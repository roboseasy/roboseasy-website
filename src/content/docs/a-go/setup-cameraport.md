---
title: "카메라 포트 고정"
category: "a-go"
group: "Start"
order: 110
---

# LeKiwi 카메라 포트 고정

[텔레오퍼레이션](/docs/a-go/start-teleoperation)의 호스트 명령에는 카메라 경로가 `/dev/video0`, `/dev/video2` 처럼 번호로 들어 있었습니다. 이 번호는 리눅스가 **부팅 시 장치를 인식한 순서**대로 붙이는 것이라, 케이블을 꽂는 순서나 부팅 타이밍에 따라 바뀔 수 있습니다. 이 페이지에서는 어떤 순서든 손목 카메라와 정면 카메라가 항상 같은 이름으로 잡히도록 고정합니다.

> 🎯 **학습 목표**
>
> - 장치 번호가 바뀌면 데이터셋과 모델에 어떤 문제가 생기는지 설명할 수 있다.
> - USB 포트 경로로 카메라를 식별하고 udev 규칙으로 고정 이름을 부여할 수 있다.
> - 고정한 이름으로 텔레오퍼레이션이 정상 동작하는지 검증할 수 있다.

---

## 1. 왜 고정해야 하는가

텔레오퍼레이션만 할 때는 번호가 바뀌어도 명령 옵션을 고치면 그만입니다. 문제는 **데이터 수집과 모델 추론**에서 생깁니다.

- 데이터셋에는 `front` 영상과 `wrist` 영상이 이름으로 저장됩니다. 모델은 "front에는 작업 공간 전체가, wrist에는 그리퍼가 보인다"는 전제로 학습합니다.
- 어느 날 번호가 뒤바뀐 채 데이터를 모으면, 그 에피소드는 front 자리에 그리퍼 영상이 들어갑니다. 학습 데이터에 섞이면 모델 성능이 떨어지고, 추론 중에 바뀌면 모델은 엉뚱한 화면을 보고 행동합니다.
- 이런 오류는 프로그램이 에러를 내지 않고 **조용히 잘못된 결과**만 만들기 때문에 찾기 어렵습니다.

