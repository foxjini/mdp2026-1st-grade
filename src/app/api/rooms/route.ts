import { NextRequest, NextResponse } from 'next/server';
import { assertUploadKey, createRoom, listRooms } from '@/core/server/roomStore';
import { roomErrorResponse } from './_respond';

export const dynamic = 'force-dynamic';

// GET /api/rooms → 업로드된 공간 목록 (room.json 메타만)
export async function GET() {
  try {
    return NextResponse.json({ rooms: await listRooms() });
  } catch (err) {
    return roomErrorResponse(err);
  }
}

// POST /api/rooms { name, team, iconType, sensorsDesc } → 새 공간 생성
export async function POST(request: NextRequest) {
  try {
    assertUploadKey(request.headers);
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await createRoom(body), { status: 201 });
  } catch (err) {
    return roomErrorResponse(err);
  }
}
