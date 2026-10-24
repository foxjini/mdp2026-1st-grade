// mock.js — 스마트 주차장 (예제 꾸러미)
// 칸마다 서로 다른 주기로 차가 들어왔다 나갑니다 (state.t = 경과 초).
const PERIODS = [20, 28, 36];

module.exports = {
  tick(state) {
    const slots = PERIODS.map((p, i) => ((state.t + i * 11) % p < p * 0.5 ? 1 : 0));
    const free = 3 - slots.reduce((a, b) => a + b, 0);
    return {
      slot_1: slots[0],
      slot_2: slots[1],
      slot_3: slots[2],
      free_count: free,
      // code.py 와 똑같이 입구 표시등 색을 바꿈 (기본 장치 값)
      rgb_color: free > 0 ? '#22C55E' : '#EF4444',
      rgb_state: 'ON',
    };
  },

  // code.py handle() 과 같은 동작: 차단기(SG90) 열기/닫기
  onCommand(action, value, state) {
    if (action === 'gate') return { servo_angle: value ? 90 : 0 };
  },
};
