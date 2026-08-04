import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const PERSONALITY_PROMPTS: Record<string, string> = {
  Logical: `You are a purely logical debater. You rely exclusively on data, statistics, peer-reviewed research, and formal logical structures. 
You never make emotional appeals. Every claim must be backed by evidence or reasoning. 
You identify logical fallacies in your opponent's arguments. You use syllogisms and deductive reasoning.`,
  Emotional: `You are an emotionally compelling debater. You use vivid stories, human experiences, empathy, and moral intuition. 
You connect arguments to real human impact. You appeal to values and feelings while still maintaining coherence. 
You use pathos powerfully and make abstract ideas deeply personal.`,
  "Devil's Advocate": `You are a Devil's Advocate debater. You always argue the opposite of what seems obvious or popular. 
You challenge assumptions, expose hidden weaknesses, and defend controversial positions with vigor. 
You find angles others miss and push thinking to its limits. You relish intellectual provocation.`,
  Neutral: `You are a balanced, neutral debater. You present multiple perspectives fairly, acknowledge the strength of opposing views, 
and seek nuanced middle ground. You avoid extremes. You model intellectual humility and analytical balance.`,
};

const STYLE_PROMPTS: Record<string, string> = {
  Formal: `Debate style: FORMAL. Keep a structured, professional tone (premise → evidence → conclusion) and use transitions like "Furthermore," "Consequently," "In contrast."
But keep the WORDS themselves plain and everyday — formal in structure, not in vocabulary. No slang, but no fancy words either.`,
  Casual: `Debate style: CASUAL. Use conversational language, relatable examples, and accessible explanations.
Be friendly but still substantive. Use contractions, everyday language, and a warm tone.`,
  Oxford: `Debate style: OXFORD UNION. Structure your point like a proposition with a clear rebuttal, in the classic "This House believes..." spirit.
But say it in plain, modern English — skip the flowery, literary language.`,
  Parliamentary: `Debate style: PARLIAMENTARY. Use light procedural framing ("The honorable member...", "I yield the floor...") sparingly.
Structure responses like a short speech with a rebuttal and a counter-point. Keep the actual wording simple and direct, not stiff.`,
};

