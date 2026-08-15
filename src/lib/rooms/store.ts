// ============================================================================
// Group Debate — data access layer
//
// Two backends behind one interface:
//  - Supabase (debate_rooms / room_participants / room_messages), used when
//    a real project is configured.
//  - An in-memory fallback, used when it isn't (placeholder env vars, or the
//    project is paused/unreachable) — same mock-mode philosophy as
//    isMockAuth / the /api/debates mock-save path, so the feature keeps
//    working for local demoing even if Supabase is down.
//
// The in-memory store lives on `globalThis` so it survives Next.js dev
// Fast Refresh reloading this module. It does NOT survive a server restart
// or work across multiple serverless instances — that's an accepted
// limitation of the fallback path, not the Supabase path.
// ============================================================================

import { getServiceClient } from '@/lib/supabase/admin';
import {
  ROUNDS,
  advanceTurn,
  computeTurnOrder,
  generateRoomCode,
  moderatorNextTurn,
  moderatorRoundIntro,
  moderatorWelcome,
  moderatorWrapUp,
  type EngineParticipant,
  type Round,
} from './engine';
import { judgeRoomDebate } from './judge';
import type { DebateRoom, RoomFullState, RoomMessage, RoomParticipant, RoomStatus } from './types';

export class RoomError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ── In-memory fallback store ────────────────────────────────────────────────

type MemRoom = DebateRoom & { participants: RoomParticipant[]; messages: RoomMessage[] };

const g = globalThis as unknown as { __edquantaRoomStore?: Map<string, MemRoom> };
const memRooms = g.__edquantaRoomStore ?? new Map<string, MemRoom>();
g.__edquantaRoomStore = memRooms;

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toFullState(r: MemRoom): RoomFullState {
  const { participants, messages, ...room } = r;
  return { room, participants: [...participants], messages: [...messages] };
}

// ── Shared validation / helpers (backend-agnostic) ──────────────────────────

function assertValidCreateInput(input: {
  topic: string;
  debateStyle: string;
  difficulty: string;
  maxParticipants: number;
  hostName: string;
}) {
  if (!input.topic?.trim()) throw new RoomError('A debate topic is required.', 400);
  if (!input.hostName?.trim()) throw new RoomError('A display name is required.', 400);
  if (!Number.isInteger(input.maxParticipants) || input.maxParticipants < 2 || input.maxParticipants > 6) {
    throw new RoomError('Participant count must be between 2 and 6.', 400);
  }
}

function engineParticipants(participants: RoomParticipant[]): EngineParticipant[] {
  return participants.map((p) => ({ id: p.id, display_name: p.display_name, position: p.position }));
}

function balancePositions(participants: RoomParticipant[]): RoomParticipant[] {
  let proCount = participants.filter((p) => p.position === 'Pro').length;
  let againstCount = participants.filter((p) => p.position === 'Against').length;
  return participants.map((p) => {
    if (p.position) return p;
    const assigned: 'Pro' | 'Against' = proCount <= againstCount ? 'Pro' : 'Against';
    if (assigned === 'Pro') proCount++;
    else againstCount++;
    return { ...p, position: assigned };
  });
}

/** Builds the moderator message(s) + room pointer state for a freshly-advanced turn. */
function buildAdvanceOutcome(room: DebateRoom, participants: RoomParticipant[], msgIndex: number) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const round = ROUNDS[room.round_index] as Round;
  const speakerId = room.turn_order[room.turn_index];
  const speaker = byId.get(speakerId);
  const isRoundStart = room.turn_index === 0;
  const text = isRoundStart && speaker
    ? moderatorRoundIntro(round, engineParticipants([speaker])[0], room.round_index + 1)
    : speaker
    ? moderatorNextTurn(round, engineParticipants([speaker])[0])
    : moderatorWrapUp();

  return {
    id: uid(),
    room_id: room.id,
    participant_id: null,
    role: 'moderator' as const,
    round,
    content: text,
    turn_index: msgIndex,
    created_at: new Date().toISOString(),
  };
}

// ── Create ───────────────────────────────────────────────────────────────

