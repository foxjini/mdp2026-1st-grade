import { NextRequest, NextResponse } from 'next/server';
import { assertUploadKey, updateBuiltinConnection } from '@/core/server/roomStore';
import { roomErrorResponse } from '../../_respond';

export const dynamic = 'force-dynamic';

// PATCH /api/rooms/builtin/:id { picoIp, mode } → 기본 예제 공간의 Pico 연결 설정 저장
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    assertUploadKey(request.headers);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json({ connection: await updateBuiltinConnection(params.id, body) });
  } catch (err) {
    return roomErrorResponse(err);
  }
}