실제로 [텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 쓴 로봇은 `video0` 이 손목 카메라였지만, 이 페이지의 예시 로봇(스크린샷의 `lekiwi01`)은 `video0` 이 정면 카메라입니다. 같은 부품으로 조립해도 이렇게 달라지므로, 이 페이지의 장치 번호와 포트 값은 예시일 뿐이고 반드시 본인 로봇에서 직접 확인해야 합니다.

해결 원리는 간단합니다. 카메라가 **어느 USB 포트에 꽂혀 있는지**는 바뀌지 않으므로, 포트 위치를 기준으로 `/dev/cam_front`, `/dev/cam_wrist` 같은 고정 이름을 만들어 두고 그 이름만 쓰는 것입니다.

---

## 2. [Pi] 카메라 장치 확인

라즈베리파이에서 진행합니다.

> **팁** 💡`TIP`
> <br>**킷에 이미 설정되어 있을 수 있습니다.** `ls -l /dev/cam_*` 를 먼저 실행해 보세요. `/dev/cam_front`, `/dev/cam_wrist` 가 이미 있다면 7절의 별칭 명령으로 front와 wrist가 올바르게 보이는지만 확인하면 됩니다. 고쳐야 한다면 `ls /etc/udev/rules.d/` 로 기존 규칙 파일을 찾아 백업(`sudo cp <파일> <파일>.bak`)한 뒤 수정하세요. 아무것도 없으면 이 페이지의 순서대로 새로 만듭니다.

비디오 장치를 다루는 도구를 설치하고 목록을 봅니다.

```bash
sudo apt install v4l-utils
v4l2-ctl --list-devices
```

![](/img/a_go/setup-cameraport-01.webp)

출력을 읽는 요령은 다음과 같습니다.

- `bcm2835-codec`, `bcm2835-isp`, `rpivid` 는 라즈베리파이 내부의 영상 처리 장치입니다. 카메라가 아니므로 무시합니다.
- `USB Camera (usb-0000:01:00.0-1.1)` 처럼 **USB** 로 시작하는 항목이 우리가 꽂은 카메라입니다. 괄호 안의 `1.1`, `1.2` 가 USB 포트 위치입니다.
- 카메라 하나에 `/dev/video0`, `/dev/video1` 처럼 장치가 **두 개씩** 나옵니다. 앞의 짝수 번호가 실제 영상 스트림이고 뒤의 홀수 번호는 메타데이터용입니다. 우리가 쓰는 것은 짝수 쪽입니다.

위 예시에서는 포트 `1.1` 에 `/dev/video0`, 포트 `1.2` 에 `/dev/video2` 가 연결되어 있습니다.

---

## 3. 어느 카메라가 어느 장치인지 판별

번호는 알았지만 어느 것이 손목이고 어느 것이 정면인지는 아직 모릅니다. [텔레오퍼레이션](/docs/a-go/start-teleoperation)을 그대로 실행해 화면으로 확인하는 것이 가장 확실합니다.

호스트 명령에 `front: /dev/video0`, `wrist: /dev/video2` 로 넣고 실행한 뒤, Rerun 화면에서 `observation.front` 에 작업 공간이, `observation.wrist` 에 그리퍼가 보이는지 확인합니다.

### 3.1. [Pi] 호스트 실행

```bash
python -m lerobot.robots.lekiwi.lekiwi_host \
    --robot.id=lekiwi07 \
    --robot.cameras='{
    front: {type: opencv, index_or_path: /dev/video0, width: 640, height: 480, fps: 30, rotation: 0, fourcc: MJPG},
    wrist: {type: opencv, index_or_path: /dev/video2, width: 640, height: 480, fps: 30, rotation: 0, fourcc: MJPG}
    }' \
    --host.connection_time_s=14400
```

### 3.2. [PC] 클라이언트 실행

```bash
# 우분투
cd ~/lerobot
python examples/lekiwi/teleoperate.py
```

```bat
:: 윈도우
cd %USERPROFILE%\lerobot
python examples\lekiwi\teleoperate.py
```

LeRobot을 pip 패키지로 설치해 `examples` 폴더가 없다면 [제어 스크립트](/docs/a-go/start-custom-scripts)의 커스텀 클라이언트(`lekiwi-teleoperate.py`)로 확인해도 됩니다.

![](/img/a_go/setup-cameraport-02.webp)

위 화면은 `video0` 이 정면, `video2` 가 손목으로 올바르게 잡힌 경우입니다. 반대로 나왔다면 두 번호를 바꿔 기억해 두면 됩니다. 이렇게 확인한 대응을 다음 단계에서 고정합니다.

| 장치 | USB 포트 | 카메라 |
|---|---|---|
| `/dev/video0` | `1-1.1` | 정면(front) |
| `/dev/video2` | `1-1.2` | 손목(wrist) |

---

## 4. [Pi] USB 포트 경로 확인

udev 규칙에 쓸 정확한 포트 경로 문자열을 뽑습니다. 카메라의 시리얼 번호로 구분하는 방법도 있지만, 저가형 웹캠은 시리얼이 없거나 두 대가 같은 값을 갖는 경우가 흔해 **USB 포트 위치(KERNELS)** 를 쓰는 편이 확실합니다.

```bash
udevadm info -a -n /dev/video0 | grep 'KERNELS=="[0-9]' | head -n 1
```

```text
KERNELS=="1-1.1:1.0"
```

```bash
udevadm info -a -n /dev/video2 | grep 'KERNELS=="[0-9]' | head -n 1
```

```text
KERNELS=="1-1.2:1.0"
```

`udevadm info -a` 는 장치와 그 상위 장치들의 속성을 모두 출력하는데, 그중 숫자로 시작하는 첫 번째 KERNELS 값이 USB 포트 경로입니다. 이 값은 앞서 `v4l2-ctl` 에서 본 `1.1`, `1.2` 와 대응합니다.

> **팁** 💡`TIP`
> <br>값이 안 나오면 `grep 'KERNELS'` 로 전체를 보고 `1-1.x:1.0` 형태의 값을 찾습니다. 라즈베리파이 모델이나 USB 허브 사용 여부에 따라 `3-1.2:1.0` 처럼 앞 숫자가 다를 수 있습니다.

---

## 5. [Pi] udev 규칙 작성

**udev** 는 리눅스가 장치를 인식할 때 이름과 권한을 정하는 시스템입니다. 규칙 파일에 "이 조건을 만족하는 장치에 이 별칭을 붙여라"라고 적어 두면 부팅 때마다 자동으로 적용됩니다.

```bash
sudo nano /etc/udev/rules.d/99-serial.rules
```

3절에서 확인한 대응대로 작성합니다. 자신의 로봇에서 확인한 KERNELS 값과 카메라 대응으로 바꿔 넣으세요. 파일에 이미 카메라 줄(`video4linux`)이 있다면 줄을 더 추가하지 말고 그 줄을 고칩니다.

```text
SUBSYSTEM=="video4linux", KERNELS=="1-1.1:1.0", ATTR{index}=="0", SYMLINK+="cam_front"
SUBSYSTEM=="video4linux", KERNELS=="1-1.2:1.0", ATTR{index}=="0", SYMLINK+="cam_wrist"
```

| 항목 | 의미 |
|---|---|
| `SUBSYSTEM=="video4linux"` | 비디오 장치만 대상 |
| `KERNELS=="1-1.1:1.0"` | 이 USB 포트에 꽂힌 장치만 대상 |
| `ATTR{index}=="0"` | 카메라당 두 개인 장치 중 **영상 스트림 쪽(index 0)** 만 선택. 이 조건이 없으면 메타데이터 장치에도 같은 이름이 붙어 충돌합니다 |
| `SYMLINK+="cam_front"` | `/dev/cam_front` 라는 별칭 생성 |

`==` 는 비교, `+=` 는 추가입니다. 별칭 이름은 `cam_left`, `cam_hand` 처럼 구분하기 쉬운 것으로 바꿔도 되지만, 호스트 명령의 카메라 이름과 헷갈리지 않게 `front`, `wrist` 를 그대로 쓰는 것을 권합니다.

---

## 6. [Pi] 규칙 적용 및 확인

규칙을 다시 읽어 들이고 기존 장치에도 적용합니다. 재부팅은 필요 없습니다.

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
ls -l /dev/cam_*
```

```text
lrwxrwxrwx 1 root root 6 Sep  2 20:21 /dev/cam_front -> video0
lrwxrwxrwx 1 root root 6 Sep  2 20:21 /dev/cam_wrist -> video2
```

별칭 두 개가 각각 올바른 번호를 가리키면 완료입니다. 이제 재부팅하거나 케이블을 뺐다 꽂아 번호가 바뀌어도, 별칭은 항상 **같은 포트의 카메라**를 따라갑니다.

> **경고** ⚠️ `WARN`
> <br>**바뀐 것은 기준입니다.** 이제 카메라를 구분하는 기준은 장치 번호가 아니라 **USB 포트 위치**입니다. 따라서 케이블을 다른 포트로 옮겨 꽂으면 별칭도 따라 바뀝니다. 손목 카메라와 정면 카메라를 어느 포트에 꽂는지 정해 두고 지키는 것이 이 방법의 전제입니다.

---

## 7. 텔레오퍼레이션으로 재확인

호스트 명령에서 번호 대신 별칭을 씁니다. 이 카메라 설정이 앞으로 데이터 기록과 추론에서도 그대로 쓰는 **최종 카메라 설정**입니다. [USB 포트 고정](/docs/a-go/setup-usbport)에서 `--robot.port` 를 더한 뒤, [제어 스크립트](/docs/a-go/start-custom-scripts)의 `start_lekiwi_host.sh` 에 그대로 담습니다.

### 7.1. [Pi] 호스트 실행

```bash
python -m lerobot.robots.lekiwi.lekiwi_host \
    --robot.id=lekiwi07 \
    --robot.cameras='{
    front: {type: opencv, index_or_path: /dev/cam_front, width: 640, height: 480, fps: 30, rotation: 0, fourcc: MJPG},
    wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 30, rotation: 0, fourcc: MJPG}
    }' \
    --host.connection_time_s=14400
