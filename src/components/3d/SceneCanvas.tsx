'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { SmartHomeRoom } from './SmartHomeRoom';
import { SmartFarmRoom } from './SmartFarmRoom';
import { SmartFactoryRoom } from './SmartFactoryRoom';
import { CameraRig } from './CameraRig';
import { DynamicRoom } from './DynamicRoom';
import { RenderPipeline } from './RenderPipeline';
import { useGraphicsStore } from '@/core/graphics/useGraphicsStore';
import { RoomPackage } from '@/core/types/iot';
import { useIoTStore } from '@/core/store/useIoTStore';
import { roomUsesDevice } from '@/core/rooms/devices';

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

  // RGB · Cds 를 연결하지 않은 업로드 공간은 그 값으로 방 조명을 바꾸지 않음 (기본 파란색 물듦 방지)
  const usesRgb = roomUsesDevice(roomPackage, 'rgb');
  const usesCds = roomUsesDevice(roomPackage, 'cds');
  const isLightOn = usesRgb && rgbState === 'ON';
  const normalizedLight = usesCds ? Math.min(1, Math.max(0, lightVal / 65535)) : 0.6;

  // 고급 품질은 환경광(IBL)이 채움광을 맡으므로 앰비언트를 줄여 입체감을 살림
  const quality = useGraphicsStore((s) => s.quality);
  const high = quality === 'high';
  const ambientIntensity = (high ? 0.16 : 0.75) + normalizedLight * (high ? 0.08 : 0.15);
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
        dpr={[1, high ? 1.75 : 1]}
        gl={{ antialias: !high, alpha: true, powerPreference: 'high-performance' }}
      >
        {/* 0. 환경광 · 후처리 · 자동 품질 조절 */}
        <RenderPipeline />

        {/* 1. 화사하고 부드러운 헤미스피어 라이트 */}
        <hemisphereLight
          color={isLightOn ? rgbColor : '#FFFFFF'}
          groundColor="#E2E8F0"
          intensity={high ? 0.22 : 0.45}
        />

        {/* 2. Cds 조도 센서 연동 앰비언트 라이트 */}
        <ambientLight color={ambientColor} intensity={ambientIntensity} />

        {/* 3. 부드러운 자연광 (Studio Key Light) */}
        <directionalLight
          position={[7.0, 9.0, 5.0]}
          intensity={high ? 1.25 : 1.1}
          color="#FFF6E8"
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
          shadow-normalBias={0.02}
          shadow-radius={high ? 6 : 3}
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
