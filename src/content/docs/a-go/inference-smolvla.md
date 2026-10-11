---
title: "SmolVLA 추론"
category: "a-go"
group: "Inference"
order: 210
---

# Model Inference (SmolVLA)

[SmolVLA 학습](/docs/a-go/train-smolvla)에서 파인튜닝한 정책으로 LeKiwi를 자율 실행합니다. SmolVLA는 ACT보다 무겁고 **언어 조건부** 정책이라 추론 방식에 신경 쓸 부분이 몇 가지 더 있습니다. 기본 흐름(호스트 실행 → PC에서 추론)은 [ACT 추론](/docs/a-go/inference-act)과 같으니 먼저 읽어 두는 것을 권합니다.

> **정보** ℹ️ `INFO`
> <br>**v0.5.1까지는 `lerobot-record`로 추론을 돌렸지만, 0.6.0부터는 `lerobot-rollout`을 씁니다.** (`docs/source/cheat-sheet.mdx`에 명시되어 있습니다.) 이 페이지는 커스텀 스크립트(`lekiwi-inference.py`)와 `lerobot-rollout` 두 가지를 모두 다룹니다.

---

## 1. 데이터셋의 태스크 문장 확인

SmolVLA는 **언어 조건부** 정책이라 `--task` 문장이 학습 때와 달라지면 동작이 달라집니다. 먼저 데이터셋에 기록된 문장을 확인하세요.

```bash
python -c "
from lerobot.datasets.lerobot_dataset import LeRobotDatasetMetadata
m = LeRobotDatasetMetadata('roboseasy/lekiwi_pick_and_place')
print(list(m.tasks.index))
"
```

```text
['Pick up the cube and place it in the box']
```

---

## 2. LeKiwi 구조 이해하기 ⭐

RTC를 제대로 쓰려면 **추론이 어디서 도는지** 먼저 알아야 합니다.

```text
┌─────────────────────────┐          ZMQ           ┌───────────────────────┐
│  PC (GPU, 클라이언트)     │  cmd  : 포트 5555  →   │  LeKiwi (Raspberry Pi) │
│                         │  obs  : 포트 5556  ←   │                       │
│  lerobot-rollout        │                        │  lekiwi_host          │
│  └ SmolVLA 추론 ★       │                        │  └ 모터 + 카메라        │
└─────────────────────────┘                        └───────────────────────┘
```

**추론은 Pi가 아니라 PC에서 돕니다.** Pi는 관측을 보내고 명령을 받는 ZMQ 서버(`robots/lekiwi/lekiwi_host.py`)일 뿐입니다. 따라서 실행 순서는 항상 같습니다.

```bash
# ① 라즈베리파이에서 먼저 호스트 실행 (제어 스크립트 페이지에서 만든 스크립트)
./start_lekiwi_host.sh lekiwi07

# ② 그 다음 PC에서 추론 실행 (3~4절)
```

그래서 LeKiwi의 제어 루프 지연은 두 가지가 겹칩니다.

```text
총 지연 = 정책 추론 시간 + ZMQ 네트워크 왕복 시간
```

30 FPS 제어를 목표로 하면 한 틱에 33ms인데, SmolVLA 추론만으로도 이를 넘기기 쉽습니다. 여기에 Wi-Fi 왕복까지 더해지면 로봇이 뚝뚝 끊기거나 멈칫거립니다. **→ 이것이 RTC가 필요한 이유입니다 (4절).**

---

## 3. 기본 실행

PC에서 conda 환경을 활성화하고 환경 변수를 정합니다.

```bash
conda activate lerobot060
cd ~/workspace/lekiwi
export HF_USER="roboseasy"        # 본인의 Hugging Face 계정명으로 변경
export TASK_NAME="lekiwi_pick_and_place"
```

### 3.1. 커스텀 스크립트로 실행 (권장 시작점)

[ACT 추론](/docs/a-go/inference-act)에서 쓴 `lekiwi-inference.py` 를 그대로 씁니다. 사전 검사, 바퀴 속도 제한, `SPACE` 일시정지, `ESC` 시 시작 자세 복귀 같은 안전 장치가 그대로 적용됩니다. 학습 때와 같은 `--rename_map` 을 넘깁니다.

```bash
python lekiwi-inference.py \
  --robot.remote_ip=192.168.0.207 \
  --robot.id=lekiwi07 \
  --policy.path=${HF_USER}/${TASK_NAME}_smolvla \
  --task="Pick up the cube and place it in the box" \
  --base_speed_scale=0.3 \
  --display_data=true \
  --rename_map='{"observation.images.front": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}'
```

