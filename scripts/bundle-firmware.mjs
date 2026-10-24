#!/usr/bin/env node
/**
 * 전시용 통합 펌웨어 묶기 (교사용)
 *
 *   npm run firmware:bundle -- <출력 폴더 또는 CIRCUITPY 드라이브>
 *   예) npm run firmware:bundle -- E:\            (Windows: Pico가 E: 드라이브일 때)
 *       npm run firmware:bundle                  (기본: firmware/dist/)
 *
 * 1. firmware/circuitpython/code.py (통합 펌웨어)를 복사합니다.
 * 2. settings.toml 은 출력 위치에 없을 때만 복사합니다. (Wi-Fi 정보 보호)
 * 3. rooms-data/<공간ID>/code.py 를 teams/<공간ID>.py 로 복사합니다. (ROOM_ID 자동 보정)
 * 4. 핀 충돌과 Python 문법 오류를 보고합니다.
 */
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOMS_DIR = process.env.ROOMS_DATA_DIR || path.join(ROOT, 'rooms-data');
const FW_DIR = path.join(ROOT, 'firmware', 'circuitpython');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'firmware', 'dist'));

// src/core/server/roomStore.ts 의 RESERVED_PINS 와 동일하게 유지
const RESERVED_PINS = {
  GP15: 'DHT11',
  GP16: 'SG90 서보',
  GP18: 'RGB LED (R)',
  GP19: 'RGB LED (G)',
  GP20: 'RGB LED (B)',
  GP26: 'Cds 조도 (ADC0)',
  GP23: 'Pico 2 W 무선 모듈',
  GP24: 'Pico 2 W 무선 모듈',
  GP25: 'Pico 2 W 무선 모듈',
  GP29: 'Pico 2 W 무선 모듈',
};

const warnings = [];
const errors = [];

function findPython() {
  for (const cmd of ['python3', 'python', 'py']) {
    const r = spawnSync(cmd, ['--version'], { encoding: 'utf8' });
    if (r.status === 0) return cmd;
  }
  return null;
}

function checkPythonSyntax(python, file, label) {
  if (!python) return;
  const r = spawnSync(python, ['-c', 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read())', file], {
    encoding: 'utf8',
  });
  if (r.status !== 0) errors.push(`${label}: Python 문법 오류\n${(r.stderr || '').trim().split('\n').slice(-3).join('\n')}`);
}

fs.mkdirSync(path.join(OUT, 'teams'), { recursive: true });

// 1~2. 통합 펌웨어 / settings.toml
fs.copyFileSync(path.join(FW_DIR, 'code.py'), path.join(OUT, 'code.py'));
if (!fs.existsSync(path.join(OUT, 'settings.toml'))) {
  fs.copyFileSync(path.join(FW_DIR, 'settings.toml'), path.join(OUT, 'settings.toml'));
  warnings.push('settings.toml 을 새로 복사했습니다. Wi-Fi SSID/PASSWORD 를 입력하세요.');
}

// 3. 팀 모듈
const rooms = [];
let ids = [];
try {
  ids = fs.readdirSync(ROOMS_DIR).filter((id) => /^[a-z0-9_-]+$/.test(id));
} catch {
  warnings.push(`공간 폴더가 없습니다: ${ROOMS_DIR}`);
}
for (const id of ids) {
  let meta = { id, name: id, team: '', pins: [] };
  try {
    meta = { ...meta, ...JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, id, 'room.json'), 'utf8')) };
  } catch {
    warnings.push(`${id}: room.json 을 읽을 수 없습니다.`);
  }
  rooms.push(meta);
}

// 이전 묶음의 팀 모듈 정리 (삭제된 공간 제거)
for (const f of fs.readdirSync(path.join(OUT, 'teams'))) {
  if (f.endsWith('.py')) fs.rmSync(path.join(OUT, 'teams', f));
}

const python = findPython();
if (!python) warnings.push('Python 이 없어 문법 검사를 건너뜁니다.');
checkPythonSyntax(python, path.join(OUT, 'code.py'), 'code.py (통합 펌웨어)');

const included = [];
for (const meta of rooms) {
  const src = path.join(ROOMS_DIR, meta.id, 'code.py');
  if (!fs.existsSync(src)) {
    warnings.push(`"${meta.name}" (${meta.id}): code.py 가 없어 제외합니다. (시뮬레이션만 동작)`);
    continue;
  }
  let code = fs.readFileSync(src, 'utf8');
  const idLine = `ROOM_ID = "${meta.id}"`;
  const m = code.match(/^ROOM_ID\s*=\s*["']([^"']*)["']/m);
  if (!m) code = `${idLine}\n${code}`;
  else if (m[1] !== meta.id) {
    warnings.push(`"${meta.name}": ROOM_ID "${m[1]}" → "${meta.id}" 로 보정했습니다.`);
    code = code.replace(m[0], idLine);
  }
  const modName = meta.id.replace(/-/g, '_');
  const dest = path.join(OUT, 'teams', `${modName}.py`);
  fs.writeFileSync(dest, code, 'utf8');
  checkPythonSyntax(python, dest, `teams/${modName}.py ("${meta.name}")`);
  included.push(`${meta.name} (${meta.team || '팀 미정'}) → teams/${modName}.py`);
}

// 4. 핀 충돌
const pinOwners = {};
for (const meta of rooms) {
  for (const pin of Array.isArray(meta.pins) ? meta.pins : []) {
    if (RESERVED_PINS[pin]) errors.push(`핀 충돌: "${meta.name}" 의 ${pin} 은(는) ${RESERVED_PINS[pin]} 핀입니다.`);
    (pinOwners[pin] ||= []).push(meta.name);
  }
}
for (const [pin, owners] of Object.entries(pinOwners)) {
  if (owners.length > 1) errors.push(`핀 충돌: ${pin} 을(를) ${owners.join(', ')} 이(가) 함께 사용합니다.`);
}

console.log('==================================================');
console.log(` 통합 펌웨어 출력: ${OUT}`);
console.log('==================================================');
console.log(`포함된 팀 모듈 ${included.length}개`);
included.forEach((l) => console.log(`  ✔ ${l}`));
if (warnings.length) {
  console.log('\n[주의]');
  warnings.forEach((w) => console.log(`  - ${w}`));
}
if (errors.length) {
  console.log('\n[오류] 전시 전에 반드시 수정하세요');
  errors.forEach((e) => console.log(`  ✖ ${e}`));
  process.exitCode = 1;
} else {
  console.log('\n핀 충돌 / 문법 오류 없음. lib/ 폴더(adafruit_httpserver, adafruit_motor, adafruit_dht)도 확인하세요.');
}
