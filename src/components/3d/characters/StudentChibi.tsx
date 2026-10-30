'use client';

// 여학생: 교복(남색 블레이저 · 리본 · 주름치마 · 흰 무릎 양말) · 시스루 앞머리 + 양갈래(리본) · 책 (스마트 독서실)
import React from 'react';
import type * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { MascotBase, MascotProps, Ol, Soft, CuteEye, Blush } from './MascotBase';

const SKIN = '#F9DCC6';
const HAIR = '#4A2C22';
const BLAZER = '#2E4374';
const SKIRT = '#7D8496';
const RIBBON = '#E8577E';
const SOCK = '#F6F3EE';
const SHOE = '#5A3A28';

// 앞머리 끝: 이마 아래 가장자리를 따라 부드러운 물결 (x, 끝 높이)
const FRINGE_TIPS: [number, number][] = [
  [-0.17, 0.31],
  [-0.1, 0.325],
  [-0.03, 0.33],
  [0.04, 0.328],
  [0.11, 0.322],
  [0.175, 0.305],
];
// 머리(구, 중심 y 0.25 · 반지름 0.25 · 가로 1.05배) 겉면의 z
const faceZ = (x: number, y: number) => 0.25 * Math.sqrt(Math.max(0, 1 - (x / 0.2625) ** 2 - ((y - 0.25) / 0.245) ** 2));

