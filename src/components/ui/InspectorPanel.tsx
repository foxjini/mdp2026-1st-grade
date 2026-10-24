'use client';

import React, { useState } from 'react';
import {
  Check,
  User,
  Loader2,
  Sliders,
  DoorClosed,
  Lightbulb,
  Thermometer,
  Droplets,
  Sun,
  ChevronDown,
  Cpu,
} from 'lucide-react';
import { useIoTStore } from '@/core/store/useIoTStore';

const PRESET_COLORS = [
  { name: '오션 블루', color: '#3B82F6' },
  { name: '웜 화이트', color: '#FDE047' },
  { name: '네온 에메랄드', color: '#10B981' },
  { name: '로맨틱 퍼플', color: '#A855F7' },
  { name: '선셋 레드', color: '#EF4444' },
];

interface InspectorPanelProps {
  onApproveProposal: () => void;
  onOpenReviewModal?: () => void;
  approvalStatus: 'pending' | 'approved';
}

export function InspectorPanel({
  onApproveProposal,
  onOpenReviewModal,
  approvalStatus,
}: InspectorPanelProps) {
  const sensors = useIoTStore((s) => s.sensors);
  const actuators = useIoTStore((s) => s.actuators);
  const setServoAngle = useIoTStore((s) => s.setServoAngle);
  const setRgbColor = useIoTStore((s) => s.setRgbColor);
  const setRgbState = useIoTStore((s) => s.setRgbState);

  const door = actuators.sg90_door;
  // 업로드 공간은 이 공간의 Pico 에 연결한 기본 장치(baseDevices)만 제어 위젯 표시
  const roomPackage = useIoTStore((s) => s.activeRoomPackage);
  const useSg90 = !roomPackage || roomPackage.meta.baseDevices.includes('sg90');
  const useRgbLed = !roomPackage || roomPackage.meta.baseDevices.includes('rgb');
  const useDht = !roomPackage || roomPackage.meta.baseDevices.includes('dht11');
  const useCds = !roomPackage || roomPackage.meta.baseDevices.includes('cds');
  const light = actuators.rgb_light;

  const [showActuatorControls, setShowActuatorControls] = useState(true);

  return (
    <aside className="w-[340px] h-full flex flex-col bg-[#F8FAFC] border-l border-slate-200/80 p-4 gap-4 shrink-0 overflow-y-auto select-none">
      {/* 1. 상단 IoT 코어 에이전트 프로필 카드 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* 코어 마이크로컨트롤러 아바타 */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-sky-400 p-0.5 shadow-xs flex items-center justify-center overflow-hidden">
              <div className="w-full h-full rounded-[14px] bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">Pico 2 W 코어</span>
                <span className="text-[11px] text-slate-400 font-medium">
                  통합 제어 허브
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                CircuitPython 9.2.1 · RP2350
              </span>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200/80">
            정상 가동
          </span>
        </div>

        <p className="text-xs text-slate-500 font-normal leading-relaxed">
          명령 대기 중입니다. 하단 입력창 또는 컨트롤러를 통해 조작하세요.
        </p>

        {/* 접이식 하드웨어 실시간 제어 슬라이더 & 센서 모니터 */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
          <div
            onClick={() => setShowActuatorControls(!showActuatorControls)}
            className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>하드웨어 액추에이터 제어</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                showActuatorControls ? 'rotate-180' : ''
              }`}
            />
          </div>

          {showActuatorControls && (
            <div className="flex flex-col gap-3.5 pt-1">
              {!useSg90 && !useRgbLed && (
                <div className="p-2.5 rounded-xl border border-dashed border-slate-300 text-[11px] text-slate-500">
                  이 공간의 Pico 에는 SG90 · RGB LED 가 연결되어 있지 않습니다. 확장 장치는 3D 화면에서 조작하세요.
                </div>
              )}

              {/* SG90 도어 서보모터 */}
              {useSg90 && (
              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <DoorClosed className="w-3.5 h-3.5 text-amber-500" />
                    스마트 도어 (SG90)
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-600">
                    {door.pending ? (
                      <span className="flex items-center gap-1 text-[10px] text-blue-500">
                        <Loader2 className="w-3 h-3 animate-spin" /> 구동 중
                      </span>
                    ) : (
                      `${door.reportedAngle}°`
                    )}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="180"
                  step="5"
                  value={door.targetAngle}
                  disabled={door.pending}
                  onChange={(e) => setServoAngle(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <div className="grid grid-cols-4 gap-1">
                  {[0, 45, 90, 180].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => setServoAngle(deg)}
                      disabled={door.pending}
                      className={`py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                        door.reportedAngle === deg
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {deg === 0 ? '닫힘' : `${deg}°`}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* RGB LED 조명 */}
              {useRgbLed && (
              <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                    실내 무드등 (RGB LED)
                  </span>
                  <button
                    onClick={() =>
                      setRgbState(light.reportedState === 'ON' ? 'OFF' : 'ON')
                    }
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                      light.reportedState === 'ON'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {light.reportedState === 'ON' ? '켜짐' : '꺼짐'}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  {PRESET_COLORS.map((item) => (
                    <button
                      key={item.color}
                      onClick={() => {
                        setRgbColor(item.color);
                        if (light.reportedState !== 'ON') setRgbState('ON');
                      }}
                      className="w-6 h-6 rounded-full border border-slate-300/80 shadow-2xs hover:scale-110 transition-transform relative flex items-center justify-center"
                      style={{ backgroundColor: item.color }}
                      title={item.name}
                    >
                      {light.reportedColor === item.color && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-md stroke-[3]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* 센서 텔레메트리 칩 (DHT11 & Cds) */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-white p-2 rounded-xl border border-slate-200/70 flex flex-col items-center shadow-2xs">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Thermometer className="w-3 h-3 text-rose-500" />
                    <span>실내 온도</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5">
                    {useDht ? `${sensors.dht11_temp.value.toFixed(1)}℃` : '미사용'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-200/70 flex flex-col items-center shadow-2xs">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Droplets className="w-3 h-3 text-sky-500" />
                    <span>실내 습도</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5">
                    {useDht ? `${sensors.dht11_humi.value.toFixed(0)}%` : '미사용'}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-xl border border-slate-200/70 flex flex-col items-center shadow-2xs">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>센서 조도</span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 mt-0.5">
                    {!useCds
                      ? '미사용'
                      : sensors.cds_light.value > 1000
                        ? `${(sensors.cds_light.value / 1000).toFixed(0)}k`
                        : sensors.cds_light.value}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. 사용자 확인 필요 (승인 요청 카드) */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-slate-400 tracking-wider">
          사용자 확인 필요
        </span>

        {/* 승인 대기 카드 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-black text-[9px] tracking-wide">
              승인 필요
            </span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              환기 자동화 규칙 승인 대기
            </span>
            <span className="text-[10px] text-slate-400 font-medium ml-auto">
              2분 58초 남음
            </span>
          </div>

          <p className="text-xs text-slate-600 font-normal leading-relaxed">
            {approvalStatus === 'pending'
              ? '실내 온도(28.4℃) 상승 감지. 쾌적한 실내 환경 유지를 위해 스마트 도어를 90°로 개방할까요?'
              : '✅ 승인이 완료되어 스마트 도어 90° 개방 및 자동 환기 시퀀스가 적용되었습니다.'}
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onOpenReviewModal}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              상태 검토
            </button>
            <button
              onClick={onApproveProposal}
              disabled={approvalStatus === 'approved'}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                approvalStatus === 'approved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
              }`}
            >
              {approvalStatus === 'approved' ? '승인 완료' : '동작 승인'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. 실시간 제어 및 텔레메트리 현황 타임라인 섹션 */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-slate-400 tracking-wider">
          실시간 제어 및 텔레메트리 현황
        </span>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-0 relative">
          {/* 세로 타임라인 연결선 */}
          <div className="absolute left-[29px] top-7 bottom-7 w-0.5 bg-slate-200 z-0" />

          {/* Step 1 */}
          <div className="flex items-start gap-3 relative z-10 py-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-900">스마트 도어 (SG90)</span>
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-0.5">
                명령 수신 및 PWM 신호 동기화
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                서보모터 각도 90° 제어 신호 전달 완료
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 relative z-10 py-2">
            <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-900">온습도 센서 (DHT11)</span>
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-0.5">
                디지털 버스 샘플링 완료
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                실내 온도 24.2℃, 습도 48% 정상 수집
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 relative z-10 py-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-900">조도 센서 (Cds)</span>
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-0.5">
                ADC0 아날로그 전압 판독
              </span>
              <span className="text-[11px] text-slate-400 font-medium leading-tight">
                실내 조도 38,200 ADC 값 실시간 반영 중
              </span>
            </div>
          </div>

          {/* Step 4: RGB 무드등 보간 진행 중 (57%) */}
          <div className="flex items-start gap-3 relative z-10 py-2">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs shadow-blue-500/30">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="flex flex-col min-w-0 w-full">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-900">실내 무드등 (RGB LED)</span>
              </div>
              <span className="text-xs font-semibold text-slate-700 mt-0.5">
                색조 보간 전환 중
              </span>
              <span className="text-[11px] text-slate-400 font-medium mb-1.5">
                오션 블루 색상 부드러운 전환 진행 중
              </span>

              {/* 57% 프로그레스 바 */}
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: '57%' }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  57 %
                </span>
              </div>
            </div>
          </div>

          {/* Step 5: 다음 주기 대기 */}
          <div className="flex items-start gap-3 relative z-10 pt-2 pb-1">
            <div className="w-6 h-6 rounded-full bg-white border-2 border-dashed border-slate-300 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-500">
                다음 주기 대기
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Pico 2 W 하드웨어 주기적 헬스체크 대기 중
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
