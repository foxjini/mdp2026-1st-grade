// 학생용 3D 디자인 킷 (`import { PALETTE, MAT, DataPin, HoverLift, useSmoothValue } from '@/core/sdk'`)
// 원칙: 색조가 들어간 중립색 + 강조색은 상태 · 데이터에만 / PBR 재질 / 감쇠(damp) 모션(bounce 금지)
//       / 상태는 색 + 글자로 함께 / 센서 값이 끊겨도 부드럽게 유지
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { SensorData } from '../types/iot';

// ------------------------------------------------------------------------------
// 1. 색 팔레트: 순흑(#000) · 순회색 · 원색(#FF0000) 대신 색조가 들어간 차분한 색
// ------------------------------------------------------------------------------
export const PALETTE = {
  // 공간 (넓은 면적: 밝고 차분하게)
  wall: '#EEE9E2',
  wallShade: '#E2DBD1',
  ceiling: '#F6F3EE',
  floor: '#C9A57C',
  trim: '#D8D0C4',
  // 소재 색
  oak: '#C8A27A',
  walnut: '#7A5536',
  linen: '#E7E0D3',
  sage: '#8FA89A',
  clay: '#C97C5D',
  sand: '#D9C7A7',
  charcoal: '#2E3338',
  ink: '#1F2933',
  inkSoft: '#52606D',
  // 상태 · 데이터 색 (정보에만 사용)
  ok: '#2F9E6E',
  warn: '#D9922E',
  alert: '#D64545',
  info: '#3A7BD5',
  off: '#9AA5B1',
} as const;

export type PinStatus = 'ok' | 'warn' | 'alert' | 'info' | 'off';

// ------------------------------------------------------------------------------
// 2. PBR 재질 프리셋: <meshStandardMaterial {...MAT.oak} /> 처럼 펼쳐서 사용
// ------------------------------------------------------------------------------
type MatProps = {
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
};

const m = (color: string, roughness: number, metalness = 0): MatProps => ({ color, roughness, metalness });

export const MAT = {
  oak: m(PALETTE.oak, 0.62),
  walnut: m(PALETTE.walnut, 0.55),
  linen: m(PALETTE.linen, 0.95),
  sage: m(PALETTE.sage, 0.9),
  leather: m('#8B5E3C', 0.5),
  ceramic: m('#F3EFE8', 0.28),
  matteWhite: m('#F1EEE9', 0.8),
  plaster: m(PALETTE.wall, 0.92),
  brushedMetal: m('#B8BDC2', 0.35, 0.85),
  chrome: m('#E5E7EA', 0.12, 1),
  brass: m('#C9A45C', 0.3, 0.9),
  concrete: m('#A7A39C', 0.9),
  plant: m('#4E7D5B', 0.7),
  rubber: m(PALETTE.charcoal, 0.85),
  /** meshPhysicalMaterial 용 유리 (예: <meshPhysicalMaterial {...MAT.glass} />) */
  glass: { color: '#EAF4F8', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 },
  /** 화면 · 디스플레이 (발광 → 고급 그래픽에서 은은하게 빛남) */
  screen: (color: string = PALETTE.info): MatProps => ({ color: '#0F1419', roughness: 0.4, metalness: 0, emissive: color, emissiveIntensity: 1.4 }),
  /** 상태 표시등: 켜지면 발광(블룸), 꺼지면 무광 회색 */
  glow: (color: string, on = true): MatProps =>
    on
      ? { color, roughness: 0.3, metalness: 0, emissive: color, emissiveIntensity: 2.2 }
      : { color: '#C9CDD2', roughness: 0.5, metalness: 0, emissive: '#000000', emissiveIntensity: 0 },
};

// ------------------------------------------------------------------------------
// 3. 센서 값 스무딩 (데이터 견고성): 갑자기 튀는 값은 부드럽게, 끊기면 마지막 값 유지
// ------------------------------------------------------------------------------
/**
 * useFrame 에서 읽는 부드러운 값. `const level = useSmoothValue(useCustomValue('level'));`
 * → useFrame 안에서 `level.current` 사용 (re-render 없음)
 */
export function useSmoothValue(target: number | null | undefined, options: { lambda?: number; initial?: number } = {}) {
  const { lambda = 4, initial } = options;
  const start = typeof target === 'number' && Number.isFinite(target) ? target : initial ?? 0;
  const smooth = useRef(start);
  const goal = useRef(start);
  useEffect(() => {
    // 값이 없거나 숫자가 아니면(수신 대기 · 끊김) 마지막 정상 값을 유지
    if (typeof target === 'number' && Number.isFinite(target)) goal.current = target;
  }, [target]);
  useFrame((_, delta) => {
    smooth.current = THREE.MathUtils.damp(smooth.current, goal.current, lambda, Math.min(delta, 0.1));
  });
  return smooth;
}

// 시스템 '동작 줄이기' 설정이면 장식용 움직임을 끔 (접근성)
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduce;
}

// ------------------------------------------------------------------------------
// 4. HoverLift: 마우스를 올리면 살짝 떠오름 (임계 감쇠 → 튕김 없음), 클릭 가능 표시
// ------------------------------------------------------------------------------
interface HoverLiftProps {
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  lift?: number;
  scale?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  disabled?: boolean;
}

