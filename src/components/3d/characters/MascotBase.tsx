'use client';

// 마스코트 캐릭터 공통 엔진: 경로를 따라 천천히 걷기 · 쉬기 · 손 흔들기 · 음성 안내 입모양 · 자막 · 클릭
// 생김새(몸)는 캐릭터 파일이 그리고, 팔 · 다리 · 머리 · 눈 · 입 ref(rig)를 받아 이 엔진이 움직입니다.
// - 움직임은 모두 THREE.MathUtils.damp 로 감속 (bounce 없음), useFrame 안에서 객체를 만들지 않음
// - 시스템 '동작 줄이기' 설정이면 제자리에 서서 숨쉬기만 멈춤
import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, Outlines } from '@react-three/drei';
import { useVoiceStore, announce } from '@/core/voice/voice';
import { useGraphicsStore } from '@/core/graphics/useGraphicsStore';
import { PALETTE, usePrefersReducedMotion } from '@/core/sdk/design';

export interface MascotRig {
  head: React.RefObject<THREE.Group>;
  armL: React.RefObject<THREE.Group>;
  armR: React.RefObject<THREE.Group>;
  legL: React.RefObject<THREE.Group>;
  legR: React.RefObject<THREE.Group>;
  eyes: React.RefObject<THREE.Group>;
  mouth: React.RefObject<THREE.Mesh>;
  tail: React.RefObject<THREE.Group>;
}

export interface MascotProps {
  /** 걸어 다닐 바닥 좌표 [x, z] 목록 (가구를 피한 통로). 1개 이하면 제자리에 서 있음 */
  waypoints?: [number, number][];
  /** 시작 위치 (waypoints 가 없을 때) */
  position?: [number, number, number];
  /** 걷는 속도 (m/s, 기본 0.35) */
  speed?: number;
  /** 도착 후 쉬는 시간 범위 (초) */
  pause?: [number, number];
  /** 크기 (기본 1.25 ≈ 키 1.5 m, 치비 비례) */
  scale?: number;
  /** 이름표 */
  name?: string;
  /** 클릭하면 읽어 줄 말 (문장, 또는 그때의 센서 값으로 문장을 만드는 함수). 없으면 이름으로 인사 */
  say?: string | (() => string);
  /** 클릭하면 실행 — 캐릭터는 멈춰서 손을 흔듦. 주면 say · 기본 인사 대신 이 함수가 음성 안내를 맡음 */
  onClick?: () => void;
  isModalOpen?: boolean;
}

interface MascotBaseProps extends MascotProps {
  /** 자막 말풍선 높이 (캐릭터 발에서, m) */
  captionHeight: number;
  /** 걸음 폭 (다리가 짧으면 작게) */
  stride?: number;
  children: (rig: MascotRig) => React.ReactNode;
}