조작키(`SPACE`/`ESC`/`Ctrl + C`)와 안전 수칙은 [ACT 추론](/docs/a-go/inference-act)과 같습니다.

### 3.2. `lerobot-rollout` 으로 실행 (sync 추론)

LeRobot 0.6.0의 표준 추론 명령입니다. `--inference.type` 을 생략하면 동기(sync) 방식으로, 추론이 끝날 때까지 로봇이 다음 행동을 기다립니다.

```bash
lerobot-rollout \
  --strategy.type=base \
  --policy.path=${HF_USER}/${TASK_NAME}_smolvla \
  --robot.type=lekiwi_client \
  --robot.remote_ip=192.168.0.207 \
  --robot.id=lekiwi07 \
  --rename_map='{"observation.images.front": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}' \
  --task="Pick up the cube and place it in the box" \
  --fps=30 \
  --duration=60
```

> **경고** ⚠️ `WARN`
> <br>**`--robot.remote_ip`는 필수입니다.** `LeKiwiClientConfig`에 기본값이 없는 필드라 빠뜨리면 실행되지 않습니다. [고정 IP · 무선 연결](/docs/a-go/lekiwi-wifi-static-ip)에서 만든 Pi의 IP를 넣으세요.

로컬 체크포인트를 쓰려면 경로만 바꿉니다.

```bash
--policy.path=outputs/train/smolvla_lekiwi/${TASK_NAME}/checkpoints/last/pretrained_model
```

---

## 4. RTC 적용 — LeKiwi 권장 명령어 ⭐

**RTC(Real-Time Chunking)** 는 액션 청크 생성을 **인페인팅 문제**로 다룹니다. 이전 청크의 남은 부분(`prev_chunk_left_over`)을 prefix로 고정한 채 다음 청크를 생성해서, **추론이 진행되는 동안에도 로봇이 끊김 없이 이전 청크를 계속 실행**합니다.

```bash
lerobot-rollout \
  --strategy.type=base \
  --policy.path=${HF_USER}/${TASK_NAME}_smolvla \
  --inference.type=rtc \
  --inference.rtc.execution_horizon=10 \
  --inference.rtc.max_guidance_weight=10.0 \
  --inference.rtc.prefix_attention_schedule=LINEAR \
  --robot.type=lekiwi_client \
  --robot.remote_ip=192.168.0.207 \
  --robot.id=lekiwi07 \
  --rename_map='{"observation.images.front": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}' \
  --task="Pick up the cube and place it in the box" \
  --fps=30 \
  --duration=60
```

### RTC 옵션 전체

`RTCConfig` (`src/lerobot/policies/rtc/configuration_rtc.py`) 기준입니다.

| 플래그 | 기본값 | 설명 |
|---|---|---|
| `--inference.type` | `sync` | `rtc`로 바꾸면 백그라운드 스레드에서 비동기 추론 |
| `--inference.rtc.execution_horizon` | `10` | 한 청크에서 실제로 실행할 스텝 수. **가장 중요한 튜닝 값** |
| `--inference.rtc.max_guidance_weight` | `10.0` | prefix 일관성 강제 강도. 클수록 이전 청크에 강하게 붙음 |
| `--inference.rtc.prefix_attention_schedule` | `LINEAR` | `ZEROS` / `ONES` / `LINEAR` / `EXP` |
| `--inference.rtc.enabled` | `true` |  |
| `--inference.rtc.debug` | `false` | 디노이징 과정 기록 (디버깅용) |
| `--inference.queue_threshold` | `30` | 액션 큐 임계값 |

### `execution_horizon` 고르는 법

SmolVLA는 `chunk_size=50`으로 청크를 뽑습니다. 그중 몇 스텝을 실행하고 다음 추론을 시작할지가 `execution_horizon`입니다.

```text
추론 1회에 걸리는 시간(초) × fps  ≲  execution_horizon  ≪  chunk_size(50)
```

| 상황 | 권장값 | 이유 |
|---|---|---|
| 추론 빠름 / 유선 LAN | `8 ~ 10` | 반응성 우선. 자주 재계획 |
| 기본 (Wi-Fi + 중급 GPU) | `10 ~ 16` | 0.6.0 예제 기본값 근처 |
| 추론 느림 / Wi-Fi 불안정 | `20 ~ 25` | 끊김 방지 우선. 대신 반응이 둔해짐 |

