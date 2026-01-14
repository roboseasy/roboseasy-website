# SO-ARM Calibration

## 개요

SO-Arm **Follower Arm** 으로 **Leader Arm**제어(teleoperation) 하기 위해서

**Leader Arm** 과 **Follower Arm** 모두 Manual calibration을 진행해야 합니다.

Calibration은 로봇 팔의 각 관절(joint)이 정확한 위치를 인식하고 매핑할 수 있도록 하는 중요한 과정입니다.

> **팁** 💡`TIP`
>
> Calibration 이후 Calibration 파일은 `~/.cache/huggingface/lerobot/calibration`에 생성됩니다.

---

## Calibration 과정

### 준비 사항

Calibration을 시작하기 전에 다음 사항들을 확인해주세요:

- Leader Arm과 Follower Arm이 모두 연결되어 있는지 확인
- USB 포트 연결 상태 확인 (`/dev/so101_leader`, `/dev/so101_follower`)
- 로봇 팔이 자유롭게 움직일 수 있는 공간 확보

### Calibration 순서

1. **Leader Arm Calibration** 진행
2. **Follower Arm Calibration** 진행

---

## 실습 영상

실습 영상을 함께 같이 보면서 같이 진행해 보세요!

<iframe width="100%" height="400" src="https://www.youtube.com/embed/vDS5eLKd9lM" title="SO-Arm Max 칼리브레이션 영상" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

---

## 0. 가상환경 활성화

```bash
cd lerobot

# 가상환경 활성화
source .venv/bin/activate
```

## 1. Leader Arm Calibration

### Calibration 명령어

다음 명령어를 실행하여 Leader Arm Calibration을 시작합니다:

```bash
lerobot-calibrate \
    --teleop.type=so101_leader \
    --teleop.port=/dev/so101_leader \
    --teleop.id=leader
```

### Calibration 과정

1. **중간 위치 설정**
   명령어 실행 후 다음과 같은 메시지가 표시됩니다:

   ```plaintext
   Move None SO101Leader to the middle of its range of motion and press ENTER....
   Move all joints sequentially through their entire ranges of motion.
   Recording positions. Press ENTER to stop...
   ```

   위 메시지를 따라 중간 위치를 잡아주고 엔터를 눌러주세요.

2. **관절 움직임**
   - 로봇 팔을 중간 위치(middle position)로 이동
   - 모든 관절(joints)을 순차적으로 전체 범위에서 움직여보기
   - ENTER 키를 눌러 기록 중지

3. **Calibration 결과**
   Calibration이 완료되면 다음과 같은 관절 위치 정보가 표시됩니다:

   ```plaintext
   -------------------------------------------
   -------------------------------------------
   NAME            |    MIN |    POS |    MAX
   shoulder_pan    |   1955 |   2007 |   3132
   shoulder_lift   |    709 |    724 |   2057
   elbow_flex      |   1605 |   3036 |   3110
   wrist_flex      |    808 |   2797 |   2803
   wrist_roll      |   2037 |   2048 |   2055
   gripper         |   2019 |   2046 |   3383
   ```

4. **파일 저장 확인**
   성공적으로 완료되면 다음 메시지가 표시됩니다:

   ```bash
   Calibration saved to ~/.cache/huggingface/lerobot/calibration/teleoperators/so101_leader/leader.json
   ```

---

## 2. Follower Arm Calibration

### Calibration 명령어

Leader Arm Calibration 완료 후, 다음 명령어로 Follower Arm Calibration을 진행합니다:

```bash
lerobot-calibrate \
    --robot.type=so101_follower \
    --robot.port=/dev/so101_follower \
    --robot.id=follower
```

### Calibration 과정

Follower Arm의 Calibration 과정은 Leader Arm과 동일합니다:

1. 중간 위치로 로봇 팔 이동
2. 모든 관절을 전체 범위에서 움직이기
3. ENTER 키로 기록 완료
4. 관절 위치 정보 확인
5. Calibration 파일 저장 확인

---

## Calibration 파일

### 저장 위치

Calibration이 완료되면 다음 위치에 파일이 저장됩니다:

- **Leader Arm**: `~/.cache/huggingface/lerobot/calibration/teleoperators/so101_leader/leader.json`
- **Follower Arm**: `~/.cache/huggingface/lerobot/calibration/robots/so101_follower/follower.json`

### 파일 구성

각 Calibration 파일에는 다음 정보가 포함됩니다:

- 각 관절의 최소값(MIN)
- 현재 위치(POS)
- 최대값(MAX)

> **성공** ✨ `SUCCESS` 
>
> 두 팔 모두 Calibration이 완료되면 텔레오퍼레이션과 데이터 수집을 시작할 수 있습니다.

---

## 문제 해결

### 일반적인 문제

- **포트 연결 오류**: USB 포트 번호(`/dev/so101_leader`, `/dev/so101_follower`) 확인
- **권한 문제**: 사용자가 시리얼 포트 접근 권한을 가지고 있는지 확인
- **하드웨어 연결**: 로봇 팔의 전원과 USB 연결 상태 점검

### Calibration 재실행

Calibration 결과가 만족스럽지 않다면 동일한 명령어로 다시 실행할 수 있습니다. 새로운 Calibration 파일이 기존 파일을 덮어쓰게 됩니다.

---

## 다음 단계

<div class="card-grid">
  <a href="#/software-teleoperation" class="card">
    <h3>🎮 Teleoperation</h3>
    <p>Leader Arm으로 Follower Arm을 제어해봅니다</p>
  </a>
</div>
