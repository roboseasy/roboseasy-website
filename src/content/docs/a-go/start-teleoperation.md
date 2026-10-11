---
title: "Teleoperation"
category: "a-go"
group: "Start"
order: 100
---

# A-Go(LeKiwi) Teleoperation

**텔레오퍼레이션(teleoperation)** 은 사람이 로봇을 실시간으로 원격 조종하는 것입니다. 단순히 로봇을 움직여 보는 재미를 넘어, 이후 단계에서 다룰 **모방 학습의 출발점**입니다. 로봇이 배울 시범 데이터는 모두 사람이 텔레오퍼레이션으로 만든 것이기 때문입니다. 이 페이지에서는 리더 암으로 LeKiwi의 팔을, 키보드로 바퀴를 조종합니다.

> 🎯 **학습 목표**
>
> - 호스트와 클라이언트 사이에 어떤 데이터가 오가는지 설명할 수 있다.
> - Pi에서 호스트를, PC에서 클라이언트를 실행해 텔레오퍼레이션을 수행할 수 있다.
> - 호스트 로그와 시각화 화면을 읽고 정상 동작 여부를 판단할 수 있다.

---

## 1. 텔레오퍼레이션의 구조

[Pi LeRobot 설치](/docs/a-go/lekiwi-lerobot-setup)에서 본 호스트와 클라이언트 구조가 여기서 실제로 동작합니다.

| 방향 | 내용 | 출처 |
|---|---|---|
| PC → Pi | **행동(action)** : 팔 관절 6개의 목표 각도 + 바퀴 속도 3개 | 리더 암 + 키보드 |
| Pi → PC | **관측(observation)** : 팔 관절의 현재 각도, 바퀴 속도, 카메라 영상 2개 | LeKiwi의 모터와 카메라 |

이 교환이 초당 30번 반복됩니다. PC의 클라이언트는 리더 암 각도를 읽어 보내고, Pi의 호스트는 그것을 모터에 쓰고 카메라 영상을 돌려보냅니다. 관측과 행동이 짝을 이루어 흐른다는 점을 기억해 두세요. [데이터 기록](/docs/a-go/dataset-record) 단계에서는 이 짝을 그대로 파일에 저장합니다.

호스트에는 **워치독(watchdog)** 이라는 안전장치가 있습니다. 클라이언트로부터 명령이 0.5초 이상 오지 않으면 바퀴를 즉시 멈춥니다. 와이파이가 끊겨도 로봇이 벽으로 돌진하지 않게 하는 장치입니다.

---

## 2. [Pi] 호스트 실행

라즈베리파이에 SSH로 접속하고 가상환경(`~/lerobot060_venv`)이 활성화된 상태에서 호스트를 먼저 띄웁니다. 클라이언트가 붙을 때까지 기다리는 쪽이 호스트이므로 **순서는 항상 호스트가 먼저**입니다.

### 2.1. 명령 실행

```bash
python -m lerobot.robots.lekiwi.lekiwi_host \
    --robot.id=lekiwi07 \
    --robot.cameras='{
    wrist: {type: opencv, index_or_path: /dev/video0, width: 640, height: 480, fps: 30, rotation: 0, fourcc: MJPG},
    front: {type: opencv, index_or_path: /dev/video2, width: 640, height: 480, fps: 30, rotation: 0, fourcc: MJPG}
    }' \
    --host.connection_time_s=14400
```

| 옵션 | 의미 |
|---|---|
| `--robot.id` | [캘리브레이션](/docs/a-go/start-calibration)에서 캘리브레이션한 **같은 id**. 다르면 변환표를 못 찾습니다 |
| `--robot.cameras` | 카메라 이름과 설정. 이름(`wrist`, `front`)은 관측 데이터의 키가 되므로 이후 단계에서도 그대로 씁니다 |
| `index_or_path` | 카메라 장치 경로. 꽂는 순서에 따라 바뀔 수 있는데, 이 문제는 [카메라 포트 고정](/docs/a-go/setup-cameraport)에서 해결합니다 |
| `fourcc: MJPG` | 압축 영상 포맷. 비압축(YUYV)은 USB 대역폭을 다 써서 카메라 두 개를 30fps로 못 돌립니다 |
| `--host.connection_time_s` | 호스트가 켜져 있는 시간(초). 기본값 30초는 너무 짧아 4시간(14400초)으로 늘렸습니다 |

### 2.2. 정상 출력 확인

![](/img/a_go/start-teleoperation-01.webp)

위 화면 맨 위처럼 `Press ENTER to use provided calibration file ...` 이 나오면 ENTER를 눌러 [캘리브레이션](/docs/a-go/start-calibration)에서 만든 파일을 그대로 씁니다. 이 질문은 모터에 기록된 값과 파일이 다를 때만 나옵니다.

