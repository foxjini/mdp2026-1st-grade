# ==============================================================================
# CircuitPython 10.x Firmware for Raspberry Pi Pico 2 W
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
        return read_dht()["temperature"] if dht else None

    def humidity(self):
        return read_dht()["humidity"] if dht else None

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
#    고정 IP 는 연결 '후'에 적용합니다. (connect() 가 DHCP 를 다시 시작하므로 재연결마다 다시 적용)
# ------------------------------------------------------------------------------
ssid = os.getenv("CIRCUITPY_WIFI_SSID")
password = os.getenv("CIRCUITPY_WIFI_PASSWORD")
static_ip = os.getenv("PICO_STATIC_IP")
ip_addr = "0.0.0.0"


def apply_static_ip():
    """PICO_STATIC_IP 가 있으면 고정 IP 로 바꿉니다. 실패하면 DHCP 주소를 그대로 씁니다."""
    if not static_ip:
        return
    try:
        import ipaddress

        gateway = os.getenv("PICO_GATEWAY") or ".".join(static_ip.split(".")[:3] + ["1"])
        netmask = os.getenv("PICO_NETMASK") or "255.255.255.0"
        dns = os.getenv("PICO_DNS")
        # 형식 오류는 DHCP 를 멈추기 전에 미리 확인합니다.
        addrs = {
            "ipv4": ipaddress.IPv4Address(static_ip),
            "netmask": ipaddress.IPv4Address(netmask),
            "gateway": ipaddress.IPv4Address(gateway),
        }
        if dns:
            addrs["ipv4_dns"] = ipaddress.IPv4Address(dns)  # None 을 넘기면 ValueError 이므로 있을 때만
    except Exception as err:
        print(f"고정 IP 설정 값 오류 ({err}). settings.toml 의 PICO_* 값을 확인하세요. DHCP 주소를 씁니다.")
        return
    try:
        wifi.radio.set_ipv4_address(**addrs)
    except Exception as err:
        print(f"고정 IP 적용 실패: {err}")
    now = str(wifi.radio.ipv4_address)
    if now == static_ip:
        print(f"고정 IP 적용: {static_ip} (게이트웨이 {gateway})")
    else:
        print(f"[주의] 고정 IP {static_ip} 적용 안 됨. 현재 IP: {now}")


def connect_wifi(attempts=3):
    """Wi-Fi 연결 + 고정 IP 적용. 성공하면 True"""
    global ip_addr
    if not ssid:
        print("settings.toml 에 CIRCUITPY_WIFI_SSID 가 없습니다.")
        return False
    for n in range(1, attempts + 1):
        print(f"Wi-Fi 연결 시도 중 ({n}/{attempts}): {ssid}...")
        try:
            wifi.radio.connect(ssid, password)
        except Exception as err:
            print(f"Wi-Fi 연결 실패: {err}")
            time.sleep(2)
            continue
        if wifi.radio.connected and wifi.radio.ipv4_address is not None:
            apply_static_ip()
            ip_addr = str(wifi.radio.ipv4_address)
            print(f"Wi-Fi 연결 성공! Pico 2 W IP: {ip_addr}")
            return True
        time.sleep(2)
    ip_addr = "0.0.0.0"
    return False


# ------------------------------------------------------------------------------
# 3. HTTP Server 및 REST API 라우트 (CORS 지원)
# ------------------------------------------------------------------------------
pool = socketpool.SocketPool(wifi.radio)
server = Server(pool, "/static", debug=False)  # debug=True 는 요청마다 시리얼 출력 (팀 모듈 오류를 찾기 어려움)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}
server.headers = CORS_HEADERS  # 404 · 오류 응답에도 CORS 헤더


# DHT11 은 2초에 한 번만 읽을 수 있고 가끔 실패합니다. 마지막 정상 값을 보관합니다.
DHT_INTERVAL = 2.0
dht_cache = {"temperature": None, "humidity": None, "ok": False, "at": -DHT_INTERVAL}


def read_dht():
    if dht is None:
        return dht_cache
    now = time.monotonic()
    if now - dht_cache["at"] >= DHT_INTERVAL:
        dht_cache["at"] = now
        try:
            t = dht.temperature
            h = dht.humidity
            if t is not None and h is not None:
                dht_cache["temperature"] = t
                dht_cache["humidity"] = h
                dht_cache["ok"] = True
            else:
                dht_cache["ok"] = False
        except RuntimeError:
            dht_cache["ok"] = False  # 간헐적 읽기 실패: 마지막 정상 값 유지
    return dht_cache


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

    # 팀 확장 센서 값을 먼저 읽음 (팀 모듈이 read() 에서 바꾼 서보/LED 상태가 같은 응답에 반영되도록)
    # rooms = {공간ID: {...}}, custom = 전체 병합
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

    # 연결된 기본 장치 값만 보냄 (없는 장치는 대시보드에서 '수신 대기')
    if dht:
        reading = read_dht()
        data["dht_ok"] = reading["ok"]
        if reading["temperature"] is not None:  # 정상 값이 아직 없으면 보내지 않음 → '수신 대기'
            data["temperature"] = reading["temperature"]
            data["humidity"] = reading["humidity"]
    if cds:
        data["light_adc"] = cds.value
    if my_servo:
        data["servo_angle"] = current_servo_angle
    if red_pwm:
        data["rgb_color"] = current_rgb_color
        data["rgb_state"] = current_rgb_state

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
#    Wi-Fi 가 끊기면 (공유기 재부팅 등) 자동으로 다시 연결하고 서버를 다시 시작합니다.
# ------------------------------------------------------------------------------
server_running = False


def start_server():
    global server_running
    try:
        server.start(ip_addr, port=80)
        server_running = True
        print(f"HTTP Server 실행 중: http://{ip_addr}")
    except Exception as err:
        server_running = False
        print(f"HTTP Server 시작 실패: {err}")
        print("  → 80 포트를 웹 워크플로가 쓰고 있다면 settings.toml 에 CIRCUITPY_WEB_API_PORT = 8080 을 추가하세요.")


def stop_server():
    global server_running
    if server_running:
        try:
            server.stop()
        except Exception:
            pass
    server_running = False


if connect_wifi():
    start_server()
else:
    print("Wi-Fi 연결 실패. 10초마다 다시 시도합니다. (SSID · 비밀번호 · 2.4GHz 공유기 확인)")

last_check = time.monotonic()
while True:
    now = time.monotonic()
    interval = 5 if server_running else 10
    if now - last_check >= interval:
        last_check = now
        if not wifi.radio.connected:
            if server_running:
                print("Wi-Fi 연결이 끊겼습니다. 다시 연결합니다...")
                stop_server()
            if connect_wifi(attempts=1):
                start_server()
        elif not server_running:
            ip_addr = str(wifi.radio.ipv4_address)
            start_server()

    if server_running:
        try:
            server.poll()
        except Exception as err:
            print(f"Server poll error: {err}")
    time.sleep(0.01)
