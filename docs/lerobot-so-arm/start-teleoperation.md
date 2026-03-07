# SO-ARM Teleoperation

> **리더-팔로워 텔레오퍼레이션이란?**
>
> 리더-팔로워(Leader-Follower) 방식은 한 대의 로봇(리더)을 사람이 직접 조작하면, 
> <br>다른 로봇(팔로워)이 그 동작을 실시간으로 따라하는 직관적 원격 제어 방식입니다.
> <br>SO-ARM 두 대와 Ubuntu 환경에서 
> <br>USB 포트(`/dev/so101_leader`, `/dev/so101_follower`)로 쉽게 구현할 수 있습니다.

---

## 개요

- **직관적 제어**: Leader Arm을 손으로 움직이면 Follower Arm이 그대로 따라함
- **고품질 데이터 수집**: Imitation Learning 등 학습용 데이터셋 구축에 최적
- **Ubuntu 환경**: USB 포트(`/dev/so101_leader`, `/dev/so101_follower`) 기준 설명

---

## 실습 영상

실습 영상을 함께 같이 보면서 같이 진행해 보세요!

<iframe width="100%" height="400" src="https://www.youtube.com/embed/x55GjA5352U" title="SO-Arm Max 텔레오퍼레이션 영상" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

---

## 하드웨어 및 환경 준비

- **SO-ARM 로봇 2대** (리더/팔로워)
- **Ubuntu PC** (USB 포트 2개 이상)
- **USB 케이블 2개**
- **(선택) 카메라**: 데이터 수집/모델 추론용

### 캘리브레이션

리더/팔로워 모두 캘리브레이션을 반드시 진행해야 합니다.
<br>자세한 방법은 [SO-ARM 캘리브레이션 가이드](#/software-calibration) 참고.

---

## 0. 가상환경 활성화

```bash
cd lerobot

# 가상환경 활성화
source .venv/bin/activate
```

---

## 1. 카메라 index 찾기

### 카메라 index, 스펙, fps 확인

2개 이상의 카메라를 연결해 데이터셋 구축/모델 추론에 활용할 수 있습니다.
<br>PC에 연결된 카메라의 index, 해상도, fps 등 정보를 확인하려면 아래 명령어를 실행하세요.

```bash
lerobot-find-cameras
```

**출력 예시:**

```plaintext
--- Detected Cameras ---
Camera#0:
  Name: OpenCV Camera @ 0
  Type: OpenCV
  Id: 0
  Backend api: V4L2
  Default stream profile:
    Format: 16.0
    Width: 1920
    Height: 1080
    Fps: 15.0
--------------------
Camera#1:
  Name: OpenCV Camera @ 1
  Type: OpenCV
  Id: 1
  Backend api: V4L2
  Default stream profile:
    Format: 16.0
    Width: 1280
    Height: 720
    Fps: 30.0
--------------------
```

---

## 2. 텔레오퍼레이션 실행 예시

SO-ARM 두 대를 Ubuntu에서 USB로 연결한 환경 기준 예시입니다.

### 기본 텔레옵 (카메라 없이)

```bash
# 카메라 없이 기본 텔레옵
lerobot-teleoperate \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --teleop.type=so101_leader \
  --teleop.port=/dev/so101_leader \
  --teleop.id=leader \
  --display_data=false
```

### 카메라 추가 설정

```bash
# 카메라 추가 설정
lerobot-teleoperate \
  --teleop.type=so101_leader \
  --teleop.port=/dev/so101_leader \
  --teleop.id=leader \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: 4, width: 640, height: 480, fps: 25},
  }' \
  --display_data=true
```

### 카메라 고정 포트 설정

```bash
# 카메라 포트 고정 설정 후 사용
lerobot-teleoperate \
  --teleop.type=so101_leader \
  --teleop.port=/dev/so101_leader \
  --teleop.id=leader \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --display_data=true
```

---

## 주요 옵션 설명

| 옵션명 | 설명 | 예시 값 |
|--------|------|---------|
| --robot.type | 팔로워 로봇 타입 | so101_follower |
| --robot.port | 팔로워 USB 포트 | /dev/so101_follower |
| --robot.id | 팔로워 이름 | follower |
| --teleop.type | 리더 로봇 타입 | so101_leader |
| --teleop.port | 리더 USB 포트 | /dev/so101_leader |
| --teleop.id | 리더 이름 | leader |

> **팁** 💡`TIP`
>
> 여러 카메라를 동시에 사용할 수 있습니다.
> <br>각 카메라의 index, 해상도, fps는 `lerobot-find-cameras`로 확인한 값 사용

---

## 문제 해결 / 트러블슈팅

> **경고** ⚠️ `WARN`
> <br>**자주 발생하는 문제와 해결법**
>
> - **포트 인식 안됨**: USB 케이블 재연결, 포트 번호 확인, 권한 설정(`chmod 666`)
> - **카메라 인식 안됨**: 카메라 index 확인, OpenCV 설치 확인, 다른 USB 포트 사용
> - **동기화 문제**: 캘리브레이션 파일 삭제 후 재실행
>   ```bash
>   rm -rf ~/.cache/huggingface/lerobot/calibration/
>   ```
> - **권한 문제**:
>   ```bash
>   sudo usermod -a -G dialout $USER
>   # 로그아웃 후 재로그인 필요
>   ```

---

## 안전 및 팁

- 로봇 주변에 충분한 공간 확보
- 비상시 전원 차단 준비 (Ctrl+C)
- 데이터 수집 전 체크리스트: 포트/권한/캘리브레이션/카메라 모두 점검

> **팁** 💡`TIP`
>
> 실패 케이스도 데이터로 수집하면 학습에 더 유리합니다
> <br>여러 번 반복해 다양한 상황을 기록하세요
> <br>카메라 연결 순서에 따라 index가 달라질 수 있으니, 항상 `lerobot-find-cameras`로 확인합니다.

---

## 다음 단계

Teleoperation을 완료하였다면, 다음 단계로 진행하세요:

<div class="card-grid">
  <a href="#/software-record-replay" class="card">
    <h3>📹 Record & Replay</h3>
    <p>VLA 모델을 훈련시키기 위해 데이터셋을 수집합니다</p>
  </a>
</div>
