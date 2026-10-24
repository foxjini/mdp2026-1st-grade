# ==============================================================================
# CircuitPython 9.x/10.x Firmware for Raspberry Pi Pico 2 W
# 공간(팀)별 펌웨어: Pico 2 W 1대 = 플랫폼의 공간 1개
#   기본 장치(DHT11, Cds, SG90, RGB LED) 중 config.py 의 BASE_DEVICES 만 사용 + 팀 모듈(teams/*.py)
#
# [CIRCUITPY 드라이브 구성]  ← npm run firmware:bundle -- <공간ID> <드라이브> 로 자동 생성
#   code.py            ← 이 파일 (학생은 수정하지 않습니다)
#   config.py          ← ROOM_ID, BASE_DEVICES (공간의 room.json 기준)
#   settings.toml      ← Wi-Fi 정보 + (선택) PICO_STATIC_IP 고정 IP
#   teams/<공간ID>.py  ← 우리 팀이 업로드한 code.py
#   lib/               ← adafruit_httpserver (+ 사용하는 장치에 따라 adafruit_motor, adafruit_dht)
# ==============================================================================
import os
import sys
import time
import board
import analogio
import pwmio
import wifi
import socketpool
from adafruit_httpserver import Server, Request, Response, JSONResponse, POST, GET, OPTIONS

ALL_BASE_DEVICES = ["dht11", "cds", "sg90", "rgb"]

try:
    import config

    ROOM_ID = getattr(config, "ROOM_ID", "")
    BASE_DEVICES = [d for d in getattr(config, "BASE_DEVICES", ALL_BASE_DEVICES) if d in ALL_BASE_DEVICES]
except ImportError:
    ROOM_ID = ""
    BASE_DEVICES = list(ALL_BASE_DEVICES)

print(f">>> Pico 2 W 펌웨어 시작 (공간: {ROOM_ID or '미지정'}, 기본 장치: {BASE_DEVICES})")

# ------------------------------------------------------------------------------
# 1. 기본 장치 초기화 (BASE_DEVICES 에 있는 장치만. 나머지 핀은 팀 모듈이 사용 가능)
# ------------------------------------------------------------------------------
dht = None
cds = None
my_servo = None
red_pwm = green_pwm = blue_pwm = None

# 1.1 DHT11 온습도 센서 (GP15)
if "dht11" in BASE_DEVICES:
    import adafruit_dht

    dht = adafruit_dht.DHT11(board.GP15)

# 1.2 Cds 조도 센서 (GP26 / ADC0)
if "cds" in BASE_DEVICES:
    cds = analogio.AnalogIn(board.GP26)

# 1.3 SG90 서보모터 (GP16 / 50Hz PWM)
current_servo_angle = 0
if "sg90" in BASE_DEVICES:
    from adafruit_motor import servo

    servo_pwm = pwmio.PWMOut(board.GP16, duty_cycle=2 ** 15, frequency=50)
    my_servo = servo.Servo(servo_pwm, min_pulse=500, max_pulse=2400)
    my_servo.angle = current_servo_angle

# 1.4 RGB LED (GP18-Red, GP19-Green, GP20-Blue / PWM)
current_rgb_color = "#3B82F6"  # 기본 블루
current_rgb_state = "ON"
if "rgb" in BASE_DEVICES:
    red_pwm = pwmio.PWMOut(board.GP18, frequency=1000)
    green_pwm = pwmio.PWMOut(board.GP19, frequency=1000)
    blue_pwm = pwmio.PWMOut(board.GP20, frequency=1000)


def apply_rgb(hex_code, state):
    global current_rgb_color, current_rgb_state
    if red_pwm is None:
        return
    current_rgb_color = hex_code
    current_rgb_state = state

    if state == "OFF":
        red_pwm.duty_cycle = 0
        green_pwm.duty_cycle = 0
        blue_pwm.duty_cycle = 0
        return

    # Hex to RGB 16-bit (0 ~ 65535)
    clean_hex = hex_code.lstrip("#")
    if len(clean_hex) == 6:
        r = int(clean_hex[0:2], 16) / 255.0
        g = int(clean_hex[2:4], 16) / 255.0
        b = int(clean_hex[4:6], 16) / 255.0
        red_pwm.duty_cycle = int(r * 65535)
        green_pwm.duty_cycle = int(g * 65535)
        blue_pwm.duty_cycle = int(b * 65535)


apply_rgb(current_rgb_color, current_rgb_state)


