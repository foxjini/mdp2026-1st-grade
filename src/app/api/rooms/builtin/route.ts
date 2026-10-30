import { NextRequest, NextResponse } from 'next/server';
import { assertUploadKey, readBuiltinConnections, readHiddenSamples, restoreSampleRooms } from '@/core/server/roomStore';
import { roomErrorResponse } from '../_respond';

export const dynamic = 'force-dynamic';

// GET /api/rooms/builtin → 기본 예제 공간별 Pico 연결 설정 { builtin_home: { picoIp, mode }, ... } + 전시용으로 삭제한 샘플 공간 id
export async function GET() {
  try {
    const [connections, hidden] = await Promise.all([readBuiltinConnections(), readHiddenSamples()]);
    return NextResponse.json({ connections, hidden });
  } catch (err) {
    return roomErrorResponse(err);
  }
}

// POST /api/rooms/builtin { action: 'restore' } → 삭제한 샘플 공간(기본 공간 · 기본 예제)을 모두 되살림
export async function POST(request: NextRequest) {
  try {
    assertUploadKey(request.headers);
    await restoreSampleRooms();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return roomErrorResponse(err);
  }
}
