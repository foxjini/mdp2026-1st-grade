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

export function CameraRig({ viewPreset = 'default', presetTrigger = 0 }: CameraRigProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isAutoRotate = useIoTStore((s) => s.isAutoRotate);
  const { camera } = useThree();

  const isTransitioningRef = useRef(false);
  const destPosRef = useRef(new THREE.Vector3().copy(DEFAULT_POS));
  const destTargetRef = useRef(new THREE.Vector3().copy(DEFAULT_TARGET));

  useEffect(() => {
    if (viewPreset === 'overview') {
      destPosRef.current.copy(OVERVIEW_POS);
      destTargetRef.current.copy(OVERVIEW_TARGET);
    } else {
      destPosRef.current.copy(DEFAULT_POS);
      destTargetRef.current.copy(DEFAULT_TARGET);
    }
    isTransitioningRef.current = true;
  }, [viewPreset, presetTrigger]);

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

