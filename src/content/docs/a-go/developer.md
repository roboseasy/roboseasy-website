---
title: "저장소와 구조"
category: "a-go"
group: "개발자"
order: 160
description: "A-Go(LeKiwi) 소프트웨어 구조 — 4개 저장소, ROS 2 패키지 · 토픽, 포트, 코드 고치고 로봇에 올리는 법"
---

# LeKiwi 저장소와 구조

이 페이지는 A-Go(LeKiwi)의 코드를 직접 읽고 고치려는 개발자를 위한 안내입니다. 로봇 소프트웨어는 공개 저장소 4개로 나뉘어 있고, 그중 로봇 쪽 3개는 SD 카드 이미지에 이미 들어 있습니다. 여기서는 저장소 · ROS 2 패키지 · 토픽 · 포트의 지도를 보여 주고, 같은 공유기에서 여러 대를 쓸 때 꼭 바꿔야 하는 `ROS_DOMAIN_ID` 와 고친 코드를 로봇에 올리는 방법을 다룹니다. 웹 화면이나 Physical Labs 로만 쓴다면 이 페이지를 읽지 않아도 됩니다.

> 🎯 **학습 목표**
>
> - 4개 저장소가 로봇 · PC 의 어디에 들어가고 무엇을 하는지 설명할 수 있다.
> - 로봇 기능(bringup)이 켜는 ROS 2 노드와 주요 토픽 · 서비스 · 포트를 찾을 수 있다.
> - 같은 공유기에서 쓰는 로봇마다 `ROS_DOMAIN_ID` 를 다르게 바꿀 수 있다.
> - ROS 2 패키지 · 게이트웨이 · 네트워크 스크립트를 고쳐 로봇에 올릴 수 있다.
> - PC 에서 RViz 나 LeRobot 클라이언트로 로봇에 직접 붙을 때의 주의점을 안다.

---

## 1. 소프트웨어 한눈에 보기

### 1.1. 저장소 4개

