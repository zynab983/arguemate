import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORY_CONFIGS, isPrepareCategory } from '@/lib/prepare/categories';

// Generates the AI counterpart's next roleplay turn for a Prepare session.
// Deliberately mirrors /api/debate/route.ts's structure (model priority +
// retry/backoff, opening-vs-followup chat handling) so behavior is
// consistent with the existing 1-vs-AI debate feature. Fully separate route
// and prompt set — does not touch /api/debate in any way.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, context, difficulty, messages, isOpening } = body;

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }
    if (!isPrepareCategory(category)) {
      return Response.json({ error: 'Unknown practice category.' }, { status: 400 });
    }

    const config = CATEGORY_CONFIGS[category];
    const ctx: Record<string, string> = context || {};
    const diff = difficulty || 'Intermediate';

    const systemInstruction = config.systemPrompt(ctx, diff);

    const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    async function callWithRetry(fn: () => Promise<any>, retries = 2): Promise<any> {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await fn();
        } catch (err: any) {
          const is404 = err?.message?.includes('404') || err?.message?.includes('not found');
          if (is404) throw err;
          const isTransient =
            err?.message?.includes('429') ||
            err?.message?.includes('503') ||
            err?.message?.includes('quota') ||
            err?.message?.includes('QUOTA') ||
            err?.message?.includes('Resource has been exhausted') ||
            err?.message?.includes('Service Unavailable') ||
            err?.message?.includes('high demand') ||
            err?.status === 429 ||
            err?.status === 503;
          if (isTransient && attempt < retries) {
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
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
          const result = await callWithRetry(() => model.generateContent(config.openingInstruction(ctx)));
          responseText = result.response.text();
        } else {
          // Gemini requires chat history to start with a 'user' turn. The
          // session opens with an AI monologue (role 'ai'), so pair it with
          // a synthetic user prompt — same trick as /api/debate.
          const allPrior = (messages || []).slice(0, -1);
          const geminiHistory: { role: string; parts: { text: string }[] }[] = [];

          let i = 0;
          if (allPrior[0]?.role === 'ai') {
            geminiHistory.push({ role: 'user', parts: [{ text: 'Please begin.' }] });
            geminiHistory.push({ role: 'model', parts: [{ text: allPrior[0].content }] });
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

        break;
      } catch (err: any) {
        lastError = err;
        const isTransient =
          err?.message?.includes('429') ||
          err?.message?.includes('503') ||
          err?.message?.includes('quota') ||
          err?.message?.includes('QUOTA') ||
          err?.message?.includes('Resource has been exhausted') ||
          err?.message?.includes('Service Unavailable') ||
          err?.message?.includes('high demand') ||
          err?.status === 429 ||
          err?.status === 503;
        if (isTransient) continue;
        throw err;
      }
    }

    if (responseText === null) throw lastError;

    return Response.json({ message: responseText, aiRoleLabel: config.aiRoleLabel });
  } catch (error: any) {
    console.error('Prepare API error:', error);

    if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('API key')) {
      return Response.json({ error: 'Invalid Gemini API key. Please check your configuration.' }, { status: 401 });
    }
    if (error?.message?.includes('SAFETY')) {
      return Response.json({ error: 'That scenario was flagged by safety filters. Please try different details.' }, { status: 422 });
    }
    if (error?.message?.includes('quota') || error?.message?.includes('QUOTA')) {
      return Response.json({ error: 'API quota exceeded. Please try again later.' }, { status: 429 });
    }

    return Response.json({ error: error?.message || 'Failed to generate a response. Please try again.' }, { status: 500 });
  }
}
