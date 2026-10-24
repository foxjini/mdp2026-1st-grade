import { NextResponse } from 'next/server';
import { RoomError } from '@/core/server/roomStore';

export function roomErrorResponse(err: unknown) {
  if (err instanceof RoomError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : '서버 오류';
  return NextResponse.json({ error: message }, { status: 500 });
}
