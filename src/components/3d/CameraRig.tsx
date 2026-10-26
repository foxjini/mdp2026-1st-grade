'use client';

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useIoTStore } from '@/core/store/useIoTStore';

export type CameraPreset = 'default' | 'overview';

interface CameraRigProps {
  viewPreset?: CameraPreset;
  presetTrigger?: number;
}

const DEFAULT_POS = new THREE.Vector3(6.8, 5.2, 7.2);
const DEFAULT_TARGET = new THREE.Vector3(0, 1.2, 0);

const OVERVIEW_POS = new THREE.Vector3(0.01, 11.2, 4.2);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0.2, 0);

// 3D 화면이 세로로 길면(양쪽 패널을 편 좁은 화면) 가로 시야가 좁아져 장면이 잘림 → 그만큼 뒤로 물러남
// (가로:세로 1.15 이상이면 그대로, 좁을수록 최대 1.6배까지)
function fitFactor(aspect: number): number {
  return THREE.MathUtils.clamp(1.15 / Math.max(aspect, 0.1), 1, 1.6);
}

function presetPose(preset: CameraPreset, aspect: number, outPos: THREE.Vector3, outTarget: THREE.Vector3) {
  const pos = preset === 'overview' ? OVERVIEW_POS : DEFAULT_POS;
  const target = preset === 'overview' ? OVERVIEW_TARGET : DEFAULT_TARGET;
  outTarget.copy(target);
  outPos.copy(pos).sub(target).multiplyScalar(fitFactor(aspect)).add(target);
}

export function CameraRig({ viewPreset = 'default', presetTrigger = 0 }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isAutoRotate = useIoTStore((s) => s.isAutoRotate);
  const { camera, size } = useThree();
  // 0.05 단위로만 다시 맞춤 (서랍이 열리고 닫히는 동안 매 프레임 바뀌지 않게)
  const aspectStep = Math.round((size.width / Math.max(size.height, 1)) * 20) / 20;
  const userMovedRef = useRef(false);

  const isTransitioningRef = useRef(false);
  const destPosRef = useRef(new THREE.Vector3().copy(DEFAULT_POS));
  const destTargetRef = useRef(new THREE.Vector3().copy(DEFAULT_TARGET));

  // 시점 버튼을 누르면 그 시점으로 (사용자가 돌려 놓은 시점은 초기화)
  useEffect(() => {
    userMovedRef.current = false;
    presetPose(viewPreset, aspectStep, destPosRef.current, destTargetRef.current);
    isTransitioningRef.current = true;
  }, [viewPreset, presetTrigger]);

  // 화면 비율이 바뀌면(창 크기 · 패널 서랍) 기본 시점 거리만 다시 맞춤. 사용자가 직접 돌린 뒤에는 그대로 둠
  useEffect(() => {
    if (userMovedRef.current) return;
    presetPose(viewPreset, aspectStep, destPosRef.current, destTargetRef.current);
    isTransitioningRef.current = true;
  }, [aspectStep]);

  useFrame((_, delta) => {
    if (isTransitioningRef.current && controlsRef.current) {
      // 지수 감쇠(damp): 프레임 속도와 관계없이 같은 시간에 부드럽게 감속하며 도착 (관성 있는 카메라 워크)
      const t = 1 - Math.exp(-3.2 * Math.min(delta, 0.1));
      camera.position.lerp(destPosRef.current, t);
      controlsRef.current.target.lerp(destTargetRef.current, t);
      controlsRef.current.update();

      const posDist = camera.position.distanceTo(destPosRef.current);
      const targetDist = controlsRef.current.target.distanceTo(destTargetRef.current);
      if (posDist < 0.04 && targetDist < 0.04) {
        camera.position.copy(destPosRef.current);
        controlsRef.current.target.copy(destTargetRef.current);
        controlsRef.current.update();
        isTransitioningRef.current = false;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      // 사용자가 직접 돌리기 시작하면 자동 시점 전환을 멈춤 (서로 끌어당기지 않게)
      onStart={() => {
        isTransitioningRef.current = false;
        userMovedRef.current = true;
      }}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.6}
      zoomSpeed={0.7}
      autoRotate={isAutoRotate}
      autoRotateSpeed={0.8}
      minDistance={3.5}
      maxDistance={18}
      maxPolarAngle={Math.PI / 2 - 0.05}
      target={[0, 1.2, 0]}
    />
  );
}