def set_servo(angle):
    global current_servo_angle
    if my_servo is None:
        return None
    angle = max(0, min(180, int(angle)))
    my_servo.angle = angle
    current_servo_angle = angle
    return angle


# 1.5 팀 모듈에 전달하는 기본 장치 접근 객체 (팀 모듈은 기본 장치 핀을 직접 다시 초기화하지 않습니다)
#     연결하지 않은 장치는 None 을 돌려주거나 아무 동작도 하지 않습니다.
class Base:
    def has(self, device):
        return device in BASE_DEVICES

    def temperature(self):
        try:
            return dht.temperature if dht else None
        except RuntimeError:
            return None

    def humidity(self):
        try:
            return dht.humidity if dht else None
        except RuntimeError:
            return None

    def light(self):
        return cds.value if cds else None

    def servo_angle(self):
        return current_servo_angle if my_servo else None

    def set_servo(self, angle):
        return set_servo(angle)

    def rgb(self):
        return (current_rgb_color, current_rgb_state) if red_pwm else None

    def set_rgb(self, hex_code, state="ON"):
        apply_rgb(hex_code, state)


base = Base()

# ------------------------------------------------------------------------------
# 1.6 팀 모듈 로드: /teams/*.py → setup(base), read(base), handle(base, action, value)
#     팀 모듈에서 오류가 나도 기본 기능과 웹 서버는 계속 동작합니다.
# ------------------------------------------------------------------------------
teams = {}         # 공간 ID → 모듈
team_errors = {}   # 공간 ID → 마지막 오류 메시지

try:
    team_files = sorted(os.listdir("/teams"))
    sys.path.append("/teams")
except OSError:
    team_files = []

for fname in team_files:
    if not fname.endswith(".py") or fname.startswith("_"):
        continue
    mod_name = fname[:-3]
    try:
        mod = __import__(mod_name)
        room_id = getattr(mod, "ROOM_ID", mod_name)
        if hasattr(mod, "setup"):
            mod.setup(base)
        teams[room_id] = mod
        print(f"[팀 모듈] {room_id} 로드 완료")
    except Exception as err:
        team_errors[mod_name] = str(err)
        print(f"[팀 모듈] {mod_name} 로드 실패: {err}")

# ------------------------------------------------------------------------------
# 2. Wi-Fi 연결 (settings.toml 참조)
#    공간마다 Pico IP 가 달라야 합니다. 방법 ① 공유기에서 DHCP 예약  ② 아래 고정 IP 설정
#      PICO_STATIC_IP = "192.168.0.51"
#      PICO_NETMASK   = "255.255.255.0"   (생략 시 기본값)
#      PICO_GATEWAY   = "192.168.0.1"     (생략 시 x.x.x.1)
#      PICO_DNS       = "8.8.8.8"         (선택)
# ------------------------------------------------------------------------------
ssid = os.getenv("CIRCUITPY_WIFI_SSID")
password = os.getenv("CIRCUITPY_WIFI_PASSWORD")
static_ip = os.getenv("PICO_STATIC_IP")

if static_ip:
    try:
        import ipaddress

        gateway = os.getenv("PICO_GATEWAY") or ".".join(static_ip.split(".")[:3] + ["1"])
        dns = os.getenv("PICO_DNS")
        wifi.radio.set_ipv4_address(
            ipv4=ipaddress.IPv4Address(static_ip),
            netmask=ipaddress.IPv4Address(os.getenv("PICO_NETMASK") or "255.255.255.0"),
            gateway=ipaddress.IPv4Address(gateway),
            ipv4_dns=ipaddress.IPv4Address(dns) if dns else None,
        )
        print(f"고정 IP 설정: {static_ip} (게이트웨이 {gateway})")
    except Exception as e:
        print(f"고정 IP 설정 실패: {e}. DHCP 로 연결합니다.")

print(f"Wi-Fi 연결 시도 중: {ssid}...")
try:
    wifi.radio.connect(ssid, password)
    ip_addr = str(wifi.radio.ipv4_address)
    print(f"Wi-Fi 연결 성공! Pico 2 W IP: {ip_addr}")
except Exception as e:
    print(f"Wi-Fi 연결 실패: {e}. Standalone 모드로 대기합니다.")
    ip_addr = "0.0.0.0"