export function StudentChibi(props: MascotProps) {
  return (
    <MascotBase {...props} captionHeight={1.48} stride={0.5}>
      {(rig) => (
        <group>
          {/* 다리: 흰 무릎 양말 + 로퍼 */}
          {[
            [rig.legL, 0.07],
            [rig.legR, -0.07],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.27, 0]}>
              <mesh position={[0, -0.05, 0]}>
                <capsuleGeometry args={[0.04, 0.05, 6, 12]} />
                <Soft color={SKIN} />
              </mesh>
              <mesh position={[0, -0.15, 0]} castShadow>
                <capsuleGeometry args={[0.044, 0.07, 6, 12]} />
                <Soft color={SOCK} rough={0.8} />
              </mesh>
              <mesh position={[0, -0.235, 0.025]} scale={[1, 0.6, 1.5]} castShadow>
                <sphereGeometry args={[0.055, 14, 10]} />
                <Soft color={SHOE} rough={0.3} />
              </mesh>
            </group>
          ))}

          {/* 주름치마 (면을 각지게 그려 주름처럼) */}
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.2, 0.14, 14, 1]} />
            <meshStandardMaterial color={SKIRT} roughness={0.8} flatShading />
            <Ol thickness={0.008} />
          </mesh>
          {/* 블레이저 몸통 + 흰 셔츠 V + 리본 + 단추 */}
          <mesh position={[0, 0.46, 0]} scale={[1, 1.1, 0.85]} castShadow>
            <sphereGeometry args={[0.15, 26, 20]} />
            <Soft color={BLAZER} rough={0.6} />
            <Ol />
          </mesh>
          <mesh position={[0, 0.515, 0.124]} rotation={[-0.37, 0, -Math.PI / 2]}>
            <circleGeometry args={[0.062, 3]} />
            <Soft color="#FAF8F5" rough={0.6} />
          </mesh>
          <group position={[0, 0.53, 0.133]} rotation={[-0.3, 0, 0]}>
            {[-1, 1].map((d) => (
              <mesh key={d} position={[d * 0.03, 0, 0]} rotation={[0, 0, (d * Math.PI) / 2]}>
                <coneGeometry args={[0.026, 0.05, 4]} />
                <Soft color={RIBBON} rough={0.45} />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.014, 10, 8]} />
              <Soft color="#C9446A" />
            </mesh>
          </group>
          {[0.43, 0.38].map((y) => (
            <mesh key={y} position={[0.045, y, 0.128]}>
              <sphereGeometry args={[0.01, 8, 6]} />
              <meshStandardMaterial color="#D9B45C" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}

          {/* 팔: 블레이저 소매 + 흰 소맷부리 + 손, 왼손에 책 */}
          {[
            [rig.armL, 0.165],
            [rig.armR, -0.165],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.55, 0]}>
              <mesh position={[0, -0.08, 0]} castShadow>
                <capsuleGeometry args={[0.04, 0.09, 6, 12]} />
                <Soft color={BLAZER} rough={0.6} />
              </mesh>
              <mesh position={[0, -0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.036, 0.008, 6, 16]} />
                <Soft color="#FAF8F5" />
              </mesh>
              <mesh position={[0, -0.17, 0]}>
                <sphereGeometry args={[0.036, 12, 10]} />
                <Soft color={SKIN} />
              </mesh>
              {i === 0 && (
                <RoundedBox args={[0.03, 0.15, 0.11]} radius={0.008} smoothness={2} position={[0.02, -0.17, 0.05]} castShadow>
                  <Soft color="#5B8DEF" rough={0.5} />
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

            {/* 머리카락: 정수리 덮개 + 뒷머리(목덜미까지) */}
            <mesh position={[0, 0.29, -0.035]} scale={[1.1, 1.02, 1.05]} castShadow>
              <sphereGeometry args={[0.258, 30, 22, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
              <Soft color={HAIR} rough={0.4} />
              <Ol thickness={0.008} />
            </mesh>
            <mesh position={[0, 0.21, -0.07]} scale={[1.08, 0.9, 0.95]} castShadow>
              <sphereGeometry args={[0.25, 28, 20]} />
              <Soft color={HAIR} rough={0.4} />
            </mesh>
            {/* 앞머리: 이마를 덮는 매끈한 껍질 + 아래 가장자리 물결 */}
            <mesh position={[0, 0.25, 0.004]} scale={[1.07, 1.0, 1.04]} castShadow>
              <sphereGeometry args={[0.256, 32, 16, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.08, Math.PI * 0.3]} />
              <Soft color={HAIR} rough={0.4} />
            </mesh>
            {FRINGE_TIPS.map(([x, y]) => (
              <mesh key={x} position={[x, y + 0.012, faceZ(x, y) + 0.006]} rotation={[-0.45, x * 2.2, x * -1.2]} scale={[0.95, 1.5, 0.22]}>
                <sphereGeometry args={[0.04, 14, 10]} />
                <Soft color={HAIR} rough={0.4} />
              </mesh>
            ))}
            {/* 옆머리: 볼을 감싸는 긴 가닥 */}
            {[-1, 1].map((d) => (
              <mesh key={d} position={[d * 0.225, 0.19, 0.06]} rotation={[0.1, 0, d * -0.08]} scale={[0.38, 1.45, 0.55]}>
                <sphereGeometry args={[0.085, 14, 12]} />
                <Soft color={HAIR} rough={0.4} />
              </mesh>
            ))}
            {/* 양갈래: 귀 뒤 아래로 내려온 묶음 + 분홍 리본 */}
            {[-1, 1].map((d) => (
              <group key={`p${d}`} position={[d * 0.255, 0.2, -0.09]} rotation={[0.15, 0, d * 0.35]}>
                <mesh position={[0, -0.1, 0]} scale={[0.9, 1.4, 0.9]} castShadow>
                  <sphereGeometry args={[0.085, 16, 12]} />
                  <Soft color={HAIR} rough={0.4} />
                </mesh>
                <mesh position={[0, -0.215, 0]} scale={[0.75, 1, 0.75]}>
                  <sphereGeometry args={[0.055, 12, 10]} />
                  <Soft color={HAIR} rough={0.4} />
                </mesh>
                <group position={[0, 0.01, 0.02]} rotation={[0, d * 0.6, 0]}>
                  {[-1, 1].map((k) => (
                    <mesh key={k} position={[k * 0.032, 0, 0]} rotation={[0, 0, (k * Math.PI) / 2]}>
                      <coneGeometry args={[0.03, 0.055, 4]} />
                      <Soft color={RIBBON} rough={0.45} />
                    </mesh>
                  ))}
                  <mesh>
                    <sphereGeometry args={[0.016, 10, 8]} />
                    <Soft color="#C9446A" />
                  </mesh>
                </group>
              </group>
            ))}

            {/* 눈(속눈썹 포함, 깜빡임) · 볼 · 입 */}
            <group ref={rig.eyes} position={[0, 0.245, 0]}>
              {[-1, 1].map((d) => (
                <group key={d}>
                  <CuteEye x={d * 0.088} y={0} z={0.214} size={0.056} color="#3B2418" />
                  <mesh position={[d * 0.128, 0.052, 0.2]} rotation={[0, 0, d * 0.55]}>
                    <boxGeometry args={[0.034, 0.009, 0.008]} />
                    <meshBasicMaterial color="#2A1A14" />
                  </mesh>
                </group>
              ))}
            </group>
            <Blush x={-0.15} y={0.165} z={0.2} r={0.042} />
            <Blush x={0.15} y={0.165} z={0.2} r={0.042} />
            {/* 웃는 입선 + 말할 때 벌어지는 입 */}
            <mesh position={[0, 0.148, 0.243]} rotation={[0, 0, Math.PI]}>
              <torusGeometry args={[0.02, 0.005, 6, 14, Math.PI]} />
              <meshStandardMaterial color="#B44A5A" />
            </mesh>
            <mesh ref={rig.mouth} position={[0, 0.135, 0.242]} scale={[1.1, 0.2, 1]}>
              <sphereGeometry args={[0.018, 12, 8]} />
              <meshStandardMaterial color="#9B3A48" />
            </mesh>
          </group>
        </group>
      )}
    </MascotBase>
  );
}
