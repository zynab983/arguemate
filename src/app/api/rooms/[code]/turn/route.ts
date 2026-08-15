import { NextRequest } from 'next/server';
import { RoomError, submitTurn } from '@/lib/rooms/store';

// Submits one participant's turn. The AI Moderator's turn-advancement and,
// on the final turn, the AI Judge evaluation both happen inside submitTurn()
// so the client just gets back the fully updated room state.
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const { userId, content } = await request.json();
    if (!userId) return Response.json({ error: 'Missing participant identity.' }, { status: 400 });

    const state = await submitTurn(code, { userId, content });
    return Response.json(state);
  } catch (error: any) {
    if (error instanceof RoomError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Submit turn error:', error);
    return Response.json({ error: error?.message || 'Failed to submit your turn.' }, { status: 500 });
  }
}
