// mock.js — 화재 방재 안전실 (예제 꾸러미)
// 30초마다 불꽃이 감지되고(경보 작동), reset 명령이 오면 경보와 불꽃이 꺼집니다.
let flame = 0;
let alarm = 0;
let lastFireAt = -20; // 시작 10초 뒤 첫 화재

module.exports = {
  tick(state) {
    if (state.t - lastFireAt > 30) {
      flame = 1;
      alarm = 1;
      lastFireAt = state.t;
    }
    // 온도가 35℃ 이상이어도 경보
    if (state.base.temperature >= 35) alarm = 1;
    return {
      flame,
      alarm_on: alarm,
      // code.py 와 같은 경보등 규칙 (기본 장치 값)
      rgb_color: alarm ? '#EF4444' : '#FFFFFF',
      rgb_state: 'ON',
    };
  },

  onCommand(action, value, state) {
    if (action === 'reset') {
      flame = 0;
      alarm = 0;
      return { flame, alarm_on: alarm, rgb_color: '#FFFFFF', rgb_state: 'ON' };
    }
  },
};
