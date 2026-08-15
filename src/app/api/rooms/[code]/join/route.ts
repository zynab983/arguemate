import { NextRequest } from 'next/server';
import { RoomError, joinRoom } from '@/lib/rooms/store';

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const { userId, displayName } = await request.json();
    if (!userId) return Response.json({ error: 'Missing participant identity.' }, { status: 400 });

    const state = await joinRoom(code, { userId, displayName });
    return Response.json(state);
  } catch (error: any) {
    if (error instanceof RoomError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Join room error:', error);
    return Response.json({ error: error?.message || 'Failed to join room.' }, { status: 500 });
  }
}
