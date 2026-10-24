# code.py (팀 모듈) — 스마트 주차장 (예제 꾸러미)
# 이 팀 전용 Pico 2 W 의 펌웨어가 teams/<공간ID>.py 로 불러옵니다. (npm run firmware:bundle)
# 기본 장치: SG90(차단기), RGB LED(입구 표시등) — DHT11 · Cds 는 연결하지 않음
# 확장 장치: 적외선 장애물 센서 3개 (감지 시 LOW) → GP13, GP14, GP15
#            (GP15 는 DHT11 을 쓰지 않으므로 확장에 사용 가능)
import board
import digitalio

ROOM_ID = "example_smart_parking"

SLOT_PINS = [board.GP13, board.GP14, board.GP15]
sensors = []


def setup(base):
    for pin in SLOT_PINS:
        s = digitalio.DigitalInOut(pin)
        s.direction = digitalio.Direction.INPUT
        s.pull = digitalio.Pull.UP
        sensors.append(s)
    base.set_servo(0)


def read(base):
    slots = [0 if s.value else 1 for s in sensors]  # LOW = 차량 감지
    free = len(slots) - sum(slots)
    base.set_rgb("#22C55E" if free > 0 else "#EF4444", "ON")
    return {"slot_1": slots[0], "slot_2": slots[1], "slot_3": slots[2], "free_count": free}


def handle(base, action, value):
    if action == "gate":
        base.set_servo(90 if value else 0)
        return {"ok": True}
    return {"ok": False, "error": "unknown action: " + str(action)}
