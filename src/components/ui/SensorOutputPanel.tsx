'use client';

import React from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { Thermometer, Droplets, Sun, Activity, Download, Gauge, AlertTriangle } from 'lucide-react';
import { useRoomDevices } from '@/core/rooms/useRoomDevices';
import { baseSensorStatus, describeCustom } from '@/core/rooms/devices';
import { SensorData } from '@/core/types/iot';

// 기본 센서 상태 배지 (수신 대기 / 경고 범위 / 정상)
function BaseBadge({ sensor, okText, okCls }: { sensor: SensorData; okText: string; okCls: string }) {
  const st = baseSensorStatus(sensor);
  const cls =
    st === 'stale'
      ? 'bg-slate-50 text-slate-400 border-slate-200'
      : st === 'warn'
        ? 'bg-rose-50 text-rose-600 border-rose-200'
        : okCls;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {st === 'stale' ? '수신 대기' : st === 'warn' ? '경고 범위' : okText}
    </span>
  );
}

export function SensorOutputPanel() {
  const sensors = useIoTStore((s) => s.sensors);
  const mode = useIoTStore((s) => s.mode);
  const customSensors = useIoTStore((s) => s.customSensors);
  // 업로드 공간은 이 공간의 Pico 에 연결한 기본 장치(baseDevices)만 표시
  const { dht11: useDht, cds: useCds, customDefs } = useRoomDevices();
  // code.py / mock.js 가 보냈지만 room.json customSensors 에 없는 key (오타 · 등록 누락)
  const unknownKeys = Object.keys(customSensors).filter((k) => !customDefs.some((d) => d.key === k));

  const temp = sensors.dht11_temp;
  const humi = sensors.dht11_humi;
  const light = sensors.cds_light;

  const exportCsv = () => {
    const now = new Date().toISOString();
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      '타임스탬프,센서명,측정값,단위\n' +
      (useDht ? `${now},온도(DHT11),${temp.value.toFixed(1)},℃\n${now},습도(DHT11),${humi.value.toFixed(1)},%\n` : '') +
      (useCds ? `${now},조도(Cds),${light.value},ADC\n` : '') +
      customDefs
        .map((d) => `${new Date().toISOString()},${d.name}(${d.key}),${customSensors[d.key]?.value ?? ''},${d.unit}\n`)
        .join('');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `iot_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <aside className="w-[340px] h-full flex flex-col bg-[#F8FAFC] border-l border-slate-200/80 p-4 gap-4 shrink-0 overflow-y-auto select-none">
      {/* 1. 상단 패널 타이틀 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">실시간 센서 출력</h2>
            <span className="text-[10px] text-slate-400">
              {mode === 'simulation' ? '시뮬레이터 난수 스트림' : 'Pico 2 W ADC/디지털 버스'}
            </span>
          </div>
        </div>

        <button
          onClick={exportCsv}
          className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 text-[11px] font-semibold transition-all flex items-center gap-1 shadow-2xs"
          title="측정 데이터 CSV 파일 다운로드"
        >
          <Download className="w-3.5 h-3.5" />
          <span>CSV</span>
        </button>
      </div>

      {useDht && (
      <>
      {/* 2. DHT11 온도 상세 카드 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-rose-500" />
            실내 온도 (DHT11 · GP15)
          </span>
          <BaseBadge sensor={temp} okText="정상 범위" okCls="bg-emerald-50 text-emerald-600 border-emerald-200" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 font-mono">
            {temp.isStale ? '--' : temp.value.toFixed(1)}
          </span>
          <span className="text-xs font-bold text-slate-400">℃</span>
          <span className="text-[11px] text-slate-400 ml-auto font-medium">
            정상: {temp.minWarning ?? '-'} ~ {temp.maxWarning ?? '-'}℃
          </span>
        </div>

        {/* 온도 게이지 바 */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-emerald-400 to-rose-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, (temp.value / 40) * 100))}%` }}
          />
        </div>
      </div>

      {/* 3. DHT11 습도 상세 카드 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Droplets className="w-4 h-4 text-sky-500" />
            실내 습도 (DHT11 · GP15)
          </span>
          <BaseBadge sensor={humi} okText="적정 상태" okCls="bg-sky-50 text-sky-600 border-sky-200" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 font-mono">
            {humi.isStale ? '--' : humi.value.toFixed(0)}
          </span>
          <span className="text-xs font-bold text-slate-400">%</span>
          <span className="text-[11px] text-slate-400 ml-auto font-medium">
            정상: {humi.minWarning ?? '-'} ~ {humi.maxWarning ?? '-'}%
          </span>
        </div>

        {/* 습도 게이지 바 */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, humi.value))}%` }}
          />
        </div>
      </div>

      </>
      )}

      {useCds && (
      // 4. Cds 조도 센서 상세 카드
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-500" />
            주변 조도 (Cds · GP26 / ADC0)
          </span>
          <BaseBadge sensor={light} okText="아날로그 수집 중" okCls="bg-amber-50 text-amber-600 border-amber-200" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 font-mono">
            {light.isStale ? '--' : light.value.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-slate-400">/ 65,535 ADC</span>
        </div>

        {/* 조도 비례 바 */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, (light.value / 65535) * 100))}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400">
          * 3D 방의 Ambient Light 밝기가 이 조도 값에 따라 자동 연동됩니다.
        </span>
      </div>

      )}

      {/* 4-1. 팀 확장 센서 (room.json customSensors) */}
      {customDefs.map((def) => {
        const view = describeCustom(def, customSensors[def.key]);
        return (
          <div key={def.key} className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-2xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-blue-500" />
                {def.name} <code className="text-[10px] text-slate-400">{def.key}</code>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  view.stale
                    ? 'bg-slate-50 text-slate-400 border-slate-200'
                    : view.warn
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}
              >
                {view.stale ? '수신 대기' : view.warn ? '경고 범위' : view.isState ? '상태값 (0/1)' : '팀 확장 센서'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{view.text}</span>
              <span className="text-[11px] text-slate-400 ml-auto font-medium">
                {view.isState ? '0 = 꺼짐 · 1 = 켜짐' : `${def.min ?? 0} ~ ${def.max ?? 100}${def.unit ? ` ${def.unit}` : ''}`}
              </span>
            </div>
            {!view.isState && (
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${view.warn ? 'bg-rose-500' : 'bg-blue-500'}`}
                  style={{ width: `${view.stale ? 0 : view.ratio}%` }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* 4-2. room.json 에 없는 값 (key 오타 · 등록 누락 디버깅) */}
      {unknownKeys.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex flex-col gap-1.5">
          <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            room.json customSensors 에 없는 값
          </span>
          {unknownKeys.map((k) => (
            <code key={k} className="text-[11px] text-amber-900 font-bold">
              {k} = {customSensors[k].value}
            </code>
          ))}
          <span className="text-[10px] text-amber-700 leading-relaxed">
            {mode === 'simulation' ? 'mock.js' : 'code.py read()'} 가 보낸 key 가 room.json 에 없습니다. key 오타이거나 customSensors 등록이 빠졌습니다. (화면 · 게이지에 쓰이지 않음)
          </span>
        </div>
      )}

      {/* 5. 실시간 센서 패킷 피드 */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-slate-400 tracking-wider">
          실시간 센서 패킷 로그 (최근 갱신)
        </span>
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs font-mono text-[11px] flex flex-col gap-1.5">
          {[
            ...(useDht
              ? [
                  { id: 'DHT11_TEMP', text: temp.isStale ? '--' : `${temp.value.toFixed(1)}℃` },
                  { id: 'DHT11_HUMI', text: humi.isStale ? '--' : `${humi.value.toFixed(0)}%` },
                ]
              : []),
            ...(useCds ? [{ id: 'CDS_LIGHT', text: light.isStale ? '--' : `${light.value} ADC` }] : []),
            ...customDefs.map((def) => ({
              id: `CUSTOM.${def.key.toUpperCase()}`,
              text: describeCustom(def, customSensors[def.key]).text,
            })),
          ].map((row, i) => (
            <div key={row.id} className={`flex items-center justify-between text-slate-500 ${i > 0 ? 'border-t border-slate-100 pt-1' : ''}`}>
              <span>{row.id}</span>
              <span className="text-slate-800 font-bold">{row.text}</span>
            </div>
          ))}
          {!useDht && !useCds && customDefs.length === 0 && <span className="text-slate-400">표시할 센서가 없습니다.</span>}
        </div>
      </div>
    </aside>
  );
}
