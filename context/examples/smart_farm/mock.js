// mock.js — 스마트 팜 온실 (예제 꾸러미)
// 토양 수분은 천천히 마르고, 펌프가 켜져 있으면 빠르게 올라갑니다. 온도가 높을수록 빨리 마릅니다.
let soil = 55;
let pump = false;

function round1(v) {
  return Math.round(v * 10) / 10;
}

module.exports = {
  tick(state) {
    const dry = 0.4 + Math.max(0, state.base.temperature - 24) * 0.08;
    soil += pump ? 4 : -dry + (Math.random() - 0.5) * 0.3;
    soil = Math.max(5, Math.min(95, soil));
    if (soil >= 80) pump = false; // 충분히 젖으면 자동 정지
    return { soil_moisture: round1(soil), pump_on: pump ? 1 : 0 };
  },

  onCommand(action, value) {
    if (action === 'water') {
      pump = !!value;
      return { pump_on: pump ? 1 : 0, soil_moisture: round1(soil) };
    }
  },
};
