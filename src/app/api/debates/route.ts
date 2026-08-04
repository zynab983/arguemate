import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic, messages, winner, score, duration, difficulty,
      debateStyle, aiPersonality, userId, evaluation,
    } = body;

    const supabase = getSupabaseClient();

    if (!supabase) {
      // Mock mode: return success with generated ID
      return Response.json({
        success: true,
        debateId: `mock-${Date.now()}`,
        mock: true,
      });
    }

    // Store debate in Supabase
    const { data: debate, error: debateError } = await supabase
      .from('debates')
      .insert({
        user_id: userId,
        topic,
        winner,
        score,
        duration,
        difficulty,
        debate_style: debateStyle,
        ai_personality: aiPersonality,
        message_count: messages.length,
        // Evaluation breakdown
        grade: evaluation?.grade || null,
        score_logic: evaluation?.scores?.logic || null,
        score_facts: evaluation?.scores?.facts || null,
        score_persuasiveness: evaluation?.scores?.persuasiveness || null,
        score_confidence: evaluation?.scores?.confidence || null,
        score_communication: evaluation?.scores?.communication || null,
        score_relevance: evaluation?.scores?.relevance || null,
        strengths: evaluation?.strengths || null,
        weaknesses: evaluation?.weaknesses || null,
        suggestions: evaluation?.suggestions || null,
        best_argument: evaluation?.bestArgument || null,
        fallacies: evaluation?.fallacies || null,
        summary: evaluation?.summary || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (debateError) throw debateError;

    // Store messages
    if (debate?.id && messages?.length > 0) {
      const messageRows = messages.map((msg: any, idx: number) => ({
        debate_id: debate.id,
        role: msg.role,
        content: msg.content,
        turn_index: idx,
        created_at: new Date().toISOString(),
      }));

      const { error: msgError } = await supabase
        .from('debate_messages')
        .insert(messageRows);

      if (msgError) {
        console.error('Failed to store messages:', msgError);
      }
    }

    return Response.json({ success: true, debateId: debate?.id });
  } catch (error: any) {
    console.error('Save debate error:', error);
    return Response.json(
      { error: error?.message || 'Failed to save debate.' },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('userId');
    const debateId = searchParams.get('debateId');

    const supabase = getSupabaseClient();

    // Single debate fetch (for replay)
    if (debateId) {
      if (!supabase) {
        return Response.json({ debate: null, messages: [] });
      }
      const { data: debate, error: dErr } = await supabase
        .from('debates')
        .select('*')
        .eq('id', debateId)
        .single();

      const { data: msgs, error: mErr } = await supabase
        .from('debate_messages')
        .select('*')
        .eq('debate_id', debateId)
        .order('turn_index', { ascending: true });

      if (dErr) throw dErr;
      return Response.json({ debate, messages: msgs || [] });
    }

    if (!supabase || !userId) {
      // No database configured or no user — return an empty list (no fake data)
      return Response.json({ debates: [] });
    }

    const { data: debates, error } = await supabase
      .from('debates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return Response.json({ debates: debates || [] });
  } catch (error: any) {
    console.error('Get debates error:', error);
    return Response.json({ debates: [], error: error?.message });
  }
}
