'use client';

import React, { useState } from 'react';
import {
  Check,
  Loader2,
  Sliders,
  DoorClosed,
  Lightbulb,
  Thermometer,
  Droplets,
  Sun,
  ChevronDown,
  Cpu,
  Gauge,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { useRoomDevices } from '@/core/rooms/useRoomDevices';
import { useAutomationStore } from '@/core/automation/useAutomationStore';
import { baseSensorStatus, describeCustom } from '@/core/rooms/devices';

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

type RowState = 'ok' | 'pending' | 'stale' | 'warn' | 'error';

interface StatusRow {
  key: string;
  name: string;
  detail: string;
  state: RowState;
  swatch?: string;
}

export function InspectorPanel({
  onApproveProposal,
  onOpenReviewModal,
  approvalStatus,
}: InspectorPanelProps) {
  const sensors = useIoTStore((s) => s.sensors);
  const actuators = useIoTStore((s) => s.actuators);
  const customSensors = useIoTStore((s) => s.customSensors);
  const mode = useIoTStore((s) => s.mode);
  const connectionState = useIoTStore((s) => s.connectionState);
  const picoIp = useIoTStore((s) => s.picoIpAddress);
  const lastResult = useIoTStore((s) => s.lastCommandResult);
  // 자동화 규칙(고온 감지)이 요청한 승인이면 업로드 공간에서도 카드 표시
  const approval = useAutomationStore((s) => s.approval);
  const setServoAngle = useIoTStore((s) => s.setServoAngle);
  const setRgbColor = useIoTStore((s) => s.setRgbColor);
  const setRgbState = useIoTStore((s) => s.setRgbState);

  // 업로드 공간은 이 공간의 Pico 에 연결한 기본 장치(baseDevices)와 room.json 확장 센서만 표시
  const devices = useRoomDevices();
  const door = actuators.sg90_door;
  const light = actuators.rgb_light;
  const servoLabel = devices.isUploaded ? '서보모터 (SG90 · GP16)' : '스마트 도어 (SG90)';
  const rgbLabel = devices.isUploaded ? 'RGB LED (GP18~20)' : '실내 무드등 (RGB LED)';

  const [showActuatorControls, setShowActuatorControls] = useState(true);

  // 연결 상태 배지 (시뮬레이션 / 연결됨 / 연결 중 / 응답 없음)
  const status =
    mode === 'simulation'
      ? { text: '시뮬레이션', cls: 'bg-sky-50 text-sky-600 border-sky-200/80', desc: '하드웨어 없이 시뮬레이션 값(mock)으로 동작 중입니다.' }
      : connectionState === 'connected'
        ? { text: '연결됨', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200/80', desc: `이 공간의 Pico 2 W (${picoIp}) 와 통신 중입니다.` }
        : connectionState === 'connecting'
          ? { text: '연결 중', cls: 'bg-amber-50 text-amber-600 border-amber-200/80', desc: `Pico 2 W (${picoIp}) 에 연결하는 중입니다.` }
          : { text: '응답 없음', cls: 'bg-rose-50 text-rose-600 border-rose-200/80', desc: `Pico 2 W (${picoIp || 'IP 미지정'}) 가 응답하지 않습니다. 전원 · Wi-Fi · IP 를 확인하세요.` };

  // 센서 칩: 이 공간에서 쓰는 기본 센서만, 값이 안 들어오면 '수신 대기'
  const sensorChips = [
    devices.dht11 && { key: 'temp', label: '온도', icon: <Thermometer className="w-3 h-3 text-rose-500" />, sensor: sensors.dht11_temp, text: `${sensors.dht11_temp.value.toFixed(1)}℃` },
    devices.dht11 && { key: 'humi', label: '습도', icon: <Droplets className="w-3 h-3 text-sky-500" />, sensor: sensors.dht11_humi, text: `${sensors.dht11_humi.value.toFixed(0)}%` },
    devices.cds && {
      key: 'cds',
      label: '조도',
      icon: <Sun className="w-3 h-3 text-amber-500" />,
      sensor: sensors.cds_light,
      text: sensors.cds_light.value > 1000 ? `${(sensors.cds_light.value / 1000).toFixed(0)}k` : String(sensors.cds_light.value),
    },
  ].filter(Boolean) as Array<{ key: string; label: string; icon: React.ReactNode; sensor: typeof sensors.dht11_temp; text: string }>;

  // 실시간 장치 현황: 이 공간에 실제로 있는 장치의 현재 값 · 상태
  // Pico 자체가 응답하지 않으면 배선 · key 대신 연결 문제를 먼저 안내
  const picoDown = mode === 'hardware' && connectionState !== 'connected';
  const rows: StatusRow[] = [];
  if (devices.sg90) {
    rows.push({
      key: 'sg90',
      name: servoLabel,
      state: door.errorMessage ? 'error' : door.pending ? 'pending' : 'ok',
      detail: door.errorMessage
        ? `명령 실패: ${door.errorMessage}`
        : door.pending
          ? `${door.targetAngle}° 로 구동 중`
          : `현재 ${door.reportedAngle}°`,
    });
  }
  if (devices.rgb) {
    rows.push({
      key: 'rgb',
      name: rgbLabel,
      state: light.errorMessage ? 'error' : light.pending ? 'pending' : 'ok',
      detail: light.errorMessage
        ? `명령 실패: ${light.errorMessage}`
        : light.pending
          ? '색상 · 전원 변경 중'
          : `${light.reportedColor} · ${light.reportedState === 'ON' ? '켜짐' : '꺼짐'}`,
      swatch: light.reportedState === 'ON' ? light.reportedColor : undefined,
    });
  }
  if (devices.dht11) {
    const st = baseSensorStatus(sensors.dht11_temp);
    rows.push({
      key: 'dht11',
      name: '온습도 센서 (DHT11 · GP15)',
      state: st,
      detail:
        st === 'stale'
          ? picoDown ? '수신 대기 — Pico 응답 없음' : '수신 대기 — 값이 들어오지 않습니다 (배선 · dht_ok 확인)'
          : `${sensors.dht11_temp.value.toFixed(1)}℃ · ${sensors.dht11_humi.value.toFixed(0)}%`,
    });
  }
  if (devices.cds) {
    const st = baseSensorStatus(sensors.cds_light);
    rows.push({
      key: 'cds',
      name: '조도 센서 (Cds · GP26)',
      state: st,
      detail:
        st === 'stale'
          ? picoDown ? '수신 대기 — Pico 응답 없음' : '수신 대기 — 값이 들어오지 않습니다'
          : `${sensors.cds_light.value.toLocaleString()} / 65,535 ADC`,
    });
  }
  devices.customDefs.forEach((def) => {
    const view = describeCustom(def, customSensors[def.key]);
    rows.push({
      key: `custom-${def.key}`,
      name: `${def.name} (${def.key})`,
      state: view.stale ? 'stale' : view.warn ? 'warn' : 'ok',
      detail: view.stale
        ? picoDown
          ? '수신 대기 — Pico 응답 없음'
          : `수신 대기 — ${mode === 'simulation' ? 'mock.js' : 'code.py read()'} 가 이 key 를 보내는지 확인`
        : view.warn
          ? `${view.text} · 경고 범위`
          : view.text,
    });
  });

  return (
    <aside className="w-[340px] h-full flex flex-col bg-[#F8FAFC] border-l border-slate-200/80 p-4 gap-4 shrink-0 overflow-y-auto select-none">
      {/* 1. 상단 Pico 2 W 코어 카드 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-sky-400 p-0.5 shadow-xs flex items-center justify-center overflow-hidden">
              <div className="w-full h-full rounded-[14px] bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 whitespace-nowrap">Pico 2 W 코어</span>
              <span className="text-[10px] text-slate-400 whitespace-nowrap">이 공간 전용 · CircuitPython 10.x</span>
            </div>
          </div>

          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border whitespace-nowrap shrink-0 ${status.cls}`}>{status.text}</span>
        </div>

        <p className="text-xs text-slate-500 font-normal leading-relaxed">{status.desc}</p>

        {/* 접이식 하드웨어 실시간 제어 & 센서 모니터 */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-3">
          <div
            onClick={() => setShowActuatorControls(!showActuatorControls)}
            className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>기본 장치 제어</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showActuatorControls ? 'rotate-180' : ''}`}
            />
          </div>

          {showActuatorControls && (
            <div className="flex flex-col gap-3.5 pt-1">
              {!devices.sg90 && !devices.rgb && (
                <div className="p-2.5 rounded-xl border border-dashed border-slate-300 text-[11px] text-slate-500">
                  이 공간의 Pico 에는 SG90 · RGB LED 가 연결되어 있지 않습니다. 확장 장치는 3D 화면에서 조작하세요.
                </div>
              )}

              {/* SG90 서보모터 */}
              {devices.sg90 && (
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <DoorClosed className="w-3.5 h-3.5 text-amber-500" />
                      {servoLabel}
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
                        {deg === 0 && !devices.isUploaded ? '닫힘' : `${deg}°`}
                      </button>
                    ))}
                  </div>
                  {door.errorMessage && (
                    <p className="text-[10px] text-rose-600 font-semibold flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-px" /> {door.errorMessage}
                    </p>
                  )}
                </div>
              )}

              {/* RGB LED */}
              {devices.rgb && (
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-500" />
                      {rgbLabel}
                    </span>
                    <button
                      onClick={() => setRgbState(light.reportedState === 'ON' ? 'OFF' : 'ON')}
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
                  {light.errorMessage && (
                    <p className="text-[10px] text-rose-600 font-semibold flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-px" /> {light.errorMessage}
                    </p>
                  )}
                </div>
              )}

              {/* 기본 센서 칩 (DHT11 · Cds 중 사용하는 것만) */}
              {sensorChips.length > 0 && (
                <div className={`grid gap-1.5 ${sensorChips.length === 3 ? 'grid-cols-3' : sensorChips.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {sensorChips.map((chip) => (
                    <div key={chip.key} className="bg-white p-2 rounded-xl border border-slate-200/70 flex flex-col items-center shadow-2xs">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        {chip.icon}
                        <span>{chip.label}</span>
                      </div>
                      <span className={`text-xs font-extrabold mt-0.5 ${chip.sensor.isStale ? 'text-slate-400' : 'text-slate-800'}`}>
                        {chip.sensor.isStale ? '수신 대기' : chip.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. 팀 확장 장치 (업로드 공간: room.json customSensors + 최근 확장 명령) */}
      {devices.isUploaded && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider">팀 확장 장치 (room.json)</span>
          <div className="bg-white rounded-2xl p-3 border border-blue-200/70 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-2">
            {devices.customDefs.length === 0 && (
              <p className="text-[11px] text-slate-500">확장 센서가 없습니다. 기본 장치만 사용합니다.</p>
            )}
            {devices.customDefs.map((def) => {
              const view = describeCustom(def, customSensors[def.key]);
              return (
                <div key={def.key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 min-w-0">
                      <Gauge className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{def.name}</span>
                      <code className="text-[9px] text-slate-400">{def.key}</code>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        view.stale
                          ? 'bg-slate-50 text-slate-400 border-slate-200'
                          : view.warn
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : view.isState && view.text === '켜짐'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                      }`}
                    >
                      {view.stale ? '수신 대기' : view.text}
                    </span>
                  </div>
                  {!view.isState && (
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${view.warn ? 'bg-rose-500' : 'bg-blue-500'}`}
                        style={{ width: `${view.stale ? 0 : view.ratio}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="border-t border-slate-100 pt-2 flex items-start gap-1.5 text-[11px]">
              <Send className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-px" />
              {lastResult ? (
                <span className="text-slate-600">
                  최근 확장 명령 <code className="font-bold text-slate-800">{lastResult.action} = {String(lastResult.value)}</code>{' '}
                  →{' '}
                  {lastResult.ok ? (
                    <b className="text-emerald-600">처리 완료</b>
                  ) : (
                    <b className="text-rose-600">
                      실패 ({mode === 'simulation' ? 'mock.js onCommand' : 'code.py handle()'} 확인)
                    </b>
                  )}
                </span>
              ) : (
                <span className="text-slate-400">3D 화면에서 확장 장치를 클릭하면 명령 결과가 여기에 표시됩니다.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. 사용자 확인 필요 (기본 예제 공간 데모 · 자동화 규칙의 승인 요청) */}
      {(!devices.isUploaded || approval.ruleId) && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider">사용자 확인 필요</span>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-black text-[9px] tracking-wide">승인 필요</span>
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                환기 자동화 규칙 승인 대기
              </span>
            </div>

            <p className="text-xs text-slate-600 font-normal leading-relaxed">
              {approvalStatus === 'pending'
                ? approval.message || `실내 온도 ${sensors.dht11_temp.value.toFixed(1)}℃. 쾌적한 실내 환경 유지를 위해 스마트 도어를 90°로 개방할까요?`
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
      )}

      {/* 4. 실시간 장치 현황 (이 공간에 있는 장치만, 실제 값) */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-slate-400 tracking-wider">실시간 장치 현황</span>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-0 relative">
          {rows.length === 0 && <p className="text-[11px] text-slate-500">이 공간에 등록된 장치가 없습니다. room.json 을 확인하세요.</p>}
          {rows.length > 1 && <div className="absolute left-[29px] top-7 bottom-7 w-0.5 bg-slate-200 z-0" />}

          {rows.map((row) => (
            <div key={row.key} className="flex items-start gap-3 relative z-10 py-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  row.state === 'ok'
                    ? 'bg-slate-900 text-white'
                    : row.state === 'pending'
                      ? 'bg-blue-600 text-white'
                      : row.state === 'stale'
                        ? 'bg-white border-2 border-dashed border-slate-300 text-slate-400'
                        : 'bg-rose-100 border border-rose-300 text-rose-600'
                }`}
              >
                {row.state === 'ok' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                {row.state === 'pending' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {row.state === 'stale' && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                {(row.state === 'warn' || row.state === 'error') && <AlertTriangle className="w-3.5 h-3.5" />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">{row.name}</span>
                <span
                  className={`text-[11px] font-medium flex items-center gap-1.5 ${
                    row.state === 'warn' || row.state === 'error' ? 'text-rose-600' : 'text-slate-500'
                  }`}
                >
                  {row.swatch && <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: row.swatch }} />}
                  {row.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
