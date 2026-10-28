'use client';

// 젖소 농부: 동글동글 토실토실한 젖소 · 멜빵 청바지 · 밀짚모자 · 목 방울 (스마트 팜 온실)
import React from 'react';
import type * as THREE from 'three';
import { MascotBase, MascotProps, Ol, Soft, CuteEye, Blush } from './MascotBase';

const WHITE = '#FBF8F3';
const SPOT = '#3A3330';
const DENIM = '#4F74A8';
const MUZZLE = '#F5B8C4';
const STRAW = '#E7C77C';

// 몸 · 머리의 검은 반점 (구 표면에 납작하게)
const BODY_SPOTS: [number, number, number, number][] = [
  [0.14, 0.52, 0.14, 0.05],
  [-0.17, 0.46, -0.08, 0.06],
  [0.05, 0.56, -0.19, 0.05],
];

export function CowFarmer(props: MascotProps) {
  return (
    <MascotBase {...props} captionHeight={1.45} stride={0.42} speed={props.speed ?? 0.28}>
      {(rig) => (
        <group>
          {/* 짧은 다리 + 발굽 */}
          {[
            [rig.legL, 0.1],
            [rig.legR, -0.1],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.2, 0]}>
              <mesh position={[0, -0.08, 0]} castShadow>
                <capsuleGeometry args={[0.07, 0.06, 6, 14]} />
                <Soft color={DENIM} rough={0.75} />
              </mesh>
              <mesh position={[0, -0.16, 0.015]} scale={[1, 0.65, 1.15]} castShadow>
                <sphereGeometry args={[0.072, 16, 12]} />
                <Soft color={SPOT} rough={0.4} />
              </mesh>
            </group>
          ))}

          {/* 토실토실한 몸 (흰 털) + 반점 */}
          <mesh position={[0, 0.43, 0]} scale={[1.12, 1, 1]} castShadow>
            <sphereGeometry args={[0.23, 30, 24]} />
            <Soft color={WHITE} sheen />
            <Ol />
          </mesh>
          {BODY_SPOTS.map(([x, y, z, r], i) => (
            <mesh key={i} position={[x, y, z]} scale={[1, 1, 0.35]} rotation={[0, Math.atan2(x, z), 0]}>
              <sphereGeometry args={[r, 12, 10]} />
              <Soft color={SPOT} />
            </mesh>
          ))}
          {/* 멜빵 청바지: 아랫배를 감싸는 반구 + 가슴 덮개 + 멜빵 + 단추 */}
          <mesh position={[0, 0.35, 0]} scale={[1.14, 0.78, 1.03]} castShadow>
            <sphereGeometry args={[0.235, 28, 20, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55]} />
            <Soft color={DENIM} rough={0.75} />
          </mesh>
          <mesh position={[0, 0.42, 0.205]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.18, 0.13, 0.03]} />
            <Soft color={DENIM} rough={0.75} />
          </mesh>
          <mesh position={[0, 0.42, 0.222]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.07, 0.05, 0.01]} />
            <Soft color="#6C8EBF" rough={0.75} />
          </mesh>
          {[-1, 1].map((d) => (
            <group key={d}>
              <mesh position={[d * 0.08, 0.53, 0.155]} rotation={[-0.75, 0, d * 0.12]}>
                <boxGeometry args={[0.03, 0.18, 0.015]} />
                <Soft color={DENIM} rough={0.75} />
              </mesh>
              <mesh position={[d * 0.075, 0.475, 0.215]}>
                <sphereGeometry args={[0.014, 10, 8]} />
                <meshStandardMaterial color="#D9B45C" metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          ))}
          {/* 목 방울: 목을 두르는 빨간 끈(앞쪽 반원) + 금색 방울 */}
          <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.15, 0.014, 8, 28, Math.PI]} />
            <Soft color="#C8414B" />
          </mesh>
          <mesh position={[0, 0.565, 0.165]}>
            <sphereGeometry args={[0.03, 14, 12]} />
            <meshStandardMaterial color="#E2BE52" metalness={0.85} roughness={0.25} />
          </mesh>

          {/* 팔 + 발굽 손 */}
          {[
            [rig.armL, 0.235],
            [rig.armR, -0.235],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.5, 0]}>
              <mesh position={[0, -0.07, 0]} castShadow>
                <capsuleGeometry args={[0.055, 0.07, 6, 12]} />
                <Soft color={WHITE} sheen />
              </mesh>
              <mesh position={[0, -0.16, 0]} castShadow>
                <sphereGeometry args={[0.055, 14, 12]} />
                <Soft color={SPOT} rough={0.4} />
              </mesh>
            </group>
          ))}

          {/* 꼬리 (끝에 술) */}
          <group ref={rig.tail} position={[0, 0.38, -0.22]}>
            <mesh position={[0, -0.05, -0.05]} rotation={[-0.6, 0, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 6]} />
              <Soft color={WHITE} />
            </mesh>
            <mesh position={[0, -0.11, -0.1]}>
              <sphereGeometry args={[0.03, 10, 8]} />
              <Soft color={SPOT} />
            </mesh>
          </group>

          {/* 머리 */}
          <group ref={rig.head} position={[0, 0.62, 0]}>
            <mesh position={[0, 0.24, 0]} scale={[1.1, 0.95, 1]} castShadow>
              <sphereGeometry args={[0.26, 32, 26]} />
              <Soft color={WHITE} sheen />
              <Ol />
            </mesh>
            {/* 머리 반점 (옆머리 · 눈을 가리지 않게) */}
            <mesh position={[0.21, 0.31, 0.07]} scale={[1, 1, 0.45]} rotation={[0, 1.25, 0]}>
              <sphereGeometry args={[0.1, 16, 12]} />
              <Soft color={SPOT} />
            </mesh>
            {/* 분홍 코 · 콧구멍 */}
            <mesh position={[0, 0.13, 0.2]} scale={[1.45, 0.9, 0.85]}>
              <sphereGeometry args={[0.1, 22, 16]} />
              <Soft color={MUZZLE} rough={0.4} />
            </mesh>
            {[-1, 1].map((d) => (
              <mesh key={d} position={[d * 0.05, 0.15, 0.285]} scale={[1, 1.4, 0.5]}>
                <sphereGeometry args={[0.014, 8, 6]} />
                <meshStandardMaterial color="#B5566A" />
              </mesh>
            ))}
            <mesh ref={rig.mouth} position={[0, 0.085, 0.27]} scale={[1.6, 0.2, 1]}>
              <sphereGeometry args={[0.022, 12, 8]} />
              <meshStandardMaterial color="#7A3440" />
            </mesh>
            {/* 눈 · 볼 */}
            <group ref={rig.eyes}>
              <CuteEye x={-0.1} y={0.29} z={0.21} size={0.05} />
              <CuteEye x={0.1} y={0.29} z={0.21} size={0.05} />
            </group>
            <Blush x={-0.19} y={0.2} z={0.17} />
            <Blush x={0.19} y={0.2} z={0.17} />
            {/* 귀 (옆으로) · 작은 뿔 */}
            {[-1, 1].map((d) => (
              <group key={d}>
                <mesh position={[d * 0.29, 0.3, 0]} rotation={[0, 0, d * -0.3]} scale={[1.5, 0.75, 0.6]}>
                  <sphereGeometry args={[0.06, 14, 10]} />
                  <Soft color={WHITE} sheen />
                </mesh>
                <mesh position={[d * 0.2, 0.42, 0.02]} rotation={[0, 0, -d * 1.0]}>
                  <coneGeometry args={[0.028, 0.08, 10]} />
                  <Soft color="#EFE3C8" rough={0.4} />
                </mesh>
              </group>
            ))}
            {/* 밀짚모자 (챙 + 몸통 + 빨간 띠) */}
            <group position={[0, 0.47, -0.01]} rotation={[-0.12, 0, 0.08]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.3, 0.32, 0.02, 32]} />
                <Soft color={STRAW} rough={0.8} />
                <Ol thickness={0.008} />
              </mesh>
              <mesh position={[0, 0.07, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.16, 0.13, 28]} />
                <Soft color={STRAW} rough={0.8} />
              </mesh>
              <mesh position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.162, 0.162, 0.035, 28]} />
                <Soft color="#C8414B" />
              </mesh>
            </group>
          </group>
        </group>
      )}
    </MascotBase>
  );
}