그 뒤 `No command available` 경고가 계속 찍히는 것이 **정상**입니다. 아직 클라이언트가 붙지 않아 명령이 없다는 뜻이고, 마지막 줄의 `Stopping the base` 는 워치독이 바퀴를 안전하게 멈춰 둔 것입니다. 클라이언트가 연결되면 이 경고는 멈춥니다.

호스트는 이 창을 그대로 두고, PC에서 새 터미널을 엽니다.

---

## 3. [Ubuntu PC] 사전 점검: 디스플레이 서버

클라이언트 예제는 `pynput` 으로 키보드 입력을 **전역으로** 가로채서 바퀴를 조종합니다. 최신 우분투의 기본 디스플레이 서버인 Wayland는 보안상 이 방식을 막기 때문에 키보드 리스너가 켜지지 않고, 예제가 시작하자마자 `ValueError: Robot or teleop is not connected!` 로 멈춥니다(팔도 움직이지 않습니다). 한 번만 X11로 바꿔 두면 됩니다. 윈도우는 이 절을 건너뜁니다.

먼저 현재 상태를 확인합니다.

```bash
echo $XDG_SESSION_TYPE
```

`x11` 이면 이 절은 건너뜁니다. `wayland` 라면 아래 명령으로 설정을 바꿉니다. 원본을 백업한 뒤 주석 처리된 한 줄을 활성화하는 명령입니다.

```bash
sudo cp /etc/gdm3/custom.conf /etc/gdm3/custom.conf.bak && \
sudo sed -i 's/^#WaylandEnable=false/WaylandEnable=false/' /etc/gdm3/custom.conf && \
grep -n WaylandEnable /etc/gdm3/custom.conf
```

```text
10:WaylandEnable=false
```

위처럼 출력되면 재부팅합니다.

```bash
sudo reboot
```

재부팅 후 다시 확인해서 `x11` 이 나오면 됩니다.

---

## 4. [PC] 클라이언트 설정

클라이언트는 LeRobot 저장소에 포함된 예제 스크립트를 씁니다. 실행 전에 **내 로봇에 맞게 두 곳**을 고칩니다.

> **정보** ℹ️ `INFO`
> <br>**LeRobot을 pip 패키지로 설치했다면** 소스 저장소가 없으므로 PC에 `examples` 폴더도 없어 4~5절을 따라 할 수 없습니다. PC 쪽 클라이언트는 [제어 스크립트](/docs/a-go/start-custom-scripts)의 커스텀 클라이언트(`lekiwi-teleoperate.py`)로 실행하세요.

```bash
# 우분투
cd ~/lerobot
nano examples/lekiwi/teleoperate.py
```

```bash
:: 윈도우 (메모장으로 열기)
cd %USERPROFILE%\lerobot
notepad examples\lekiwi\teleoperate.py
```

![](/img/a_go/start-teleoperation-02.webp)

처음 열면 위 화면처럼 다른 IP와 id가 적혀 있습니다. `robot_config` 와 `teleop_arm_config` 두 줄을 내 로봇에 맞게 아래처럼 고칩니다.

```python
robot_config = LeKiwiClientConfig(remote_ip="192.168.0.207", id="lekiwi07")
teleop_arm_config = SO100LeaderConfig(port="/dev/ttyACM0", id="leader")
```

| 항목 | 값 | 설명 |
|---|---|---|
| `remote_ip` | `192.168.0.207` | [고정 IP · 무선 연결](/docs/a-go/lekiwi-wifi-static-ip)에서 만든 LeKiwi의 고정 IP. 현재 네트워크 대역에 맞춥니다 |
| `id` (robot) | `lekiwi07` | 호스트와 같은 id |
| `port` (teleop) | `/dev/ttyACM0` | 리더 암이 연결된 PC의 USB 포트. 윈도우는 `COM22` 형태 |
| `id` (teleop) | `leader` | [캘리브레이션](/docs/a-go/start-calibration)에서 리더 암을 캘리브레이션한 id |

> **팁** 💡`TIP`
> <br>**스크립트가 하는 일** 코드를 읽어 보면 구조가 단순합니다. 설정 세 개(로봇, 리더 암, 키보드)를 만들고 각각 `connect()` 한 뒤, 무한 루프에서 관측을 받고, 리더 암과 키보드에서 행동을 만들고, 로봇에 보내고, 시각화 도구에 기록합니다. 마지막의 `precise_sleep` 이 이 루프를 정확히 30 FPS로 맞춥니다. 이후 단계의 데이터 기록 코드도 같은 뼈대 위에 저장 기능만 얹은 것입니다.

---

## 5. [PC] 클라이언트 실행

리더 암이 PC에 연결되어 있고, Pi의 호스트가 떠 있는지 확인한 뒤 실행합니다.

> **경고** ⚠️ `WARN`
> <br>**처음 바퀴를 굴리기 전에** 로봇을 책상이 아니라 바닥에 내려놓고 주변 1~2m를 비워 두세요. 책상 위에서 키를 잘못 누르면 떨어집니다. 이상하면 바로 터미널에서 `Ctrl + C` 를 누르고, 그래도 멈추지 않으면 LeKiwi의 배터리 전원 스위치를 끕니다.