export async function createRoom(input: {
  hostUserId: string;
  hostName: string;
  topic: string;
  debateStyle: string;
  difficulty: string;
  maxParticipants: number;
}): Promise<RoomFullState> {
  assertValidCreateInput(input);
  const db = getServiceClient();

  const baseRoom = {
    topic: input.topic.trim(),
    debate_style: input.debateStyle,
    difficulty: input.difficulty,
    max_participants: input.maxParticipants,
    status: 'lobby' as RoomStatus,
    current_round: null as Round | null,
    turn_order: [] as string[],
    turn_index: 0,
    round_index: 0,
    winner_participant_id: null,
    best_argument: null,
    best_rebuttal: null,
    summary: null,
    started_at: null,
    completed_at: null,
  };

  if (db) {
    let code = generateRoomCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await db.from('debate_rooms').select('id').eq('code', code).maybeSingle();
      if (!existing) break;
      code = generateRoomCode();
    }

    const { data: room, error: roomErr } = await db
      .from('debate_rooms')
      .insert({ ...baseRoom, code, host_user_id: input.hostUserId })
      .select()
      .single();
    if (roomErr) throw new RoomError(roomErr.message, 500);

    const { data: host, error: hostErr } = await db
      .from('room_participants')
      .insert({
        room_id: room.id,
        user_id: input.hostUserId,
        display_name: input.hostName.trim(),
        position: null,
        is_host: true,
      })
      .select()
      .single();
    if (hostErr) throw new RoomError(hostErr.message, 500);

    return { room: room as DebateRoom, participants: [host as RoomParticipant], messages: [] };
  }

  // In-memory fallback
  let code = generateRoomCode();
  while (memRooms.has(code)) code = generateRoomCode();

  const roomId = uid();
  const host: RoomParticipant = {
    id: uid(),
    room_id: roomId,
    user_id: input.hostUserId,
    display_name: input.hostName.trim(),
    position: null,
    is_host: true,
    joined_at: new Date().toISOString(),
    score_argument_quality: null,
    score_reasoning: null,
    score_relevance: null,
    score_rebuttals: null,
    score_clarity: null,
    score_overall: null,
    judge_feedback: null,
  };
  const memRoom: MemRoom = {
    ...baseRoom,
    id: roomId,
    code,
    host_user_id: input.hostUserId,
    created_at: new Date().toISOString(),
    participants: [host],
    messages: [],
  };
  memRooms.set(code, memRoom);
  return toFullState(memRoom);
}

// ── Read ─────────────────────────────────────────────────────────────────

export async function getRoomFull(code: string): Promise<RoomFullState | null> {
  const db = getServiceClient();
  const normalized = code.trim().toUpperCase();

  if (db) {
    const { data: room, error: roomErr } = await db.from('debate_rooms').select('*').eq('code', normalized).maybeSingle();
    // A real query/connection error (missing table, paused/unreachable
    // project, etc.) must NOT be reported as "room not found" — that's
    // misleading and impossible to debug. Only a genuinely empty result
    // (no error, no row) means the code doesn't exist.
    if (roomErr) {
      throw new RoomError(
        `Could not reach the debate database (${roomErr.message}). If you just added the Group Debate feature, make sure supabase/multiplayer_schema.sql has been run in your Supabase project.`,
        503
      );
    }
    if (!room) return null;

    const { data: participants, error: pErr } = await db
      .from('room_participants')
      .select('*')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: true });
    if (pErr) throw new RoomError(`Could not load participants (${pErr.message}).`, 503);

    const { data: messages, error: mErr } = await db
      .from('room_messages')
      .select('*')
      .eq('room_id', room.id)
      .order('turn_index', { ascending: true });
    if (mErr) throw new RoomError(`Could not load the transcript (${mErr.message}).`, 503);

    return { room: room as DebateRoom, participants: (participants || []) as RoomParticipant[], messages: (messages || []) as RoomMessage[] };
  }

  const memRoom = memRooms.get(normalized);
  return memRoom ? toFullState(memRoom) : null;
}

function requireRoom(state: RoomFullState | null): RoomFullState {
  if (!state) throw new RoomError('Room not found. Double-check the code.', 404);
  return state;
}

// ── Join ─────────────────────────────────────────────────────────────────