| 저장소 | 들어가는 곳 | 하는 일 |
|---|---|---|
| [roboseasy/lekiwi_ws](https://github.com/roboseasy/lekiwi_ws) | 로봇 `~/lekiwi_ws` | ROS 2 Jazzy 작업공간(colcon). 모터 드라이버 · 센서 · 팔로워 팔 · 베이스 컨트롤러 · 데이터 노드 · 지도 작성 · 자율 주행 (패키지 14개) |
| [roboseasy/lekiwi_web_operator](https://github.com/roboseasy/lekiwi_web_operator) | 로봇 `~/lekiwi_web_operator` + systemd 서비스 `lekiwi-web-operator` | 게이트웨이. 웹 화면 · REST API · WebSocket (포트 8080). 로봇 기능 · 지도 작성 · 자율 주행을 켜고 끕니다 |
| [roboseasy/lekiwi_net](https://github.com/roboseasy/lekiwi_net) | 로봇 `~/lekiwi_net` | 와이파이 · AP 전환 스크립트, 로봇 번호 정하기(`clone_init.sh`), 이미지 점검 · 이관 도구 |
| [roboseasy/lekiwi_pc_agent](https://github.com/roboseasy/lekiwi_pc_agent) | 사용자 노트북 `~/lekiwi_pc_agent` | 노트북에 꽂은 SO-101 리더암의 값을 게이트웨이로 보냅니다 (웹 화면의 팔 조작 · 리더 보정) |

- **로봇 폴더 하나 = 저장소 하나**입니다. 로봇에서는 폴더 이름과 위치를 바꾸지 않습니다. systemd 서비스 · 게이트웨이 · Physical Labs · `~/.bashrc` · bringup(장비 프로파일 · `arm_profile.yaml` 위치)이 이 경로를 그대로 씁니다.
- 로봇 쪽 3개는 SD 카드 이미지에 들어 있어 사용자가 설치할 것은 없습니다. 다만 이미지의 로봇 폴더에는 `.git` 이 없어서, 로봇에서 `git pull` 로 업데이트할 수 없습니다. 고친 코드를 올리는 방법은 6장에 있습니다.
- 4개 모두 공개 저장소이고 기본 브랜치는 `main` 입니다. Physical Labs 앱은 이 저장소들과 따로 배포되는 PC 앱입니다.

### 1.2. 로봇에서 도는 프로그램 — 누가 무엇을 켜나

로봇이 부팅하면 게이트웨이 하나만 켜집니다. 나머지는 게이트웨이가 `ros2 launch` 로 켜고 끕니다.

| 프로그램 | 누가 켜나 | 하는 일 |
|---|---|---|
| 게이트웨이 (`python3 -m lekiwi_web_operator`) | 부팅할 때 systemd (`lekiwi-web-operator.service`) | 웹 화면 · REST · WebSocket (포트 8080). 아래 셋을 켜고 끕니다 |
| 로봇 기능 (`lekiwi_bringup` 의 `bringup.launch.py`) | 웹 화면 **로봇 켜기** · Physical Labs **▶ 로봇 켜기** | 센서 · 모터 · 팔로워 팔 · 데이터 노드 (2.2) |
| 지도 작성 (`lekiwi_cartographer` 의 `cartographer.launch.py`) | 웹 화면 **지도 작성 시작** | Cartographer 2D (라이다 + IMU) |
| 자율 주행 (`lekiwi_navigation2` 의 `navigation.launch.py`) | 웹 `자율 주행` 화면의 **자율 주행 시작** (지도를 고른 뒤) | Nav2 (AMCL · MPPI Omni · 충돌 감시) |

- 지도 작성과 자율 주행은 함께 켤 수 없습니다. 둘 다 로봇 기능이 켜져 있어야 합니다.
- 터미널에서 직접 켠 launch 는 웹 화면 대시보드에 `외부 실행` 으로 보입니다.

### 1.3. 포트와 주소

| 포트 | 여는 프로그램 | 쓰임 |
|---|---|---|
| 8080 (HTTP · WebSocket) | 게이트웨이 | 웹 화면, REST `/api/...`, WebSocket `/ws` (상태 · 카메라 · 로그), `/agent` (PC 에이전트) |
| 5555 (ZMQ PULL) | `lekiwi_zmq_host_node` | 명령 받기 (lerobot action JSON). 로봇 기능이 켜져 있을 때만 열립니다 |
| 5556 (ZMQ PUSH) | `lekiwi_zmq_host_node` | 관측 보내기 (상태 9개 + 카메라 JPEG). 로봇 기능이 켜져 있을 때만 열립니다 |
| 22 (SSH) | OpenSSH | 계정 `roboseasy`, 비밀번호는 스페이스 한 번 |

- 로봇 주소: AP 모드 `192.168.4.1`, 공유기 모드 `lekiwi01.local` 또는 공유기가 준 IP, 유선은 PC 의 인터넷 공유로 받은 주소(예: 우분투 `10.42.0.x`). 웹 화면 대시보드의 `로봇` 칸에 지금 쓸 수 있는 주소가 모두 나옵니다.
- 게이트웨이는 IP · `*.local` · 로봇 자기 이름 · `localhost` 로 연 요청만 받습니다. 공유기 DNS 이름(예: `lekiwi01.lan`)으로 열면 `이 주소로는 열 수 없습니다. http://lekiwi01.local:8080 또는 IP 주소로 여세요` 가 나옵니다 (DNS rebinding 막기).

> **경고** ⚠️ `WARN`
> <br>**게이트웨이와 ZMQ 포트에는 로그인이 없습니다** 같은 네트워크에 있는 사람은 누구나 웹 화면에서 조작 권한을 받거나 5555 포트로 명령을 보낼 수 있습니다. 믿을 수 있는 네트워크에서만 쓰고, AP 비밀번호는 로봇마다 바꿔 두세요 ([네트워크 (AP · 공유기)](/docs/a-go/lekiwi-wifi-static-ip)).

---

## 2. ROS 2 작업공간 (`lekiwi_ws`)

저장소 루트가 곧 colcon 작업공간입니다. 그래서 `~/lekiwi_ws/src` 가 아니라 `~/lekiwi_ws` 에 받습니다. 하드웨어를 직접 여는 낮은 계층(`lekiwi_sensor/` · `lekiwi_motor/`)과 그 토픽만 쓰는 높은 계층으로 나뉘고, 한 장치는 한 노드만 엽니다.

### 2.1. 패키지 14개

| 패키지 | 종류 | 하는 일 | 주요 노드 · 파일 |
|---|---|---|---|
| `lekiwi_msgs` | 메시지 | 커스텀 메시지 (`MotorState` · `MotorStateArray` · `WheelCommand` · `ArmCommand` · `ArmRegisters` · `LerobotState`) | — |
| `lekiwi_description` | URDF | 몸체 + SO-101 팔 + 카메라 · 라이다 · IMU 프레임, RViz 설정 | `rviz/base.rviz` |
| `lekiwi_bringup` | launch | 로봇 기능 한 번에 켜기, 장비 프로파일 예시 | `bringup.launch.py` |
| `lekiwi_motor_driver` | C++ | Feetech 모터 버스(`/dev/ttyACM0`)를 여는 유일한 노드. 모터 9개 상태 30 Hz, 바퀴 속도 · 팔 위치 쓰기 | `lekiwi_motor_driver_node` |
| `lekiwi_base_controller` | C++ | `cmd_vel` → 바퀴 속도, 엔코더 → `odom` (50 Hz), 모터 안전 상태기계. 상한 0.23 m/s · 1.53 rad/s | `lekiwi_base_controller_node` |
| `lekiwi_imu` | C++ | BMI160 IMU (I2C `/dev/i2c-1`, 주소 `0x68`) 100 Hz | `lekiwi_imu_node` |
| `lekiwi_lidar` | C++ | YDLIDAR 라이다 (`/dev/ttyUSB0`) 10 Hz | `lekiwi_lidar_node` |
| `lekiwi_scan_filter` | C++ | 로봇 몸체에서 되돌아온 스캔(약 19 cm 안)을 지웁니다 | `lekiwi_scan_filter_node` |
| `lekiwi_camera` | C++ | 전방 · 손목 USB 카메라의 MJPEG 를 다시 압축하지 않고 발행 (640×480 · 30 fps) | `front_camera_node` · `wrist_camera_node` |
| `lekiwi_lerobot` | Python (lerobot 가상환경) | 팔로워 팔. lerobot 0.6.0 보정 · 단위로 목표를 따라가고(시작 램프 · 튐 막기), LeKiwi 관측 9개를 내고, 접은 자세로 접습니다 | `lekiwi_follower_arm_node` |
| `lekiwi_zmq_host` | Python (시스템) | Physical Labs 연결 노드 (2.5) | `lekiwi_zmq_host_node` |
| `lekiwi_teleop` | Python | 터미널 키보드 조작 · 시험 도구, Nav2 모터 감독 | `lekiwi_keyboard_teleop` 등 |
| `lekiwi_cartographer` | launch · 설정 | Cartographer 2D 지도 작성 · 저장 (`~/maps/lekiwi/`) | `cartographer.launch.py` · `save_map.sh` |
| `lekiwi_navigation2` | launch · 설정 | 저장 지도로 Nav2 자율 주행 | `navigation.launch.py` |

팔로워 팔 노드만 lerobot 0.6.0 이 든 가상환경(`~/lerobot060_venv`)의 python 으로 돌고, 나머지는 시스템 python 과 C++ 입니다.

### 2.2. 로봇 기능(bringup)이 켜는 노드

게이트웨이는 `ros2 launch lekiwi_bringup bringup.launch.py use_camera:=true` 로 로봇 기능을 켭니다 (웹 화면 대시보드의 **카메라 포함**을 끄면 `false`). 켤 때 **바퀴 토크는 꺼진 채** 시작하고, **팔 토크는 바꾸지 않습니다**.

| 인자 | 기본값 | 켜는 것 |
|---|---|---|
| `use_imu` | `true` | `lekiwi_imu_node` |
| `use_lidar` | `true` | `lekiwi_lidar_node` · `lekiwi_scan_filter_node` |
| `use_camera` | `false` | `front_camera_node` · `wrist_camera_node` |
| `use_motors` | `true` | `lekiwi_motor_driver_node` |
| `use_base_controller` | `true` | `lekiwi_base_controller_node` (+ 드라이버 바퀴 쓰기) |
| `use_arm` | `true` | `lekiwi_follower_arm_node` (+ 드라이버 팔 쓰기) |
| `use_zmq_host` | `true` | `lekiwi_zmq_host_node` |
| `zmq_cmd_port` · `zmq_obs_port` | `5555` · `5556` | 데이터 노드 포트 |
| `lerobot_python` | `~/lerobot060_venv/bin/python` | 팔로워 팔을 돌릴 python |
| `robot_id` | (비움) | 팔로워 보정 이름. 비우면 `arm_profile.yaml` · 장비 프로파일의 값을 쓰고, 둘 다 없으면 호스트 이름 |
| `robot_profile` | (비움) | 장비 프로파일 경로. 비우면 `~/lekiwi_ws/robot_profile.yaml`, 없으면 패키지 기본값 |

`robot_state_publisher` · `joint_state_publisher` 는 늘 켜집니다.

![웹 화면의 로그 화면 — 게이트웨이가 bringup 을 use_camera:=true 로 켜고 노드가 차례로 시작되는 줄](/img/a_go/web-logs.webp)
*웹 화면의 `로그` 화면. 첫 줄이 게이트웨이가 실행한 명령이고, 이어서 노드가 차례로 뜹니다. 카메라 두 개는 `lekiwi_camera_node-N` 으로, lerobot 가상환경으로 켠 팔로워 팔은 `python-N` 으로 보입니다.*

> **경고** ⚠️ `WARN`
> <br>**로봇 기능은 웹 · 앱의 로봇 켜기로 켜세요** 터미널에서 `ros2 launch lekiwi_bringup bringup.launch.py` 를 직접 실행하면 기본값 때문에 카메라 없이 켜지고(이미지의 `~/.bashrc` 단축 명령 `bringup` 도 같습니다), 웹에서 켠 것과 겹치면 같은 노드가 둘씩 뜨고 나중에 켠 모터 드라이버는 `Device or resource busy` 로 버스를 열지 못합니다. 터미널에서 켠 것을 `Ctrl+C` 로 끄면 팔을 접지 않고 끝납니다. 팔은 힘을 준 채 그 자리에 남고, 그 상태에서 주 전원을 끄면 떨어집니다. 같은 버스를 쓰는 옛 LeRobot 호스트(`lekiwi_host`)도 함께 실행하지 않습니다.

### 2.3. 주요 토픽 · 서비스

LeKiwi 전용 이름은 상대 이름 `lekiwi/<계층>/<이름>` 을 쓰고, Cartographer · Nav2 와 맞닿는 것은 표준 이름(`cmd_vel` · `odom` · `map` · `tf`)을 씁니다. 전체 목록과 QoS 는 저장소의 [interfaces.md](https://github.com/roboseasy/lekiwi_ws/blob/main/src/docs/interfaces.md)에 있습니다.

| 이름 | 타입 | 내용 |
|---|---|---|
| `lekiwi/motor/states` | `lekiwi_msgs/MotorStateArray` | 모터 9개 상태 (30 Hz) |
| `cmd_vel` | `geometry_msgs/Twist` | 바퀴 속도 명령. 발행자는 한 번에 하나 (웹 조작 · 데이터 노드 · Nav2 · 터미널 조작 도구 중 하나) |
| `odom` | `nav_msgs/Odometry` | 바퀴 주행 거리계 (50 Hz) |
| `lekiwi/sensor/scan` · `lekiwi/sensor/scan_filtered` | `sensor_msgs/LaserScan` | 라이다 (10 Hz). 지도 작성 · 자율 주행은 걸러진 쪽을 씁니다 |
| `lekiwi/sensor/offset_imu` | `sensor_msgs/Imu` | IMU (자이로 바이어스 제거). Cartographer 입력 |
| `lekiwi/sensor/front_camera/image_raw/compressed` (손목은 `wrist_camera`) | `sensor_msgs/CompressedImage` | 카메라 JPEG |
| `lekiwi/arm/goal` | `sensor_msgs/JointState` | 팔 목표 (LeRobot 단위: 관절은 도, 그리퍼는 0~100). 6개가 모두 있어야 받습니다 |
| `lekiwi/arm/status` | `std_msgs/String` (JSON) | 팔로워 상태 (`state` · `reason` · `robot_id` …) |
| `lekiwi/lerobot/state` | `lekiwi_msgs/LerobotState` | LeKiwi 관측 9개 (팔 6 + 몸체 속도 3). 보정이 모터와 맞을 때만 나옵니다 |
| `lekiwi/zmq_host/status` | `std_msgs/String` (JSON) | 데이터 노드 세션 상태 (`session` · `reason` · `client_ip` …) |
| `lekiwi/safety/estop_latched` | `std_msgs/Bool` | 웹 비상 정지가 걸려 있는지 |

| 서비스 | 타입 | 하는 일 |
|---|---|---|
| `lekiwi/motor/power` | `std_srvs/SetBool` | 바퀴 토크 켜기 · 끄기 (베이스 컨트롤러의 안전 상태기계를 거칩니다. 사람이 바퀴 토크를 켤 때는 이것을 부릅니다) |
| `lekiwi/motor/arm_torque` | `std_srvs/SetBool` | 팔 토크 켜기 · 끄기 |
| `lekiwi/arm/rest` | `std_srvs/Trigger` | 팔을 저장된 접은 자세로 천천히 접기 (접은 자세가 없으면 거절) |
| `lekiwi/motor/reset_odometry` | `std_srvs/Trigger` | `odom` 을 원점으로 |

### 2.4. 새 코드를 짤 때 알아 둘 안전장치

아래 장치는 로봇 쪽에서 늘 동작합니다. 새 노드나 클라이언트를 만들 때는 이 위에 얹는다고 생각하면 됩니다.

| 상황 | 결과 |
|---|---|
| `cmd_vel` 이 0.3초 넘게 끊김 | 베이스 컨트롤러가 바퀴 명령을 0 으로 |
| 엔코더(모터 상태)가 0.5초 넘게 끊기거나 바퀴가 응답 없음 | 속도 0 → 바퀴 토크 끔 → 고장 고정 (`lekiwi/motor/power` false 뒤에만 다시 켬) |
| 팔 목표가 그 모터의 마지막 위치에서 90°(1024 tick) 넘게 떨어짐 | 모터 드라이버가 그 안으로 자름 |
| 팔로워가 따라가기 시작할 때 · 한 번에 크게 튀는 목표 | 시작 램프 2초, 한 번에 45° 까지만 |
| 팔 명령이 끊김 | 아무것도 하지 않음 — 모터가 마지막 목표를 유지 (팔이 떨어지지 않게) |
| 데이터 노드 명령이 0.5초 / 2초 끊김 | `cmd_vel` 0 한 번 / 세션 끝 (바퀴 토크 끔, 팔 토크는 유지) |
| 웹 조작 화면의 생존 신호가 2초 끊김 | 조작 권한이 끝나고 정지 · 그 권한으로 켠 바퀴 토크 끔 |
| 비상 정지 (웹 · 앱) | 정지 · 자율 주행 목표 취소 · 바퀴와 팔 토크 끔 (편 팔은 떨어짐) |

> **경고** ⚠️ `WARN`
> <br>**바퀴 · 팔이 움직이는 시험은 사람이 지켜볼 때만 하세요** 처음에는 바퀴를 바닥에서 띄우고 팔 둘레를 비운 뒤, 전원을 바로 끌 수 있는 사람이 옆에 있을 때 실행합니다. 비상 정지는 네트워크로 가는 명령이라 와이파이가 끊기면 닿지 않습니다. 주 전원은 늘 손이 닿는 곳에 둡니다.

### 2.5. Physical Labs 가 붙는 길 — `lekiwi_zmq_host`

데이터 노드 `lekiwi_zmq_host_node` 는 LeRobot 의 LeKiwi 호스트와 **같은 ZMQ 메시지**를 ROS 토픽 · 서비스로 바꿔 줍니다. 그래서 PC 는 ROS 없이 LeRobot 의 `LeKiwiClient` 로 붙습니다. 이 노드는 번역만 하고, 팔 제한은 팔로워 팔이, 바퀴 상한은 베이스 컨트롤러가 그대로 맡습니다.

```text
[명령: PC -> 로봇]
Physical Labs --(ZMQ :5555)--> lekiwi_zmq_host_node
    lekiwi_zmq_host_node --lekiwi/arm/goal--> lekiwi_follower_arm_node    --> lekiwi_motor_driver_node (팔 1~6)
    lekiwi_zmq_host_node --cmd_vel----------> lekiwi_base_controller_node --> lekiwi_motor_driver_node (바퀴 7~9)

[관측: 로봇 -> PC]
    lekiwi_follower_arm_node --lekiwi/lerobot/state--> lekiwi_zmq_host_node
    front/wrist_camera_node  --image_raw/compressed--> lekiwi_zmq_host_node
lekiwi_zmq_host_node --(ZMQ :5556)--> Physical Labs
```

- **관측** (30 Hz 이하): 상태 9개 (`arm_shoulder_pan.pos` … `arm_gripper.pos` 6개, `x.vel` · `y.vel` [m/s], `theta.vel` [deg/s]) + `front` · `wrist` JPEG(base64) + 메타 정보 `_lekiwi_ros`.
- **상태가 0.5초 넘게 없으면 관측을 보내지 않습니다.** 빈 값을 0 으로 채워 0 자세가 녹화 · 추론되는 것을 막기 위해서입니다. 팔로워 보정이 없으면 상태가 나오지 않으므로 관측도 오지 않습니다.
- **명령**: lerobot action JSON. 팔 6개 키는 모두 있거나 모두 없어야 하고(일부만 있으면 팔 부분만 버립니다), 바퀴 키는 없으면 0 입니다. 유한한 수가 아니거나 절댓값이 1e4 를 넘으면 명령 전체를 버립니다.
- **세션**: 첫 명령이 오면 `active` (바퀴 토크 켬, 첫 팔 명령 때 팔 토크 켬). 시작이 막히면 `waiting` 으로 1초마다 다시 보고, 비상 정지나 바깥에서 토크가 꺼지면 `blocked` (명령이 2초 끊겨야 풀림). 한 번에 PC 한 대만 조작합니다 (세션을 연 주소가 주인).
- **시작을 막는 이유** (`reason`): `웹 화면이 조작 중입니다` · `비상 정지가 걸려 있습니다` · `다른 프로그램이 cmd_vel 을 보내고 있습니다: …` · `팔로워 팔 노드(lekiwi_follower_arm_node)가 없습니다` 등. 게이트웨이 `/api/status` 의 `zmq_host` 에서도 보입니다.
- 관측을 보내는 동안 이 노드는 Pi CPU 한 코어의 약 65% 를 씁니다. 관측을 받는 클라이언트가 없으면 거의 쉽니다.

### 2.6. 로봇마다 다른 파일

| 파일 | 내용 | 누가 쓰나 |
|---|---|---|
| `~/lekiwi_ws/robot_profile.yaml` | 장비 프로파일: 포트 · 바퀴 ID · 방향 · 치수 · IMU 주소 (없으면 패키지 기본값) | 사람 (필요할 때만 만듦) |
| `~/lekiwi_ws/arm_profile.yaml` | 팔로워 보정 이름(`robot_id`) · 접은 자세(`rest_pose_ticks`) | 웹 · 앱 캘리브레이션 (손으로 고치지 않음) |
| `~/.cache/huggingface/lerobot/calibration/robots/lekiwi/<robot_id>.json` | 팔로워 보정 파일 (lerobot 형식) | 웹 · 앱 캘리브레이션 |
| `~/maps/lekiwi/` | 저장한 지도 | 웹 지도 작성 |
| `/etc/hostname` · `/etc/kit-number` | 호스트 이름 `lekiwiNN` · 킷 번호 | `clone_init.sh` (4.2) |
| `/etc/systemd/system/lekiwi-web-operator.service.d/ros_domain.conf` · `~/.bashrc` | `ROS_DOMAIN_ID` | 사람 (5장) |

- 노드 파라미터는 패키지 기본 설정 → (베이스 컨트롤러만) `lekiwi_description/config/base_frame.yaml` → 장비 프로파일 → (팔로워 팔만) `arm_profile.yaml` → `robot_id` 인자 순서로 들어가고, **뒤에 들어간 값이 이깁니다**.
- 이미지에는 보정 · 접은 자세 · 지도가 들어 있지 않습니다. 카드를 다시 구우면 이 파일들이 사라지므로, 필요하면 굽기 전에 PC 로 복사해 둡니다.

### 2.7. 로봇에서 살펴보기

**[로봇]** PC 에서 `ssh` 로 로봇에 들어가면 로봇의 `~/.bashrc` 가 ROS 2 환경과 `ROS_DOMAIN_ID` 를 맞춰 줍니다. 로봇 기능을 켜 둔 상태에서 아래 명령으로 노드와 토픽을 봅니다. 모두 읽기만 합니다.

```bash
ssh roboseasy@lekiwi01.local
ros2 node list                            # 켜진 노드
ros2 topic hz lekiwi/motor/states         # 약 30 Hz
ros2 topic hz lekiwi/sensor/scan_filtered # 약 10 Hz
ros2 topic echo lekiwi/zmq_host/status    # 데이터 노드 세션 상태
journalctl -u lekiwi-web-operator -f      # 게이트웨이 로그
```

웹 화면 대시보드 아래쪽의 `로봇` · `노드` 칸에서도 같은 정보를 볼 수 있습니다.

![웹 화면 대시보드의 로봇 칸과 노드 칸 — 이름 · IP · 버전 · ROS 도메인과 노드 수, 접속 주소 링크, 노드별 있음 · 없음](/img/a_go/web-dashboard-robot-nodes.webp)
*`로봇` 칸의 `ROS` 줄에 지금 쓰는 도메인과 노드 수가, `노드` 칸에 핵심 노드가 떠 있는지가 보입니다. 이 그림을 찍을 때는 이 로봇의 IMU 가 응답하지 않아 `lekiwi_imu_node` 가 `없음` 이었습니다. 정상이면 `있음` 입니다.*

---

## 3. 게이트웨이 (`lekiwi_web_operator`)

### 3.1. 서비스와 실행 스크립트

게이트웨이는 systemd 서비스 `lekiwi-web-operator` 로 부팅할 때 자동으로 뜹니다. 서비스는 `~/lekiwi_web_operator/run_web_operator.sh` 를 실행하고, 이 스크립트가 ROS 2 와 `~/lekiwi_ws/install/setup.bash` 를 읽은 뒤 시스템 python 으로 `python3 -m lekiwi_web_operator` 를 띄웁니다 (가상환경을 쓰지 않습니다).

| 설정 | 값 | 이유 |
|---|---|---|
| 사용자 | `roboseasy` | 경로가 `/home/roboseasy/lekiwi_web_operator` 로 정해져 있습니다 |
| 다시 켜기 | 실패하면 3초 뒤 (`Restart=on-failure`) | |
| 끄는 신호 | `SIGINT`, 최대 90초 기다림 | `Ctrl+C` 처럼 끝내야 게이트웨이가 팔을 접고 기능을 차례로 끄며, 모터 드라이버가 바퀴를 세우고 바퀴 토크를 끕니다 |
| 시작 전 | `loginctl enable-linger roboseasy` | 마지막 SSH 가 끊겨도 ROS 공유 메모리 통신이 멈추지 않게 |
| 환경 | `ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET`, `RMW_IMPLEMENTATION=rmw_fastrtps_cpp` | 환경에 값이 없을 때 스크립트가 정합니다 |

| 할 일 | 명령 (로봇) |
|---|---|
| 상태 | `systemctl status lekiwi-web-operator` |
| 로그 | `journalctl -u lekiwi-web-operator -f` |
| 다시 시작 | `sudo systemctl restart lekiwi-web-operator` |
| 멈추기 (다음 부팅에 다시 켜짐) | `sudo systemctl stop lekiwi-web-operator` |

> **경고** ⚠️ `WARN`
> <br>**게이트웨이를 다시 켜면 웹 · 앱에서 켠 로봇 기능도 꺼집니다** 팔 토크가 켜져 있으면 게이트웨이가 끄기 전에 팔을 접은 자세로 움직이고, 접지 못하면 팔 토크를 켠 채 둡니다. 팔 둘레를 비우고 로봇이 움직이지 않을 때 하며, 네트워크를 바꾸는 중(최대 약 2분)에는 다시 켜지 않습니다. 다시 켠 뒤에는 **로봇 켜기**를 다시 누릅니다.

### 3.2. 파일 구조

| 파일 | 하는 일 |
|---|---|
| `lekiwi_web_operator/http_server.py` · `websocket.py` · `hub.py` | HTTP · REST · WebSocket, 화면마다 채널 보내기 |
| `lekiwi_web_operator/robot.py` · `teleop.py` | 안전 규칙: 조작 권한 · 생존 신호 · 비상 정지 · 자율 주행 시작 순서 |
| `lekiwi_web_operator/ros_node.py` | rclpy 노드 (구독 · 발행 · 서비스 · 그래프 감시) |
| `lekiwi_web_operator/processes.py` | `ros2 launch` 켜기 · 끄기 · 로그 · 외부 실행 찾기 |
| `lekiwi_web_operator/network.py` | 네트워크 화면 (안에서 `~/lekiwi_net` 스크립트를 부릅니다) |
| `lekiwi_web_operator/agent.py` | PC 에이전트 `/agent` 연결 · 허락 · 리더 값 검사 |
| `lekiwi_web_operator/follower_calibration.py` · `lerobot_calibration.py` | 팔로워 보정 (`lerobot_calibration.py` 는 PC 에이전트 `calibration.py` 의 사본) |
| `web/` | 화면. 빌드 없는 HTML · CSS · JS 모듈이고, `web/js/pages/*.js` 가 화면 하나씩입니다 |

### 3.3. REST API · WebSocket

GET 은 누구나 읽을 수 있어, 로봇 상태를 스크립트로 볼 때 편합니다.

```bash
curl -s http://lekiwi01.local:8080/api/info | python3 -m json.tool     # 이름 · 버전 · 기능 · 접속 주소
curl -s http://lekiwi01.local:8080/api/status | python3 -m json.tool   # 상태 전부 (WebSocket status 와 같음)
```

| 경로 | 내용 |
|---|---|
| `GET /api/info` | 로봇 이름 · 버전 · 보기 전용 여부 · 기능 · 속도 단계 · 접속 주소 |
| `GET /api/status` | 상태 전부 (`processes` · `ros` · `zmq_host` · `calibration` · `network` …) |
| `GET /api/maps` · `/api/maps/preview?name=<파일>.yaml` | 저장 지도 목록 · 미리보기 PNG |
| `GET /api/logs?process=<기능>&lines=200` | 최근 로그 |
| `GET /api/network` | 인터페이스 · IP · 와이파이 · 모드 |
| `POST /api/...` | 조작 권한 · 로봇 켜기 · 주행 · 보정 · 지도 · 네트워크 명령 |
| WebSocket `/ws` | 상태(4 Hz) · 알림 · 스캔 · 지도 · 경로 · 로그 · 카메라 JPEG(최대 15 fps) |
| WebSocket `/agent` | PC 에이전트 (리더암 값) |

POST 는 규칙이 더 있습니다. `Content-Type: application/json`, 같은 출처의 `Origin`, 그리고 WebSocket `/ws` 에 붙었을 때 받은 `client_id` 를 `X-Client-Id` 로 보내야 합니다. 명령 대부분은 조작 권한이 필요하고, 권한은 그 화면의 생존 신호(0.5초마다)가 2초 끊기면 끝납니다. 답은 `{"ok", "code", "message"}` 모양이고, `code` 에 따라 HTTP 상태가 정해집니다 (`ok` 200 · `bad_request` 400 · `not_operator` · `read_only` 403 · `conflict` 409 · `failed` 500 · `unavailable` 503). 전체 경로 표와 WebSocket 메시지는 저장소 [README](https://github.com/roboseasy/lekiwi_web_operator)의 11장 '구조'에 있습니다.

### 3.4. PC 에서 보기 전용 게이트웨이 띄우기

PC 에 ROS 2 Jazzy 가 있으면, 로봇은 그대로 두고 PC 에서 게이트웨이를 하나 더 `--read-only` 로 띄워 볼 수 있습니다. 보기 전용은 조작 · 기능 켜고 끄기 · 와이파이 · 비상 정지 명령을 모두 거절합니다. PC 는 로봇과 같은 서브넷 · 같은 `ROS_DOMAIN_ID` · `ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET` 이어야 합니다 (7.1 과 같은 조건).

```bash
# 우분투
source /opt/ros/jazzy/setup.bash
source ~/lekiwi_ws/install/setup.bash    # (선택) lekiwi_msgs 를 빌드해 두면 모터 상태까지 보인다
export ROS_DOMAIN_ID=41                  # 로봇과 같은 번호 (5장)
export ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET
cd ~/lekiwi_web_operator                 # PC 에 받은 게이트웨이 저장소
python3 -m lekiwi_web_operator --read-only --port 8081
```

브라우저로 `http://localhost:8081` 을 엽니다. 모터 상태까지 보려면 PC 작업공간에서 `colcon build --symlink-install --packages-select lekiwi_description lekiwi_msgs` 로 메시지 패키지도 빌드해 둡니다. PC 에는 **보기 전용이 아닌** 게이트웨이를 띄우지 않습니다 (두 게이트웨이가 함께 바퀴 명령을 낼 수 있습니다).

---

## 4. 네트워크 스크립트 (`lekiwi_net`)

### 4.1. 파일과 짧은 명령

NetworkManager(`nmcli`)를 쓰는 카드용 스크립트입니다. 웹 화면의 `네트워크` 화면과 Physical Labs 도 이 스크립트를 부릅니다. 사용법은 [네트워크 (AP · 공유기)](/docs/a-go/lekiwi-wifi-static-ip)에 있고, 여기서는 구성만 봅니다.

| 파일 | 짧은 명령 | 하는 일 |
|---|---|---|
| `run_ap.sh` | `run_ap` | AP 모드로 (재부팅해도 유지). 로봇 주소 `192.168.4.1` |
| `run_wifi.sh` | `run_wifi [SSID PASSWORD]` | 공유기 모드로. 인자를 주면 새 공유기를 저장(DHCP)하고 연결. 실패하면 AP 로 돌아옵니다 |
| `set_ap.sh` | `set_ap [SSID PASSWORD]` | AP 이름 · 비밀번호 바꾸기 |
| `set_ip.sh` · `set_dhcp.sh` | `setip [킷 번호]` · `setdhcp` | 공유기 모드 고정 IP `192.168.0.(200 + 킷 번호)` (공유기 대역이 `192.168.0.x` 일 때만) / DHCP 로 되돌리기 |
| `wifi_list.sh` · `net_status.sh` | `wifi list` · `net_status` | 주변 와이파이 목록 · 지금 연결과 주소 |
| `clone_init.sh` | — | 로봇 번호 정하기 (4.2) |
| `image_ready_check.sh` | — | 이미지를 뜨기 전 점검 (4.3) |
| `provision_ap_mode.sh` · `rollback_ap_mode.sh` | — | 예전(netplan) 세대 카드의 네트워크만 이 방식으로 옮기기 · 되돌리기 |

- 짧은 명령은 이미지의 `~/.bashrc` 에 들어 있습니다 (`# >>> lekiwi_net >>>` 블록, 정의는 `bashrc_net.sh`).
- 어떤 스크립트도 유선(`eth0`)을 건드리지 않습니다. 와이파이 설정이 꼬이면 랜선으로 들어와 고칩니다.

### 4.2. 로봇 번호 정하기 (`clone_init.sh`)

같은 이미지로 구운 카드는 모두 `lekiwi01` · 킷 번호 1 로 시작합니다. 여러 대를 쓰면 카드마다 한 번 번호를 정합니다.

```bash
sudo ~/lekiwi_net/clone_init.sh lekiwi07 7     # 호스트 이름 lekiwiNN · 킷 번호 N (1~54)
sudo reboot
```

호스트 이름 · 킷 번호 · AP 채널을 정하고, 공유기가 이미 등록돼 있으면 공유기 고정 주소(`192.168.0.(200 + 킷 번호)`)도 맞춥니다. 갓 구운 카드처럼 공유기가 아직 없으면 고정 주소는 정하지 않습니다. 나중에 등록한 공유기에는 DHCP 로 붙으므로, 고정 주소가 필요하면 그때 `setip <킷 번호>` 를 합니다. 호스트 이름은 킷 번호와 맞는 `lekiwiNN` 이어야 합니다. 다시 켠 뒤에는 새 이름(예: `lekiwi07.local`)으로 찾으므로, 앱 · 브라우저에 저장해 둔 주소도 바꿉니다. **AP 이름 · 비밀번호와 `ROS_DOMAIN_ID` 는 바꾸지 않습니다** — AP 는 웹 `네트워크` 화면이나 Physical Labs 의 AP 칸에서, 도메인은 5장대로 바꿉니다.

### 4.3. 이미지를 뜨기 전 점검 (`image_ready_check.sh`)

손본 카드를 이미지로 떠서 여러 장에 복제하려면, 뜨기 전에 개인 정보가 남아 있지 않은지 점검합니다. 공유기 비밀번호 · 남은 개인 키 · `authorized_keys` · 셸 기록 · 부트 파티션 · NetworkManager 상태를 읽기만 하고 아무것도 바꾸지 않습니다.

```bash
sudo ~/lekiwi_net/image_ready_check.sh
```

항목마다 `[OK]` · `[WARN]` · `[FAIL]` 한 줄이 나오고, 끝 줄에 `요약: FAIL n · WARN m` 이 나옵니다. `FAIL` 이 하나라도 있으면 종료 코드가 1 입니다. 비밀번호 · 키는 값이 아니라 파일 이름만 보여 줍니다.

---

## 5. `ROS_DOMAIN_ID` 바꾸기

### 5.1. 왜 바꾸나요?

ROS 2 노드는 같은 네트워크에서 `ROS_DOMAIN_ID` 가 같은 노드끼리 서로를 찾습니다. 이미지로 구운 카드는 모두 같은 번호(`41`)라서, **같은 공유기에 로봇이 여러 대 있으면 로봇끼리 토픽이 섞입니다**. 이때 웹 화면 대시보드는 `베이스 컨트롤러가 둘 이상입니다. 같은 ROS_DOMAIN_ID 에 다른 로봇이 있습니다` 경고를 띄우고 주행을 거절합니다.

- 같은 공유기에서 여러 대를 쓴다면 로봇마다 다른 번호를 줍니다. 번호는 0~101 사이에서 고르고(ROS 2 가 리눅스에서 안전하다고 권하는 범위), 같은 공유기의 로봇끼리 겹치지 않게 합니다.
- 웹 브라우저와 Physical Labs(ZMQ · REST)는 도메인을 쓰지 않으므로 바꿔도 영향이 없습니다. PC 에서 RViz 나 `ros2` 명령으로 로봇을 볼 때만 PC 도 같은 번호를 씁니다.
- 받은 로봇은 번호가 이미 다를 수 있습니다. 웹 화면 대시보드 `로봇` 칸의 `ROS` 줄(`도메인 41 · 노드 12개` 처럼)이나 `GET /api/status` 의 `ros.domain_id` 로 지금 값을 확인합니다.

### 5.2. 바꾸는 법

번호는 두 곳에 있습니다. 게이트웨이 서비스(→ 게이트웨이가 켜는 모든 노드)가 쓰는 drop-in 파일과, SSH 터미널이 쓰는 `~/.bashrc` 입니다. **두 곳을 같은 번호로** 바꿔야 SSH 터미널에서도 노드가 보입니다.

1. **[PC]** 로봇이 멈춰 있는지 확인하고, SSH 로 로봇에 들어갑니다.

   ```bash
   ssh roboseasy@lekiwi01.local
   ```

2. **[로봇]** 지금 번호가 들어 있는 줄을 찾습니다.

   ```bash
   grep -n ROS_DOMAIN_ID /etc/systemd/system/lekiwi-web-operator.service.d/ros_domain.conf ~/.bashrc
   ```

3. **[로봇]** 두 파일에서 숫자만 새 번호로 바꿉니다.

   ```bash
   sudo nano /etc/systemd/system/lekiwi-web-operator.service.d/ros_domain.conf   # Environment=ROS_DOMAIN_ID=<새 번호>
   nano ~/.bashrc                                                                 # export ROS_DOMAIN_ID=<새 번호>
   ```

4. **[로봇]** 서비스 설정을 다시 읽고 게이트웨이를 다시 켭니다. 지금 터미널에도 새 번호를 적용합니다.

   ```bash
   sudo systemctl daemon-reload && sudo systemctl restart lekiwi-web-operator
   source ~/.bashrc
   ```

5. **[웹 화면]** 게이트웨이를 다시 켜면 로봇 기능이 꺼지므로, **로봇 켜기**를 다시 누릅니다.

> **팁** 💡`TIP`
> <br>**`sudo systemctl edit` 로 새 설정을 더하지 말고, 있는 `ros_domain.conf` 의 숫자를 고치세요** drop-in 파일은 이름 순서로 읽혀서, `systemctl edit` 가 만드는 `override.conf` 가 `ros_domain.conf` 보다 먼저 읽힙니다. 그러면 뒤에 읽힌 `ros_domain.conf` 의 옛 번호가 그대로 이깁니다. `ros_domain.conf` 를 지우면 실행 스크립트의 기본값 `42` 가 쓰입니다.

### 5.3. 확인

- **[웹 화면]** 대시보드 `로봇` 칸의 `ROS` 줄이 `도메인 <새 번호>` 로 바뀌었는지 봅니다.
- **[로봇]** 새 터미널에서 `ros2 node list` 를 했을 때, 로봇 기능을 켠 뒤 노드가 보이면 됩니다.
- **[PC]** RViz 나 보기 전용 게이트웨이를 쓰는 PC 터미널도 `export ROS_DOMAIN_ID=<새 번호>` 로 맞춥니다.

---

## 6. 코드 고쳐 로봇에 올리기

### 6.1. 공통

- PC 에서 저장소를 받아 고치고, 로봇으로 복사한 뒤 로봇에서 적용합니다. 이미지의 로봇 폴더에는 `.git` 이 없기 때문입니다.
- PC 와 로봇이 같은 네트워크에 있어야 합니다. AP 모드는 인터넷이 없으니, 저장소는 인터넷이 될 때 미리 받아 둡니다.
- 아래 예의 `roboseasy@lekiwi01.local` 은 내 로봇의 주소로 바꿉니다 (AP 모드면 `roboseasy@192.168.4.1`).

### 6.2. ROS 2 패키지 (`lekiwi_ws`)

1. **[PC]** 저장소를 받습니다. 저장소 루트가 작업공간이므로 `~/lekiwi_ws` 에 받습니다.

   ```bash
   # 우분투
   git clone https://github.com/roboseasy/lekiwi_ws.git ~/lekiwi_ws
   ```

2. **[PC]** 고친 패키지 폴더를 로봇의 같은 자리로 복사합니다. 패키지 폴더는 `src/` 바로 아래이거나 `src/lekiwi_motor/` · `src/lekiwi_sensor/` 아래에 있습니다.

   ```bash
   # 우분투
   PKG_DIR=src/lekiwi_zmq_host     # 고친 패키지 폴더 (예: src/lekiwi_sensor/lekiwi_camera)
   rsync -av --exclude __pycache__ ~/lekiwi_ws/$PKG_DIR/ roboseasy@lekiwi01.local:lekiwi_ws/$PKG_DIR/
   ```

3. **[로봇]** 그 패키지만 다시 빌드합니다. 로봇의 `~/.bashrc` 가 lerobot 가상환경을 켜 두므로 먼저 끕니다. Pi 4 는 메모리가 빠듯해 동시 작업 수를 2 로 줄입니다.

   ```bash
   cd ~/lekiwi_ws
   deactivate 2>/dev/null                 # (lerobot060_venv) 표시를 끈다
   source /opt/ros/jazzy/setup.bash
   export MAKEFLAGS=-j2 CMAKE_BUILD_PARALLEL_LEVEL=2
   colcon build --symlink-install --parallel-workers 2 --packages-select lekiwi_zmq_host   # 고친 패키지 이름
   ```

   이미지의 `~/.bashrc` 에는 같은 일을 하는 단축 명령 `cbs <패키지>`(고른 패키지만) · `cb`(전체) · `sb`(빌드 결과 source)도 들어 있습니다.

4. **[웹 화면]** 로봇 기능을 껐다 켭니다 (**로봇 끄기** → **로봇 켜기**). 팔 토크가 켜져 있으면 **로봇 끄기**가 먼저 팔을 접은 자세로 움직이니 팔 둘레를 비워 둡니다. 지도 작성 · 자율 주행 패키지를 고쳤다면 그 기능을 껐다 켭니다.

- 이미지는 `--symlink-install` 로 빌드돼 있어, 있던 Python · launch · 설정 파일만 고쳤다면 3번을 건너뛰어도 노드를 다시 켜면 반영됩니다. C++ 를 고쳤거나, 파일을 새로 더했거나, `package.xml` · `setup.py` · `CMakeLists.txt` 를 바꿨다면 꼭 다시 빌드합니다.
- 패키지를 새로 더했다면 게이트웨이도 다시 켭니다. 게이트웨이는 시작할 때 읽은 환경으로 로봇 기능을 켜기 때문입니다.
- 시험은 `colcon test --packages-select <패키지> && colcon test-result --verbose` 로 돌립니다. 빌드가 끝나면 로봇에서 `ros2 pkg list | grep -c lekiwi` 가 `14` 여야 합니다.

| 빌드 오류 | 원인 · 할 일 |
|---|---|
| `No module named 'catkin_pkg'` | lerobot 가상환경이 켜져 있습니다. `deactivate` 뒤 같은 터미널에서 다시 빌드 |
| `c++: fatal error: Killed signal terminated program cc1plus` | 메모리 부족. 작업 수를 1 로 (`MAKEFLAGS=-j1`, `--parallel-workers 1`) 하고 `--executor sequential` 을 붙입니다 |
| `Could not find a package configuration file provided by "ydlidar_sdk"` | 라이다 SDK 가 없습니다 (이미지에는 있습니다). 새로 설치한 OS 라면 저장소 README 의 라이다 SDK 절을 따릅니다 |
| 실행할 때 `Package 'lekiwi_...' not found` | 빌드 결과를 source 하지 않았습니다 → `source ~/lekiwi_ws/install/setup.bash` |

> **경고** ⚠️ `WARN`
> <br>**작업공간을 통째로 새로 받을 때는 장비 파일을 옮기세요** 로봇 기능을 끈 뒤 로봇에서 `~/lekiwi_ws` 를 옮겨 두고(`mv ~/lekiwi_ws ~/lekiwi_ws.bak`) 새로 받으면, 옛 폴더에 있던 `arm_profile.yaml`(보정 이름 · 접은 자세)과 `robot_profile.yaml` 이 새 폴더에 없습니다. 새 폴더로 다시 복사한 뒤 전체를 빌드하고 로봇 기능을 켜세요.

### 6.3. 게이트웨이 (`lekiwi_web_operator`)

저장소의 `deploy_to_robot.sh` 가 PC 폴더를 로봇의 `~/lekiwi_web_operator/` 로 그대로 복사합니다 (개발용 폴더 `dev` · `tests` · `docs` 는 보내지 않습니다).

```bash
# 우분투
git clone https://github.com/roboseasy/lekiwi_web_operator.git ~/lekiwi_web_operator
cd ~/lekiwi_web_operator
# … 코드를 고친 뒤
./deploy_to_robot.sh roboseasy@lekiwi01.local
ssh -t roboseasy@lekiwi01.local 'sudo systemctl restart lekiwi-web-operator'
```

- 서비스 파일(`lekiwi-web-operator.service`)을 바꿨다면 다시 켜기 전에 `sudo cp ~/lekiwi_web_operator/lekiwi-web-operator.service /etc/systemd/system/ && sudo systemctl daemon-reload` 를 로봇에서 실행합니다. 도메인 drop-in(`ros_domain.conf`)은 저장소 밖이라 배포해도 그대로 남습니다.
- 배포는 `rsync --delete` 라서 로봇 폴더가 PC 폴더와 똑같아집니다. 로봇에서 직접 고친 파일은 사라집니다.
- 웹 화면의 `이동 설계` 페이지는 로봇에 먼저 올라간 **시험 기능**이라 아직 저장소에 정식으로 들어가지 않았습니다. 저장소 판으로 배포하면 이 페이지가 빠질 수 있습니다.
- 다시 켜면 로봇 기능이 꺼지는 점은 3.1 과 같습니다.

### 6.4. 네트워크 스크립트 (`lekiwi_net`)

```bash
# 우분투
git clone https://github.com/roboseasy/lekiwi_net.git ~/lekiwi_net
cd ~/lekiwi_net
python3 -m pytest -q          # PC 에서 시험 (가짜 명령으로만 돌고, 이 PC 의 네트워크는 건드리지 않는다)
rsync -av --exclude .git --exclude __pycache__ ~/lekiwi_net/ roboseasy@lekiwi01.local:lekiwi_net/
```

- 실행 권한을 그대로 두고 복사합니다 (`rsync -a` 는 권한을 지킵니다).
- 앱과 게이트웨이가 스크립트의 출력 줄(`inet …` · `error: …`)을 읽습니다. 출력 모양을 바꾸면 화면이 깨지니, 저장소 README 의 '앱이 읽는 출력 줄' 절을 먼저 보세요.

### 6.5. PC 에이전트 (`lekiwi_pc_agent`)

PC 에이전트는 로봇이 아니라 노트북에서 돕니다. 설치와 사용은 [PC 에이전트 (리더암)](/docs/a-go/pc-agent)에 있습니다.

- 게이트웨이와는 WebSocket `ws://<로봇 주소>:8080/agent` 로 통신하고, 규약은 저장소의 `docs/agent_protocol.md` 에 있습니다.
- 보정 코드 `lekiwi_pc_agent/calibration.py` 는 게이트웨이의 `lekiwi_web_operator/lerobot_calibration.py` 와 같은 코드(사본)입니다. 한쪽을 고치면 다른 쪽도 같이 고칩니다.
- 시험은 로봇 · 리더암 없이 돌릴 수 있습니다: lerobot 과 pytest 가 든 환경에서 `python -m pytest -q`.

---

## 7. PC 에서 직접 붙기

### 7.1. RViz 로 보기

PC 에서 로봇의 토픽을 RViz 로 보려면 PC 에도 ROS 2 가 필요합니다. 노드는 모두 로봇에서 돌고, PC 는 보기만 합니다.

1. **[PC]** Ubuntu 24.04 에 ROS 2 Jazzy(`ros-jazzy-desktop`)를 설치하고([공식 설치 문서](https://docs.ros.org/en/jazzy/Installation/Ubuntu-Install-Debs.html)), 필요한 도구를 더합니다.

   ```bash
   # 우분투
   sudo apt install ros-dev-tools ros-jazzy-xacro ros-jazzy-joint-state-publisher ros-jazzy-nav2-rviz-plugins
   ```

2. **[PC]** 작업공간을 받아 로봇 모델 패키지 하나만 빌드합니다 (PC 에는 라이다 SDK 가 없어 전체를 빌드하지 않습니다).

   ```bash
   # 우분투
   git clone https://github.com/roboseasy/lekiwi_ws.git ~/lekiwi_ws
   cd ~/lekiwi_ws
   source /opt/ros/jazzy/setup.bash
   colcon build --symlink-install --packages-select lekiwi_description
   ```

3. **[PC]** 새 터미널마다 환경을 맞추고 RViz 를 엽니다. `ROS_DOMAIN_ID` 는 로봇과 같은 번호여야 합니다 (5장).

   ```bash
   # 우분투
   source /opt/ros/jazzy/setup.bash
   source ~/lekiwi_ws/install/setup.bash
   export ROS_DOMAIN_ID=41
   export ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET
   rviz2 -d ~/lekiwi_ws/src/lekiwi_description/rviz/base.rviz
   ```

로봇 기능을 웹 · 앱에서 켜 둔 상태여야 화면에 로봇과 스캔이 보입니다. PC 와 로봇은 같은 서브넷(AP 의 `192.168.4.x`, 유선의 `10.42.0.x`, 같은 공유기)에 있어야 합니다. RViz 가 비어 보이면 같은 설정의 터미널에서 `ros2 node list` 로 로봇 노드가 보이는지 확인합니다.

### 7.2. LeRobot `LeKiwiClient` 로 붙기 (색 주의)

데이터 노드는 LeRobot LeKiwi 호스트와 같은 메시지를 쓰므로, LeRobot 0.6.0 의 `LeKiwiClient` 로 직접 붙을 수 있습니다.

```python
from lerobot.robots.lekiwi import LeKiwiClient, LeKiwiClientConfig

robot = LeKiwiClient(LeKiwiClientConfig(remote_ip="<로봇 IP>", id="lekiwi"))
robot.connect()   # 팔로워 보정이 없으면 첫 관측을 못 받아 몇 초 뒤 실패한다
```

> **경고** ⚠️ `WARN`
> <br>**바닐라 LeRobot 클라이언트로 받으면 영상의 빨강과 파랑이 바뀌어 들어옵니다** 로봇은 카메라의 표준 JPEG 를 그대로 보내는데, 바닐라 `LeKiwiClient` 는 예전 호스트의 색 순서를 가정합니다. 그래서 LeRobot 예제 스크립트나 예전 LeKiwi 제어 스크립트로 붙으면 영상이 BGR 로 들어옵니다. Physical Labs 는 이를 맞춰 받으므로 **데이터 수집 · 추론은 Physical Labs 로 하세요**. 직접 쓸 때는 받은 영상 배열의 채널 순서를 뒤집어(BGR → RGB) 씁니다.

- 한 번에 PC 한 대만 조작합니다. 다른 PC 가 세션을 쥐고 있거나 웹 화면이 조작 권한을 쥐고 있으면 명령이 버려집니다. 이유는 `ros2 topic echo lekiwi/zmq_host/status` 의 `reason` 이나 `GET /api/status` 의 `zmq_host` 에서 봅니다.
- 명령이 2초 끊기면 세션이 끝나며 바퀴 토크가 꺼집니다. 팔은 힘을 준 채 그 자리에 남습니다.
- 로봇에서 옛 LeRobot 호스트(`lekiwi_host`)를 따로 띄우지 않습니다. 모터 버스는 모터 드라이버 노드가 쥐고 있어, 다른 프로그램이 같은 버스를 열면 `Device or resource busy` 로 막힙니다.

---

## 8. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| PC 에서 `ros2 node list` 에 로봇 노드가 안 보인다 | 로봇 기능이 켜져 있는지, PC 터미널의 `ROS_DOMAIN_ID` 가 로봇과 같은지, `ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET` 인지, 같은 서브넷인지 (7.1) |
| 로봇 SSH 터미널에서도 노드가 안 보인다 | `~/.bashrc` 와 `ros_domain.conf` 의 번호가 같은지 (5.2) |
| 대시보드에 `베이스 컨트롤러가 둘 이상입니다. 같은 ROS_DOMAIN_ID 에 다른 로봇이 있습니다` | 같은 공유기의 다른 로봇과 도메인이 겹칩니다 → 로봇마다 다른 번호로 (5장) |
| 대시보드에 `같은 기능이 N개 떠 있습니다` | 터미널에서 같은 launch 를 또 켰습니다 → 하나를 끕니다 |
| 게이트웨이가 뜨지 않고 저널에 `lekiwi_ws 가 빌드되지 않았습니다: … 이 없습니다.` | `~/lekiwi_ws/install/setup.bash` 가 있는지. 작업공간을 새로 받았다면 빌드부터 (6.2) |
| 8080 은 열리는데 5555 · 5556 이 닫혀 있다 | 로봇 기능이 꺼져 있습니다 → **로봇 켜기**. 켰는데도 닫혀 있으면 로그에 `use_zmq_host:=true but lekiwi_zmq_host is not built; skipping the ZMQ host` 가 있는지 |
| `LeKiwiClient.connect()` 가 몇 초 뒤 실패한다 | 상태(`lekiwi/lerobot/state`)가 나오지 않습니다. 팔로워 보정이 있는지 [캘리브레이션](/docs/a-go/start-calibration)에서 보고, `lekiwi/zmq_host/status` 의 `reason` 을 확인 |
| 직접 받은 영상의 빨강 · 파랑이 바뀌어 있다 | 바닐라 LeRobot 클라이언트의 색 순서 (7.2). 데이터 수집 · 추론은 Physical Labs 로 |
| 모터 드라이버 로그에 `Device or resource busy` | 같은 버스를 여는 다른 프로그램(옛 LeRobot 호스트, 터미널에서 또 켠 bringup)이 있습니다 |
| 브라우저에 `이 주소로는 열 수 없습니다. http://lekiwi01.local:8080 또는 IP 주소로 여세요` | 공유기 DNS 이름으로 열었습니다 → `.local` 이름이나 IP 로 |
| 게이트웨이를 배포한 뒤 `이동 설계` 메뉴가 없다 | 시험 기능이라 저장소에 없는 페이지입니다 (6.3) |
| 빌드가 실패한다 | 6.2 의 빌드 오류 표 |

일반 사용 중에 생기는 문제(접속 · 카메라 · 팔 · 앱 연결)는 [문제 해결](/docs/a-go/troubleshooting)에 모아 두었습니다.

---

## 9. 정리

- 로봇 소프트웨어는 공개 저장소 4개입니다: `lekiwi_ws`(ROS 2) · `lekiwi_web_operator`(게이트웨이) · `lekiwi_net`(네트워크)는 로봇에, `lekiwi_pc_agent` 는 노트북에 들어갑니다. 로봇 폴더 이름은 바꾸지 않습니다.
- 부팅하면 게이트웨이(포트 8080)만 뜨고, 로봇 기능 · 지도 작성 · 자율 주행은 게이트웨이가 `ros2 launch` 로 켭니다. Physical Labs 는 게이트웨이(관리)와 데이터 노드 `lekiwi_zmq_host`(ZMQ 5555 · 5556)에 붙습니다.
- 같은 공유기에서 여러 대를 쓰면 `ros_domain.conf` 와 `~/.bashrc` 의 `ROS_DOMAIN_ID` 를 로봇마다 다르게 바꿉니다.
- 이미지의 로봇 폴더에는 `.git` 이 없으니, PC 에서 고쳐 복사(`rsync` · `deploy_to_robot.sh`)한 뒤 로봇에서 빌드 · 재시작합니다.
- 바닐라 LeRobot 클라이언트로 붙으면 영상 색이 뒤집히므로, 데이터 수집 · 추론은 Physical Labs 로 합니다.

<div class="card-grid">
  <a href="/docs/a-go/troubleshooting" class="card">
    <h3>🩺 문제 해결</h3>
    <p>접속 · 네트워크 · 카메라 · 팔 · 앱 연결에서 자주 생기는 문제와 확인할 것</p>
  </a>
  <a href="/docs/a-go/lekiwi-wifi-static-ip" class="card">
    <h3>📶 네트워크 (AP · 공유기)</h3>
    <p>AP 모드와 공유기 모드 오가기, AP 이름 · 비밀번호, 고정 IP, 로봇 번호</p>
  </a>
  <a href="/docs/a-go/physical-labs-setup" class="card">
    <h3>🧠 Physical Labs 연결</h3>
    <p>앱에 A-Go 를 추가하고 연결 확인 · 로봇 켜기 · 보정까지</p>
  </a>
  <a href="https://github.com/roboseasy/lekiwi_ws" class="card" target="_blank" rel="noopener">
    <h3>💻 GitHub — lekiwi_ws</h3>
    <p>ROS 2 작업공간 저장소. 패키지별 README 와 인터페이스 문서</p>
  </a>
</div>
