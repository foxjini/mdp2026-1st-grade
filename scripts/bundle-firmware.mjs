#!/usr/bin/env node
/**
 * 공간(팀)별 Pico 2 W 펌웨어 묶기 — Pico 1대 = 공간 1개
 *
 *   npm run firmware:bundle                          → 공간 목록 (공간 ID · IP · 기본 장치)
 *   npm run firmware:bundle -- <공간ID> <출력경로>
 *   예) npm run firmware:bundle -- room_mx1abc E:\     (Windows: 우리 팀 Pico 가 E: 드라이브일 때)
 *       npm run firmware:bundle -- room_mx1abc         (기본: firmware/dist/<공간ID>/)
 *       npm run firmware:bundle -- builtin_home E:\    (기본 예제 공간: 기본 4종만, 팀 모듈 없음)
 *
 * 1. firmware/circuitpython/code.py 를 복사합니다.
 * 2. config.py 를 만듭니다. (ROOM_ID, BASE_DEVICES ← room.json baseDevices)
 * 3. rooms-data/<공간ID>/code.py 를 teams/<공간ID>.py 로 복사합니다. (다른 팀 파일은 정리, ROOM_ID 자동 보정)
 * 4. settings.toml: 없으면 새로 만들고, room.json 의 picoIp 를 PICO_STATIC_IP 로 기록합니다. (Wi-Fi 정보는 유지)
 * 5. 예약 핀 충돌(이 공간이 사용하는 기본 장치 핀)과 Python 문법 오류를 보고합니다.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOMS_DIR = process.env.ROOMS_DATA_DIR || path.join(ROOT, 'rooms-data');
const FW_DIR = path.join(ROOT, 'firmware', 'circuitpython');
const ALL_BASE_DEVICES = ['dht11', 'cds', 'sg90', 'rgb'];
const BUILTIN = { builtin_home: '스마트 거실 허브', builtin_farm: '스마트 팜 온실', builtin_factory: '스마트 팩토리 공정' };

// src/core/types/iot.ts BASE_DEVICE_INFO · src/core/server/roomStore.ts reservedPins() 와 동일하게 유지
const BASE_DEVICE_PINS = {
  dht11: ['DHT11 온습도', ['GP15']],
  cds: ['Cds 조도', ['GP26']],
  sg90: ['SG90 서보', ['GP16']],
  rgb: ['RGB LED', ['GP18', 'GP19', 'GP20']],
};
const WIRELESS_PINS = ['GP23', 'GP24', 'GP25', 'GP29'];

function reservedPins(baseDevices) {
  const reserved = {};
  WIRELESS_PINS.forEach((pin) => (reserved[pin] = 'Pico 2 W 무선 모듈'));
  baseDevices.forEach((d) => BASE_DEVICE_PINS[d][1].forEach((pin) => (reserved[pin] = BASE_DEVICE_PINS[d][0])));
  return reserved;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function loadRooms() {
  const rooms = [];
  const builtinConn = readJson(path.join(ROOMS_DIR, '_builtin.json')) || {};
  for (const [id, name] of Object.entries(BUILTIN)) {
    rooms.push({ id, name, team: '기본 예제', baseDevices: ALL_BASE_DEVICES, pins: [], picoIp: builtinConn[id]?.picoIp || '', builtin: true });
  }
  let ids = [];
  try {
    ids = fs.readdirSync(ROOMS_DIR).filter((id) => /^[a-z0-9_-]+$/.test(id));
  } catch {
    // 공간 폴더 없음
  }
  for (const id of ids) {
    const meta = readJson(path.join(ROOMS_DIR, id, 'room.json'));
    if (!meta) continue;
    rooms.push({
      id,
      name: meta.name || id,
      team: meta.team || '',
      baseDevices: Array.isArray(meta.baseDevices) ? meta.baseDevices.filter((d) => ALL_BASE_DEVICES.includes(d)) : ALL_BASE_DEVICES,
      pins: Array.isArray(meta.pins) ? meta.pins : [],
      picoIp: meta.picoIp || '',
      hasCode: fs.existsSync(path.join(ROOMS_DIR, id, 'code.py')),
    });
  }
  return rooms;
}

function findPython() {
  for (const cmd of ['python3', 'python', 'py']) {
    const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return cmd;
  }
  return null;
}

const rooms = loadRooms();
const roomId = process.argv[2];

// 인자가 없으면 공간 목록 출력
if (!roomId) {
  console.log('사용법: npm run firmware:bundle -- <공간ID> <출력경로(CIRCUITPY 드라이브)>\n');
  console.log('공간 ID'.padEnd(22) + 'Pico IP'.padEnd(20) + '기본 장치'.padEnd(26) + '이름');
  for (const r of rooms) {
    console.log(
      r.id.padEnd(22) +
        (r.picoIp || '(미지정)').padEnd(20) +
        (r.baseDevices.join(',') || '(없음)').padEnd(26) +
        `${r.name}${r.team ? ` (${r.team})` : ''}${r.builtin || r.hasCode ? '' : '  ⚠ code.py 없음'}`
    );
  }
  process.exit(0);
}

const room = rooms.find((r) => r.id === roomId);
if (!room) {
  console.error(`✖ 공간 "${roomId}" 를 찾을 수 없습니다. 인자 없이 실행하면 공간 목록이 나옵니다.`);
  process.exit(1);
}

const OUT = path.resolve(process.argv[3] || path.join(ROOT, 'firmware', 'dist', room.id));
const warnings = [];
const errors = [];
const python = findPython();
if (!python) warnings.push('Python 이 없어 문법 검사를 건너뜁니다.');

function checkPythonSyntax(file, label) {
  if (!python) return;
  const r = spawnSync(python, ['-c', 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read())', file], {
    encoding: 'utf8',
  });
  if (r.status !== 0) errors.push(`${label}: Python 문법 오류\n${(r.stderr || '').trim().split('\n').slice(-3).join('\n')}`);
}

fs.mkdirSync(path.join(OUT, 'teams'), { recursive: true });

// 1. 펌웨어
fs.copyFileSync(path.join(FW_DIR, 'code.py'), path.join(OUT, 'code.py'));
checkPythonSyntax(path.join(OUT, 'code.py'), 'code.py (플랫폼 펌웨어)');

// 2. config.py
fs.writeFileSync(
  path.join(OUT, 'config.py'),
  `# npm run firmware:bundle 이 생성한 파일입니다. (공간: ${room.name})\n` +
    `ROOM_ID = ${JSON.stringify(room.id)}\n` +
    `BASE_DEVICES = ${JSON.stringify(room.baseDevices)}\n`,
  'utf8'
);

// 3. 팀 모듈 (이 Pico 에는 이 공간 하나만)
for (const f of fs.readdirSync(path.join(OUT, 'teams'))) {
  if (f.endsWith('.py')) fs.rmSync(path.join(OUT, 'teams', f));
}
let teamFile = null;
if (!room.builtin) {
  const src = path.join(ROOMS_DIR, room.id, 'code.py');
  if (!fs.existsSync(src)) {
    warnings.push('code.py 가 업로드되지 않아 기본 장치만 동작합니다. (확장 센서/명령 없음)');
  } else {
    let code = fs.readFileSync(src, 'utf8');
    const idLine = `ROOM_ID = "${room.id}"`;
    const m = code.match(/^ROOM_ID\s*=\s*["']([^"']*)["']/m);
    if (!m) code = `${idLine}\n${code}`;
    else if (m[1] !== room.id) {
      warnings.push(`ROOM_ID "${m[1]}" → "${room.id}" 로 보정했습니다.`);
      code = code.replace(m[0], idLine);
    }
    teamFile = `teams/${room.id.replace(/-/g, '_')}.py`;
    fs.writeFileSync(path.join(OUT, teamFile), code, 'utf8');
    checkPythonSyntax(path.join(OUT, teamFile), teamFile);
  }
}

// 4. settings.toml (Wi-Fi 는 유지, PICO_STATIC_IP 만 갱신)
const settingsPath = path.join(OUT, 'settings.toml');
let settings = fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : fs.readFileSync(path.join(FW_DIR, 'settings.toml'), 'utf8');
if (!fs.existsSync(settingsPath)) warnings.push('settings.toml 을 새로 만들었습니다. Wi-Fi SSID/PASSWORD 를 입력하세요.');
const ipOnly = room.picoIp.split(':')[0];
const isLanIp = /^\d+\.\d+\.\d+\.\d+$/.test(room.picoIp) && !ipOnly.startsWith('127.');
if (isLanIp) {
  const line = `PICO_STATIC_IP = "${ipOnly}"`;
  settings = /^PICO_STATIC_IP\s*=.*$/m.test(settings)
    ? settings.replace(/^PICO_STATIC_IP\s*=.*$/m, line)
    : `${settings.trimEnd()}\n\n# 이 Pico 의 고정 IP (플랫폼 '${room.name}' 공간의 Pico IP 와 같아야 합니다)\n${line}\n`;
} else if (room.picoIp) {
  warnings.push(`Pico IP "${room.picoIp}" 는 연습용(mock) 주소라 settings.toml 에 고정 IP 를 쓰지 않았습니다.`);
} else {
  warnings.push('이 공간에 Pico IP 가 없습니다. 부팅 후 시리얼 창의 IP 를 플랫폼 "Pico 연결 설정"에 입력하세요.');
}
fs.writeFileSync(settingsPath, settings, 'utf8');

// 5. 예약 핀 충돌
const reserved = reservedPins(room.baseDevices);
for (const pin of room.pins) {
  if (reserved[pin]) errors.push(`핀 충돌: ${pin} 은(는) ${reserved[pin]} 핀입니다. (room.json pins / baseDevices 확인)`);
}
const ipOwners = rooms.filter((r) => r.id !== room.id && r.picoIp && r.picoIp === room.picoIp);
if (ipOwners.length) errors.push(`Pico IP ${room.picoIp} 를 다른 공간(${ipOwners.map((r) => r.name).join(', ')})도 사용합니다.`);

const libs = ['adafruit_httpserver/'];
if (room.baseDevices.includes('dht11')) libs.push('adafruit_dht.mpy');
if (room.baseDevices.includes('sg90')) libs.push('adafruit_motor/');

console.log('==================================================');
console.log(` "${room.name}" (${room.id}) 펌웨어 → ${OUT}`);
console.log('==================================================');
console.log(`  기본 장치 : ${room.baseDevices.join(', ') || '(없음)'}`);
console.log(`  확장 핀   : ${room.pins.join(', ') || '(없음)'}`);
console.log(`  팀 모듈   : ${teamFile || '(없음)'}`);
console.log(`  Pico IP   : ${room.picoIp || '(미지정 · DHCP)'}`);
console.log(`  필요 lib  : ${libs.join(', ')}`);
if (warnings.length) {
  console.log('\n[주의]');
  warnings.forEach((w) => console.log(`  - ${w}`));
}
if (errors.length) {
  console.log('\n[오류] 전시 전에 반드시 수정하세요');
  errors.forEach((e) => console.log(`  ✖ ${e}`));
  process.exitCode = 1;
} else {
  console.log('\n핀 충돌 / 문법 오류 없음. Pico 를 재부팅한 뒤 http://<Pico IP>/api/teams 로 확인하세요.');
}
