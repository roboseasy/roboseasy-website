---
title: "Calibration"
category: "a-go"
group: "Start"
order: 90
---

# A-Go(LeKiwi) Calibration

소프트웨어 설치가 끝났으니 이제 로봇의 몸을 다룰 차례입니다. 모터에 명령을 보내기 전에 반드시 거쳐야 하는 단계가 **캘리브레이션**입니다. LeKiwi의 팔(팔로워 암)과 이를 조종할 리더 암 양쪽 모두에 진행합니다.

> 🎯 **학습 목표**
>
> - 서보 모터에 캘리브레이션이 필요한 이유를 설명할 수 있다.
> - 팔로워 암과 리더 암을 각각 캘리브레이션하고 결과 파일이 어디에 저장되는지 안다.
> - 캘리브레이션 결과 표를 읽고 정상 여부를 판단할 수 있다.

---

## 1. 캘리브레이션이란

LeKiwi의 팔에 쓰이는 서보 모터는 관절 위치를 **0부터 4095까지의 정수(raw 값)** 로 알려 줍니다. 문제는 이 숫자가 모터마다, 조립 상태마다 다르다는 점입니다. 같은 "팔을 곧게 편 자세"라도 어떤 모터는 2048, 어떤 모터는 1900을 내놓습니다. 기어를 끼울 때 이가 한 칸만 어긋나도 값이 달라집니다.

캘리브레이션은 이 raw 값을 **관절마다 통일된 기준(각도)** 으로 바꾸는 변환표를 만드는 과정입니다. 두 가지를 기록합니다.

| 기록 항목 | 의미 | 사용처 |
|---|---|---|
| **중간 위치** | 관절 가동 범위의 한가운데 자세에서의 raw 값 | 각도 0도의 기준점 |
| **최소·최대 위치** | 관절을 양 끝까지 움직였을 때의 raw 값 | 가동 범위의 양 끝, 안전 한계 |

이 변환표가 있어야 리더 암의 "어깨 30도"가 팔로워 암의 "어깨 30도"로 정확히 전달됩니다. 리더와 팔로워 모두 캘리브레이션해야 하는 이유입니다.

결과는 로봇 **id 이름의 JSON 파일**로 저장되며, 이후 텔레오퍼레이션이나 데이터 수집에서 같은 id를 쓰면 자동으로 불러옵니다.

```text
~/.cache/huggingface/lerobot/calibration/robots/lekiwi/<id>.json
~/.cache/huggingface/lerobot/calibration/teleoperators/so_leader/<id>.json
```

> **경고** ⚠️ `WARN`
> <br>**id는 로봇의 이름표입니다.** 캘리브레이션, 텔레오퍼레이션, 데이터 기록 모든 단계에서 같은 id를 써야 같은 변환표가 적용됩니다. 이 자료에서는 라즈베리파이 호스트명과 같은 `lekiwi07` 을 씁니다.

---

## 2. [Pi] LeKiwi 팔로워 암 캘리브레이션

라즈베리파이에 SSH로 접속하고 가상환경이 활성화된 상태에서 진행합니다.

### 2.1. 명령 실행

```bash
lerobot-calibrate \
    --robot.type=lekiwi \
    --robot.id=lekiwi07 \
    --robot.port=/dev/ttyACM0 \
    --robot.cameras='{}'
```

| 옵션 | 의미 |
|---|---|
| `--robot.type=lekiwi` | 로봇 종류. 어떤 관절이 있는지 LeRobot이 이걸로 압니다 |
| `--robot.id=lekiwi07` | 저장될 캘리브레이션 파일 이름 |
| `--robot.port=/dev/ttyACM0` | 모터 제어 보드가 연결된 USB 시리얼 포트 |
| `--robot.cameras='{}'` | 카메라를 비움. 캘리브레이션에는 모터만 필요하므로 카메라를 열지 않아 빠르고 오류가 적습니다 |

![](/img/a_go/start-calibration-01.webp)

`LeKiwi connected.` 가 보이면 모터 보드와 통신이 된 것입니다.

> **팁** 💡`TIP`
> <br>모터 보드 포트는 USB를 다시 꽂으면 `/dev/ttyACM1` 처럼 바뀔 수 있습니다. [USB 포트 고정](/docs/a-go/setup-usbport)을 마쳤다면 `--robot.port=/dev/lekiwi` 를 쓰면 됩니다.

### 2.2. 기존 파일 사용 여부 선택

같은 id로 저장된 파일이 이미 있으면 어떻게 할지 묻습니다.

- **ENTER** : 기존 캘리브레이션 파일을 그대로 사용
- **c 입력 후 ENTER** : 새로 캘리브레이션 진행

처음이거나, 부품을 재조립했거나, 텔레오퍼레이션에서 팔이 어긋나게 따라온다면 `c` 로 새로 진행합니다.

### 2.3. 중간 위치에 놓기

`Move robot to the middle of its range of motion and press ENTER` 메시지가 나오면 아래 사진처럼 팔을 **가동 범위의 한가운데 자세**로 만듭니다. 팔을 앞으로 곧게 뻗고 그리퍼는 정면을 향하게 한 자세입니다. 이 자세가 각도 0의 기준이 됩니다.

![](/img/a_go/start-calibration-02.webp)

자세를 잡은 뒤 ENTER를 누릅니다.

### 2.4. 관절 가동 범위 기록

이어서 `Move all arm joints ... sequentially through their entire ranges of motion` 메시지와 함께 표가 나타납니다. 이때부터 프로그램이 각 관절의 위치를 **계속 읽으면서 최소값과 최대값을 갱신**합니다.

