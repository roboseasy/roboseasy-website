---
title: "제어 스크립트"
category: "a-go"
group: "Start"
order: 130
---

# LeKiwi 제어 코드 커스터마이징과 텔레오퍼레이션

[텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 LeRobot 예제 스크립트로 텔레오퍼레이션을 해 보았습니다. 동작은 했지만 IP나 id를 바꾸려면 매번 코드 파일을 열어야 했고, 이후 데이터 기록과 추론에서도 같은 불편이 반복됩니다. 이 페이지에서는 왜 예제 코드가 그렇게 되어 있는지 살펴보고, 설정을 명령줄 인자로 넘길 수 있게 정리한 **커스텀 스크립트**로 갈아탑니다. 라즈베리파이 쪽 호스트도 한 줄로 띄울 수 있게 스크립트로 묶습니다. 이 페이지 이후의 모든 실습은 이 두 가지 위에서 진행됩니다.

> 🎯 **학습 목표**
>
> - LeRobot 기본 도구가 LeKiwi 텔레오퍼레이션에 바로 쓰이지 않는 이유를 설명할 수 있다.
> - 호스트 실행 스크립트의 각 부분이 무엇을 해결하는지 이해하고 실행할 수 있다.
> - 커스텀 클라이언트 스크립트로 인자만 바꿔 텔레오퍼레이션을 수행할 수 있다.

---

## 1. 예제 코드의 한계

### 1.1. 설정이 코드 안에 있다

[텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 쓴 `examples/lekiwi/teleoperate.py` 의 앞부분입니다.

```python
FPS = 30

def main():
    # Create the robot and teleoperator configurations
    robot_config = LeKiwiClientConfig(remote_ip="192.168.0.207", id="lekiwi07")
    teleop_arm_config = SO100LeaderConfig(port="/dev/ttyACM0", id="leader")
    keyboard_config = KeyboardTeleopConfig(id="my_laptop_keyboard")

    # Initialize the robot and teleoperator
    robot = LeKiwiClient(robot_config)
    leader_arm = SO100Leader(teleop_arm_config)
    keyboard = KeyboardTeleop(keyboard_config)
```

IP, 로봇 id, 리더 암 포트가 모두 코드 안에 **하드코딩** 되어 있습니다. 예제로서는 읽기 쉽지만, 로봇이 바뀌거나 네트워크 대역이 바뀔 때마다 파일을 열어 고쳐야 합니다. 여러 대의 로봇을 번갈아 쓰거나 다른 장소로 옮기면 실수하기 쉽습니다.

### 1.2. 기본 명령줄 도구는 LeKiwi를 지원하지 않는다

LeRobot에는 `lerobot-teleoperate` 라는 명령줄 도구가 있어 SO-ARM 같은 로봇은 인자만으로 텔레오퍼레이션이 됩니다. 그런데 이 도구는 **조종 장치를 하나만** 받습니다. LeKiwi는 팔은 리더 암으로, 바퀴는 키보드로 조종하므로 조종 장치가 **두 개** 필요하고, 그래서 기본 도구를 쓸 수 없습니다. 예제 스크립트가 따로 있는 이유가 이것입니다.

### 1.3. 커스텀 저장소

두 문제를 함께 해결한 스크립트 모음을 저장소에서 받습니다(PC에서 실행). 예제와 같은 구조를 유지하면서 설정을 전부 인자로 뺐고, 리더 암과 키보드를 함께 다룹니다. 스크립트는 저장소의 `feature/lerobot` 브랜치에 있으므로 `-b feature/lerobot` 을 붙여 받습니다.

```bash
# 우분투
mkdir -p ~/workspace
cd ~/workspace
git clone -b feature/lerobot https://github.com/roboseasy/lekiwi.git
cd lekiwi
```

```bat
:: 윈도우
cd %USERPROFILE%
mkdir workspace
cd workspace
git clone -b feature/lerobot https://github.com/roboseasy/lekiwi.git
cd lekiwi
```

| 스크립트 | 하는 일 | 사용하는 페이지 |
|---|---|---|
| `lekiwi-teleoperate.py` | 기록 없이 조작만 | 이 페이지 |
| `lekiwi-record.py` | 조작하면서 데이터셋 기록 | [데이터 기록](/docs/a-go/dataset-record) |
| `lekiwi-replay.py` | 기록한 에피소드를 로봇에서 재생 | [데이터 재생](/docs/a-go/dataset-replay) |
| `lekiwi-rollout.py` | 학습된 정책으로 자율 실행. `--duration_s` 로 시간 제한 (실험·디버깅용) | [ACT 추론](/docs/a-go/inference-act) |
| `lekiwi-inference.py` | 학습된 정책으로 자율 실행. ESC로 멈출 때까지 계속 (시연용) | [ACT 추론](/docs/a-go/inference-act), [SmolVLA 추론](/docs/a-go/inference-smolvla) |
| `lekiwi-evaluate.py` | 정책 성공률 측정 | [ACT 추론](/docs/a-go/inference-act) |

모든 스크립트는 `--robot.*`(로봇 접속), `--display_data` 같은 **인자 이름을 공유**하고, 리더 암을 쓰는 `lekiwi-teleoperate.py`·`lekiwi-record.py` 는 `--teleop.*` 도 공유합니다. 이 페이지에서 익힌 인자를 이후 단계에서 그대로 씁니다.

---

## 2. [Pi] 호스트 실행 스크립트

### 2.1. 왜 스크립트로 묶는가

[카메라 포트 고정](/docs/a-go/setup-cameraport)에서 완성한 호스트 명령은 카메라 설정 때문에 일곱 줄이 넘습니다. 라즈베리파이에 접속할 때마다 이것을 입력하는 것은 번거롭고 오타가 나기 쉽습니다. 게다가 호스트는 모터에 기록된 캘리브레이션 값이 파일과 다르면 시작할 때 "기존 캘리브레이션을 쓸까요?"라고 묻는데, 나중에 자동 실행으로 돌릴 때 이 질문에 답할 사람이 없으면 오류로 죽습니다. 이런 것들을 셸 스크립트 하나에 담습니다.

### 2.2. 스크립트 작성

라즈베리파이에 SSH로 접속해 홈 폴더에 만듭니다.

> **팁** 💡`TIP`
> <br>**킷에 이미 들어 있을 수 있습니다.** `ls ~/start_lekiwi_host.sh` 로 먼저 확인합니다. 파일이 있으면 `cp ~/start_lekiwi_host.sh ~/start_lekiwi_host.sh.bak` 으로 백업한 뒤, 아래 내용과 비교해 `ROBOT_ID` 기본값, `--robot.port`, 카메라 경로를 고칩니다. 없으면 아래처럼 새로 만듭니다.

```bash
nano ~/start_lekiwi_host.sh
```

```bash
#!/usr/bin/env bash
# LeKiwi 호스트 실행 스크립트
# 사용법: ./start_lekiwi_host.sh [robot_id] [run_time_sec]
set -e

VENV_DIR="$HOME/lerobot060_venv"
ROBOT_ID="${1:-lekiwi07}"
RUN_TIME_SEC="${2:-14400}"  # 기본 4시간

if [ ! -x "$VENV_DIR/bin/python" ]; then
        echo "[lekiwi] error: venv not found at $VENV_DIR"
        exit 1
fi

# 카메라는 MJPG 강제 — 기본값(YUYV)은 두 카메라 동시 스트림이
# Pi USB 대역폭을 초과해 wrist 카메라가 타임아웃 난다 (실측)
# (아래 주석 줄은 손목 카메라를 세로로 달았을 때의 예시)
# CAMERAS_CONFIG='{front: {type: opencv, index_or_path: /dev/cam_front, fps: 30, width: 640, height: 480, rotation: 0, fourcc: MJPG}, wrist: {type: opencv, index_or_path: /dev/cam_wrist, fps: 30, width: 480, height: 640, rotation: -90, fourcc: MJPG}}'
CAMERAS_CONFIG='{front: {type: opencv, index_or_path: /dev/cam_front, fps: 30, width: 640, height: 480, rotation: 0, fourcc: MJPG}, wrist: {type: opencv, index_or_path: /dev/cam_wrist, fps: 30, width: 640, height: 480, rotation: 0, fourcc: MJPG}}'

echo "[lekiwi] starting host: id=$ROBOT_ID run_time=${RUN_TIME_SEC}s"
echo "[lekiwi] laptop should connect to this Pi's IP (ZMQ 5555/5556)"
# 시작 시 "기존 캘리브레이션 사용?" 프롬프트에 자동 ENTER —
# nohup/systemd처럼 stdin이 없는 환경에서 EOFError로 죽는 것 방지.
# 재캘리브레이션은 lerobot-calibrate로 별도 수행.
exec "$VENV_DIR/bin/python" -m lerobot.robots.lekiwi.lekiwi_host \
        --robot.id="$ROBOT_ID" \
        --robot.port=/dev/lekiwi \
        --robot.cameras="$CAMERAS_CONFIG" \
        --host.connection_time_s="$RUN_TIME_SEC" <<< ''
```

각 부분이 해결하는 문제는 다음과 같습니다.

| 부분 | 역할 |
|---|---|
| `VENV_DIR` | [Pi LeRobot 설치](/docs/a-go/lekiwi-lerobot-setup)에서 만든 가상환경의 Python을 직접 지정. 가상환경을 활성화하지 않은 셸에서도 동작합니다 |
| `ROBOT_ID="${1:-lekiwi07}"` | 첫 번째 인자를 로봇 id로 쓰고, 없으면 `lekiwi07`. 다른 로봇이면 이 기본값을 바꿔 둡니다 |
| `RUN_TIME_SEC` | 두 번째 인자를 실행 시간으로 쓰고, 없으면 4시간 |
| `--robot.port=/dev/lekiwi` | [USB 포트 고정](/docs/a-go/setup-usbport)에서 만든 모터 보드 고정 포트. 포트를 고정하지 않았다면 `/dev/ttyACM0` 으로 바꿉니다 |
| `CAMERAS_CONFIG` | [카메라 포트 고정](/docs/a-go/setup-cameraport)에서 고정한 `/dev/cam_front`, `/dev/cam_wrist` 별칭과 MJPG 설정. 주석 처리된 줄은 손목 카메라를 세로로 달았을 때의 예시입니다 |
| `<<< ''` | 빈 줄을 표준 입력으로 넣어 캘리브레이션 질문에 ENTER를 자동으로 답합니다 |
| `exec` | 셸을 Python 프로세스로 교체해, `Ctrl + C` 가 호스트에 바로 전달되게 합니다 |

> **팁** 💡`TIP`
> <br>**카메라 해상도 규칙** `width` 와 `height` 는 회전을 적용한 **뒤**의 크기입니다. 640×480 웹캠을 `rotation: 0` 으로 쓰면 `640, 480`, 세로로 달아 `rotation: -90` 을 쓰면 `480, 640` 이어야 합니다. 이 조합이 어긋나면 카메라 열기에 실패합니다.

저장한 뒤 실행 권한을 줍니다.

```bash
chmod +x ~/start_lekiwi_host.sh
```

### 2.3. 실행

```bash
./start_lekiwi_host.sh lekiwi07
```

첫 번째 인자가 로봇 id입니다. 생략하면 스크립트의 기본값 `lekiwi07` 이 쓰이므로, 다른 로봇에서는 그 로봇의 id를 넘기거나 기본값을 바꿉니다. [캘리브레이션](/docs/a-go/start-calibration)에서 쓴 id와 같아야 합니다.

![](/img/a_go/start-custom-scripts-01.webp)

예시 화면은 호스트를 직접 실행했을 때의 화면(id `lekiwi01`)입니다. 스크립트로 실행하면 맨 앞에 `[lekiwi] starting host: id=lekiwi07 run_time=14400s` 같은 안내 줄이 먼저 찍힙니다.

[텔레오퍼레이션](/docs/a-go/start-teleoperation)과 같은 대기 화면이 나오면 정상입니다. 이 창은 그대로 두고 PC로 넘어갑니다. 이후 [데이터 기록](/docs/a-go/dataset-record), [데이터 재생](/docs/a-go/dataset-replay), [ACT 추론](/docs/a-go/inference-act), [SmolVLA 추론](/docs/a-go/inference-smolvla)에서 "호스트 실행"은 모두 이 한 줄을 뜻합니다.

---

## 3. [PC] 커스텀 클라이언트로 텔레오퍼레이션

### 3.1. 명령

PC의 conda 환경을 활성화하고 저장소 폴더로 이동한 뒤 실행합니다. [텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 코드에 적었던 값들이 그대로 인자가 되었습니다.

```bash
# 우분투
conda activate lerobot060
cd ~/workspace/lekiwi
```

```bat
:: 윈도우
conda activate lerobot060
cd %USERPROFILE%\workspace\lekiwi
```

```bash
# 우분투
python lekiwi-teleoperate.py \
    --robot.remote_ip=192.168.0.207 \
    --robot.id=lekiwi07 \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=leader \
    --fps=30 \
    --display_data=true
```

```bat
:: 윈도우
python lekiwi-teleoperate.py ^
    --robot.remote_ip=192.168.0.207 ^
    --robot.id=lekiwi07 ^
    --teleop.port=COM22 ^
    --teleop.id=leader ^
    --fps=30 ^
    --display_data=true
```

| 인자 | 의미 |
|---|---|
| `--robot.remote_ip` | [고정 IP · 무선 연결](/docs/a-go/lekiwi-wifi-static-ip)에서 만든 LeKiwi의 고정 IP |
| `--robot.id` | 호스트와 같은 로봇 id |
| `--teleop.port` | 리더 암이 꽂힌 PC의 USB 포트 |
| `--teleop.id` | [캘리브레이션](/docs/a-go/start-calibration)에서 리더 암을 캘리브레이션한 id |
| `--fps` | 제어 주기. 기본 30 |
| `--display_data` | Rerun 시각화 창 표시 |
| `--teleop_time_s` | 지정한 초 뒤 자동 종료. 생략하면 ESC를 누를 때까지 |

인자를 생략하면 스크립트 안의 기본값이 쓰이는데, 이 기본값은 실습 환경과 다를 수 있으니 처음에는 위처럼 전부 명시하는 것을 권합니다.

### 3.2. 조작키

리더 암은 그대로 따라 움직이고, 바퀴는 키보드로 조종합니다.

| 키 | 동작 |
|---|---|
| `W` / `S` | 전진 / 후진 |
| `A` / `D` | 왼쪽 / 오른쪽 이동 |
| `Q` / `E` | 제자리 왼쪽 / 오른쪽 회전 |
| `R` / `F` | 속도 단계 올리기 / 내리기 |
| `SPACE` | 바퀴 정지 |
| `ESC` | 종료 |

[텔레오퍼레이션](/docs/a-go/start-teleoperation) 예제에서는 회전이 `Z` / `X` 였는데 커스텀 스크립트는 손이 닿기 쉬운 `Q` / `E` 로 옮겼습니다. 속도 키는 누르고 있으면 순식간에 최대나 최소로 튀기 때문에 0.4초에 한 단계씩만 바뀌도록 되어 있습니다.

종료하면 바퀴를 멈추고, 팔은 현재 자세를 목표로 한 번 더 보내 튀지 않게 한 뒤 연결을 끊습니다. `Ctrl + C` 도 같은 순서로 정리됩니다.

### 3.3. 키보드 입력 방식

[텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 Wayland를 X11로 바꾼 이유는 예제가 쓰는 전역 키 감지 방식이 Wayland에서 막히기 때문이었습니다. 커스텀 스크립트는 `--base_control` 인자로 입력 방식을 고르며, 기본값 `auto` 가 환경을 보고 자동으로 정합니다.

| 값 | 방식 | 조건 |
|---|---|---|
| `pynput` | 전역 키 감지. 누르고 있는 동안 이동 | X11에서만 동작 |
| `terminal` | 이 터미널 창의 입력을 읽음 | Wayland에서도 동작. 터미널 창에 포커스가 있어야 함 |
| `none` | 바퀴 조종 끄고 팔만 | 팔만 확인할 때 |

즉 [텔레오퍼레이션](/docs/a-go/start-teleoperation)의 X11 전환은 이 스크립트에서는 필수가 아닙니다. Wayland 환경이면 자동으로 터미널 입력 방식이 되고, 시작 로그에 어느 방식이 선택됐는지 출력됩니다. 터미널 방식일 때는 Rerun 창이 아니라 **명령을 실행한 터미널 창**을 클릭한 상태에서 키를 눌러야 합니다.

### 3.4. 화면 확인

![](/img/a_go/start-custom-scripts-02.webp)

[텔레오퍼레이션](/docs/a-go/start-teleoperation)과 같은 화면입니다. 정면과 손목 카메라, 관측과 행동 그래프가 보이고 리더 암을 움직이면 팔이 따라옵니다. 시작할 때 실제로 들어온 카메라 이름과 해상도가 로그에 한 번 찍히는데, [카메라 포트 고정](/docs/a-go/setup-cameraport)에서 정한 `front`, `wrist` 와 `480×640×3`(높이×너비×채널) 형태인지 확인해 두면 [데이터 기록](/docs/a-go/dataset-record)에서 기록할 데이터의 구조를 미리 아는 셈입니다.

---

## 4. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `venv not found` 로 호스트가 멈춤 | [Pi LeRobot 설치](/docs/a-go/lekiwi-lerobot-setup)에서 만든 가상환경 경로가 `~/lerobot060_venv` 인지 확인 |
| 호스트가 카메라를 못 엶 | [카메라 포트 고정](/docs/a-go/setup-cameraport) 별칭 `ls -l /dev/cam_*` 확인. 해상도와 회전 조합 확인 |
| 호스트 시작 직후 `EOFError` | 스크립트 마지막의 `<<< ''` 누락 |
| 클라이언트 연결 timeout | 호스트가 떠 있는지, `--robot.remote_ip` 가 맞는지, PC와 Pi가 같은 와이파이인지 |
| 바퀴가 키에 반응하지 않음 | 시작 로그의 입력 방식 확인. 터미널 방식이면 터미널 창을 클릭. `--base_control=terminal` 로 강제 가능 |
| 팔이 안 따라옴 | `--teleop.port` 확인, 리더 암 전원, `--teleop.id` 가 [캘리브레이션](/docs/a-go/start-calibration)에서 쓴 리더 암 id(`leader`)와 같은지 확인 |
| `No module named 'zmq'` | [LeRobot 설치 (Ubuntu)](/docs/a-go/setup-lerobot-ubuntu) / [LeRobot 설치 (Windows)](/docs/a-go/setup-lerobot-windows)에서 `lekiwi` extra 설치 여부 |

---

## 5. 정리

- LeRobot 예제는 설정이 코드에 박혀 있고, 기본 명령줄 도구는 조종 장치 두 개가 필요한 LeKiwi를 지원하지 않습니다.
- 커스텀 저장소의 스크립트는 설정을 **인자**로 받고, 이 페이지부터 [SmolVLA 추론](/docs/a-go/inference-smolvla)까지 같은 인자 체계를 씁니다.
- 호스트는 `./start_lekiwi_host.sh <로봇 id>` 한 줄로 띄우며, 스크립트가 가상환경과 카메라 설정, 캘리브레이션 질문을 대신 처리합니다.
- 바퀴 조종은 환경에 맞는 입력 방식이 자동 선택되므로 Wayland에서도 동작합니다.

다음 단계 [데이터 기록](/docs/a-go/dataset-record)에서는 같은 인자에 데이터셋 이름만 더해 실제 학습 데이터를 기록합니다.
