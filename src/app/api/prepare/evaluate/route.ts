import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORY_CONFIGS, isPrepareCategory } from '@/lib/prepare/categories';

// Final scoring for a Prepare session. Mirrors /api/evaluate/route.ts's
// retry/model-fallback + JSON-parsing pattern exactly, applied to a
// generic professional-skills rubric instead of the debate rubric.
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
        await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
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
    const { category, context, difficulty, messages } = body;

    if (!isPrepareCategory(category)) {
      return Response.json({ error: 'Unknown practice category.' }, { status: 400 });
    }
    if (!messages || messages.length < 2) {
      return Response.json({ error: 'Not enough of the session to evaluate yet.' }, { status: 400 });
    }

    const config = CATEGORY_CONFIGS[category];
    const ctx: Record<string, string> = context || {};

    const transcript = messages
      .map((m: any) => `[${m.role === 'user' ? 'USER' : config.aiRoleLabel.toUpperCase()}]: ${m.content}`)
      .join('\n\n');

    const prompt = `You are an expert professional-skills coach evaluating a practice session. The user practiced "${config.label}" against an AI playing the role of ${config.aiRoleLabel}. Analyze ONLY the user's turns (labeled [USER]) and give a detailed, honest evaluation.

SESSION CONTEXT:
- Practice type: ${config.label}
- Difficulty: ${difficulty || 'Intermediate'}
- Details: ${Object.entries(ctx).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('; ') || 'none provided'}

FULL TRANSCRIPT:
${transcript}

Evaluate the USER's performance across these 5 dimensions (each score out of 100):
1. clarity - how clear, structured, and easy to follow their responses were
2. confidence - assertiveness, composure, and conviction
3. relevance - how well they addressed what was actually asked/said, staying on-topic
4. impact - how persuasive, memorable, or effective their responses were for this specific context
5. professionalism - tone, etiquette, and appropriateness for a real professional setting

Then give a short overall verdict phrase (e.g. "Strong Performance", "Solid Effort", "Needs Work", "Outstanding").

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation, just raw JSON):
{
  "scores": {
    "clarity": <0-100>,
    "confidence": <0-100>,
    "relevance": <0-100>,
    "impact": <0-100>,
    "professionalism": <0-100>
  },
  "overall": <0-100>,
  "grade": "<A+|A|A-|B+|B|B-|C+|C|C-|D|F>",
  "verdict": "<short phrase>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "tips": ["<actionable improvement tip 1>", "<tip 2>", "<tip 3>"],
  "bestMoment": "<the user's single strongest moment or line, quoted or closely paraphrased>",
  "summary": "<2-3 sentence overall performance summary>"
}`;

    await new Promise((r) => setTimeout(r, 1500));

    const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let result: any = null;
    let lastErr: any = null;

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await callWithRetry(() => model.generateContent(prompt));
        break;
      } catch (err: any) {
        lastErr = err;
        if (isRateLimit(err)) continue;
        throw err;
      }
    }

    if (!result) throw lastErr;

    const raw = result.response.text().trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let evaluation;
    try {
      evaluation = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse prepare evaluation JSON:', jsonStr);
      return Response.json({ error: 'Failed to parse AI evaluation. Please try again.' }, { status: 500 });
    }

    const scores = evaluation.scores || {};
    const clamp = (v: any) => Math.max(0, Math.min(100, Number(v) || 0));

    const safeEval = {
      scores: {
        clarity: clamp(scores.clarity),
        confidence: clamp(scores.confidence),
        relevance: clamp(scores.relevance),
        impact: clamp(scores.impact),
        professionalism: clamp(scores.professionalism),
      },
      overall: clamp(evaluation.overall),
      grade: evaluation.grade || 'C',
      verdict: evaluation.verdict || 'Solid Effort',
      strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths.slice(0, 4) : [],
      weaknesses: Array.isArray(evaluation.weaknesses) ? evaluation.weaknesses.slice(0, 4) : [],
      tips: Array.isArray(evaluation.tips) ? evaluation.tips.slice(0, 4) : [],
      bestMoment: evaluation.bestMoment || '',
      summary: evaluation.summary || '',
    };

    return Response.json({ evaluation: safeEval });
  } catch (error: any) {
    console.error('Prepare evaluate API error:', error);

    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      return Response.json({ error: 'Invalid Gemini API key.' }, { status: 401 });
    }
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      return Response.json({ error: 'API quota exceeded. Please wait a moment and try again.' }, { status: 429 });
    }
    return Response.json({ error: error?.message || 'Evaluation failed.' }, { status: 500 });
  }
}
