// mock.js — 스마트 독서실 (집중 학습 도우미) · 기본 예제
// · 소음: 40초 주기 (0~20초 조용함 38~45dB → 20~30초 점점 시끄러워짐, 최고 68dB → 30~40초 다시 조용해짐)
// · 온도: 25~28℃ 를 천천히 오르내림 (2분 주기)
// · code.py read() 와 같은 자동 규칙:
//     소음 단계 → RGB 색 (값이 바뀔 때만 보냄), 온도 27℃ 이상 → 창 90° / 24℃ 이하 → 창 0°
//     휴식 버튼 → 10초 동안 하늘색 + break_on = 1
const GREEN = '#2F9E6E';
const ORANGE = '#D9922E';
const RED = '#D64545';
const SKY = '#3A7BD5';

let lastT = 0;
let breakUntil = -1;   // 휴식이 끝나는 시각 (state.t 기준, 초)
let lastColor = '';    // 마지막으로 보낸 RGB 색
let tempZone = '';     // 'hot' (27℃ 이상) | 'cool' (24℃ 이하) | '' (아직 모름)

function round1(v) {
  return Math.round(v * 10) / 10;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function noiseAt(t) {
  const p = t % 40;
  let db;
  if (p < 20) {
    // 조용함: 38 ~ 45 dB 사이에서 살짝 흔들림
    db = 41.5 + Math.sin(p * 0.8) * 2.5 + (Math.random() - 0.5) * 2;
    db = clamp(db, 38, 45);
  } else if (p < 30) {
    // 점점 시끄러워짐: 42 → 68 dB
    db = 42 + ((p - 20) / 10) * 26 + (Math.random() - 0.5) * 1.5;
  } else {
    // 다시 조용해짐: 68 → 40 dB
    db = 68 - ((p - 30) / 10) * 28 + (Math.random() - 0.5) * 1.5;
  }
  return round1(clamp(db, 30, 90));
}

function colorForNoise(db) {
  if (db >= 60) return RED;
  if (db >= 50) return ORANGE;
  return GREEN;
}

module.exports = {
  tick(state) {
    const t = state.t;
    lastT = t;

    const noise = noiseAt(t);
    const temperature = round1(26.5 + Math.sin((t / 120) * Math.PI * 2) * 1.5); // 25 ~ 28℃
    const onBreak = t < breakUntil;

    const out = { noise: noise, temperature: temperature, break_on: onBreak ? 1 : 0 };

    // 규칙 1 + 휴식: RGB 색은 바뀔 때만 보냄 (대시보드에서 직접 바꾼 색을 매번 덮어쓰지 않도록)
    const color = onBreak ? SKY : colorForNoise(noise);
    if (color !== lastColor) {
      lastColor = color;
      out.rgb_color = color;
      out.rgb_state = 'ON';
    }

    // 규칙 2: 27℃ 이상이 되는 순간 열고, 24℃ 이하가 되는 순간 닫음
    let zone = tempZone;
    if (temperature >= 27) zone = 'hot';
    else if (temperature <= 24) zone = 'cool';
    if (zone !== tempZone) {
      tempZone = zone;
      out.servo_angle = zone === 'hot' ? 90 : 0;
    }

    return out;
  },

  onCommand(action, value, state) {
    const now = state && typeof state.t === 'number' ? state.t : lastT;

    if (action === 'break') {
      if (value) {
        breakUntil = now + 10;
        lastColor = SKY;
        return { break_on: 1, rgb_color: SKY, rgb_state: 'ON' };
      }
      // 휴식 취소 → 다음 tick 에서 소음 규칙 색으로 돌아감
      breakUntil = -1;
      lastColor = '';
      return { break_on: 0 };
    }

    if (action === 'window') {
      // code.py: base.set_servo(90 if value else 0)
      return { servo_angle: value ? 90 : 0 };
    }
  },
};