export function HoverLift({ children, position, rotation, lift = 0.05, scale = 1.03, onClick, disabled = false }: HoverLiftProps) {
  const inner = useRef<THREE.Group>(null);
  const hovered = useRef(false);
  const reduce = usePrefersReducedMotion();

  useFrame((_, delta) => {
    const g = inner.current;
    if (!g) return;
    const on = hovered.current && !disabled && !reduce;
    const dt = Math.min(delta, 0.1);
    g.position.y = THREE.MathUtils.damp(g.position.y, on ? lift : 0, 10, dt);
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, on ? scale : 1, 10, dt));
  });

  useEffect(
    () => () => {
      if (hovered.current) document.body.style.cursor = 'auto';
    },
    []
  );

  return (
    <group position={position} rotation={rotation}>
      <group
        ref={inner}
        onPointerOver={(e) => {
          e.stopPropagation();
          hovered.current = true;
          if (!disabled) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hovered.current = false;
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          if (disabled || !onClick) return;
          e.stopPropagation();
          onClick(e);
        }}
      >
        {children}
      </group>
    </group>
  );
}

/** 3D 배지 카드 공통 스타일 (DataPin · 기본 장치 배지가 같은 모양을 쓰도록). selected 면 정보색 테두리 */
export function badgeStyle(selected = false): React.CSSProperties {
  return {
    whiteSpace: 'nowrap',
    background: 'rgba(250,248,245,0.94)',
    border: selected ? `1.5px solid ${PALETTE.info}` : '1px solid rgba(31,41,51,0.10)',
    borderRadius: 12,
    padding: '6px 10px',
    boxShadow: selected ? '0 8px 22px rgba(58,123,213,0.22)' : '0 6px 18px rgba(31,41,51,0.10)',
    color: PALETTE.ink,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out',
  };
}

// ------------------------------------------------------------------------------
// 5. DataPin: 3D 데이터 노드 핀 (점 + 줄기 + 배지). 상태는 색 + 글자로 함께 표시
// ------------------------------------------------------------------------------
// 1000 이상 · 정수는 쉼표만 (38,460), 그 외는 소수 1자리 (24.6)
function formatNumber(v: number, decimals?: number): string {
  const d = decimals ?? (Number.isInteger(v) || Math.abs(v) >= 1000 ? 0 : 1);
  return v.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const STATUS_TEXT: Record<PinStatus, string> = { ok: '정상', warn: '주의', alert: '경고', info: '정보', off: '꺼짐' };

interface DataPinProps {
  position: [number, number, number];
  label: string;
  /** useSensor / useCustomSensor 결과를 주면 값 · 수신 대기 · 경고를 자동으로 */
  sensor?: SensorData;
  value?: number | string | null;
  unit?: string;
  /** 소수 자리 (생략하면 자동: 정수 · 1000 이상은 0자리 + 천 단위 쉼표, 그 외 1자리) */
  decimals?: number;
  /** 상태를 직접 지정 ('ok' | 'warn' | 'alert' | 'info' | 'off'). 생략하면 sensor 의 경고 범위로 자동 */
  status?: PinStatus;
  stale?: boolean;
  height?: number;
  isModalOpen?: boolean;
}

export function DataPin({
  position,
  label,
  sensor,
  value,
  unit,
  decimals,
  status,
  stale,
  height = 0.45,
  isModalOpen = false,
}: DataPinProps) {
  const dot = useRef<THREE.Mesh>(null);
  const isStale = stale ?? (sensor ? sensor.isStale : value === undefined || value === null);
  const raw = value ?? sensor?.value;
  const warn =
    !!sensor &&
    !sensor.isStale &&
    ((sensor.minWarning !== undefined && sensor.value < sensor.minWarning) ||
      (sensor.maxWarning !== undefined && sensor.value > sensor.maxWarning));
  const st: PinStatus = isStale ? 'off' : status ?? (warn ? 'warn' : 'ok');
  const color = PALETTE[st];
  const text =
    isStale || raw === undefined || raw === null || (typeof raw === 'number' && !Number.isFinite(raw))
      ? '--'
      : typeof raw === 'number'
        ? formatNumber(raw, decimals)
        : String(raw);
  const shownUnit = unit ?? sensor?.unit ?? '';

  // 경고 · 주의일 때만 점이 천천히 숨쉬듯 (계속 깜빡이는 장식은 피함)
  useFrame(({ clock }) => {
    if (!dot.current) return;
    const pulse = st === 'alert' || st === 'warn' ? 1 + Math.sin(clock.elapsedTime * 3) * 0.18 : 1;
    dot.current.scale.setScalar(pulse);
  });

  return (
    <group position={position}>
      <mesh ref={dot} position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial {...MAT.glow(color, !isStale)} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.004, 0.004, height, 6]} />
        <meshStandardMaterial color={PALETTE.inkSoft} roughness={0.6} transparent opacity={0.5} />
      </mesh>
      {!isModalOpen && (
        <Html position={[0, height + 0.05, 0]} center distanceFactor={8} zIndexRange={[10, 0]} pointerEvents="none" style={{ pointerEvents: 'none' }}>
          <div style={{ ...badgeStyle(), pointerEvents: 'none' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: PALETTE.inkSoft }}>{label}</span>
            <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {text}
              {text !== '--' && <span style={{ fontSize: 10, fontWeight: 700, color: PALETTE.inkSoft, marginLeft: 2 }}>{shownUnit}</span>}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: 'inline-block' }} />
              {isStale ? '수신 대기' : STATUS_TEXT[st]}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
