// Shared, framework-agnostic types for the Group Debate feature.
// Safe to import from client components (no server-only code here).
import type { Round } from './engine';

export type { Round };
export type RoomStatus = 'lobby' | 'in_progress' | 'evaluating' | 'completed' | 'failed';
export type Position = 'Pro' | 'Against';

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  position: Position | null;
  is_host: boolean;
  joined_at: string;
  score_argument_quality: number | null;
  score_reasoning: number | null;
  score_relevance: number | null;
  score_rebuttals: number | null;
  score_clarity: number | null;
  score_overall: number | null;
  judge_feedback: string | null;
}

export interface RoomMessage {
  id: string;
  room_id: string;
  participant_id: string | null;
  role: 'participant' | 'moderator';
  round: Round | null;
  content: string;
  turn_index: number;
  created_at: string;
}

export interface DebateRoom {
  id: string;
  code: string;
  host_user_id: string;
  topic: string;
  debate_style: string;
  difficulty: string;
  max_participants: number;
  status: RoomStatus;
  current_round: Round | null;
  turn_order: string[];
  turn_index: number;
  round_index: number;
  winner_participant_id: string | null;
  best_argument: string | null;
  best_rebuttal: string | null;
  summary: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface RoomFullState {
  room: DebateRoom;
  participants: RoomParticipant[];
  messages: RoomMessage[];
}