**튜닝 절차**: `10`으로 시작 → 로봇이 멈칫거리면 5씩 올리기 → 너무 둔하게 반응하면 내리기. `nvidia-smi`로 추론 시간을 같이 보면 판단이 쉽습니다.

### RTC가 학습 없이도 켜지는 이유

학습 로그에서 `'rtc_config': None`이었는데도 추론에서 켤 수 있습니다. `src/lerobot/rollout/context.py`가 실행 시점에 주입하기 때문입니다.

```python
if is_rtc:
    policy.config.rtc_config = cfg.inference.rtc
    if hasattr(policy, "init_rtc_processor"):
        policy.init_rtc_processor()
```

**즉 이미 학습을 마친 체크포인트도 재학습 없이 그대로 RTC로 돌릴 수 있습니다.**

> 참고: RTC는 `predict_action_chunk` 경로에서만 동작합니다. `modeling_smolvla.py:335`에 `select_action`과 함께 쓰지 못한다는 assert가 있습니다.

---

## 5. 추론 시 반드시 지킬 것

1. **카메라 구성이 데이터 수집 때와 동일**해야 합니다 (개수, 이름, 해상도, 배치 위치). LeKiwi는 Pi 쪽 호스트 설정이 기준입니다.
2. **`--task` 문장**은 데이터셋 태스크 문장과 같아야 합니다 (1절).
3. 카메라 이름 매핑은 학습 때 쓴 `rename_map`과 일치해야 합니다. (학습 시 지정한 rename은 preprocessor에 저장되므로 같은 체크포인트를 쓰면 자동 적용됩니다.)
4. **Pi에서 호스트를 먼저 띄운 뒤** PC에서 추론을 실행하세요.
5. 처음 돌리는 모델은 바퀴 속도를 낮추고(`--base_speed_scale=0.3`), 로봇 주변을 비운 상태에서 시작합니다.

---

## 6. `--strategy.type` 선택

| 값 | 동작 |
|---|---|
| `base` | 자율 실행, 기록 없음 (기본 평가용) |
| `episodic` | 에피소드 단위 실행 + 리셋 구간 |
| `sentry` | 계속 기록하며 주기적 자동 업로드 |
| `highlight` | 링 버퍼 + 키 입력(`s` 저장 / `h` 푸시)으로 구간 저장 |
| `dagger` | 사람 개입 교정 (DAgger / RaC) — 추가 데이터 수집에 유용 |

예: RTC로 돌리면서 실패 구간만 사람이 교정해 데이터를 더 모으기

```bash
lerobot-rollout \
  --strategy.type=dagger \
  --strategy.num_episodes=20 \
  --strategy.record_autonomous=true \
  --inference.type=rtc \
  --inference.rtc.execution_horizon=10 \
  --policy.path=${HF_USER}/${TASK_NAME}_smolvla \
  --robot.type=lekiwi_client \
  --robot.remote_ip=192.168.0.207 \
  --robot.id=lekiwi07 \
  --rename_map='{"observation.images.front": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}' \
  --teleop.type=so101_leader \
  --teleop.port=/dev/ttyACM0 \
  --teleop.id=leader \
  --dataset.repo_id=${HF_USER}/${TASK_NAME}_dagger \
  --dataset.single_task="Pick up the cube and place it in the box"
```

---

## 7. 실습 과제

1. `--inference.type=sync`와 `--inference.type=rtc`로 각각 로봇을 돌려 움직임의 끊김 정도를 비교하기 (같은 체크포인트, 같은 태스크 문장으로)
2. `--inference.rtc.execution_horizon`을 5 / 10 / 20으로 바꿔가며 반응성과 부드러움의 트레이드오프 체감하기
3. 5k / 10k / 20k 체크포인트를 각각 로봇에 올려 성공률 비교하기 ([ACT 추론](/docs/a-go/inference-act)의 `lekiwi-evaluate.py` 활용)

---

## 관련 소스 파일

| 경로 | 역할 |
|---|---|
| `src/lerobot/scripts/lerobot_rollout.py` | 추론 CLI (0.6.0 신규) |
| `src/lerobot/rollout/inference/factory.py` | `--inference.type` (sync / rtc) 정의 |
| `src/lerobot/policies/rtc/configuration_rtc.py` | `RTCConfig` 기본값 |
| `src/lerobot/rollout/context.py` | 추론 시 RTC를 정책에 주입 |
| `src/lerobot/processor/rename_processor.py` | `rename_map` 적용 |
| `src/lerobot/robots/lekiwi/lekiwi_host.py` | Pi에서 도는 ZMQ 서버 |
