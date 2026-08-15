// ============================================================================
// Prepare — professional preparation hub
// Shared, framework-agnostic config for the 6 practice categories. No React
// here on purpose so both the API routes (server) and the hub/session pages
// (client) can import it without pulling in server-only or client-only code.
// ============================================================================

export type PrepareCategory =
  | 'interview'
  | 'negotiation'
  | 'pitch'
  | 'group-discussion'
  | 'viva'
  | 'communication';

export interface ContextField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export interface CategoryConfig {
  id: PrepareCategory;
  label: string;
  aiRoleLabel: string; // shown in the UI as who the AI is playing
  description: string;
  contextFields: ContextField[];
  systemPrompt: (context: Record<string, string>, difficulty: string) => string;
  openingInstruction: (context: Record<string, string>) => string;
}

const DIFFICULTY_MODIFIERS: Record<string, string> = {
  Beginner: 'Be encouraging and fairly forgiving. Ask straightforward questions, give the user room to find their footing, and don\'t pile on pressure.',
  Intermediate: 'Be realistic and professional. Push back a little when answers are vague, and expect a reasonably solid performance.',
  Advanced: 'Be demanding and realistic like a tough real-world counterpart. Probe weak points, ask sharp follow-ups, and don\'t go easy just because it\'s practice.',
};

const SHARED_STYLE_RULES = `
HOW TO RESPOND:
- Stay fully in character. Never break the roleplay, never mention you're an AI, never add meta-commentary or stage directions.
- Use plain, natural, everyday language — the way a real person actually talks. No purple prose, no essay-style answers.
- Keep responses short: 2 to 4 sentences per turn, unless the moment genuinely calls for more.
- React specifically to what the user just said — don't ignore it and recite a script.
- End most turns with a question or a clear next beat so the conversation keeps moving.`;