```bash
# 우분투
cd ~/lerobot
python examples/lekiwi/teleoperate.py
```

```bash
:: 윈도우
cd %USERPROFILE%\lerobot
python examples\lekiwi\teleoperate.py
```

`Starting teleop loop...` 가 출력되고 **Rerun** 시각화 창이 열립니다.

![](/img/a_go/start-teleoperation-03.webp)

| 화면 영역 | 내용 |
|---|---|
| `observation.front` | 정면 카메라 영상 |
| `observation.wrist` | 손목 카메라 영상. 그리퍼가 보여야 합니다 |
| `observation` 그래프 | LeKiwi 팔 관절의 현재 각도 |
| `action` 그래프 | 리더 암에서 읽은 목표 각도와 바퀴 속도 |

리더 암을 움직이면 LeKiwi의 팔이 따라오고, `action` 그래프의 선이 먼저 움직인 뒤 `observation` 선이 뒤따르는 것을 볼 수 있습니다. 두 그래프의 차이가 곧 팔로워가 리더를 쫓아가는 지연입니다.

바퀴는 키보드로 조종합니다. 이 예제는 키 입력을 **전역으로** 받으므로(우분투는 X11 세션에서만) 터미널, Rerun 등 어느 창에 포커스가 있어도 키가 전달됩니다. 다른 창에 글자를 입력하다가 로봇이 움직이지 않도록 주의하세요.

| 키 | 동작 |
|---|---|
| `W` / `S` | 전진 / 후진 |
| `A` / `D` | 왼쪽 / 오른쪽 이동 |
| `Z` / `X` | 제자리 왼쪽 / 오른쪽 회전 |
| `R` / `F` | 속도 올리기 / 내리기 |

LeKiwi의 바퀴는 옴니휠이라 회전 없이 옆으로도 움직일 수 있습니다. 종료는 터미널에서 `Ctrl + C` 입니다.

> **경고** ⚠️ `WARN`
> <br>처음에는 팔을 넓게 움직이기 전에 리더 암을 천천히 움직여 팔로워가 어느 방향으로 따라오는지 확인하세요. 캘리브레이션이 어긋났다면 팔로워가 예상과 다른 방향으로 갈 수 있습니다.

---

## 6. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `ModuleNotFoundError: No module named 'zmq'` | PC 설치 때 `lekiwi` extra가 빠짐. [LeRobot 설치 (Ubuntu)](/docs/a-go/setup-lerobot-ubuntu) / [LeRobot 설치 (Windows)](/docs/a-go/setup-lerobot-windows) 4.1절의 extras 설치 명령(`lekiwi` 포함)을 다시 실행 |
| 연결 대기 후 timeout | Pi 호스트가 떠 있는지, `remote_ip` 가 맞는지, PC와 Pi가 같은 와이파이인지. `ping 192.168.0.207` 으로 확인 |
| 리더 암 포트 오류 | `ls /dev/ttyACM*` 로 포트 확인. 리더 암 전원 확인 |
| 시작하자마자 `ValueError: Robot or teleop is not connected!` | 우분투 디스플레이 서버가 Wayland라 키보드 리스너가 켜지지 않음. 3절대로 X11로 전환 |
| 카메라 영상이 검거나 없음 | 호스트의 `index_or_path` 가 실제 장치와 다름. [카메라 포트 고정](/docs/a-go/setup-cameraport) 참고 |
| front와 wrist 화면이 서로 바뀜 | 호스트 명령의 `/dev/video0`, `/dev/video2` 를 맞바꿈. [카메라 포트 고정](/docs/a-go/setup-cameraport)에서 고정 |
| 호스트가 30초 만에 꺼짐 | `--host.connection_time_s` 옵션 누락 |
| 팔이 리더와 다른 자세로 따라옴 | [캘리브레이션](/docs/a-go/start-calibration)을 양쪽 모두 `c` 로 다시 진행 |

---

## 7. 정리

- 텔레오퍼레이션은 PC 클라이언트가 **행동**을 보내고 Pi 호스트가 **관측**을 돌려주는 교환을 초당 30번 반복하는 것입니다.
- 실행 순서는 항상 **호스트 먼저, 클라이언트 나중**입니다.
- 호스트의 `No command available` 은 클라이언트 대기 중이라는 정상 메시지이며, 워치독이 바퀴를 안전하게 멈춥니다.
- 이 예제의 키보드 조종은 우분투에서는 X11 세션에서만 동작합니다(윈도우는 그대로 동작). Wayland에서도 동작하는 방법은 [제어 스크립트](/docs/a-go/start-custom-scripts)에서 다룹니다.

카메라 장치 번호가 꽂는 순서에 따라 바뀌는 문제를 남겨 두었습니다. 데이터 수집 전에 반드시 해결해야 하므로 다음 페이지 [카메라 포트 고정](/docs/a-go/setup-cameraport)에서 다룹니다.
