'use client';

// 학생: 교복(남색 블레이저 · 넥타이 · 회색 주름치마) · 동그란 안경 · 단발머리 · 책 (스마트 독서실)
import React from 'react';
import type * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { MascotBase, MascotProps, Ol, Soft, CuteEye, Blush } from './MascotBase';

const SKIN = '#F7D6BD';
const HAIR = '#2E2019';
const BLAZER = '#2C3E66';
const SKIRT = '#8C8F99';
const SOCK = '#2C3557';
const SHOE = '#5A3A28';

export function StudentChibi(props: MascotProps) {
  return (
    <MascotBase {...props} captionHeight={1.48} stride={0.5}>
      {(rig) => (
        <group>
          {/* 다리: 무릎 양말 + 로퍼 */}
          {[
            [rig.legL, 0.07],
            [rig.legR, -0.07],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.27, 0]}>
              <mesh position={[0, -0.06, 0]}>
                <capsuleGeometry args={[0.042, 0.05, 6, 12]} />
                <Soft color={SKIN} />
              </mesh>
              <mesh position={[0, -0.15, 0]} castShadow>
                <capsuleGeometry args={[0.045, 0.07, 6, 12]} />
                <Soft color={SOCK} rough={0.8} />
              </mesh>
              <mesh position={[0, -0.235, 0.025]} scale={[1, 0.6, 1.5]} castShadow>
                <sphereGeometry args={[0.055, 14, 10]} />
                <Soft color={SHOE} rough={0.3} />
              </mesh>
            </group>
          ))}

          {/* 주름치마 */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.19, 0.13, 16, 1]} />
            <Soft color={SKIRT} rough={0.8} />
            <Ol thickness={0.008} />
          </mesh>
          {/* 블레이저 몸통 + 흰 셔츠 V + 넥타이 + 단추 */}
          <mesh position={[0, 0.46, 0]} scale={[1, 1.1, 0.85]} castShadow>
            <sphereGeometry args={[0.15, 26, 20]} />
            <Soft color={BLAZER} rough={0.6} />
            <Ol />
          </mesh>
          <mesh position={[0, 0.52, 0.11]} rotation={[0.35, 0, Math.PI]}>
            <coneGeometry args={[0.06, 0.12, 3]} />
            <Soft color="#FAF8F5" rough={0.6} />
          </mesh>
          <mesh position={[0, 0.49, 0.135]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.03, 0.11, 0.012]} />
            <Soft color="#B9373F" rough={0.5} />
          </mesh>
          {[0.43, 0.38].map((y) => (
            <mesh key={y} position={[0.045, y, 0.128]}>
              <sphereGeometry args={[0.01, 8, 6]} />
              <meshStandardMaterial color="#D9B45C" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          {/* 가슴 이름표 */}
          <mesh position={[-0.07, 0.49, 0.118]} rotation={[0.2, -0.3, 0]}>
            <boxGeometry args={[0.05, 0.016, 0.004]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>

          {/* 팔: 블레이저 소매 + 손, 왼손에 책 */}
          {[
            [rig.armL, 0.165],
            [rig.armR, -0.165],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.55, 0]}>
              <mesh position={[0, -0.08, 0]} castShadow>
                <capsuleGeometry args={[0.04, 0.09, 6, 12]} />
                <Soft color={BLAZER} rough={0.6} />
              </mesh>
              <mesh position={[0, -0.17, 0]}>
                <sphereGeometry args={[0.038, 12, 10]} />
                <Soft color={SKIN} />
              </mesh>
              {i === 0 && (
                <RoundedBox args={[0.03, 0.15, 0.11]} radius={0.008} smoothness={2} position={[0.02, -0.17, 0.05]} castShadow>
                  <Soft color="#3A7BD5" rough={0.5} />
                </RoundedBox>
              )}
            </group>
          ))}

          {/* 머리 */}
          <group ref={rig.head} position={[0, 0.6, 0]}>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.04, 0.045, 0.06, 12]} />
              <Soft color={SKIN} />
            </mesh>
            <mesh position={[0, 0.25, 0]} scale={[1.05, 0.98, 1]} castShadow>
              <sphereGeometry args={[0.25, 32, 26]} />
              <Soft color={SKIN} sheen />
              <Ol />
            </mesh>
            {/* 단발머리: 뒤통수 덮개 + 앞머리 + 옆머리 */}
            <mesh position={[0, 0.3, -0.035]} scale={[1.1, 1.02, 1.05]} castShadow>
              <sphereGeometry args={[0.258, 30, 22, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
              <Soft color={HAIR} rough={0.35} />
              <Ol thickness={0.008} />
            </mesh>
            {/* 앞머리 (한 덩어리로 매끈하게) */}
            <mesh position={[0, 0.41, 0.16]} rotation={[0.75, 0, 0]} scale={[2.6, 0.75, 1.15]}>
              <sphereGeometry args={[0.085, 22, 14]} />
              <Soft color={HAIR} rough={0.35} />
            </mesh>
            {[-1, 1].map((d) => (
              <mesh key={d} position={[d * 0.24, 0.2, -0.01]} scale={[0.45, 1.35, 0.85]}>
                <sphereGeometry args={[0.1, 14, 12]} />
                <Soft color={HAIR} rough={0.45} />
              </mesh>
            ))}
            {/* 눈 · 볼 · 입 */}
            <group ref={rig.eyes}>
              <CuteEye x={-0.09} y={0.25} z={0.215} size={0.05} color="#4A2E22" />
              <CuteEye x={0.09} y={0.25} z={0.215} size={0.05} color="#4A2E22" />
            </group>
            <Blush x={-0.15} y={0.17} z={0.2} />
            <Blush x={0.15} y={0.17} z={0.2} />
            <mesh ref={rig.mouth} position={[0, 0.14, 0.24]} scale={[1.3, 0.2, 1]}>
              <sphereGeometry args={[0.02, 12, 8]} />
              <meshStandardMaterial color="#9B4048" />
            </mesh>
            {/* 동그란 안경 */}
            <group position={[0, 0.25, 0.25]}>
              {[-1, 1].map((d) => (
                <mesh key={d} position={[d * 0.09, 0, 0]}>
                  <torusGeometry args={[0.062, 0.007, 8, 28]} />
                  <meshStandardMaterial color="#2B2320" metalness={0.5} roughness={0.3} />
                </mesh>
              ))}
              <mesh position={[0, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.005, 0.005, 0.06, 6]} />
                <meshStandardMaterial color="#2B2320" />
              </mesh>
              {/* 렌즈 반사 */}
              {[-1, 1].map((d) => (
                <mesh key={`l${d}`} position={[d * 0.09, 0, 0.002]}>
                  <circleGeometry args={[0.058, 24]} />
                  <meshPhysicalMaterial color="#EAF4F8" transparent opacity={0.12} roughness={0.05} clearcoat={1} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      )}
    </MascotBase>
  );
}
