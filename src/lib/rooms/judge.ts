// ============================================================================
// Group Debate — AI Judge
// One Gemini call over the full multi-participant transcript. Mirrors the
// retry/model-fallback pattern already used by /api/evaluate so behavior is
// consistent with the existing 1-vs-AI judge.
// ============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ROUND_LABELS, type Round } from './engine';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface JudgeParticipantInput {
  id: string;
  display_name: string;
  position: 'Pro' | 'Against' | null;
}

export interface JudgeMessageInput {
  participant_id: string;
  round: Round;
  content: string;
}

export interface JudgeParticipantResult {
  participantId: string;
  scores: {
    argumentQuality: number;
    reasoning: number;
    relevance: number;
    rebuttals: number;
    clarity: number;
  };
  overall: number;
  feedback: string;
}

export interface JudgeResult {
  results: JudgeParticipantResult[];
  winnerParticipantId: string | null;
  bestArgument: { participantId: string | null; quote: string };
  bestRebuttal: { participantId: string | null; quote: string };
  summary: string;
}

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

const clamp = (v: any) => Math.max(0, Math.min(100, Number(v) || 0));

export async function judgeRoomDebate(params: {
  topic: string;
  debateStyle: string;
  difficulty: string;
  participants: JudgeParticipantInput[];
  messages: JudgeMessageInput[];
}): Promise<JudgeResult> {
  const { topic, debateStyle, difficulty, participants, messages } = params;

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('Invalid Gemini API key. Please check your configuration.');
  }

  // Number participants 1..N — the model is asked to refer to them by number
  // rather than free-form names, which keeps its JSON output reliably
  // matchable back to participant ids on our side.
  const roster = participants
    .map((p, i) => `${i + 1}. ${p.display_name} — arguing ${p.position ?? 'unassigned'}`)
    .join('\n');

  const transcript = messages
    .map((m) => {
      const idx = participants.findIndex((p) => p.id === m.participant_id);
      const label = idx >= 0 ? `Participant ${idx + 1}` : 'Participant ?';
      return `[${ROUND_LABELS[m.round]} — ${label}]: ${m.content}`;
    })
    .join('\n\n');

  const prompt = `You are an expert debate judge evaluating a multi-person group debate. Analyze every participant's contributions across the full transcript below and provide a detailed, honest evaluation.

DEBATE CONTEXT:
- Topic: "${topic}"
- Style: ${debateStyle}
- Difficulty: ${difficulty}

PARTICIPANTS:
${roster}

FULL TRANSCRIPT (in chronological order):
${transcript}

Evaluate EACH participant across these 5 dimensions (each score 0-100):
1. argumentQuality - strength, structure, and originality of their arguments
2. reasoning - logical soundness and use of evidence
3. relevance - how well they stayed on-topic and responded to what was actually said
4. rebuttals - how effectively they countered other participants' points
5. clarity - how clear, concise, and easy to follow their delivery was

Then determine an overall winner (the strongest performer, not necessarily the winning side), the single best argument of the whole debate, and the single best rebuttal of the whole debate — each attributed to a participant number and quoted or closely paraphrased.

Respond ONLY with a valid JSON object in this exact format (no markdown, no explanation, just raw JSON):
{
  "results": [
    {
      "participant": <number>,
      "scores": { "argumentQuality": <0-100>, "reasoning": <0-100>, "relevance": <0-100>, "rebuttals": <0-100>, "clarity": <0-100> },
      "feedback": "<1-2 sentence individual feedback>"
    }
  ],
  "winner": <participant number>,
  "bestArgument": { "participant": <number>, "quote": "<short quote or close paraphrase>" },
  "bestRebuttal": { "participant": <number>, "quote": "<short quote or close paraphrase>" },
  "summary": "<3-4 sentence overall debate summary covering how it played out and what decided the outcome>"
}`;

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

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse group judge JSON:', jsonStr);
    throw new Error('Failed to parse AI judge evaluation. Please try again.');
  }

  const byNumber = (n: any): string | null => {
    const idx = Number(n) - 1;
    return participants[idx]?.id ?? null;
  };

  const results: JudgeParticipantResult[] = (Array.isArray(parsed.results) ? parsed.results : [])
    .map((r: any) => {
      const participantId = byNumber(r.participant);
      const scores = {
        argumentQuality: clamp(r.scores?.argumentQuality),
        reasoning: clamp(r.scores?.reasoning),
        relevance: clamp(r.scores?.relevance),
        rebuttals: clamp(r.scores?.rebuttals),
        clarity: clamp(r.scores?.clarity),
      };
      const overall = Math.round(
        (scores.argumentQuality + scores.reasoning + scores.relevance + scores.rebuttals + scores.clarity) / 5
      );
      return { participantId, scores, overall, feedback: r.feedback || '' };
    })
    .filter((r: JudgeParticipantResult) => r.participantId);

  // Guarantee every participant gets a result row even if the model skipped one.
  for (const p of participants) {
    if (!results.find((r) => r.participantId === p.id)) {
      results.push({
        participantId: p.id,
        scores: { argumentQuality: 0, reasoning: 0, relevance: 0, rebuttals: 0, clarity: 0 },
        overall: 0,
        feedback: 'Not enough contributions to evaluate.',
      });
    }
  }

  const winnerParticipantId =
    byNumber(parsed.winner) ?? results.slice().sort((a, b) => b.overall - a.overall)[0]?.participantId ?? null;

  return {
    results,
    winnerParticipantId,
    bestArgument: {
      participantId: byNumber(parsed.bestArgument?.participant),
      quote: parsed.bestArgument?.quote || '',
    },
    bestRebuttal: {
      participantId: byNumber(parsed.bestRebuttal?.participant),
      quote: parsed.bestRebuttal?.quote || '',
    },
    summary: parsed.summary || '',
  };
}