export async function joinRoom(code: string, input: { userId: string; displayName: string }): Promise<RoomFullState> {
  if (!input.displayName?.trim()) throw new RoomError('A display name is required.', 400);
  const normalized = code.trim().toUpperCase();
  const db = getServiceClient();
  const state = requireRoom(await getRoomFull(normalized));

  const existing = state.participants.find((p) => p.user_id === input.userId);
  if (existing) return state; // idempotent rejoin (e.g. page refresh)

  if (state.room.status !== 'lobby') {
    throw new RoomError('This debate has already started — you can no longer join.', 409);
  }
  if (state.participants.length >= state.room.max_participants) {
    throw new RoomError('This room is full.', 409);
  }

  if (db) {
    const { data: participant, error } = await db
      .from('room_participants')
      .insert({
        room_id: state.room.id,
        user_id: input.userId,
        display_name: input.displayName.trim(),
        position: null,
        is_host: false,
      })
      .select()
      .single();
    if (error) throw new RoomError(error.message, 500);
    return { ...state, participants: [...state.participants, participant as RoomParticipant] };
  }

  const memRoom = memRooms.get(normalized)!;
  const participant: RoomParticipant = {
    id: uid(),
    room_id: memRoom.id,
    user_id: input.userId,
    display_name: input.displayName.trim(),
    position: null,
    is_host: false,
    joined_at: new Date().toISOString(),
    score_argument_quality: null,
    score_reasoning: null,
    score_relevance: null,
    score_rebuttals: null,
    score_clarity: null,
    score_overall: null,
    judge_feedback: null,
  };
  memRoom.participants.push(participant);
  return toFullState(memRoom);
}

// ── Choose Pro / Against ────────────────────────────────────────────────────

export async function setPosition(code: string, input: { userId: string; position: 'Pro' | 'Against' }): Promise<RoomFullState> {
  const normalized = code.trim().toUpperCase();
  const db = getServiceClient();
  const state = requireRoom(await getRoomFull(normalized));

  if (state.room.status !== 'lobby') {
    throw new RoomError('Positions can only be changed before the debate starts.', 409);
  }
  const participant = state.participants.find((p) => p.user_id === input.userId);
  if (!participant) throw new RoomError('You are not a participant in this room.', 403);

  if (db) {
    const { error } = await db.from('room_participants').update({ position: input.position }).eq('id', participant.id);
    if (error) throw new RoomError(error.message, 500);
    return getRoomFull(normalized) as Promise<RoomFullState>;
  }

  const memRoom = memRooms.get(normalized)!;
  const p = memRoom.participants.find((x) => x.id === participant.id)!;
  p.position = input.position;
  return toFullState(memRoom);
}

// ── Start ────────────────────────────────────────────────────────────────

export async function startRoom(code: string, input: { userId: string }): Promise<RoomFullState> {
  const normalized = code.trim().toUpperCase();
  const db = getServiceClient();
  const state = requireRoom(await getRoomFull(normalized));

  if (state.room.status !== 'lobby') throw new RoomError('This debate has already started.', 409);
  const host = state.participants.find((p) => p.is_host);
  if (!host || host.user_id !== input.userId) throw new RoomError('Only the host can start the debate.', 403);
  if (state.participants.length < 2) throw new RoomError('At least 2 participants are needed to start.', 400);

  const balanced = balancePositions(state.participants);
  const turnOrder = computeTurnOrder(engineParticipants(balanced));
  const firstSpeaker = balanced.find((p) => p.id === turnOrder[0])!;

  const welcomeMsg: Omit<RoomMessage, 'id' | 'room_id'> = {
    participant_id: null,
    role: 'moderator',
    round: 'opening',
    content: moderatorWelcome(host.display_name, state.room.topic),
    turn_index: 0,
    created_at: new Date().toISOString(),
  };
  const introMsg: Omit<RoomMessage, 'id' | 'room_id'> = {
    participant_id: null,
    role: 'moderator',
    round: 'opening',
    content: moderatorRoundIntro('opening', engineParticipants([firstSpeaker])[0], 1),
    turn_index: 1,
    created_at: new Date().toISOString(),
  };

  if (db) {
    for (const p of balanced) {
      if (p.position !== state.participants.find((x) => x.id === p.id)?.position) {
        await db.from('room_participants').update({ position: p.position }).eq('id', p.id);
      }
    }
    const { error: roomErr } = await db
      .from('debate_rooms')
      .update({
        status: 'in_progress',
        current_round: 'opening',
        turn_order: turnOrder,
        turn_index: 0,
        round_index: 0,
        started_at: new Date().toISOString(),
      })
      .eq('id', state.room.id);
    if (roomErr) throw new RoomError(roomErr.message, 500);

    await db.from('room_messages').insert([
      { ...welcomeMsg, room_id: state.room.id },
      { ...introMsg, room_id: state.room.id },
    ]);

    return getRoomFull(normalized) as Promise<RoomFullState>;
  }

  const memRoom = memRooms.get(normalized)!;
  memRoom.participants = balanced.map((p) => ({ ...p }));
  memRoom.status = 'in_progress';
  memRoom.current_round = 'opening';
  memRoom.turn_order = turnOrder;
  memRoom.turn_index = 0;
  memRoom.round_index = 0;
  memRoom.started_at = new Date().toISOString();
  memRoom.messages.push({ ...welcomeMsg, id: uid(), room_id: memRoom.id }, { ...introMsg, id: uid(), room_id: memRoom.id });
  return toFullState(memRoom);
}

