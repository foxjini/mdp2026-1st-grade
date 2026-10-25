'use client';

// 좌 · 우 패널 서랍: 폭을 0 ↔ width 로 부드럽게 바꿔 3D 화면을 넓힘
// - 안쪽 내용은 고정 폭이라 접히는 동안 찌그러지지 않음
// - 손잡이는 바깥에 붙어 있어 접힌 상태에서도 3D 화면 가장자리에 보임
import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PanelDrawerProps {
  side: 'left' | 'right';
  open: boolean;
  width: number;
  onToggle: () => void;
  /** 손잡이 안내 문구 (예: '공간 목록') */
  label: string;
  /** 단축키 안내 (예: '[') */
  shortcut?: string;
  /** 접혀 있을 때 손잡이에 알림 점 표시 */
  attention?: boolean;
  children: React.ReactNode;
}

export function PanelDrawer({ side, open, width, onToggle, label, shortcut, attention = false, children }: PanelDrawerProps) {
  const inner = useRef<HTMLDivElement>(null);

  // 접힌 패널 안으로 Tab 포커스가 들어가지 않게 (inert 는 React 18 타입에 없어 직접 설정)
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    if (open) el.removeAttribute('inert');
    else el.setAttribute('inert', '');
  }, [open]);

  const isLeft = side === 'left';
  // 펼쳐져 있으면 패널 쪽으로 접는 화살표, 접혀 있으면 펼치는 화살표
  const Icon = isLeft === open ? ChevronLeft : ChevronRight;
  const title = `${label} ${open ? '접기' : '펼치기'}${shortcut ? ` (${shortcut})` : ''}`;

  return (
    <div
      data-testid={`drawer-${side}`}
      className="relative h-full shrink-0 transition-[width] duration-300 ease-out motion-reduce:transition-none"
      style={{ width: open ? width : 0 }}
    >
      <div className="h-full overflow-hidden">
        <div ref={inner} aria-hidden={!open} className="h-full flex" style={{ width }}>
          {children}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={title}
        title={title}
        data-testid={`drawer-${side}-handle`}
        className={`absolute top-1/2 -translate-y-1/2 z-30 w-5 h-14 flex items-center justify-center bg-white/95 hover:bg-white text-slate-500 hover:text-slate-900 border border-slate-200/80 shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 ${
          isLeft ? 'left-full rounded-r-lg border-l-0' : 'right-full rounded-l-lg border-r-0'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        {attention && !open && (
          <span className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" aria-hidden />
        )}
      </button>
    </div>
  );
}
