// mock.js — 스마트 버스정류장 쉼터
// 60초 시나리오 (state.t 기준, 계속 반복)
//   0~20초  정상     : person 0, heater 0, bus_eta 10→7
//  20~50초  사람 대기 : person 1, 기온 22℃ 미만이면 heater 1, bus_eta 6→2
//  50~60초  버스 임박 : bus_eta 1→0 (0 이 된 뒤 5초 정차), RGB 초록
//  60초     회복     : 버스 출발, person 0, heater 0, bus_eta 10
// 벤치 클릭('heater' 명령) → 기온과 관계없이 heater 1 을 30초 동안 유지
let manualUntil = -1;
let lastRgb = '';

const COLD_C = 22;
const NIGHT_LIGHT = 25000;
const CYCLE = 60;
const HEATER_HOLD = 30;
const WARM_WHITE = '#FFE4B5';
const GREEN = '#22C55E';

function scenario(t) {
  const p = t % CYCLE;
  if (p < 20) return { eta: 10 - Math.floor(p / 5), person: 0 };
  if (p < 50) return { eta: 6 - Math.floor((p - 20) / 6), person: 1 };
  return { eta: p < 55 ? 1 : 0, person: 1 };
}

// 시뮬레이션용 기본 센서 시나리오 (실제 Pico 에서는 센서가 직접 잽니다)
function weather(t) {
  // 기온: 2분 주기로 19~24℃ (첫 1분은 추움 → 히터가 켜지는 장면, 다음 1분은 따뜻함)
  const temperature = Math.round((21.5 - 2.5 * Math.sin((2 * Math.PI * t) / 120)) * 10) / 10;
  // 조도: 3분 주기로 밤(어두움) ↔ 낮(밝음)
  const light = Math.round(30000 - 18000 * Math.sin((2 * Math.PI * t) / 180));
  return { temperature, light };
}

module.exports = {
  tick(state) {
    const t = state.t;
    const s = scenario(t);
    const w = weather(t);

    // 규칙 1 · 2 (mock 시나리오): 사람이 있고 추우면 히터, 버튼으로 켠 경우 30초 유지
    const manual = t < manualUntil;
    const heater = manual || (s.person === 1 && w.temperature < COLD_C) ? 1 : 0;

    const out = {
      person: s.person,
      bus_eta: s.eta,
      heater: heater,
      temperature: w.temperature,
      light: w.light,
    };

    // 규칙 3 · 4: RGB (code.py 와 같은 규칙, 바뀔 때만 보냄)
    let color = '#000000';
    let rgbState = 'OFF';
    if (s.eta <= 1) {
      color = GREEN;
      rgbState = 'ON';
    } else if (w.light < NIGHT_LIGHT) {
      color = WARM_WHITE;
      rgbState = 'ON';
    }
    const key = color + rgbState;
    if (key !== lastRgb) {
      out.rgb_color = color;
      out.rgb_state = rgbState;
      lastRgb = key;
    }
    return out;
  },

  onCommand(action, value, state) {
    if (action === 'heater') {
      manualUntil = value ? state.t + HEATER_HOLD : -1;
      return { heater: value ? 1 : 0 };
    }
  },
};
