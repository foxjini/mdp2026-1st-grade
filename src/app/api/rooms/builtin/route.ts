import { NextResponse } from 'next/server';
import { readBuiltinConnections } from '@/core/server/roomStore';
import { roomErrorResponse } from '../_respond';

export const dynamic = 'force-dynamic';

// GET /api/rooms/builtin → 기본 예제 공간별 Pico 연결 설정 { builtin_home: { picoIp, mode }, ... }
export async function GET() {
  try {
    return NextResponse.json({ connections: await readBuiltinConnections() });
  } catch (err) {
    return roomErrorResponse(err);
  }
}