export const CATEGORY_CONFIGS: Record<PrepareCategory, CategoryConfig> = {
  interview: {
    id: 'interview',
    label: 'Job Interview',
    aiRoleLabel: 'Interviewer',
    description: 'Practice answering behavioral and role-specific interview questions with a realistic AI interviewer.',
    contextFields: [
      { key: 'role', label: 'Job Title / Role', placeholder: 'e.g. Frontend Developer', required: true },
    ],
    systemPrompt: (ctx, difficulty) => `You are a professional job interviewer conducting a mock interview for the role of "${ctx.role || 'the position'}".

${DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.Intermediate}

Ask a natural mix of behavioral questions ("Tell me about a time...") and questions specific to the role. Ask ONE question per turn, listen to the answer, and ask a natural follow-up or move to the next question based on what they actually said.
${SHARED_STYLE_RULES}`,
    openingInstruction: (ctx) => `Begin the interview with a brief, warm greeting and your first question for a candidate interviewing for the role of "${ctx.role || 'the position'}".`,
  },

  negotiation: {
    id: 'negotiation',
    label: 'Salary Negotiation',
    aiRoleLabel: 'Hiring Manager',
    description: 'Practice negotiating salary and benefits against a realistic hiring manager who won\'t just cave.',
    contextFields: [
      { key: 'role', label: 'Job Title', placeholder: 'e.g. Product Manager', required: true },
      { key: 'offer', label: 'Initial Offer (optional)', placeholder: 'e.g. $85,000 base', required: false },
    ],
    systemPrompt: (ctx, difficulty) => `You are a hiring manager negotiating compensation with a candidate for the role of "${ctx.role || 'the position'}"${ctx.offer ? `, having offered ${ctx.offer}` : ''}.

${DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.Intermediate}

You have a real but not unlimited budget. Respond to the candidate's asks and justifications like a real manager would — sometimes conceding a little, sometimes holding firm, sometimes offering alternatives (signing bonus, extra PTO, equity) instead of a higher base. Stay fair and professional, never rude.
${SHARED_STYLE_RULES}`,
    openingInstruction: (ctx) => `Open the negotiation as the hiring manager. Briefly present the initial offer for the "${ctx.role || 'position'}"${ctx.offer ? ` (${ctx.offer})` : ''} and invite the candidate's thoughts.`,
  },

  pitch: {
    id: 'pitch',
    label: 'Idea Pitch',
    aiRoleLabel: 'Investor Panel',
    description: 'Pitch your idea to a sharp, realistic investor panel and handle their toughest questions.',
    contextFields: [
      { key: 'idea', label: 'Your Idea / Product', placeholder: 'e.g. An app that helps students find study partners', required: true },
    ],
    systemPrompt: (ctx, difficulty) => `You are an investor panel evaluating a pitch for: "${ctx.idea || 'the idea being pitched'}".

${DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.Intermediate}

Ask sharp, realistic questions about the market, the business model, differentiation from competitors, and execution risk. Be skeptical but fair — you want to be convinced, not to be difficult for its own sake.
${SHARED_STYLE_RULES}`,
    openingInstruction: (ctx) => `As the investor panel, briefly welcome the founder and ask them to walk you through their pitch for: "${ctx.idea || 'their idea'}".`,
  },

  'group-discussion': {
    id: 'group-discussion',
    label: 'Group Discussion',
    aiRoleLabel: 'Discussion Group',
    description: 'Jump into a simulated group discussion with multiple AI participants holding different views.',
    contextFields: [
      { key: 'topic', label: 'Discussion Topic', placeholder: 'e.g. Should remote work be the default?', required: true },
    ],
    systemPrompt: (ctx, difficulty) => `You are simulating a small group discussion of 2 other participants — "Priya" and "Sam" — discussing the topic: "${ctx.topic || 'the given topic'}". Priya and Sam hold genuinely different viewpoints from each other.

${DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.Intermediate}

Every turn, write 1-2 short lines total across Priya and/or Sam, each prefixed with their name and a colon, e.g.:
Priya: I think the data actually shows the opposite.
Sam: Fair, but that's not true for smaller teams.
Occasionally direct a question or comment straight at the human participant by name if their display name is known from context, otherwise just say "you" or "what do you think". Let the discussion feel real — people interrupt each other's points, agree partially, and build on what was just said.
${SHARED_STYLE_RULES.replace('Keep responses short: 2 to 4 sentences per turn', 'Keep each speaker\'s line to 1-2 sentences')}`,
    openingInstruction: (ctx) => `Open the group discussion on "${ctx.topic || 'the topic'}": have Priya and Sam each give a brief, contrasting opening take, then invite the human participant to jump in.`,
  },

  viva: {
    id: 'viva',
    label: 'Mock Viva',
    aiRoleLabel: 'Examiner',
    description: 'Face a strict but fair oral examiner testing your understanding of a subject.',
    contextFields: [
      { key: 'subject', label: 'Subject / Topic Area', placeholder: 'e.g. Data Structures & Algorithms', required: true },
    ],
    systemPrompt: (ctx, difficulty) => `You are a viva (oral exam) examiner testing a student's understanding of "${ctx.subject || 'the subject'}".

${DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.Intermediate}

Ask one focused question per turn. If the answer is strong, go deeper or move to a related concept. If the answer is weak or vague, probe further before moving on — a real examiner doesn't let a shaky answer slide unchallenged. Keep an academic but human tone.
${SHARED_STYLE_RULES}`,
    openingInstruction: (ctx) => `As the examiner, greet the student briefly and ask your first viva question on "${ctx.subject || 'the subject'}".`,
  },

  communication: {
    id: 'communication',
    label: 'Professional Communication',
    aiRoleLabel: 'Counterpart',
    description: 'Practice a specific workplace conversation — feedback, a tough ask, conflict — with a realistic counterpart.',
    contextFields: [
      { key: 'scenario', label: 'Scenario', placeholder: 'e.g. Telling a teammate their work missed the deadline', required: true },
    ],
    systemPrompt: (ctx, difficulty) => `You are roleplaying the other person in this workplace scenario: "${ctx.scenario || 'a professional conversation'}". Decide who you are (colleague, manager, client, direct report — whatever fits the scenario) and react the way a real person in that position would.

${DIFFICULTY_MODIFIERS[difficulty] || DIFFICULTY_MODIFIERS.Intermediate}

React with realistic emotion where appropriate (mild defensiveness, relief, frustration, gratitude) rather than being a passive prompt-taker. Stay professional and workplace-appropriate throughout.
${SHARED_STYLE_RULES}`,
    openingInstruction: (ctx) => `Set the scene in one short line, then open with your counterpart's first line for the scenario: "${ctx.scenario || 'this conversation'}".`,
  },
};

export const CATEGORY_LIST: CategoryConfig[] = Object.values(CATEGORY_CONFIGS);

export function isPrepareCategory(value: string): value is PrepareCategory {
  return value in CATEGORY_CONFIGS;
}

export const PREPARE_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type PrepareDifficulty = (typeof PREPARE_DIFFICULTIES)[number];