// 각도 감쇠: -π~π 로 감싸서 가장 짧은 쪽으로 돌기
function dampAngle(current: number, target: number, lambda: number, dt: number) {
  const diff = THREE.MathUtils.euclideanModulo(target - current + Math.PI, Math.PI * 2) - Math.PI;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export function MascotBase({
  waypoints,
  position,
  speed = 0.35,
  pause = [2, 5],
  scale = 1.25,
  name,
  say,
  onClick,
  isModalOpen = false,
  captionHeight,
  stride = 0.55,
  children,
}: MascotBaseProps) {
  const root = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  const rig: MascotRig = {
    head: useRef<THREE.Group>(null),
    armL: useRef<THREE.Group>(null),
    armR: useRef<THREE.Group>(null),
    legL: useRef<THREE.Group>(null),
    legR: useRef<THREE.Group>(null),
    eyes: useRef<THREE.Group>(null),
    mouth: useRef<THREE.Mesh>(null),
    tail: useRef<THREE.Group>(null),
  };
  const reduce = usePrefersReducedMotion();
  const speaking = useVoiceStore((s) => s.speaking);
  const speakingText = useVoiceStore((s) => s.speakingText);
  const [hovered, setHovered] = useState(false);

  const start = waypoints && waypoints.length ? waypoints[0] : null;
  const initial: [number, number, number] = start ? [start[0], 0, start[1]] : position ?? [0, 0, 0];
  const st = useRef({ i: 1, pause: 1 + Math.random() * 2, hold: 0, walk: 0, phase: 0, wave: 0, nextBlink: 2 + Math.random() * 3 });
  const tmp = useMemo(() => ({ world: new THREE.Vector3() }), []);

  useFrame(({ clock, camera }, delta) => {
    const g = root.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const s = st.current;
    const path = waypoints && waypoints.length > 1 && !reduce ? waypoints : null;

    // 1. 경로 걷기: 목표 지점까지 이동 → 도착하면 잠깐 쉼 → 다음 지점
    let moving = false;
    let targetYaw = g.rotation.y;
    if (s.hold > 0) s.hold -= dt;
    else if (path) {
      if (s.pause > 0) s.pause -= dt;
      else {
        const [tx, tz] = path[s.i % path.length];
        const dx = tx - g.position.x;
        const dz = tz - g.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.04) {
          s.pause = pause[0] + Math.random() * (pause[1] - pause[0]);
          s.i = (s.i + 1) % path.length;
          if (Math.random() < 0.35) s.wave = 1.6; // 가끔 도착해서 손 인사
        } else {
          moving = true;
          targetYaw = Math.atan2(dx, dz);
          const step = Math.min(dist, speed * (0.25 + 0.75 * s.walk) * dt);
          g.position.x += (dx / dist) * step;
          g.position.z += (dz / dist) * step;
        }
      }
    }
    s.walk = THREE.MathUtils.damp(s.walk, moving ? 1 : 0, 5, dt);

    // 2. 방향: 걸을 때는 가는 쪽, 멈추면 카메라 쪽으로 천천히
    g.getWorldPosition(tmp.world);
    const camYaw = Math.atan2(camera.position.x - tmp.world.x, camera.position.z - tmp.world.z);
    if (!moving && (s.hold > 0 || s.pause > 0.6)) targetYaw = camYaw;
    g.rotation.y = dampAngle(g.rotation.y, targetYaw, moving ? 4 : 2.2, dt);

    // 3. 걷기 동작 (다리 · 팔 번갈아, 몸 위아래 · 좌우 기울기) + 숨쉬기
    s.phase += dt * (speed / 0.35) * 7 * s.walk;
    const sw = Math.sin(s.phase);
    const w = s.walk;
    if (rig.legL.current) rig.legL.current.rotation.x = sw * stride * w;
    if (rig.legR.current) rig.legR.current.rotation.x = -sw * stride * w;
    if (rig.armL.current) {
      rig.armL.current.rotation.x = -sw * 0.5 * w;
      rig.armL.current.rotation.z = THREE.MathUtils.damp(rig.armL.current.rotation.z, 0.12, 6, dt);
    }
    if (s.wave > 0) s.wave -= dt;
    if (rig.armR.current) {
      const waving = s.wave > 0 && !reduce;
      rig.armR.current.rotation.x = THREE.MathUtils.damp(rig.armR.current.rotation.x, waving ? 0 : sw * 0.5 * w, 8, dt);
      rig.armR.current.rotation.z = THREE.MathUtils.damp(
        rig.armR.current.rotation.z,
        waving ? -2.5 + Math.sin(t * 9) * 0.28 : -0.12,
        waving ? 9 : 6,
        dt
      );
    }
    if (bob.current) {
      const breathe = reduce ? 0 : Math.sin(t * 1.8) * 0.012;
      bob.current.position.y = Math.abs(sw) * 0.035 * w;
      bob.current.rotation.z = sw * 0.05 * w;
      bob.current.rotation.x = THREE.MathUtils.damp(bob.current.rotation.x, 0.07 * w, 6, dt);
      bob.current.scale.set(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
    }

    // 4. 머리: 멈추면 카메라 쪽으로 고개 (±0.7 rad), 쉴 때 살짝 갸웃
    if (rig.head.current) {
      const local = THREE.MathUtils.clamp(
        THREE.MathUtils.euclideanModulo(camYaw - g.rotation.y + Math.PI, Math.PI * 2) - Math.PI,
        -0.7,
        0.7
      );
      rig.head.current.rotation.y = THREE.MathUtils.damp(rig.head.current.rotation.y, moving ? 0 : local, 3, dt);
      rig.head.current.rotation.z = THREE.MathUtils.damp(
        rig.head.current.rotation.z,
        moving || reduce ? sw * 0.04 * w : Math.sin(t * 0.8) * 0.07,
        3,
        dt
      );
    }

    // 5. 눈 깜빡임 (0.14초)
    // nextBlink 직전 0.14초 동안 눈을 감음
    // rig.eyes 그룹은 반드시 눈 높이에 두고 눈은 그 안 y=0 에 (그룹 원점 기준으로 세로가 줄어듦)
    if (t > s.nextBlink) s.nextBlink = t + 2.8 + Math.random() * 3;
    const closing = !reduce && s.nextBlink - t < 0.14;
    if (rig.eyes.current) {
      rig.eyes.current.scale.y = THREE.MathUtils.damp(rig.eyes.current.scale.y, closing ? 0.1 : 1, 30, dt);
    }

    // 6. 꼬리 살랑
    if (rig.tail.current && !reduce) {
      rig.tail.current.rotation.y = Math.sin(t * 2.1) * 0.35;
      rig.tail.current.rotation.z = Math.sin(t * 1.3) * 0.12;
    }

    // 7. 입모양: 음성 안내 단어 경계 펄스 + 말하는 리듬 (DocentBot 과 같은 방식)
    const v = useVoiceStore.getState();
    if (rig.mouth.current) {
      let open = 0.2;
      if (v.speaking) {
        const pulse = Math.exp(-(performance.now() - v.boundaryAt) / 140);
        const rhythm = 0.5 + 0.25 * Math.sin(t * 17) + 0.25 * Math.sin(t * 10.7 + 1.3);
        open = 0.4 + 0.6 * Math.max(pulse, rhythm * 0.85);
      }
      rig.mouth.current.scale.y = THREE.MathUtils.damp(rig.mouth.current.scale.y, open, 18, dt);
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    st.current.hold = 4.5; // 멈춰서 관람객을 보고
    st.current.wave = 2.2; // 손 인사
    if (onClick) return onClick();
    // 관람객이 직접 누른 것이라 음성 설정과 관계없이 읽음
    const text = typeof say === 'function' ? say() : say ?? (name ? `안녕하세요! ${name}입니다.` : '안녕하세요!');
    announce(null, text, true);
  };

  return (
    <group ref={root} position={initial} scale={scale}>
      {/* 바닥 그림자 (가벼운 원판) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[0.26, 28]} />
        <meshBasicMaterial color="#1F2933" transparent opacity={0.16} depthWrite={false} />
      </mesh>

      <group
        ref={bob}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        {children(rig)}
      </group>

      {/* 자막 말풍선 (음성 안내 중) */}
      {!isModalOpen && speaking && speakingText && (
        <Html position={[0, captionHeight, 0]} center distanceFactor={8} zIndexRange={[10, 0]} pointerEvents="none" style={{ pointerEvents: 'none' }}>
          <div
            data-testid="mascot-caption"
            style={{
              pointerEvents: 'none',
              maxWidth: 220,
              width: 'max-content',
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
      {/* 이름표: 마우스를 올렸을 때만 (돌아다니는 동안 화면을 어지럽히지 않게) */}
      {!isModalOpen && name && hovered && (
        <Html position={[0, captionHeight - 0.12, 0]} center distanceFactor={8} zIndexRange={[10, 0]} pointerEvents="none" style={{ pointerEvents: 'none' }}>
          <span
            style={{
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              fontSize: 10,
              fontWeight: 800,
              color: PALETTE.ink,
              background: 'rgba(250,248,245,0.95)',
              border: '1px solid rgba(31,41,51,0.1)',
              borderRadius: 999,
              padding: '3px 9px',
              boxShadow: '0 4px 12px rgba(31,41,51,0.12)',
            }}
          >
            {name} · 눌러서 안내 듣기
          </span>
        </Html>
      )}
    </group>
  );
}

// ------------------------------------------------------------------------------
// 생김새용 공용 부품
// ------------------------------------------------------------------------------

/** 고급 그래픽에서만 얇은 윤곽선 (게임 · 애니메이션 느낌) */
export function Ol({ thickness = 0.012 }: { thickness?: number }) {
  const high = useGraphicsStore((s) => s.quality === 'high');
  if (!high) return null;
  return <Outlines thickness={thickness} color="#2B2320" />;
}

/** 부드러운 캐릭터 재질 (살짝 광택) */
export function Soft({ color, rough = 0.55, sheen = false }: { color: string; rough?: number; sheen?: boolean }) {
  return sheen ? (
    <meshPhysicalMaterial color={color} roughness={rough} sheen={1} sheenColor="#FFFFFF" sheenRoughness={0.6} />
  ) : (
    <meshStandardMaterial color={color} roughness={rough} />
  );
}

/** 큰 눈: 흰자 없이 반짝이는 눈동자 + 하이라이트 2개 (치비 스타일) */
export function CuteEye({ x, y, z, size = 0.055, color = '#2A1E1A' }: { x: number; y: number; z: number; size?: number; color?: string }) {
  return (
    <group position={[x, y, z]}>
      <mesh scale={[1, 1.25, 0.55]}>
        <sphereGeometry args={[size, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.15} metalness={0.1} />
      </mesh>
      <mesh position={[size * 0.35, size * 0.45, size * 0.48]}>
        <sphereGeometry args={[size * 0.32, 10, 8]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-size * 0.3, -size * 0.4, size * 0.48]}>
        <sphereGeometry args={[size * 0.15, 8, 6]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

/** 볼 터치 */
export function Blush({ x, y, z, r = 0.035 }: { x: number; y: number; z: number; r?: number }) {
  return (
    <mesh position={[x, y, z]} scale={[1, 0.6, 0.3]}>
      <sphereGeometry args={[r, 12, 8]} />
      <meshBasicMaterial color="#F28C9A" transparent opacity={0.55} />
    </mesh>
  );
}
