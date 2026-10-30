'use client';

// 고양이 집사: 치즈색 고양이 · 연미복 · 나비넥타이 · 흰 장갑 · 갈색 장화 (스마트 거실 허브)
import React from 'react';
import type * as THREE from 'three';
import { MascotBase, MascotProps, Ol, Soft, CuteEye, Blush } from './MascotBase';

const FUR = '#F2B27A';
const FUR_LIGHT = '#FFF3E4';
const COAT = '#25303B';
const BOOT = '#7A4A2B';

export function CatButler(props: MascotProps) {
  return (
    <MascotBase {...props} captionHeight={1.42} stride={0.5}>
      {(rig) => (
        <group>
          {/* 다리 + 장화 (엉덩이를 축으로 흔들림) */}
          {[
            [rig.legL, 0.085],
            [rig.legR, -0.085],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.26, 0]}>
              <mesh position={[0, -0.12, 0]} castShadow>
                <capsuleGeometry args={[0.062, 0.12, 6, 14]} />
                <Soft color={BOOT} rough={0.35} />
              </mesh>
              {/* 장화 앞코 */}
              <mesh position={[0, -0.22, 0.04]} scale={[1, 0.7, 1.35]} castShadow>
                <sphereGeometry args={[0.07, 16, 12]} />
                <Soft color={BOOT} rough={0.35} />
              </mesh>
              {/* 접힌 장화 목 */}
              <mesh position={[0, -0.02, 0]}>
                <cylinderGeometry args={[0.08, 0.07, 0.05, 18]} />
                <Soft color="#9A6239" rough={0.4} />
              </mesh>
            </group>
          ))}

          {/* 몸통: 연미복 + 흰 셔츠 + 금단추 + 연미복 꼬리 */}
          <mesh position={[0, 0.42, 0]} scale={[1, 1.05, 0.9]} castShadow>
            <sphereGeometry args={[0.18, 28, 22]} />
            <Soft color={COAT} rough={0.5} />
            <Ol />
          </mesh>
          <mesh position={[0, 0.45, 0.145]} scale={[0.62, 1, 0.25]}>
            <sphereGeometry args={[0.13, 20, 14]} />
            <Soft color="#FAF8F5" rough={0.6} />
          </mesh>
          {[0.42, 0.36].map((y) => (
            <mesh key={y} position={[0, y, 0.178]}>
              <sphereGeometry args={[0.012, 10, 8]} />
              <meshStandardMaterial color="#D9B45C" metalness={0.8} roughness={0.25} />
            </mesh>
          ))}
          {[-0.07, 0.07].map((x) => (
            <mesh key={x} position={[x, 0.27, -0.13]} rotation={[0.35, 0, x * 2]} castShadow>
              <boxGeometry args={[0.09, 0.16, 0.025]} />
              <Soft color={COAT} rough={0.5} />
            </mesh>
          ))}
          {/* 빨간 나비넥타이 */}
          <group position={[0, 0.575, 0.15]}>
            {[-1, 1].map((d) => (
              <mesh key={d} position={[d * 0.035, 0, 0]} rotation={[0, 0, (d * Math.PI) / 2]}>
                <coneGeometry args={[0.03, 0.06, 4]} />
                <Soft color="#C8414B" rough={0.45} />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.016, 10, 8]} />
              <Soft color="#A8323B" />
            </mesh>
          </group>

          {/* 팔: 소매 + 흰 장갑 (어깨를 축으로) */}
          {[
            [rig.armL, 0.19],
            [rig.armR, -0.19],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.53, 0]}>
              <mesh position={[0, -0.09, 0]} castShadow>
                <capsuleGeometry args={[0.045, 0.1, 6, 12]} />
                <Soft color={COAT} rough={0.5} />
              </mesh>
              <mesh position={[0, -0.2, 0]} castShadow>
                <sphereGeometry args={[0.052, 16, 12]} />
                <Soft color="#FFFFFF" rough={0.7} />
              </mesh>
            </group>
          ))}

          {/* 꼬리 (살랑): 엉덩이에서 뒤로 → 위로 휘는 두 마디, 끝은 밝은 털 */}
          <group ref={rig.tail} position={[0, 0.3, -0.12]}>
            <mesh position={[0, 0.031, -0.063]} rotation={[-1.107, 0, 0]}>
              <capsuleGeometry args={[0.03, 0.14, 6, 12]} />
              <Soft color={FUR} sheen />
            </mesh>
            <mesh position={[0, 0.063, -0.125]}>
              <sphereGeometry args={[0.031, 12, 10]} />
              <Soft color={FUR} sheen />
            </mesh>
            <mesh position={[0, 0.141, -0.144]} rotation={[-0.245, 0, 0]}>
              <capsuleGeometry args={[0.029, 0.16, 6, 12]} />
              <Soft color={FUR} sheen />
            </mesh>
            <mesh position={[0, 0.222, -0.164]}>
              <sphereGeometry args={[0.036, 12, 10]} />
              <Soft color={FUR_LIGHT} sheen />
            </mesh>
          </group>

          {/* 머리 */}
          <group ref={rig.head} position={[0, 0.6, 0]}>
            <mesh position={[0, 0.25, 0]} scale={[1.08, 0.94, 1]} castShadow>
              <sphereGeometry args={[0.27, 32, 26]} />
              <Soft color={FUR} sheen />
              <Ol />
            </mesh>
            {/* 이마 줄무늬 (머리 곡면에 납작하게 붙여 뒤로 눕힘) */}
            {[-0.065, 0, 0.065].map((x) => (
              <mesh key={x} position={[x, 0.425, 0.182]} rotation={[-0.8, 0, -x * 3]} scale={[0.22, 1, 0.1]}>
                <sphereGeometry args={[0.06, 10, 8]} />
                <Soft color="#D98A4E" />
              </mesh>
            ))}
            {/* 주둥이 (흰 털) */}
            <mesh position={[0, 0.16, 0.2]} scale={[1.25, 0.8, 0.75]}>
              <sphereGeometry args={[0.1, 20, 16]} />
              <Soft color={FUR_LIGHT} sheen />
            </mesh>
            {/* 귀 */}
            {[-1, 1].map((d) => (
              <group key={d} position={[d * 0.16, 0.47, 0]} rotation={[0, 0, -d * 0.35]}>
                <mesh castShadow>
                  <coneGeometry args={[0.085, 0.16, 18]} />
                  <Soft color={FUR} sheen />
                  <Ol thickness={0.01} />
                </mesh>
                <mesh position={[0, -0.01, 0.035]} scale={[0.6, 0.7, 0.4]}>
                  <coneGeometry args={[0.08, 0.15, 14]} />
                  <Soft color="#F6B2BE" />
                </mesh>
              </group>
            ))}
            {/* 눈 (깜빡임) · 볼 · 코 · 입 · 수염 */}
            {/* 눈 그룹을 눈 높이에: 깜빡임(세로 축소)이 제자리에서 일어나게 */}
            <group ref={rig.eyes} position={[0, 0.27, 0]}>
              <CuteEye x={-0.1} y={0} z={0.23} size={0.058} />
              <CuteEye x={0.1} y={0} z={0.23} size={0.058} />
            </group>
            <Blush x={-0.17} y={0.18} z={0.2} />
            <Blush x={0.17} y={0.18} z={0.2} />
            <mesh position={[0, 0.2, 0.275]} scale={[1.3, 0.8, 0.8]}>
              <sphereGeometry args={[0.018, 10, 8]} />
              <Soft color="#E87A8C" rough={0.3} />
            </mesh>
            <mesh ref={rig.mouth} position={[0, 0.145, 0.27]} scale={[1, 0.2, 1]}>
              <sphereGeometry args={[0.028, 12, 10]} />
              <meshStandardMaterial color="#7A3440" roughness={0.6} />
            </mesh>
            {/* 수염: 주둥이 양옆에서 바깥 · 뒤로 가로로 뻗는 3가닥 (원기둥을 눕혀서) */}
            {[-1, 1].map((d) =>
              [0.18, 0.16, 0.14].map((y, k) => (
                <mesh key={`${d}-${k}`} position={[d * 0.157, y, 0.226]} rotation={[0, d * 0.3, Math.PI / 2 + d * (k - 1) * 0.16]}>
                  <cylinderGeometry args={[0.0035, 0.0035, 0.14, 5]} />
                  <meshBasicMaterial color="#6B5446" />
                </mesh>
              ))
            )}
            {/* 집사 포인트: 왼쪽 귀의 금색 귀걸이 */}
            <mesh position={[0.2, 0.4, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.018, 0.005, 6, 14]} />
              <meshStandardMaterial color="#D9B45C" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        </group>
      )}
    </MascotBase>
  );
}
