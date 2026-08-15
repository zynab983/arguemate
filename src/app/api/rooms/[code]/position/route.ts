import { NextRequest } from 'next/server';
import { RoomError, setPosition } from '@/lib/rooms/store';

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const { userId, position } = await request.json();
    if (!userId || !['Pro', 'Against'].includes(position)) {
      return Response.json({ error: 'Missing or invalid position.' }, { status: 400 });
    }

    const state = await setPosition(code, { userId, position });
    return Response.json(state);
  } catch (error: any) {
    if (error instanceof RoomError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Set position error:', error);
    return Response.json({ error: error?.message || 'Failed to set position.' }, { status: 500 });
  }
}
