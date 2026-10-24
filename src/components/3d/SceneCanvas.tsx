'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { SmartHomeRoom } from './SmartHomeRoom';
import { SmartFarmRoom } from './SmartFarmRoom';
import { SmartFactoryRoom } from './SmartFactoryRoom';
import { CameraRig } from './CameraRig';
import { DynamicRoom } from './DynamicRoom';
import { RoomPackage } from '@/core/types/iot';
import { useIoTStore } from '@/core/store/useIoTStore';

interface SceneCanvasProps {
  approvalStatus?: 'pending' | 'approved';
  onApprove?: () => void;
  onReview?: () => void;
  isModalOpen?: boolean;
  roomId?: string;
  // 업로드 공간이면 해당 꾸러미 (Scene.tsx 런타임 적용), 기본 예제 공간이면 null
  roomPackage?: RoomPackage | null;
  cameraPreset?: 'default' | 'overview';
  cameraTrigger?: number;
}

export function SceneCanvas({
  approvalStatus = 'pending',
  onApprove = () => {},
  onReview = () => {},
  isModalOpen = false,
  roomId = 'builtin_home',
  roomPackage = null,
  cameraPreset = 'default',
  cameraTrigger = 0,
}: SceneCanvasProps) {
  const lightVal = useIoTStore((s) => s.sensors.cds_light.value);
  const rgbState = useIoTStore((s) => s.actuators.rgb_light.reportedState);
  const rgbColor = useIoTStore((s) => s.actuators.rgb_light.reportedColor) || '#3B82F6';
  const setSelectedDevice = useIoTStore((s) => s.setSelectedDevice);

  const isLightOn = rgbState === 'ON';
  const normalizedLight = Math.min(1, Math.max(0, lightVal / 65535));

  // 밝고 화사한 스튜디오 조명 (Nomadian 스타일)
  const ambientIntensity = 0.75 + normalizedLight * 0.15;
  const ambientColor = '#FFFFFF';

  return (
    <div
      className="w-full h-full relative"
      onClick={() => setSelectedDevice(null)}
    >
      <Canvas
        shadows
        camera={{ position: [6.8, 5.2, 7.2], fov: 38 }}
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        {/* 1. 화사하고 부드러운 헤미스피어 라이트 */}
        <hemisphereLight
          color={isLightOn ? rgbColor : '#FFFFFF'}
          groundColor="#E2E8F0"
          intensity={0.45}
        />

        {/* 2. Cds 조도 센서 연동 앰비언트 라이트 */}
        <ambientLight color={ambientColor} intensity={ambientIntensity} />

        {/* 3. 부드러운 자연광 (Studio Key Light) */}
        <directionalLight
          position={[7.0, 9.0, 5.0]}
          intensity={1.1}
          color="#FFFDF7"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={25}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
          shadow-bias={-0.0005}
        />

        {/* 4. 창문 측 부드러운 보조광 (Fill Light) */}
        <directionalLight
          position={[-5.0, 4.0, -4.0]}
          intensity={0.4}
          color="#E0F2FE"
          castShadow={false}
        />

        {/* 3D 씬 컴포넌트: 팀 업로드 공간 / 스마트팜 온실 / 스마트 팩토리 공정 / 스마트 거실 허브 */}
        {roomPackage && roomPackage.meta.id === roomId ? (
          <DynamicRoom pkg={roomPackage} isModalOpen={isModalOpen} />
        ) : !roomId.startsWith('builtin_') ? null : roomId === 'builtin_farm' ? (
          <SmartFarmRoom isModalOpen={isModalOpen} />
        ) : roomId === 'builtin_factory' ? (
          <SmartFactoryRoom isModalOpen={isModalOpen} />
        ) : (
          <SmartHomeRoom
            approvalStatus={approvalStatus}
            onApprove={onApprove}
            onReview={onReview}
            isModalOpen={isModalOpen}
          />
        )}
        <CameraRig viewPreset={cameraPreset} presetTrigger={cameraTrigger} />
      </Canvas>
    </div>
  );
}