// ── Submit a turn ────────────────────────────────────────────────────────

async function finalizeWithJudge(state: RoomFullState): Promise<{
  updates: Partial<DebateRoom>;
  participantUpdates: Map<string, Partial<RoomParticipant>>;
}> {
  try {
    const judged = await judgeRoomDebate({
      topic: state.room.topic,
      debateStyle: state.room.debate_style,
      difficulty: state.room.difficulty,
      participants: state.participants.map((p) => ({ id: p.id, display_name: p.display_name, position: p.position })),
      messages: state.messages
        .filter((m) => m.role === 'participant' && m.round)
        .map((m) => ({ participant_id: m.participant_id!, round: m.round as Round, content: m.content })),
    });

    const participantUpdates = new Map<string, Partial<RoomParticipant>>();
    for (const r of judged.results) {
      participantUpdates.set(r.participantId, {
        score_argument_quality: r.scores.argumentQuality,
        score_reasoning: r.scores.reasoning,
        score_relevance: r.scores.relevance,
        score_rebuttals: r.scores.rebuttals,
        score_clarity: r.scores.clarity,
        score_overall: r.overall,
        judge_feedback: r.feedback,
      });
    }

    const winner = state.participants.find((p) => p.id === judged.winnerParticipantId);
    const bestArgAuthor = state.participants.find((p) => p.id === judged.bestArgument.participantId);
    const bestRebAuthor = state.participants.find((p) => p.id === judged.bestRebuttal.participantId);

    return {
      updates: {
        status: 'completed',
        winner_participant_id: judged.winnerParticipantId,
        best_argument: judged.bestArgument.quote ? `${bestArgAuthor?.display_name ?? 'A participant'}: "${judged.bestArgument.quote}"` : null,
        best_rebuttal: judged.bestRebuttal.quote ? `${bestRebAuthor?.display_name ?? 'A participant'}: "${judged.bestRebuttal.quote}"` : null,
        summary: judged.summary || (winner ? `${winner.display_name} took the win.` : null),
        completed_at: new Date().toISOString(),
      },
      participantUpdates,
    };
  } catch (err: any) {
    console.error('Group debate judge error:', err);
    return {
      updates: {
        status: 'failed',
        summary: err?.message || 'The AI Judge could not evaluate this debate. You can retry from here.',
      },
      participantUpdates: new Map(),
    };
  }
}

