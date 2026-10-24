# code.py (팀 모듈) — 스마트 펫 급식기 (예제 꾸러미)
# 이 팀 전용 Pico 2 W 의 펌웨어가 teams/<공간ID>.py 로 불러옵니다. (npm run firmware:bundle)
# 기본 장치: Cds(밤/낮), SG90(사료통 뚜껑), RGB LED(상태등) — base 객체로만 제어
# 확장 장치: 사료 무게 센서(로드셀 앰프 아날로그 출력 → GP27/ADC1)
import time
import board
import analogio

ROOM_ID = "example_smart_pet_feeder"

weight_sensor = None
feed_count = 0
lid_opened_at = None   # 뚜껑을 연 시각 (time.sleep 대신 read() 에서 닫기)


def setup(base):
    global weight_sensor
    weight_sensor = analogio.AnalogIn(board.GP27)
    if base.has("sg90"):
        base.set_servo(0)


def read(base):
    global lid_opened_at
    weight = round(weight_sensor.value / 65535 * 500)

    # 뚜껑을 연 지 3초가 지나면 닫기
    if lid_opened_at is not None and time.monotonic() - lid_opened_at > 3:
        if base.has("sg90"):
            base.set_servo(0)
        lid_opened_at = None

    # 상태등: 사료 부족(빨강) / 밤(주황 무드등) / 정상(초록)
    light = base.light()
    if weight < 50:
        base.set_rgb("#EF4444", "ON")
    elif light is not None and light < 20000:
        base.set_rgb("#F97316", "ON")
    else:
        base.set_rgb("#22C55E", "ON")

    return {"food_weight": weight, "feed_count": feed_count}


def handle(base, action, value):
    global feed_count, lid_opened_at
    if action == "feed":
        if base.has("sg90"):
            base.set_servo(90)
        lid_opened_at = time.monotonic()
        feed_count += 1
        return {"ok": True, "feed_count": feed_count}
    return {"ok": False, "error": "unknown action: " + str(action)}
