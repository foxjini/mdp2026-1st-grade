/**
 * Raspberry Pi Pico 2 W (CircuitPython 10.x) Mock REST Server
 * 
 * [목적]
 * 실제 Pico 2 W 하드웨어가 없거나 Wi-Fi 연결 환경이 제한된 교실/실습실 환경에서
 * 하드웨어 연동 모드를 100% 동일하게 모의 테스트하고 디버깅할 수 있는 에뮬레이터 서버입니다.
 * 
 * [실행 방법]  (공간마다 Pico 1대 → 공간마다 mock 서버 1개를 다른 포트로)
 *   npm run mock:pico -- --room <공간ID> --port 5051   → 그 공간의 Pico 1대를 흉내 (IP: 127.0.0.1:5051)
 *   npm run mock:pico -- --room <다른공간ID> --port 5052
 *   npm run mock:pico                                 → 포트 5050, 모든 공간을 한 번에 흉내 (간단 연습용)
 *
 * [팀 공간 mock.js]
 * rooms-data/<공간ID>/mock.js 를 자동으로 불러와 Pico 펌웨어와 같은 형식으로 응답합니다.
 *   GET  /api/status  → { ..., rooms: { 공간ID: {...} }, custom: {...}, team_errors: {...} }
 *   POST /api/command → { room, action, value } → 해당 팀 mock.js onCommand()
 * --room 을 주면 그 공간 room.json 의 baseDevices 에 있는 기본 장치 값만 응답합니다.
 * 파일이 바뀌면 다음 갱신 주기에 자동으로 다시 불러옵니다.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const PORT = Number(argValue('--port') || process.env.PORT || 5050);
// 브라우저가 막는 포트 (src/core/server/roomStore.ts 의 BLOCKED_PORTS 와 동일)
const BLOCKED_PORTS = [
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111,
  113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548,
  554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566,
  6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080,
];
if (BLOCKED_PORTS.includes(PORT)) {
  console.error(`✖ 포트 ${PORT} 는 브라우저가 보안상 막는 포트입니다. 다른 포트를 쓰세요. (예: --port 5051)`);
  process.exit(1);
}
const ONLY_ROOM = argValue('--room') || process.env.ROOM || '';
const ROOMS_DIR = process.env.ROOMS_DATA_DIR || path.join(__dirname, '..', 'rooms-data');
const ALL_BASE_DEVICES = ['dht11', 'cds', 'sg90', 'rgb'];
const startedAt = Date.now();

// 이 mock Pico 에 연결된 기본 장치 (--room 이면 room.json baseDevices, 아니면 4종 전부)
function baseDevices() {
  if (!ONLY_ROOM) return ALL_BASE_DEVICES;
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, ONLY_ROOM, 'room.json'), 'utf8'));
    return Array.isArray(meta.baseDevices) ? meta.baseDevices : ALL_BASE_DEVICES;
  } catch {
    return ALL_BASE_DEVICES;
  }
}

// 모의 하드웨어 상태
let hardwareState = {
  servoAngle: 0,
  rgbColor: '#60A5FA',
  rgbState: 'ON',
  temperature: 24.5,
  humidity: 48.0,
  lightRaw: 32000
};

// 1.5초마다 온습도 및 조도 센서값의 자연스러운 변동 시뮬레이션
setInterval(() => {
  hardwareState.temperature = Math.round((hardwareState.temperature + (Math.random() - 0.49) * 0.3) * 10) / 10;
  hardwareState.humidity = Math.round((hardwareState.humidity + (Math.random() - 0.49) * 0.5) * 10) / 10;
  hardwareState.lightRaw = Math.min(64000, Math.max(10000, hardwareState.lightRaw + Math.floor((Math.random() - 0.5) * 800)));
}, 1500);

// ------------------------------------------------------------------------------
// 팀 mock.js 로더 (브라우저 시뮬레이션과 같은 규격: module.exports = { tick, onCommand })
// ------------------------------------------------------------------------------
const teams = {}; // 공간ID → { mtime, mod, values, error }

function loadMock(file) {
  const module = { exports: {} };
  const code = fs.readFileSync(file, 'utf8');
  vm.runInNewContext(`"use strict";\n${code}`, { module, exports: module.exports, Math, Date, console }, {
    filename: file,
    timeout: 200,
  });
  return module.exports;
}

function syncTeams() {
  let ids = [];
  try {
    ids = fs.readdirSync(ROOMS_DIR).filter((id) => /^[a-z0-9_-]+$/.test(id) && (!ONLY_ROOM || id === ONLY_ROOM));
  } catch {
    ids = [];
  }
  Object.keys(teams).forEach((id) => !ids.includes(id) && delete teams[id]);
  for (const id of ids) {
    const file = path.join(ROOMS_DIR, id, 'mock.js');
    let mtime = 0;
    try {
      mtime = fs.statSync(file).mtimeMs;
    } catch {
      delete teams[id];
      continue;
    }
    if (teams[id] && teams[id].mtime === mtime) continue;
    try {
      teams[id] = { mtime, mod: loadMock(file), values: {}, error: null };
      console.log(`>>> [Mock Pico] 팀 mock.js 로드: ${id}`);
    } catch (err) {
      teams[id] = { mtime, mod: null, values: {}, error: String(err && err.message ? err.message : err) };
      console.log(`>>> [Mock Pico] 팀 mock.js 오류 (${id}): ${teams[id].error}`);
    }
  }
}

// 팀 mock.js 반환값 → 확장 센서 값. servo_angle / rgb_color / rgb_state 는 code.py 의
// base.set_servo() / set_rgb() 처럼 이 mock Pico 의 기본 장치 상태로 반영, temperature / humidity / light 는
// 기본 센서 시나리오 값 (src/core/runtime/mockRuntime.ts 와 동일 규칙)
function sanitize(values) {
  const out = {};
  if (!values || typeof values !== 'object') return out;
  for (const [k, v] of Object.entries(values)) {
    if (k === 'servo_angle') {
      if (typeof v === 'number' && Number.isFinite(v)) hardwareState.servoAngle = Math.max(0, Math.min(180, Math.round(v)));
    } else if (k === 'rgb_color') {
      if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) hardwareState.rgbColor = v.toUpperCase();
    } else if (k === 'rgb_state') {
      if (v === 'ON' || v === 'OFF') hardwareState.rgbState = v;
    } else if (k === 'temperature' || k === 'humidity' || k === 'light') {
      // 기본 센서 시나리오 (실제 Pico 에서는 센서가 직접 잼)
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      if (k === 'temperature') hardwareState.temperature = Math.round(Math.max(-10, Math.min(60, v)) * 10) / 10;
      else if (k === 'humidity') hardwareState.humidity = Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
      else hardwareState.lightRaw = Math.round(Math.max(0, Math.min(65535, v)));
    } else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
  }
  return out;
}

function mockState(team) {
  return {
    t: (Date.now() - startedAt) / 1000,
    base: {
      temperature: hardwareState.temperature,
      humidity: hardwareState.humidity,
      light: hardwareState.lightRaw,
      servoAngle: hardwareState.servoAngle,
      rgbColor: hardwareState.rgbColor,
      rgbState: hardwareState.rgbState,
    },
    custom: { ...team.values },
  };
}

function tickTeams() {
  syncTeams();
  for (const [id, team] of Object.entries(teams)) {
    if (!team.mod || typeof team.mod.tick !== 'function') continue;
    try {
      Object.assign(team.values, sanitize(team.mod.tick(mockState(team))));
    } catch (err) {
      team.error = String(err && err.message ? err.message : err);
      team.mod = null;
      console.log(`>>> [Mock Pico] tick() 오류 (${id}): ${team.error}`);
    }
  }
}

tickTeams();
setInterval(tickTeams, 1500);

function readJsonBody(req, res, onBody) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      onBody(JSON.parse(body || '{}'));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    }
  });
}

let requestCount = 0;

const server = http.createServer((req, res) => {
  requestCount++;

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url;

  // 1. 센서 텔레메트리 조회 (GET /api/status)
  if (req.method === 'GET' && url.startsWith('/api/status')) {
    const rooms = {};
    const custom = {};
    const teamErrors = {};
    for (const [id, team] of Object.entries(teams)) {
      rooms[id] = { ...team.values };
      Object.assign(custom, team.values);
      if (team.error) teamErrors[id] = team.error;
    }
    // 실제 펌웨어처럼 연결된 기본 장치 값만 응답
    const devices = baseDevices();
    const responsePayload = {
      status: 'online',
      room: ONLY_ROOM,
      base_devices: devices,
      ...(devices.includes('dht11') ? { temperature: hardwareState.temperature, humidity: hardwareState.humidity, dht_ok: true } : {}),
      ...(devices.includes('cds') ? { light_adc: hardwareState.lightRaw, light_raw: hardwareState.lightRaw } : {}),
      ...(devices.includes('sg90') ? { servo_angle: hardwareState.servoAngle } : {}),
      ...(devices.includes('rgb') ? { rgb_color: hardwareState.rgbColor, rgb_state: hardwareState.rgbState } : {}),
      uptime: process.uptime(),
      rooms,
      custom,
      team_errors: teamErrors
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responsePayload));
    return;
  }

  // 연결하지 않은 기본 장치 제어 요청은 실제 펌웨어처럼 거부
  const unused =
    req.method === 'POST' &&
    ((url.startsWith('/api/servo') && !baseDevices().includes('sg90')) || (url.startsWith('/api/rgb') && !baseDevices().includes('rgb')));
  if (unused) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: '이 Pico 에는 해당 기본 장치가 연결되어 있지 않습니다 (baseDevices).' }));
    return;
  }

  // 2. SG90 서보모터 제어 (POST /api/servo)
  if (req.method === 'POST' && url.startsWith('/api/servo')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed.angle === 'number') {
          hardwareState.servoAngle = parsed.angle;
          console.log(`>>> [Mock Pico] SG90 서보모터 회전 실행: ${parsed.angle}°`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', angle: hardwareState.servoAngle }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 3. RGB LED 조명 제어 (POST /api/rgb)
  if (req.method === 'POST' && url.startsWith('/api/rgb')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.color) hardwareState.rgbColor = parsed.color;
        if (parsed.state) hardwareState.rgbState = parsed.state;
        console.log(`>>> [Mock Pico] RGB LED 제어 실행: ${hardwareState.rgbColor} [${hardwareState.rgbState}]`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          color: hardwareState.rgbColor, 
          state: hardwareState.rgbState 
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 4. 팀 확장 명령 (POST /api/command) → 팀 mock.js onCommand()
  if (req.method === 'POST' && url.startsWith('/api/command')) {
    readJsonBody(req, res, (parsed) => {
      const team = teams[parsed.room];
      const send = (status, payload) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      };
      if (!team || !team.mod || typeof team.mod.onCommand !== 'function') {
        send(200, { success: false, error: `팀 모듈 없음 또는 onCommand 미구현: ${parsed.room}` });
        return;
      }
      try {
        Object.assign(team.values, sanitize(team.mod.onCommand(parsed.action, parsed.value, mockState(team))));
        console.log(`>>> [Mock Pico] ${parsed.room} 명령 실행: ${parsed.action} = ${JSON.stringify(parsed.value)}`);
        send(200, { success: true, result: team.values });
      } catch (err) {
        send(200, { success: false, error: String(err && err.message ? err.message : err) });
      }
    });
    return;
  }

  // 5. 로드된 팀 모듈 목록 (GET /api/teams)
  if (req.method === 'GET' && url.startsWith('/api/teams')) {
    const errors = {};
    Object.entries(teams).forEach(([id, t]) => t.error && (errors[id] = t.error));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ room: ONLY_ROOM, base_devices: baseDevices(), loaded: Object.keys(teams).filter((id) => teams[id].mod), errors })
    );
    return;
  }

  // 404 처리
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', url }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('=======================================================');
  console.log(`[Mock Pico 2 W Server] Started on http://127.0.0.1:${PORT}`);
  console.log(ONLY_ROOM ? `공간 "${ONLY_ROOM}" 전용 Pico (기본 장치: ${baseDevices().join(', ') || '없음'})` : '모든 공간 응답 모드');
  console.log(`대시보드 '${ONLY_ROOM || '각'}' 공간의 Pico 연결 설정에 IP 127.0.0.1:${PORT} 입력`);
  console.log(`CircuitPython 10.x REST Server Emulation Ready`);
  console.log('=======================================================');
});
