import { NextRequest, NextResponse } from 'next/server';
import { readRoomFile } from '@/core/server/roomStore';
import { roomErrorResponse } from '../../../_respond';

export const dynamic = 'force-dynamic';

// GET /api/rooms/:id/files/:name → 파일 하나 다운로드 (팀 백업 / 펌웨어 배포용)
export async function GET(_req: NextRequest, { params }: { params: { id: string; name: string } }) {
  try {
    const content = await readRoomFile(params.id, params.name);
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${params.name}"`,
      },
    });
  } catch (err) {
    return roomErrorResponse(err);
  }
}
