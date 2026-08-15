import { NextRequest } from 'next/server';
import { RoomError, retryEvaluation } from '@/lib/rooms/store';

// Manual retry path for when the AI Judge call fails (e.g. Gemini quota) —
// the host can re-trigger evaluation from the results screen instead of
// losing the completed debate transcript.
export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const { userId } = await request.json();
    if (!userId) return Response.json({ error: 'Missing host identity.' }, { status: 400 });

    const state = await retryEvaluation(code, { userId });
    return Response.json(state);
  } catch (error: any) {
    if (error instanceof RoomError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error('Retry evaluation error:', error);
    return Response.json({ error: error?.message || 'Failed to re-evaluate the debate.' }, { status: 500 });
  }
}
