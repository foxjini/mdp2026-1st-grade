'use client';

// 친근한 작업 로봇: 둥근 몸 · 화면 얼굴(눈웃음) · 노란 안전모 · 주황 포인트 (스마트 팩토리 공정)
import React from 'react';
import type * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { MascotBase, MascotProps, Ol, Soft } from './MascotBase';

const SHELL = '#F1EEE9';
const JOINT = '#5B6670';
const ACCENT = '#F08A3C';
const FACE = '#18212B';
const GLOW = '#6FE3D9';

export function FactoryBot(props: MascotProps) {
  return (
    <MascotBase {...props} captionHeight={1.5} stride={0.45}>
      {(rig) => (
        <group>
          {/* 다리 + 둥근 발 */}
          {[
            [rig.legL, 0.1],
            [rig.legR, -0.1],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.24, 0]}>
              <mesh position={[0, -0.09, 0]} castShadow>
                <cylinderGeometry args={[0.035, 0.035, 0.14, 12]} />
                <meshStandardMaterial color={JOINT} metalness={0.6} roughness={0.35} />
              </mesh>
              <RoundedBox args={[0.13, 0.07, 0.18]} radius={0.03} smoothness={3} position={[0, -0.2, 0.02]} castShadow>
                <Soft color={ACCENT} rough={0.4} />
              </RoundedBox>
            </group>
          ))}

          {/* 몸통: 둥근 상자 + 주황 띠 + 가슴 표시등 */}
          <RoundedBox args={[0.38, 0.32, 0.28]} radius={0.1} smoothness={4} position={[0, 0.42, 0]} castShadow>
            <Soft color={SHELL} rough={0.35} />
            <Ol />
          </RoundedBox>
          <RoundedBox args={[0.39, 0.05, 0.29]} radius={0.02} smoothness={3} position={[0, 0.33, 0]}>
            <Soft color={ACCENT} rough={0.4} />
          </RoundedBox>
          <mesh position={[0, 0.46, 0.142]}>
            <circleGeometry args={[0.045, 24]} />
            <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={1.6} />
          </mesh>
          <mesh position={[0, 0.46, 0.141]}>
            <ringGeometry args={[0.048, 0.06, 24]} />
            <meshStandardMaterial color={JOINT} metalness={0.5} roughness={0.4} />
          </mesh>

          {/* 팔: 관절 + 둥근 집게 손 */}
          {[
            [rig.armL, 0.235],
            [rig.armR, -0.235],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.52, 0]}>
              <mesh>
                <sphereGeometry args={[0.045, 14, 12]} />
                <meshStandardMaterial color={JOINT} metalness={0.6} roughness={0.35} />
              </mesh>
              <mesh position={[0, -0.1, 0]} castShadow>
                <capsuleGeometry args={[0.04, 0.1, 6, 12]} />
                <Soft color={SHELL} rough={0.35} />
              </mesh>
              <mesh position={[0, -0.21, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
                <torusGeometry args={[0.04, 0.016, 10, 20, Math.PI * 1.5]} />
                <Soft color={ACCENT} rough={0.4} />
              </mesh>
            </group>
          ))}

          {/* 머리: 둥근 상자 + 화면 얼굴 + 안전모 */}
          <group ref={rig.head} position={[0, 0.6, 0]}>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.05, 0.06, 0.06, 14]} />
              <meshStandardMaterial color={JOINT} metalness={0.6} roughness={0.35} />
            </mesh>
            <RoundedBox args={[0.48, 0.38, 0.36]} radius={0.13} smoothness={4} position={[0, 0.23, 0]} castShadow>
              <Soft color={SHELL} rough={0.3} />
              <Ol />
            </RoundedBox>
            <RoundedBox args={[0.38, 0.25, 0.04]} radius={0.08} smoothness={4} position={[0, 0.22, 0.165]}>
              <meshStandardMaterial color={FACE} roughness={0.2} metalness={0.2} />
            </RoundedBox>
            {/* 눈웃음 (^ ^) — 발광 */}
            <group ref={rig.eyes} position={[0, 0.25, 0.19]}>
              {[-1, 1].map((d) => (
                <mesh key={d} position={[d * 0.075, 0, 0]} rotation={[0, 0, 0]}>
                  <torusGeometry args={[0.035, 0.011, 8, 20, Math.PI]} />
                  <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={2} />
                </mesh>
              ))}
            </group>
            {/* 입 (웃는 호, 말하면 커짐) */}
            <group position={[0, 0.17, 0.19]}>
              <mesh ref={rig.mouth} rotation={[0, 0, Math.PI]} scale={[1, 0.2, 1]}>
                <torusGeometry args={[0.04, 0.01, 8, 20, Math.PI]} />
                <meshStandardMaterial color={GLOW} emissive={GLOW} emissiveIntensity={2} />
              </mesh>
            </group>
            {/* 볼 표시등 */}
            {[-1, 1].map((d) => (
              <mesh key={d} position={[d * 0.15, 0.17, 0.188]}>
                <circleGeometry args={[0.018, 14]} />
                <meshBasicMaterial color="#F28C9A" transparent opacity={0.8} />
              </mesh>
            ))}
            {/* 노란 안전모 */}
            <group position={[0, 0.39, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.21, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Soft color="#F2C230" rough={0.35} />
                <Ol thickness={0.008} />
              </mesh>
              <mesh position={[0, 0.005, 0.05]} scale={[1, 1, 1.15]}>
                <cylinderGeometry args={[0.235, 0.235, 0.02, 28]} />
                <Soft color="#F2C230" rough={0.35} />
              </mesh>
              {/* 앞뒤로 지나는 안전모 능선 */}
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.208, 0.016, 8, 24, Math.PI]} />
                <Soft color="#E0AE1E" rough={0.35} />
              </mesh>
            </group>
            {/* 안테나 */}
            <mesh position={[0.17, 0.48, 0]}>
              <cylinderGeometry args={[0.006, 0.006, 0.1, 6]} />
              <meshStandardMaterial color={JOINT} />
            </mesh>
            <mesh position={[0.17, 0.54, 0]}>
              <sphereGeometry args={[0.022, 12, 10]} />
              <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.4} />
            </mesh>
          </group>
        </group>
      )}
    </MascotBase>
  );
}
