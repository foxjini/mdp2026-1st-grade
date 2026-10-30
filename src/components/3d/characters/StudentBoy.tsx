'use client';

// 남학생: 동그란 안경 · 쓸어 넘긴 머리 + 바보털 · 한쪽 눈썹 올린 장난스러운 웃음 · 볼 반창고 · 느슨한 넥타이 · 주황 가방 (스마트 버스정류장)
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
import { MascotBase, MascotProps, Ol, Soft, CuteEye, Blush } from './MascotBase';

const SKIN = '#F7D6BD';
const HAIR = '#2B1E18';
const BLAZER = '#2C3E66';
const PANTS = '#5A6070';
const TIE = '#C8414B';
const BAG = '#F08A3C';
const FRAME = '#1F2A44';

// 삐죽 머리: 정수리 둘레에서 뒤로 넘어가며 솟은 부드러운 머리 다발 [위로 기울기(0 = 수평, 90 = 정수리), 방향(0 = 앞), 크기]
const TUFTS: [number, number, number][] = [
  [74, 15, 1.1], [56, 75, 0.95], [56, -60, 1], [50, 150, 0.9], [52, -140, 0.95],
];
// 앞머리 끝: 한쪽으로 쓸린 삐침 (x, 끝 높이)
const FRINGE_TIPS: [number, number][] = [
  [-0.165, 0.335], [-0.085, 0.35], [0, 0.342], [0.08, 0.355], [0.16, 0.34],
];
// 머리(구, 중심 y 0.25 · 반지름 0.25 · 가로 1.05배) 겉면의 z
const faceZ = (x: number, y: number) => 0.25 * Math.sqrt(Math.max(0, 1 - (x / 0.2625) ** 2 - ((y - 0.25) / 0.245) ** 2));
const CAP_C = new THREE.Vector3(0, 0.29, -0.03);
const CAP_R = 0.262;
function onCap(elev: number, azim: number, out = 0.9) {
  const e = (elev * Math.PI) / 180, a = (azim * Math.PI) / 180;
  const dir = new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)).normalize();
  const pos = CAP_C.clone().add(dir.clone().multiplyScalar(CAP_R * out));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return { pos, q };
}

