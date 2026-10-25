'use client';

// 가상 도슨트 (안내 로봇): 외부 모델 없이 기본 도형으로 만든 캐릭터
// - 대기: 떠 있기 · 숨쉬기 · 4~6초마다 눈 깜빡임 · 카메라 쪽으로 고개를 부드럽게 돌림
// - 음성 안내 중: 단어 경계(onboundary) 펄스 + 말하는 리듬으로 입모양을 보간, 자막 말풍선
// 학생 Scene.tsx 에서도 `import { DocentBot } from '@/components/3d/DocentBot'` 로 사용 가능
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { useVoiceStore } from '@/core/voice/voice';
import { MAT, PALETTE, usePrefersReducedMotion } from '@/core/sdk/design';

interface DocentBotProps {
  position?: [number, number, number];
  rotationY?: number;
  scale?: number;
  /** 얼굴 화면 · 표시등 색 */
  accent?: string;
  name?: string;
  isModalOpen?: boolean;
}

export function DocentBot({
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  accent = PALETTE.info,
  name = '도슨트',
  isModalOpen = false,
}: DocentBotProps) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const antenna = useRef<THREE.MeshStandardMaterial>(null);
  const nextBlink = useRef(2 + Math.random() * 3);
  const reduce = usePrefersReducedMotion();
  // 자막은 문장이 바뀔 때만 다시 그림 (입모양은 useFrame 에서 스토어를 직접 읽음)
  const speaking = useVoiceStore((s) => s.speaking);
  const speakingText = useVoiceStore((s) => s.speakingText);

  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const toCam = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, camera }, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const v = useVoiceStore.getState();

    // 1. 떠 있기 · 숨쉬기 (동작 줄이기 설정이면 멈춤)
    if (body.current && !reduce) {
      body.current.position.y = 0.62 + Math.sin(t * 1.3) * 0.025;
      const breathe = 1 + Math.sin(t * 1.6) * 0.012;
      body.current.scale.set(1, breathe, 1);
    }

    // 2. 카메라 쪽으로 고개 돌리기 (좌우 ±0.8 rad 안에서 부드럽게)
    if (head.current && root.current) {
      head.current.getWorldPosition(worldPos);
      toCam.copy(camera.position).sub(worldPos);
      // 카메라 방향(월드 yaw) - 몸 방향 → -π~π 로 맞춘 뒤 ±0.8 rad 로 제한
      const worldYaw = Math.atan2(toCam.x, toCam.z);
      const wrapped = THREE.MathUtils.euclideanModulo(worldYaw - root.current.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      const local = THREE.MathUtils.clamp(wrapped, -0.8, 0.8);
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, local, 3, dt);
      head.current.rotation.z = THREE.MathUtils.damp(head.current.rotation.z, v.speaking ? Math.sin(t * 2.2) * 0.05 : 0, 3, dt);
    }

    // 3. 눈 깜빡임 (0.14초)
    if (t > nextBlink.current) nextBlink.current = t + 3.5 + Math.random() * 2.5;
    const blinking = nextBlink.current - t > 3.36 && !reduce;
    const eyeY = blinking ? 0.12 : 1;
    if (eyeL.current && eyeR.current) {
      eyeL.current.scale.y = THREE.MathUtils.damp(eyeL.current.scale.y, eyeY, 30, dt);
      eyeR.current.scale.y = eyeL.current.scale.y;
    }

    // 4. 입모양: 단어 경계 펄스 + 말하는 리듬(두 사인파) 을 부드럽게 보간
    if (mouth.current) {
      let open = 0.15;
      if (v.speaking) {
        const pulse = Math.exp(-(performance.now() - v.boundaryAt) / 140);
        const rhythm = 0.5 + 0.25 * Math.sin(t * 17) + 0.25 * Math.sin(t * 10.7 + 1.3);
        open = 0.35 + 0.65 * Math.max(pulse, rhythm * 0.85);
      }
      mouth.current.scale.y = THREE.MathUtils.damp(mouth.current.scale.y, open, 18, dt);
    }

    // 5. 안테나 표시등: 말할 때 밝게
    if (antenna.current) {
      antenna.current.emissiveIntensity = THREE.MathUtils.damp(antenna.current.emissiveIntensity, v.speaking ? 2.6 : 1.1, 6, dt);
    }
  });

  return (
    <group ref={root} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* 바닥 받침 + 그림자 받는 원판 */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.04, 32]} />
        <meshStandardMaterial {...MAT.brushedMetal} />
      </mesh>

      <group ref={body} position={[0, 0.62, 0]}>
        {/* 몸통: 세라믹 화이트 캡슐 + 목 링 */}
        <mesh castShadow position={[0, -0.22, 0]} scale={[1, 1.15, 0.9]}>
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial {...MAT.ceramic} />
        </mesh>
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.09, 0.018, 12, 32]} />
          <meshStandardMaterial {...MAT.brushedMetal} />
        </mesh>
        {/* 가슴 표시등 */}
        <mesh position={[0, -0.16, 0.18]}>
          <circleGeometry args={[0.03, 24]} />
          <meshStandardMaterial {...MAT.glow(accent)} />
        </mesh>

        {/* 머리 */}
        <group ref={head} position={[0, 0.17, 0]}>
          <RoundedBox args={[0.42, 0.32, 0.32]} radius={0.12} smoothness={4} castShadow>
            <meshStandardMaterial {...MAT.ceramic} />
          </RoundedBox>
          {/* 얼굴 화면 */}
          <RoundedBox args={[0.32, 0.2, 0.02]} radius={0.06} smoothness={4} position={[0, -0.005, 0.158]}>
            <meshStandardMaterial color="#12171C" roughness={0.25} metalness={0.2} />
          </RoundedBox>
          {/* 눈 */}
          <mesh ref={eyeL} position={[-0.07, 0.025, 0.172]}>
            <capsuleGeometry args={[0.018, 0.03, 6, 12]} />
            <meshStandardMaterial {...MAT.glow(accent)} />
          </mesh>
          <mesh ref={eyeR} position={[0.07, 0.025, 0.172]}>
            <capsuleGeometry args={[0.018, 0.03, 6, 12]} />
            <meshStandardMaterial {...MAT.glow(accent)} />
          </mesh>
          {/* 입 (말할 때 세로로 열림) */}
          <mesh ref={mouth} position={[0, -0.055, 0.172]} scale={[1, 0.15, 1]}>
            <boxGeometry args={[0.07, 0.04, 0.004]} />
            <meshStandardMaterial {...MAT.glow(accent)} />
          </mesh>
          {/* 안테나 */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.08, 8]} />
            <meshStandardMaterial {...MAT.brushedMetal} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.022, 16, 16]} />
            <meshStandardMaterial ref={antenna} color={accent} emissive={accent} emissiveIntensity={1.1} roughness={0.3} />
          </mesh>
        </group>
      </group>

      {/* 자막 말풍선 (말하는 동안, 머리 위) */}
      {!isModalOpen && speaking && speakingText && (
        <Html position={[0, 1.32, 0]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <div
            data-testid="docent-caption"
            style={{
              pointerEvents: 'none',
              maxWidth: 220,
              width: 'max-content',
              whiteSpace: 'normal',
              background: 'rgba(31,41,51,0.92)',
              color: '#F8F6F2',
              borderRadius: 12,
              padding: '6px 10px',
              fontSize: 11,
              lineHeight: 1.45,
              fontWeight: 600,
              boxShadow: '0 8px 20px rgba(31,41,51,0.18)',
            }}
          >
            {speakingText}
          </div>
        </Html>
      )}
      {/* 이름표 (발밑: 머리 위 말풍선 · 다른 배지와 겹치지 않게) */}
      {!isModalOpen && (
        <Html position={[0, 0.02, 0.34]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <span
            style={{
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: PALETTE.inkSoft,
              background: 'rgba(250,248,245,0.9)',
              border: '1px solid rgba(31,41,51,0.08)',
              borderRadius: 999,
              padding: '2px 8px',
            }}
          >
            {name}
          </span>
        </Html>
      )}
    </group>
  );
}
