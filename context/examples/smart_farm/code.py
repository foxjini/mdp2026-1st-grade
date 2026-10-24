# code.py (팀 모듈) — 스마트 팜 온실 (예제 꾸러미)
# 이 팀 전용 Pico 2 W 의 펌웨어가 teams/<공간ID>.py 로 불러옵니다. (npm run firmware:bundle)
# 확장 장치: 토양 수분 센서(GP27/ADC1), 관수 펌프 릴레이(GP21)
# 기본 장치(SG90 환기 돔, RGB 생장등)는 base 객체로만 제어합니다.
import board
import analogio
import digitalio

ROOM_ID = "example_smart_farm"

soil = None
pump = None


def setup(base):
    global soil, pump
    soil = analogio.AnalogIn(board.GP27)
    pump = digitalio.DigitalInOut(board.GP21)
    pump.direction = digitalio.Direction.OUTPUT
    pump.value = False


def read(base):
    # 정전용량식 센서: 값이 클수록 건조 → 퍼센트로 뒤집어 환산
    moisture = round(100 - soil.value / 65535 * 100, 1)
    if moisture >= 80 and pump.value:
        pump.value = False  # 충분히 젖으면 자동 정지
    return {"soil_moisture": moisture, "pump_on": 1 if pump.value else 0}


def handle(base, action, value):
    if action == "water":
        pump.value = bool(value)
        if pump.value:
            base.set_rgb("#10B981", "ON")  # 관수 중 생장등 초록
        return {"ok": True, "pump_on": 1 if pump.value else 0}
    return {"ok": False, "error": "unknown action: " + str(action)}