# ------------------------------------------------------------------------------
# 3. HTTP Server 및 REST API 라우트 (CORS 지원)
# ------------------------------------------------------------------------------
pool = socketpool.SocketPool(wifi.radio)
server = Server(pool, "/static", debug=True)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def unused_device(request, name):
    return JSONResponse(
        request,
        {"success": False, "error": f"이 Pico 에는 {name} 이(가) 연결되어 있지 않습니다 (config.py BASE_DEVICES)."},
        headers=CORS_HEADERS,
    )


@server.route("/api/status", [GET, OPTIONS])
def handle_status(request: Request):
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)

    data = {
        "status": "online",
        "room": ROOM_ID,
        "base_devices": BASE_DEVICES,
        "ip": ip_addr,
    }

    # 연결된 기본 장치 값만 보냄 (없는 장치는 대시보드에서 '수신 대기')
    if dht:
        try:
            data["temperature"] = dht.temperature or 24.0
            data["humidity"] = dht.humidity or 50.0
        except RuntimeError:
            pass  # DHT11 간헐적 읽기 지연 무시
    if cds:
        data["light_adc"] = cds.value
    if my_servo:
        data["servo_angle"] = current_servo_angle
    if red_pwm:
        data["rgb_color"] = current_rgb_color
        data["rgb_state"] = current_rgb_state

    # 팀 확장 센서 값: rooms = {공간ID: {...}}, custom = 전체 병합
    rooms = {}
    custom = {}
    for room_id, mod in teams.items():
        if not hasattr(mod, "read"):
            continue
        try:
            values = mod.read(base)
            if isinstance(values, dict):
                rooms[room_id] = values
                custom.update(values)
        except Exception as err:
            team_errors[room_id] = str(err)
    data["rooms"] = rooms
    data["custom"] = custom
    data["team_errors"] = team_errors
    return JSONResponse(request, data, headers=CORS_HEADERS)


@server.route("/api/servo", [POST, OPTIONS])
def handle_servo(request: Request):
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)
    if my_servo is None:
        return unused_device(request, "SG90")

    try:
        body = request.json()
        angle = set_servo(body.get("angle", 0))
        return JSONResponse(request, {"success": True, "servo_angle": angle}, headers=CORS_HEADERS)
    except Exception as err:
        return JSONResponse(request, {"success": False, "error": str(err)}, headers=CORS_HEADERS)


@server.route("/api/rgb", [POST, OPTIONS])
def handle_rgb(request: Request):
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)
    if red_pwm is None:
        return unused_device(request, "RGB LED")

    try:
        body = request.json()
        color = body.get("color", current_rgb_color)
        state = body.get("state", current_rgb_state)
        apply_rgb(color, state)
        return JSONResponse(request, {"success": True, "color": color, "state": state}, headers=CORS_HEADERS)
    except Exception as err:
        return JSONResponse(request, {"success": False, "error": str(err)}, headers=CORS_HEADERS)


@server.route("/api/command", [POST, OPTIONS])
def handle_command(request: Request):
    """3D 화면 sendCommand(action, value) → 해당 팀 모듈 handle(base, action, value)"""
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)

    try:
        body = request.json()
        room_id = body.get("room", "")
        mod = teams.get(room_id)
        if mod is None or not hasattr(mod, "handle"):
            return JSONResponse(request, {"success": False, "error": "팀 모듈 없음: " + str(room_id)}, headers=CORS_HEADERS)
        result = mod.handle(base, body.get("action", ""), body.get("value"))
        ok = not (isinstance(result, dict) and result.get("ok") is False)
        return JSONResponse(request, {"success": ok, "result": result}, headers=CORS_HEADERS)
    except Exception as err:
        return JSONResponse(request, {"success": False, "error": str(err)}, headers=CORS_HEADERS)


@server.route("/api/teams", [GET, OPTIONS])
def handle_teams(request: Request):
    """이 Pico 의 공간 · 기본 장치 · 팀 모듈 로드 결과 (전시 전 점검용)"""
    if request.method == "OPTIONS":
        return Response(request, headers=CORS_HEADERS)
    return JSONResponse(
        request,
        {"room": ROOM_ID, "base_devices": BASE_DEVICES, "loaded": list(teams.keys()), "errors": team_errors},
        headers=CORS_HEADERS,
    )


# ------------------------------------------------------------------------------
# 4. 서버 시작 및 메인 루프
# ------------------------------------------------------------------------------
server.start(str(wifi.radio.ipv4_address), port=80)
print(f"HTTP Server 실행 중: http://{wifi.radio.ipv4_address}")

while True:
    try:
        server.poll()
    except Exception as err:
        print(f"Server poll error: {err}")
    time.sleep(0.01)
