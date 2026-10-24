'use client';

import React, { Suspense, useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { RoomPackage } from '@/core/types/iot';
import { compileScene, SceneProps } from '@/core/runtime/compileRoom';
import { useSceneStatus } from '@/core/runtime/useSceneStatus';

interface DynamicRoomProps {
  pkg: RoomPackage;
  isModalOpen?: boolean;
}

// 학생 Scene.tsx 렌더링 중 오류가 나도 앱 전체가 멈추지 않도록 막는 경계
class SceneErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (msg: string) => void; fallback: (msg: string) => React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }

  componentDidCatch(err: unknown) {
    this.props.onError(`렌더링 오류 (Scene.tsx): ${err instanceof Error ? err.message : String(err)}`);
  }

  render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

// 코드가 없거나 오류일 때 보여주는 기본 공간 (바닥 + 안내 배지)
function PlaceholderRoom({ title, message, isError, isModalOpen }: { title: string; message: string; isError?: boolean; isModalOpen?: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 7]} />
        <meshStandardMaterial color={isError ? '#FEE2E2' : '#E2E8F0'} roughness={0.9} />
      </mesh>
      <gridHelper args={[7, 14, '#94A3B8', '#CBD5E1']} position={[0, 0.01, 0]} />
      {!isModalOpen && (
        <Html position={[0, 1.2, 0]} center zIndexRange={[10, 0]}>
          <div
            className={`w-[300px] rounded-2xl border px-4 py-3 shadow-lg text-left select-text ${
              isError ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-white/95 border-slate-200 text-slate-700'
            }`}
          >
            <div className="text-xs font-extrabold mb-1">{title}</div>
            <div className="text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono">{message}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function DynamicRoom({ pkg, isModalOpen = false }: DynamicRoomProps) {
  const source = pkg.files['Scene.tsx'];
  const roomId = pkg.meta.id;
  const setStatus = useSceneStatus((s) => s.setStatus);
  const result = useMemo(() => (source ? compileScene(source) : null), [source]);

  useEffect(() => {
    if (!result) setStatus({ roomId, state: 'empty' });
    else if (result.ok) setStatus({ roomId, state: 'ok' });
    else setStatus({ roomId, state: 'error', message: result.error });
  }, [result, roomId, setStatus]);

  if (!result) {
    return (
      <PlaceholderRoom
        title={`"${pkg.meta.name}" 공간 준비 중`}
        message={'아직 Scene.tsx가 업로드되지 않았습니다.\n공간 메뉴(⋮) → "코드 업로드"에서 바이브 코딩으로 만든 파일을 올려 주세요.'}
        isModalOpen={isModalOpen}
      />
    );
  }

  if (!result.ok) {
    return <PlaceholderRoom title="Scene.tsx 적용 실패" message={result.error} isError isModalOpen={isModalOpen} />;
  }

  const Scene: React.ComponentType<SceneProps> = result.Component;
  return (
    <SceneErrorBoundary
      key={source}
      onError={(message) => setStatus({ roomId, state: 'error', message })}
      fallback={(msg) => <PlaceholderRoom title="Scene.tsx 실행 오류" message={msg} isError isModalOpen={isModalOpen} />}
    >
      <Suspense fallback={null}>
        <Scene isModalOpen={isModalOpen} />
      </Suspense>
    </SceneErrorBoundary>
  );
}
