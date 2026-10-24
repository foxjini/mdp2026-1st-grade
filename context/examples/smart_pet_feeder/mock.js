// mock.js — 스마트 펫 급식기 (예제 꾸러미)
// code.py 와 같은 동작을 흉내 냅니다.
// · 사료는 강아지가 조금씩 먹어서 줄어듦 · feed 명령 → 뚜껑(SG90) 90° 열고 50g 채움, 3초 뒤 닫힘
// · 상태등(RGB): 사료 부족 빨강 / 밤 주황 / 정상 초록
let weight = 320;
let feedCount = 0;
let lidOpenedAt = null;

module.exports = {
  tick(state) {
    weight = Math.max(0, weight - Math.random() * 4);
    const out = {
      food_weight: Math.round(weight),
      feed_count: feedCount,
      rgb_color: weight < 50 ? '#EF4444' : state.base.light < 20000 ? '#F97316' : '#22C55E',
      rgb_state: 'ON',
    };
    if (lidOpenedAt !== null && state.t - lidOpenedAt > 3) {
      out.servo_angle = 0;
      lidOpenedAt = null;
    }
    return out;
  },

  onCommand(action, value, state) {
    if (action === 'feed') {
      weight = Math.min(500, weight + 50);
      feedCount += 1;
      lidOpenedAt = state.t;
      return { food_weight: Math.round(weight), feed_count: feedCount, servo_angle: 90 };
    }
  },
};
