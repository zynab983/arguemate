import { NextRequest } from 'next/server';
import { RoomError, getRoomFull } from '@/lib/rooms/store';

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const state = await getRoomFull(code);
    if (!state) {
      return Response.json({ error: 'Room not found. Double-check the code.' }, { status: 404 });
    }
    return Response.json(state);
  } catch (error: any) {
    if (error instanceof RoomError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Get room error:', error);
    return Response.json({ error: error?.message || 'Failed to load room.' }, { status: 500 });
  }
}
