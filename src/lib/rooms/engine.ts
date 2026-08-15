// ============================================================================
// Group Debate — turn engine
// Deterministic (non-AI) helpers that drive the multi-person debate state
// machine: round order, speaking order, and AI Moderator announcement text.
// Kept deterministic on purpose — with up to 6 participants x 4 rounds
// (24 turns/room) an LLM-driven moderator would add latency, cost, and a
// new failure surface for something that's really just bookkeeping.
// ============================================================================

export const ROUNDS = ['opening', 'rebuttal', 'cross_questioning', 'final'] as const;
export type Round = (typeof ROUNDS)[number];

export const ROUND_LABELS: Record<Round, string> = {
  opening: 'Opening Statement',
  rebuttal: 'Rebuttal',
  cross_questioning: 'Cross Questioning',
  final: 'Final Argument',
};

export type Position = 'Pro' | 'Against';

export interface EngineParticipant {
  id: string;
  display_name: string;
  position: Position | null;
}

/** Alternates Pro/Against so the floor doesn't get dominated by one side;
 *  anyone without a chosen position (shouldn't happen once a room starts,
 *  but handled defensively) is appended at the end in join order. */
export function computeTurnOrder(participants: EngineParticipant[]): string[] {
  const pro = participants.filter((p) => p.position === 'Pro');
  const against = participants.filter((p) => p.position === 'Against');
  const unassigned = participants.filter((p) => p.position !== 'Pro' && p.position !== 'Against');

  const order: string[] = [];
  const max = Math.max(pro.length, against.length);
  for (let i = 0; i < max; i++) {
    if (pro[i]) order.push(pro[i].id);
    if (against[i]) order.push(against[i].id);
  }
  for (const p of unassigned) order.push(p.id);
  return order;
}

export function generateRoomCode(): string {
  // Avoids ambiguous characters (0/O, 1/I/L).
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export interface AdvanceResult {
  round_index: number;
  turn_index: number;
  finished: boolean;
}

/** Moves the pointer to the next speaker; rolls into the next round when
 *  everyone has spoken; reports `finished` once all 4 rounds are done. */
export function advanceTurn(round_index: number, turn_index: number, participantCount: number): AdvanceResult {
  let nextTurn = turn_index + 1;
  let nextRound = round_index;
  if (nextTurn >= participantCount) {
    nextTurn = 0;
    nextRound += 1;
  }
  return { round_index: nextRound, turn_index: nextTurn, finished: nextRound >= ROUNDS.length };
}

export function moderatorRoundIntro(round: Round, speaker: EngineParticipant, roundNumber: number): string {
  return `Round ${roundNumber} of ${ROUNDS.length} — ${ROUND_LABELS[round]}. The floor opens with ${speaker.display_name} (${speaker.position ?? 'unassigned'}). Please begin.`;
}

export function moderatorNextTurn(round: Round, speaker: EngineParticipant): string {
  return `${ROUND_LABELS[round]} continues. ${speaker.display_name} (${speaker.position ?? 'unassigned'}), the floor is yours.`;
}

export function moderatorWrapUp(): string {
  return `All arguments are in. The floor is now closed — handing this debate to the AI Judge for evaluation.`;
}

export function moderatorWelcome(hostName: string, topic: string): string {
  return `Welcome to the debate on "${topic}". I'll be your moderator today, ${hostName}. We'll move through four rounds — Opening Statement, Rebuttal, Cross Questioning, and Final Argument — with every participant speaking once per round.`;
}
