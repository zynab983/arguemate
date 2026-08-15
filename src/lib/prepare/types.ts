// Shared types for the Prepare feature's session messages + evaluation
// result shape. No server-only imports — safe for client components.

export interface PrepareMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string; // ISO string (Date isn't reliably serializable through fetch)
}

export interface PrepareScores {
  clarity: number;
  confidence: number;
  relevance: number;
  impact: number;
  professionalism: number;
}

export interface PrepareEvaluation {
  scores: PrepareScores;
  overall: number;
  grade: string;
  verdict: string; // e.g. "Strong Performance", "Solid Effort", "Needs Work"
  strengths: string[];
  weaknesses: string[];
  tips: string[];
  bestMoment: string;
  summary: string;
}
