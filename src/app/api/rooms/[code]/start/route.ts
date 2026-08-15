import { NextRequest } from 'next/server';
import { RoomError, startRoom } from '@/lib/rooms/store';

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const { userId } = await request.json();
    if (!userId) return Response.json({ error: 'Missing host identity.' }, { status: 400 });

    const state = await startRoom(code, { userId });
    return Response.json(state);
  } catch (error: any) {
    if (error instanceof RoomError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Start room error:', error);
    return Response.json({ error: error?.message || 'Failed to start the debate.' }, { status: 500 });
  }
}
