import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function isRateLimit(err: any): boolean {
  return (
    err?.message?.includes('429') ||
    err?.message?.includes('quota') ||
    err?.message?.includes('QUOTA') ||
    err?.message?.includes('Resource has been exhausted') ||
    err?.status === 429
  );
}

async function callWithRetry(fn: () => Promise<any>, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is404 = err?.message?.includes('404') || err?.message?.includes('not found');
      if (is404) throw err;
      if (isRateLimit(err) && attempt < retries) {
        // Progressive backoff: 5s, 10s, 15s
        await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return Response.json({ error: 'Invalid Gemini API key. Please check your configuration.' }, { status: 401 });
    }

    const body = await request.json();
    const { topic, messages, userStance, difficulty, debateStyle, aiPersonality, language = 'English' } = body;

    if (!messages || messages.length < 2) {
      return Response.json({ error: 'Not enough messages to evaluate.' }, { status: 400 });
    }

    // Build the transcript
    const transcript = messages
      .map((m: any, i: number) => `[${m.role === 'user' ? 'USER' : 'ARGUEBOT'}]: ${m.content}`)
      .join('\n\n');

    const prompt = `You are an expert debate judge evaluating a debate. Analyze ONLY the user's arguments (labeled [USER]) and provide a detailed, honest evaluation.

DEBATE CONTEXT:
- Topic: "${topic}"
- User's stance: ${userStance}
- Difficulty: ${difficulty}
- Style: ${debateStyle}
- AI Personality: ${aiPersonality}

FULL TRANSCRIPT:
${transcript}

Evaluate the USER's performance across these 6 dimensions (each score out of 100):
1. Logic - soundness of reasoning and argument structure
2. Facts - accuracy and use of evidence/data
3. Persuasiveness - ability to convince and engage
4. Confidence - assertiveness and certainty of claims
5. Communication - clarity, conciseness, and fluency
6. Relevance - how well arguments stayed on-topic

Then determine the winner based on argument quality (not word count).

${language && language !== 'English'
  ? `LANGUAGE: The debate above was conducted in ${language}. Write all text fields (strengths, weaknesses, suggestions, bestArgument, summary, and fallacies) in natural, everyday ${language} — not a literal translation. Keep "grade" and "winner" exactly as specified below (those stay in their fixed format, not translated).`
  : `LANGUAGE: Write all text fields in English.`}

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation, just raw JSON):
{
  "scores": {
    "logic": <0-100>,
    "facts": <0-100>,
    "persuasiveness": <0-100>,
    "confidence": <0-100>,
    "communication": <0-100>,
    "relevance": <0-100>
  },
  "overall": <0-100>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
  "winner": "<User|AI|Draw>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"],
  "bestArgument": "<The user's single best argument or line, quoted verbatim or paraphrased briefly>",
  "fallacies": ["<fallacy name: brief description>" or empty array if none],
  "summary": "<2-3 sentence overall performance summary>"
}`;

    // Wait 2s before firing evaluation so it doesn't collide with the last debate message
    await new Promise(r => setTimeout(r, 2000));

    // Model fallback: try each in order if quota is hit
    const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let result: any = null;
    let lastErr: any = null;

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await callWithRetry(() => model.generateContent(prompt));
        break; // success
      } catch (err: any) {
        lastErr = err;
        if (isRateLimit(err)) continue; // try next model
        throw err; // non-quota error — rethrow
      }
    }

    if (!result) throw lastErr;

    const raw = result.response.text().trim();

    // Strip markdown code fences if Gemini adds them
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let evaluation;
    try {
      evaluation = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse evaluation JSON:', jsonStr);
      return Response.json({ error: 'Failed to parse AI evaluation. Please try again.' }, { status: 500 });
    }

    // Validate required fields and clamp scores
    const scores = evaluation.scores || {};
    const clamp = (v: any) => Math.max(0, Math.min(100, Number(v) || 0));

    const safeEval = {
      scores: {
        logic: clamp(scores.logic),
        facts: clamp(scores.facts),
        persuasiveness: clamp(scores.persuasiveness),
        confidence: clamp(scores.confidence),
        communication: clamp(scores.communication),
        relevance: clamp(scores.relevance),
      },
      overall: clamp(evaluation.overall),
      grade: evaluation.grade || 'C',
      winner: ['User', 'AI', 'Draw'].includes(evaluation.winner) ? evaluation.winner : 'Draw',
      strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths.slice(0, 4) : [],
      weaknesses: Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses.slice(0, 4) : [],
      suggestions: Array.isArray(evaluation.suggestions) ? evaluation.suggestions.slice(0, 4) : [],
      bestArgument: evaluation.bestArgument || '',
      fallacies: Array.isArray(evaluation.fallacies) ? evaluation.fallacies : [],
      summary: evaluation.summary || '',
    };

    return Response.json({ evaluation: safeEval });
  } catch (error: any) {
    console.error('Evaluate API error:', error);

    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      return Response.json({ error: 'Invalid Gemini API key.' }, { status: 401 });
    }
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      return Response.json({ error: 'API quota exceeded. Please wait a moment and try again.' }, { status: 429 });
    }
    return Response.json({ error: error?.message || 'Evaluation failed.' }, { status: 500 });
  }
}