```

호스트가 뜨면 [텔레오퍼레이션](/docs/a-go/start-teleoperation)과 같은 `No command available` 대기 화면이 나옵니다.

### 7.2. [PC] 클라이언트 실행

```bash
# 우분투
cd ~/lerobot
python examples/lekiwi/teleoperate.py
```

```bat
:: 윈도우
cd %USERPROFILE%\lerobot
python examples\lekiwi\teleoperate.py
```

![](/img/a_go/setup-cameraport-04.webp)

`observation.front` 에 작업 공간, `observation.wrist` 에 그리퍼가 보이면 고정이 완료된 것입니다. 이후 단계에서는 이 화면 구성이 기준이 됩니다.

---

## 8. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `ls -l /dev/cam_*` 에 아무것도 없음 | 규칙 파일의 KERNELS 값 오타. `udevadm info` 출력과 대조 |
| 별칭이 홀수 번호(`video1`)를 가리킴 | `ATTR{index}=="0"` 조건 누락 |
| 별칭 두 개가 같은 번호를 가리킴 | 두 줄의 KERNELS 값이 같음. 카메라마다 다른 포트인지 확인 |
| front와 wrist가 서로 바뀜 | 규칙의 SYMLINK 이름을 서로 맞바꾸고 다시 적용 |
| 케이블을 옮긴 뒤 별칭이 사라짐 | 규칙은 포트 기준. 원래 포트에 꽂거나 규칙의 KERNELS 값 수정 |

---

## 9. 정리

- `/dev/videoN` 번호는 인식 순서에 따라 바뀌며, 이 상태로 데이터를 모으면 **에러 없이 잘못된 데이터셋**이 만들어집니다.
- 카메라는 USB 포트 위치(KERNELS)로 식별하고, udev 규칙으로 `/dev/cam_front`, `/dev/cam_wrist` 별칭을 만듭니다.
- `ATTR{index}=="0"` 으로 영상 스트림 장치만 선택합니다.
- 이후 모든 호스트 명령은 별칭을 쓰며, 카메라는 정해진 포트에 꽂아야 합니다.

카메라까지 고정되었습니다. 다음 페이지 [USB 포트 고정](/docs/a-go/setup-usbport)에서 모터 보드 포트도 udev 규칙으로 고정합니다. 이번에는 USB 포트 위치가 아니라 보드의 시리얼 번호가 기준입니다.
