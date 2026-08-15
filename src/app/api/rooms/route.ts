import { NextRequest } from 'next/server';
import { RoomError, createRoom } from '@/lib/rooms/store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hostUserId, hostName, topic, debateStyle, difficulty, maxParticipants } = body;

    if (!hostUserId) {
      return Response.json({ error: 'Missing host identity.' }, { status: 400 });
    }

    const state = await createRoom({
      hostUserId,
      hostName: hostName || 'Host',
      topic,
      debateStyle: debateStyle || 'Formal',
      difficulty: difficulty || 'Intermediate',
      maxParticipants: Number(maxParticipants) || 4,
    });

    return Response.json(state);
  } catch (error: any) {
    if (error instanceof RoomError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Create room error:', error);
    return Response.json({ error: error?.message || 'Failed to create room.' }, { status: 500 });
  }
}
