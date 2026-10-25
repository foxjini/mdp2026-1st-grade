'use client';

// 플랫폼 렌더링 파이프라인 (모든 공간에 자동 적용, 학생 Scene.tsx 는 만들지 않음)
// - 절차적 스튜디오 환경광 (Lightformer: 외부 HDRI 파일 · 네트워크 없음) → PBR 재질 반사가 살아남
// - 고급 품질에서만 후처리: SSAO(N8AO) · 블룸(강한 발광만) · SMAA · 비네트 · ACES 톤매핑
// - FPS 가 떨어지면 자동으로 절전 품질 (PerformanceMonitor)
import React from 'react';
import { AdaptiveDpr, Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useGraphicsStore } from '@/core/graphics/useGraphicsStore';
import { useIoTStore } from '@/core/store/useIoTStore';

// ?graphics=high 이면 자동 절전을 하지 않음 (교사 시연 · 화면 캡처용)
function qualityLocked(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('graphics') === 'high';
}

export function RenderPipeline() {
  const quality = useGraphicsStore((s) => s.quality);
  const lowerAutomatically = useGraphicsStore((s) => s.lowerAutomatically);

  const onDecline = () => {
    if (quality !== 'high' || qualityLocked()) return;
    lowerAutomatically();
    useIoTStore
      .getState()
      .addLog('warn', '화면이 느려져 그래픽 품질을 절전으로 낮췄습니다. (왼쪽 아래 버튼으로 다시 고급 그래픽)', 'SYSTEM');
  };

  return (
    <>
      {/* 스튜디오 반사광: 위 · 양옆 소프트박스 + 아래 반사판 (한 번만 굽기) */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={0.75} color="#FFF7ED" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={0.45} color="#FFFFFF" position={[-6, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={0.3} color="#E0F2FE" position={[6, 2.5, -2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="ring" intensity={0.25} color="#FDE68A" position={[3, 4, 6]} scale={3} />
      </Environment>

      <PerformanceMonitor onDecline={onDecline} flipflops={1} />
      <AdaptiveDpr pixelated={false} />

      {quality === 'high' && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO halfRes aoRadius={0.6} distanceFalloff={0.6} intensity={1.6} quality="performance" color="#1E293B" />
          <Bloom luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.55} mipmapBlur />
          <SMAA />
          <Vignette offset={0.32} darkness={0.32} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  );
}