const DIFFICULTY_PROMPTS: Record<string, string> = {
  Beginner: `Difficulty: BEGINNER. Keep arguments simple and clear. Avoid technical jargon entirely.
Explain concepts in plain, everyday terms. Make one clear point. Be encouraging in tone.`,
  Intermediate: `Difficulty: INTERMEDIATE. Make a well-developed point with one supporting reason or example.
You can reference a concept or fact, but explain it in plain English — don't just drop jargon. Challenge weak arguments directly.`,
  Advanced: `Difficulty: ADVANCED. Bring sharp, well-informed arguments — reference real studies, thinkers, or data when useful.
Still explain everything in plain, clear English rather than academic language. Be intellectually relentless, not wordy. Attack logical weaknesses directly.`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      difficulty,
      debateStyle,
      aiPersonality,
      messages,
      isOpening,
      userStance,
    } = body;

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const personalityPrompt = PERSONALITY_PROMPTS[aiPersonality] || PERSONALITY_PROMPTS['Logical'];
    const stylePrompt = STYLE_PROMPTS[debateStyle] || STYLE_PROMPTS['Formal'];
    const difficultyPrompt = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS['Intermediate'];

    // AI always takes the opposite stance of the user
    const aiStance = userStance === 'FOR' ? 'AGAINST' : 'FOR';

    const systemInstruction = `You are ArgueBot, an elite AI debate opponent in the ArgueMate application.

TOPIC: "${topic}"
YOUR POSITION: You are arguing ${aiStance} the motion. The user is arguing ${userStance}.

${personalityPrompt}

${stylePrompt}

${difficultyPrompt}

CRITICAL RULES:
1. ALWAYS argue from the ${aiStance} position. Never concede your core stance.
2. Respond ONLY in plain text. No markdown headers, bullet lists, or formatting symbols.
3. Use SIMPLE, EVERYDAY ENGLISH. Write like you're talking to a friend, not writing an essay or academic paper. No big/fancy/rare words when a simple one works just as well. No jargon unless the user used it first.
4. Keep responses SHORT — just 3 to 4 short lines/sentences total, max. One idea per sentence. Be punchy and direct, not a wall of text.
5. Directly rebut the user's latest point in 1 short sentence, then make your strongest counter in 1-2 short sentences.
6. No lengthy introductions, no summaries, no padding — every sentence must land a point.
7. Do NOT start with "I" as the first word. Use engaging openers.
8. End with one sharp, provocative line (still plain English) that challenges the user to respond.`;

    // Try models in order of preference; fall back if one hits quota
    const MODEL_PRIORITY = [
      'gemini-2.5-flash',
    ];

    // Helper: attempt a Gemini call with retry + exponential backoff
    async function callWithRetry(fn: () => Promise<any>, retries = 2): Promise<any> {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (err: any) {
          const is404 = err?.message?.includes('404') || err?.message?.includes('not found');
          if (is404) throw err; // Don't retry model-not-found errors
          const isRateLimit =
            err?.message?.includes('429') ||
            err?.message?.includes('quota') ||
            err?.message?.includes('QUOTA') ||
            err?.message?.includes('Resource has been exhausted') ||
            err?.status === 429;
          if (isRateLimit && attempt < retries) {
            // Wait 3s then 6s before retrying
            await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }
    }

    let lastError: any = null;
    let responseText: string | null = null;

    for (const modelName of MODEL_PRIORITY) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });

        if (isOpening) {
          const result = await callWithRetry(() =>
            model.generateContent(
              `Please deliver your opening argument for the debate on: "${topic}". You are arguing ${aiStance}. Make it compelling and set the tone for the debate.`
            )
          );
          responseText = result.response.text();
        } else {
          // Gemini requires chat history to start with a 'user' turn.
          // The debate opens with an AI monologue (role 'model'), so we pair it
          // with a synthetic user prompt to satisfy the API constraint.
          const allPrior = messages.slice(0, -1);
          const geminiHistory: { role: string; parts: { text: string }[] }[] = [];

          let i = 0;
          if (allPrior[0]?.role === 'model') {
            geminiHistory.push({
              role: 'user',
              parts: [{ text: 'Please begin with your opening argument.' }],
            });
            geminiHistory.push({
              role: 'model',
              parts: [{ text: allPrior[0].content }],
            });
            i = 1;
          }
          for (; i < allPrior.length; i++) {
            geminiHistory.push({
              role: allPrior[i].role === 'user' ? 'user' : 'model',
              parts: [{ text: allPrior[i].content }],
            });
          }

          const chat = model.startChat({ history: geminiHistory });
          const lastMessage = messages[messages.length - 1];
          const result = await callWithRetry(() => chat.sendMessage(lastMessage.content));
          responseText = result.response.text();
        }

        // Success — break out of model loop
        break;
      } catch (err: any) {
        lastError = err;
        const isRateLimit =
          err?.message?.includes('429') ||
          err?.message?.includes('quota') ||
          err?.message?.includes('QUOTA') ||
          err?.message?.includes('Resource has been exhausted') ||
          err?.status === 429;
        if (isRateLimit) {
          // Try next model
          continue;
        }
        // Non-rate-limit error — rethrow immediately
        throw err;
      }
    }

    if (responseText === null) {
      // All models hit quota
      throw lastError;
    }

    return Response.json({ message: responseText });


  } catch (error: any) {
    console.error('Debate API error:', error);

    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      return Response.json(
        { error: 'Invalid Gemini API key. Please check your configuration.' },
        { status: 401 }
      );
    }
    if (error?.message?.includes('SAFETY')) {
      return Response.json(
        { error: 'The topic was flagged by safety filters. Please try a different topic.' },
        { status: 422 }
      );
    }
    if (error?.message?.includes('quota') || error?.message?.includes('QUOTA')) {
      return Response.json(
        { error: 'API quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return Response.json(
      { error: error?.message || 'Failed to generate AI response. Please try again.' },
      { status: 500 }
    );
  }
}
