import { NextRequest, NextResponse } from 'next/server';
import {
  assertUploadKey,
  deleteRoom,
  deleteRoomFile,
  duplicateRoom,
  getRoom,
  updateMeta,
  writeRoomFiles,
} from '@/core/server/roomStore';
import { roomErrorResponse } from '../_respond';

export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

// GET /api/rooms/:id → 공간 꾸러미 전체 (메타 + Scene.tsx/mock.js/code.py + 경고)
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    return NextResponse.json(await getRoom(params.id));
  } catch (err) {
    return roomErrorResponse(err);
  }
}

// PUT /api/rooms/:id { files: { "Scene.tsx": "...", "mock.js": "...", ... } } → 파일 업로드/교체
export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    assertUploadKey(request.headers);
    const body = await request.json().catch(() => ({}));
    const files = body && typeof body.files === 'object' && body.files ? body.files : {};
    return NextResponse.json(await writeRoomFiles(params.id, files));
  } catch (err) {
    return roomErrorResponse(err);
  }
}

// PATCH /api/rooms/:id { name?, hasNotification?, ... } 또는 { action: "duplicate" } / { removeFile: "mock.js" }
export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    assertUploadKey(request.headers);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.action === 'duplicate') return NextResponse.json(await duplicateRoom(params.id), { status: 201 });
    if (typeof body.removeFile === 'string') return NextResponse.json(await deleteRoomFile(params.id, body.removeFile));
    return NextResponse.json(await updateMeta(params.id, body));
  } catch (err) {
    return roomErrorResponse(err);
  }
}

// DELETE /api/rooms/:id → 공간 폴더 삭제
export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    assertUploadKey(request.headers);
    await deleteRoom(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return roomErrorResponse(err);
  }
}