export function StudentBoy(props: MascotProps) {
  const tufts = useMemo(() => TUFTS.map(([e, a, s]) => {
    const { pos } = onCap(e, a, 0.86);
    // 바깥 방향에서 뒤쪽으로 눕혀 뿔이 아니라 쓸어 넘긴 머리처럼
    const out = pos.clone().sub(CAP_C).normalize().add(new THREE.Vector3(0, 0, -0.9)).normalize();
    return { pos, q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out), s };
  }), []);
  return (
    <MascotBase {...props} captionHeight={1.5} stride={0.55}>
      {(rig) => (
        <group>
          {/* 다리: 회색 교복 바지 + 운동화(빨간 줄) */}
          {[
            [rig.legL, 0.075],
            [rig.legR, -0.075],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.28, 0]}>
              <mesh position={[0, -0.1, 0]} castShadow>
                <capsuleGeometry args={[0.05, 0.11, 6, 12]} />
                <Soft color={PANTS} rough={0.8} />
              </mesh>
              <mesh position={[0, -0.235, 0.03]} scale={[1, 0.62, 1.55]} castShadow>
                <sphereGeometry args={[0.058, 14, 10]} />
                <Soft color="#F5F5F2" rough={0.5} />
              </mesh>
              <mesh position={[0, -0.255, 0.03]} scale={[1.05, 0.25, 1.6]}>
                <sphereGeometry args={[0.058, 14, 8]} />
                <Soft color={TIE} rough={0.5} />
              </mesh>
            </group>
          ))}

          {/* 블레이저 몸통 + 셔츠 V + 느슨하게 삐뚤어진 넥타이 + 단추 */}
          <mesh position={[0, 0.43, 0]} scale={[1.05, 1.15, 0.88]} castShadow>
            <sphereGeometry args={[0.155, 26, 20]} />
            <Soft color={BLAZER} rough={0.6} />
            <Ol />
          </mesh>
          <mesh position={[0, 0.5, 0.13]} rotation={[-0.37, 0, -Math.PI / 2]}>
            <circleGeometry args={[0.065, 3]} />
            <Soft color="#FAF8F5" rough={0.6} />
          </mesh>
          <group position={[0.012, 0.47, 0.137]} rotation={[-0.2, 0, 0.22]}>
            <mesh position={[0, 0.045, 0]}>
              <boxGeometry args={[0.03, 0.022, 0.014]} />
              <Soft color={TIE} rough={0.5} />
            </mesh>
            <mesh position={[0, -0.005, 0]}>
              <boxGeometry args={[0.028, 0.08, 0.01]} />
              <Soft color={TIE} rough={0.5} />
            </mesh>
          </group>
          {[0.41, 0.35].map((y) => (
            <mesh key={y} position={[-0.05, y, 0.13]}>
              <sphereGeometry args={[0.01, 8, 6]} />
              <meshStandardMaterial color="#D9B45C" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          {/* 주황 책가방 + 어깨끈 */}
          <RoundedBox args={[0.25, 0.27, 0.11]} radius={0.04} smoothness={3} position={[0, 0.45, -0.17]} castShadow>
            <Soft color={BAG} rough={0.55} />
          </RoundedBox>
          <RoundedBox args={[0.16, 0.09, 0.03]} radius={0.015} smoothness={2} position={[0, 0.39, -0.235]}>
            <Soft color="#D9722C" rough={0.55} />
          </RoundedBox>
          {[-1, 1].map((d) => (
            <group key={d}>
              <RoundedBox args={[0.032, 0.012, 0.3]} radius={0.005} smoothness={2} position={[d * 0.09, 0.585, -0.03]}>
                <Soft color="#D9722C" rough={0.6} />
              </RoundedBox>
              <RoundedBox args={[0.032, 0.19, 0.012]} radius={0.005} smoothness={2} position={[d * 0.095, 0.5, 0.128]} rotation={[-0.25, 0, 0]}>
                <Soft color="#D9722C" rough={0.6} />
              </RoundedBox>
            </group>
          ))}
          {/* 팔: 소매 + 손 */}
          {[
            [rig.armL, 0.175],
            [rig.armR, -0.175],
          ].map(([ref, x], i) => (
            <group key={i} ref={ref as React.RefObject<THREE.Group>} position={[x as number, 0.54, 0]}>
              <mesh position={[0, -0.085, 0]} castShadow>
                <capsuleGeometry args={[0.043, 0.1, 6, 12]} />
                <Soft color={BLAZER} rough={0.6} />
              </mesh>
              <mesh position={[0, -0.18, 0]}>
                <sphereGeometry args={[0.039, 12, 10]} />
                <Soft color={SKIN} />
              </mesh>
            </group>
          ))}

          {/* 머리 */}
          <group ref={rig.head} position={[0, 0.6, 0]}>
            <mesh position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.042, 0.047, 0.06, 12]} />
              <Soft color={SKIN} />
            </mesh>
            <mesh position={[0, 0.25, 0]} scale={[1.05, 0.98, 1]} castShadow>
              <sphereGeometry args={[0.25, 32, 26]} />
              <Soft color={SKIN} sheen />
              <Ol />
            </mesh>
            {/* 귀 */}
            {[-1, 1].map((d) => (
              <mesh key={d} position={[d * 0.26, 0.24, 0]} scale={[0.5, 1, 0.8]}>
                <sphereGeometry args={[0.045, 12, 10]} />
                <Soft color={SKIN} />
              </mesh>
            ))}
            {/* 머리카락: 덮개 + 머리 다발 + 앞머리 + 바보털 */}
            <mesh position={[0, 0.29, -0.03]} scale={[1.09, 1.03, 1.06]} castShadow>
              <sphereGeometry args={[0.258, 30, 22, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <Soft color={HAIR} rough={0.45} />
              <Ol thickness={0.008} />
            </mesh>
            {tufts.map(({ pos, q, s }, i) => (
              <group key={i} position={pos} quaternion={q} scale={s}>
                <mesh position={[0, 0.04, 0]} scale={[1.25, 1.45, 0.55]} castShadow>
                  <sphereGeometry args={[0.06, 14, 10]} />
                  <Soft color={HAIR} rough={0.45} />
                </mesh>
              </group>
            ))}
            {/* 앞머리: 이마를 덮는 껍질 + 한쪽으로 쓸린 삐침 */}
            <mesh position={[0, 0.25, 0.004]} scale={[1.07, 1.0, 1.04]}>
              <sphereGeometry args={[0.256, 32, 16, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.06, Math.PI * 0.27]} />
              <Soft color={HAIR} rough={0.45} />
            </mesh>
            {FRINGE_TIPS.map(([x, y]) => (
              <mesh key={x} position={[x, y + 0.012, faceZ(x, y) + 0.006]} rotation={[-0.45, x * 2.2, 0.35 - x * 1.2]} scale={[0.9, 1.45, 0.22]}>
                <sphereGeometry args={[0.042, 14, 10]} />
                <Soft color={HAIR} rough={0.45} />
              </mesh>
            ))}
            {/* 뒷머리: 목덜미까지 짧게 */}
            <mesh position={[0, 0.22, -0.06]} scale={[1.06, 0.82, 0.93]}>
              <sphereGeometry args={[0.25, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.75]} />
              <Soft color={HAIR} rough={0.45} />
            </mesh>
            <group position={[0.02, 0.56, 0.0]} rotation={[0.3, 0, -0.3]}>
              <mesh position={[0, 0.04, 0]}>
                <cylinderGeometry args={[0.006, 0.013, 0.08, 6]} />
                <Soft color={HAIR} rough={0.45} />
              </mesh>
              <mesh position={[0.025, 0.085, 0]} rotation={[0, 0, -1.2]}>
                <cylinderGeometry args={[0.003, 0.006, 0.05, 6]} />
                <Soft color={HAIR} rough={0.45} />
              </mesh>
            </group>

            {/* 눈(깜빡임) · 동그란 안경 · 장난스러운 눈썹 */}
            <group ref={rig.eyes} position={[0, 0.245, 0]}>
              <CuteEye x={-0.09} y={0} z={0.214} size={0.046} color="#2E2018" />
              <CuteEye x={0.09} y={0} z={0.214} size={0.046} color="#2E2018" />
            </group>
            <group position={[0, 0.245, 0.25]}>
              {[-1, 1].map((d) => (
                <mesh key={d} position={[d * 0.09, 0, 0]}>
                  <torusGeometry args={[0.064, 0.008, 8, 28]} />
                  <meshStandardMaterial color={FRAME} metalness={0.4} roughness={0.35} />
                </mesh>
              ))}
              <mesh position={[0, 0.012, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.006, 0.006, 0.05, 6]} />
                <meshStandardMaterial color={FRAME} />
              </mesh>
              {[-1, 1].map((d) => (
                <mesh key={`l${d}`} position={[d * 0.09, 0, 0.002]}>
                  <circleGeometry args={[0.06, 24]} />
                  <meshPhysicalMaterial color="#EAF4F8" transparent opacity={0.12} roughness={0.05} clearcoat={1} />
                </mesh>
              ))}
            </group>
            {/* 왼쪽 눈썹은 번쩍 올리고, 오른쪽은 살짝 내림 (장난기) */}
            <mesh position={[0.095, 0.305, 0.264]} rotation={[-0.3, 0, -0.3]}>
              <boxGeometry args={[0.06, 0.018, 0.012]} />
              <meshStandardMaterial color={HAIR} />
            </mesh>
            <mesh position={[-0.09, 0.29, 0.264]} rotation={[-0.3, 0, -0.08]}>
              <boxGeometry args={[0.06, 0.018, 0.012]} />
              <meshStandardMaterial color={HAIR} />
            </mesh>
            <Blush x={-0.15} y={0.16} z={0.2} />
            <Blush x={0.15} y={0.16} z={0.2} />
            {/* 오른쪽 볼 반창고 */}
            <group position={[-0.155, 0.185, 0.198]} rotation={[0, -0.55, 0.5]}>
              <mesh>
                <boxGeometry args={[0.062, 0.022, 0.006]} />
                <Soft color="#EBCB9F" />
              </mesh>
              <mesh position={[0, 0, 0.004]}>
                <boxGeometry args={[0.018, 0.016, 0.004]} />
                <Soft color="#F2A7A0" />
              </mesh>
            </group>
            {/* 한쪽이 올라간 웃음 + 앞니 + 말할 때 벌어지는 입 */}
            <group position={[0.006, 0.148, 0.243]} rotation={[0, 0, 0.18]}>
              <mesh rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[0.032, 0.006, 6, 16, Math.PI]} />
                <meshStandardMaterial color="#8E3A40" />
              </mesh>
              <mesh position={[0.006, -0.012, 0.002]}>
                <boxGeometry args={[0.014, 0.012, 0.004]} />
                <meshBasicMaterial color="#FFFFFF" />
              </mesh>
            </group>
            <mesh ref={rig.mouth} position={[0.004, 0.13, 0.241]} scale={[1.4, 0.2, 1]}>
              <sphereGeometry args={[0.02, 12, 8]} />
              <meshStandardMaterial color="#7A2E36" />
            </mesh>
          </group>
        </group>
      )}
    </MascotBase>
  );
}
