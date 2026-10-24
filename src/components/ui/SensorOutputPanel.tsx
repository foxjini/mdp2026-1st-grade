'use client';

import React from 'react';
import { useIoTStore } from '@/core/store/useIoTStore';
import { Thermometer, Droplets, Sun, Activity, Download, RefreshCw, Gauge } from 'lucide-react';

export function SensorOutputPanel() {
  const sensors = useIoTStore((s) => s.sensors);
  const mode = useIoTStore((s) => s.mode);
  const customSensors = useIoTStore((s) => s.customSensors);
  const roomPackage = useIoTStore((s) => s.activeRoomPackage);
  const customDefs = roomPackage?.meta.customSensors || [];

  const temp = sensors.dht11_temp;
  const humi = sensors.dht11_humi;
  const light = sensors.cds_light;

  const exportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      '타임스탬프,센서명,측정값,단위\n' +
      `${new Date().toISOString()},온도(DHT11),${temp.value.toFixed(1)},℃\n` +
      `${new Date().toISOString()},습도(DHT11),${humi.value.toFixed(1)},%\n` +
      `${new Date().toISOString()},조도(Cds),${light.value},ADC\n` +
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

      {/* 2. DHT11 온도 상세 카드 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-rose-500" />
            실내 온도 (DHT11 · GP15)
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            정상 범위
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 font-mono">
            {temp.value.toFixed(1)}
          </span>
          <span className="text-xs font-bold text-slate-400">℃</span>
          <span className="text-[11px] text-slate-400 ml-auto font-medium">
            권장: 18.0 ~ 26.0℃
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
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-600 border border-sky-200">
            적정 상태
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 font-mono">
            {humi.value.toFixed(0)}
          </span>
          <span className="text-xs font-bold text-slate-400">%</span>
          <span className="text-[11px] text-slate-400 ml-auto font-medium">
            권장: 40 ~ 60%
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

      {/* 4. Cds 조도 센서 상세 카드 */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-500" />
            주변 조도 (Cds · GP26 / ADC0)
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
            아날로그 수집 중
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900 font-mono">
            {light.value.toLocaleString()}
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

      {/* 4-1. 팀 확장 센서 (room.json customSensors) */}
      {customDefs.map((def) => {
        const sensor = customSensors[def.key];
        const min = def.min ?? 0;
        const max = def.max ?? 100;
        const value = sensor?.value ?? min;
        const ratio = max > min ? ((value - min) / (max - min)) * 100 : 0;
        const warn =
          sensor && !sensor.isStale &&
          ((def.minWarning !== undefined && value < def.minWarning) || (def.maxWarning !== undefined && value > def.maxWarning));
        return (
          <div key={def.key} className="bg-white rounded-2xl p-4 border border-blue-200/80 shadow-2xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-blue-500" />
                {def.name} <code className="text-[10px] text-slate-400">{def.key}</code>
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  !sensor || sensor.isStale
                    ? 'bg-slate-50 text-slate-400 border-slate-200'
                    : warn
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}
              >
                {!sensor || sensor.isStale ? '수신 대기' : warn ? '경고 범위' : '팀 확장 센서'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {sensor && !sensor.isStale ? Number(value.toFixed(2)) : '--'}
              </span>
              <span className="text-xs font-bold text-slate-400">{def.unit}</span>
              <span className="text-[11px] text-slate-400 ml-auto font-medium">
                {min} ~ {max}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, ratio))}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* 5. 실시간 센서 패킷 피드 */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-slate-400 tracking-wider">
          실시간 센서 패킷 로그 (최근 갱신)
        </span>
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs font-mono text-[11px] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-1">
            <span>DHT11_TEMP</span>
            <span className="text-slate-800 font-bold">{temp.value.toFixed(1)}℃</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-1">
            <span>DHT11_HUMI</span>
            <span className="text-slate-800 font-bold">{humi.value.toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between text-slate-500">
            <span>CDS_LIGHT</span>
            <span className="text-slate-800 font-bold">{light.value} ADC</span>
          </div>
          {customDefs.map((def) => (
            <div key={def.key} className="flex items-center justify-between text-slate-500 border-t border-slate-100 pt-1">
              <span>CUSTOM.{def.key.toUpperCase()}</span>
              <span className="text-slate-800 font-bold">
                {customSensors[def.key] && !customSensors[def.key].isStale ? `${customSensors[def.key].value}${def.unit}` : '--'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