export async function submitTurn(code: string, input: { userId: string; content: string }): Promise<RoomFullState> {
  const content = input.content?.trim();
  if (!content) throw new RoomError('Your argument cannot be empty.', 400);
  if (content.length > 4000) throw new RoomError('Please keep arguments under 4000 characters.', 400);

  const normalized = code.trim().toUpperCase();
  const db = getServiceClient();
  const state = requireRoom(await getRoomFull(normalized));

  if (state.room.status !== 'in_progress') throw new RoomError('This debate is not currently accepting turns.', 409);

  const speakerId = state.room.turn_order[state.room.turn_index];
  const speaker = state.participants.find((p) => p.id === speakerId);
  if (!speaker || speaker.user_id !== input.userId) throw new RoomError("It isn't your turn yet.", 403);

  const round = ROUNDS[state.room.round_index] as Round;
  const turnMsg: Omit<RoomMessage, 'id' | 'room_id'> = {
    participant_id: speaker.id,
    role: 'participant',
    round,
    content,
    turn_index: state.messages.length,
    created_at: new Date().toISOString(),
  };

  const advance = advanceTurn(state.room.round_index, state.room.turn_index, state.room.turn_order.length);

  const newState: RoomFullState = {
    room: { ...state.room, round_index: advance.round_index, turn_index: advance.turn_index },
    participants: state.participants,
    messages: [...state.messages, { ...turnMsg, id: uid(), room_id: state.room.id }],
  };

  let modMsg: RoomMessage | null = null;
  let finalize: { updates: Partial<DebateRoom>; participantUpdates: Map<string, Partial<RoomParticipant>> } | null = null;

  if (advance.finished) {
    modMsg = {
      id: uid(),
      room_id: state.room.id,
      participant_id: null,
      role: 'moderator',
      round,
      content: moderatorWrapUp(),
      turn_index: newState.messages.length,
      created_at: new Date().toISOString(),
    };
    newState.messages.push(modMsg);
    newState.room.status = 'evaluating';
    newState.room.current_round = null;
    finalize = await finalizeWithJudge({ ...newState, room: { ...newState.room, status: 'evaluating' } });
    Object.assign(newState.room, finalize.updates);
  } else {
    newState.room.current_round = round;
    modMsg = buildAdvanceOutcome({ ...state.room, round_index: advance.round_index, turn_index: advance.turn_index }, state.participants, newState.messages.length);
    newState.messages.push(modMsg);
  }

  if (db) {
    const inserts = newState.messages.slice(state.messages.length);
    if (inserts.length) {
      await db.from('room_messages').insert(inserts.map(({ id, ...rest }) => rest));
    }
    const roomPatch: Record<string, any> = {
      round_index: newState.room.round_index,
      turn_index: newState.room.turn_index,
      current_round: newState.room.current_round,
      status: newState.room.status,
    };
    if (finalize) Object.assign(roomPatch, finalize.updates);
    await db.from('debate_rooms').update(roomPatch).eq('id', state.room.id);

    if (finalize) {
      for (const [participantId, patch] of finalize.participantUpdates) {
        await db.from('room_participants').update(patch).eq('id', participantId);
      }
    }
    return getRoomFull(normalized) as Promise<RoomFullState>;
  }

  // In-memory fallback
  const memRoom = memRooms.get(normalized)!;
  memRoom.messages.push(...newState.messages.slice(state.messages.length));
  memRoom.round_index = newState.room.round_index;
  memRoom.turn_index = newState.room.turn_index;
  memRoom.current_round = newState.room.current_round;
  memRoom.status = newState.room.status;
  if (finalize) {
    Object.assign(memRoom, finalize.updates);
    for (const [participantId, patch] of finalize.participantUpdates) {
      const p = memRoom.participants.find((x) => x.id === participantId);
      if (p) Object.assign(p, patch);
    }
  }
  return toFullState(memRoom);
}

// ── Retry evaluation (used if the judge call failed) ────────────────────────

export async function retryEvaluation(code: string, input: { userId: string }): Promise<RoomFullState> {
  const normalized = code.trim().toUpperCase();
  const db = getServiceClient();
  const state = requireRoom(await getRoomFull(normalized));

  const host = state.participants.find((p) => p.is_host);
  if (!host || host.user_id !== input.userId) throw new RoomError('Only the host can retry evaluation.', 403);
  if (state.room.status !== 'failed' && state.room.status !== 'evaluating') {
    throw new RoomError('This debate is not awaiting evaluation.', 409);
  }

  const finalize = await finalizeWithJudge({ ...state, room: { ...state.room, status: 'evaluating' } });

  if (db) {
    await db.from('debate_rooms').update(finalize.updates).eq('id', state.room.id);
    for (const [participantId, patch] of finalize.participantUpdates) {
      await db.from('room_participants').update(patch).eq('id', participantId);
    }
    return getRoomFull(normalized) as Promise<RoomFullState>;
  }

  const memRoom = memRooms.get(normalized)!;
  Object.assign(memRoom, finalize.updates);
  for (const [participantId, patch] of finalize.participantUpdates) {
    const p = memRoom.participants.find((x) => x.id === participantId);
    if (p) Object.assign(p, patch);
  }
  return toFullState(memRoom);
}