각 관절을 **하나씩, 천천히, 양 끝까지** 움직입니다. 어깨 회전, 어깨 들기, 팔꿈치, 손목 굽힘, 그리퍼 순서로 하면 빠뜨리지 않습니다. 손목 회전(`wrist_roll`)과 바퀴는 무한 회전 관절이라 범위 기록 대상에서 제외됩니다.

![](/img/a_go/start-calibration-03.webp)

표의 각 열은 다음을 뜻합니다.

| 열 | 의미 |
|---|---|
| `MIN` | 지금까지 관측된 최소 raw 값 |
| `POS` | 현재 raw 값 |
| `MAX` | 지금까지 관측된 최대 raw 값 |

모든 관절을 움직였으면 ENTER를 누릅니다. `Calibration saved to ...` 가 출력되고 파일이 저장됩니다.

> **팁** 💡`TIP`
> <br>**결과가 정상인지 확인하는 법** 각 관절의 MIN과 MAX가 충분히 벌어져 있어야 합니다. MIN, POS, MAX가 거의 같은 숫자라면 그 관절을 움직이지 않은 것입니다. 이 상태로 저장하면 텔레오퍼레이션에서 그 관절이 거의 움직이지 않으니 `c` 로 다시 진행합니다.

---

## 3. [PC] SO101 리더 암 캘리브레이션

리더 암은 PC에 USB로 연결합니다. [LeRobot 설치](/docs/a-go/setup-lerobot-ubuntu)에서 만든 PC의 conda 환경을 활성화한 상태에서 진행합니다.

### 3.1. 리더 암 포트 찾기

리더 암을 USB 케이블로 PC에 연결한 상태에서 아래 명령을 실행합니다.

```bash
lerobot-find-port
```

안내 메시지가 나오면 리더 암의 USB 케이블을 뽑고 ENTER를 누릅니다. 사라진 포트가 리더 암의 포트입니다(우분투 `/dev/ttyACM0` 형태, 윈도우 `COM22` 형태). 확인한 뒤 케이블을 다시 꽂습니다.

![](/img/a_go/start-calibration-04.webp)

### 3.2. 명령 실행

```bash
# 우분투
lerobot-calibrate \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=leader
```

```bash
:: 윈도우
lerobot-calibrate ^
    --teleop.type=so101_leader ^
    --teleop.port=COM22 ^
    --teleop.id=leader
```

`--teleop.port` 에는 3.1에서 확인한 포트를 넣습니다. 이번에는 `robot` 이 아니라 `teleop` 옵션입니다. LeRobot에서 리더 암은 로봇이 아니라 **조종 장치(teleoperator)** 로 분류되기 때문입니다.

![](/img/a_go/start-calibration-05.webp)

### 3.3. 기존 파일 사용 여부 선택

팔로워 암과 같습니다. ENTER는 기존 파일 사용, `c` 는 새로 진행입니다.

### 3.4. 중간 위치에 놓기

리더 암도 같은 방식으로 팔을 앞으로 곧게 뻗은 중간 자세를 만들고 ENTER를 누릅니다.

![](/img/a_go/start-calibration-06.webp)

### 3.5. 관절 가동 범위 기록

표가 나타나면 각 관절을 하나씩 양 끝까지 움직인 뒤 ENTER를 누릅니다.

![](/img/a_go/start-calibration-07.webp)

위 화면은 범위 기록을 **막 시작한 직후**의 모습입니다. 아직 아무 관절도 움직이지 않아 MIN, POS, MAX가 모두 2047 근처에 모여 있습니다. 관절을 움직이면 이 숫자들이 실시간으로 벌어집니다.

> **팁** 💡`TIP`
> <br>리더 암과 팔로워 암은 관절 구성이 같으므로 **같은 순서, 같은 자세**로 캘리브레이션하는 것이 좋습니다. 중간 자세가 서로 다르면 텔레오퍼레이션에서 팔로워가 리더보다 늘 몇 도 틀어진 채 따라옵니다.

---

## 4. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `Permission denied: '/dev/ttyACM0'` | 사용자를 `dialout` 그룹에 추가한 뒤 재로그인. `sudo usermod -aG dialout $USER` |
| `/dev/ttyACM0` 가 없음 | `ls /dev/ttyACM*` 로 실제 포트 이름 확인. USB 케이블 재연결 |
| 모터를 찾지 못함 | 모터 전원 확인. LeKiwi는 배터리 스위치, 리더 암은 전원 어댑터 |
| 텔레오퍼레이션에서 팔이 어긋나게 따라옴 | 양쪽 모두 `c` 로 다시 캘리브레이션. 중간 자세를 같게 |
| 특정 관절만 안 움직임 | 그 관절의 MIN, MAX가 거의 같은지 확인. 다시 캘리브레이션 |

---

## 5. 정리

- 서보의 raw 값은 모터마다 달라서, **중간 위치와 최소·최대 위치**를 기록해 각도로 변환하는 표를 만듭니다.
- 팔로워 암은 Pi에서 `--robot` 옵션으로, 리더 암은 PC에서 `--teleop` 옵션으로 캘리브레이션합니다.
- 결과는 **id 이름의 JSON** 으로 저장되므로 이후 단계에서 같은 id를 씁니다.
- 부품을 재조립하거나 팔이 어긋나면 `c` 로 다시 진행합니다.

다음 페이지 [텔레오퍼레이션](/docs/a-go/start-teleoperation)에서는 이 두 팔을 연결해 리더 암으로 LeKiwi를 실시간 조종하는 텔레오퍼레이션을 진행합니다.
