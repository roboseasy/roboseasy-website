---
title: "Rollout"
category: "a-ba"
group: "Inference"
order: 150
description: "lerobot-rollout으로 학습한 Policy를 실제 로봇 위에서 실행하는 방법"
---

# Rollout

## 개요

**롤아웃(Rollout)이란?**

Rollout(롤아웃)은 학습을 마친 Policy를 실제 로봇에 올려, 사람의 조종 없이 스스로 움직이게 하는 과정을 말합니다.

Policies 단계에서 우리는 데이터셋으로 Policy를 학습시켰습니다. 하지만 학습된 체크포인트는 아직 파일일 뿐입니다. 그 파일이 정말로 과업을 수행할 수 있는지는 로봇 위에서 굴려 봐야 알 수 있습니다. 이 "굴려 보는" 과정이 롤아웃입니다.

> **정보** ℹ️ `INFO`
> <br>**v0.6.0의 가장 큰 변화**
> <br>추론 진입점이 **`lerobot-rollout`** 명령 하나로 통합되었습니다. 이전에는 평가용 추론을 위해 `lerobot-record`를 우회해서 쓰거나 별도의 스크립트를 작성해야 했지만, 이제는 "데이터를 남기지 않고 그냥 돌려보기", "24시간 자율 주행하며 계속 기록하기", "사람이 개입해 교정하기" 같은 시나리오를 모두 이 명령 하나로 처리합니다.

### 롤아웃을 이루는 두 개의 축

`lerobot-rollout`을 이해하는 가장 좋은 방법은, 이 명령이 **서로 독립적인 두 개의 축**으로 이루어져 있다고 보는 것입니다.

```plaintext
lerobot-rollout
   │
   ├── --strategy.type   :  제어 루프를 "어떻게 돌리고, 무엇을 기록할 것인가"
   │                        base · sentry · highlight · dagger · episodic
   │
   └── --inference.type  :  매 순간의 행동을 "어떻게 계산할 것인가"
                            sync · rtc
```

이 두 축은 자유롭게 조합됩니다. 예를 들어 "기록 없이 굴려보되(base) 지연을 숨기고 싶다(rtc)"면 `--strategy.type=base --inference.type=rtc`가 되고, "사람이 교정하며 데이터를 모으되(dagger) 평범하게 추론한다(sync)"면 `--strategy.type=dagger --inference.type=sync`가 됩니다.

### 다섯 가지 실행 전략 한눈에 보기

| 전략 | 한 줄 요약 | 데이터 기록 | 사람 개입 | `--dataset.repo_id` |
| -- | -- | -- | -- | -- |
| `base` | 기록 없이 그냥 굴려보기 | 없음 | 없음 | **쓰면 오류** |
| `sentry` | 쉬지 않고 돌면서 계속 기록·업로드 | 전 구간 | 없음 | 필수 |
| `highlight` | 링버퍼로 원하는 구간만 잘라 저장 | 선택 구간 | 저장 시점 선택 | 필수 |
| `dagger` | 사람이 끼어들어 교정 데이터 생성 | 교정 구간(또는 전 구간) | 실시간 개입 | 필수 |
| `episodic` | `lerobot-record`처럼 에피소드 단위 기록 | 에피소드 단위 | 리셋 구간 조작 | 필수 |

> **팁** 💡`TIP`
> <br>처음이라면 **`base`부터 시작하세요.** 학습한 Policy가 로봇을 제대로 움직이는지 확인하는 가장 빠르고 안전한 방법입니다.

### 두 가지 추론 백엔드

| 백엔드 | 동작 방식 | 적합한 Policy |
| -- | -- | -- |
| `sync` (기본값) | 제어 주기마다 Policy를 한 번 호출하고, 결과가 나올 때까지 루프가 대기 | ACT처럼 추론이 빠른 모델 |
| `rtc` | 백그라운드 스레드가 다음 행동 청크를 미리 생성, 메인 루프는 준비된 행동을 꺼내 씀 | π₀, π₀.₅, SmolVLA처럼 크고 느린 VLA |

---

## 준비사항

### 1. 가상환경 활성화

```bash
cd lerobot

# Conda 가상환경을 사용할 경우
conda activate lerobot

# uv 또는 venv 가상환경을 사용할 경우
source lerobot/bin/activate
```

### 2. 학습된 Policy 확인

롤아웃에는 Policies 단계에서 학습한 체크포인트가 필요합니다. 다음 둘 중 하나를 준비합니다.

- **로컬 체크포인트**: `outputs/train/so101/act/${TASK_NAME}/checkpoints/last/pretrained_model`
- **Hugging Face Hub 모델**: `${HF_USER}/${TASK_NAME}_act`

### 3. 환경 변수 설정

데이터셋 수집 때 사용한 환경 변수를 그대로 씁니다.

```bash
export HF_USER="roboseasy"
export TASK_NAME="pick_and_place"
export TASK_DESCRIPTION="Grab the green cube and place it in circle"
```

### 4. 의존성

`lerobot-rollout`은 기본 LeRobot 설치에 포함되어 있어 **추가 의존성이 필요 없습니다.** 다만 사용할 Policy에 따라 해당 extras가 설치되어 있어야 합니다.

```bash
# π₀ 또는 π₀.₅를 롤아웃하는 경우
pip install -e ".[pi]"

# SmolVLA를 롤아웃하는 경우
pip install -e ".[smolvla]"
```

### 5. 안전 점검

> **경고** ⚠️ `WARN`
> <br>Policy는 사람의 조종 없이 스스로 로봇을 움직입니다. 첫 실행 전에 반드시 확인하세요.
>
> - 로봇 팔 반경 안에 사람·장애물·깨지기 쉬운 물건이 없는지
> - 전원 스위치나 `Ctrl+C`에 즉시 손이 닿는 위치인지
> - `--duration`을 짧게(예: 30초) 두고 처음 한 번 돌려볼 것

---

## 공통 옵션

전략과 무관하게 모든 롤아웃에 공통으로 적용되는 옵션입니다.

| 옵션 | 설명 | 기본값 |
| -- | -- | -- |
| `--policy.path` | **필수.** Hub 모델 ID 또는 로컬 체크포인트 경로 | -- |
| `--robot.type` | **필수.** 로봇 유형 (예: `so101_follower`) | -- |
| `--robot.port` | 로봇 USB Port | -- |
| `--robot.id` | Calibration 파일을 찾기 위한 로봇 ID | -- |
| `--robot.cameras` | 카메라 설정 (JSON 형식) | -- |
| `--fps` | 제어 루프 주파수 | `30` |
| `--duration` | 실행 시간(초). **`0`이면 무한** | `0` |
| `--device` | 연산 장치 (`cuda`, `cpu`, `mps`) | 자동 |
| `--task` | Policy에 전달할 과업 설명 (기록하지 않는 전략용) | `""` |
| `--display_data` | 관측·행동을 시각화 도구로 스트리밍 | `false` |
| `--display_mode` | 시각화 백엔드 (`rerun` 또는 `foxglove`) | `rerun` |
| `--interpolation_multiplier` | 행동 보간 배수 | `1` |
| `--use_torch_compile` | `torch.compile`로 추론 가속 | `false` |
| `--return_to_initial_position` | 종료 시 시작 자세로 부드럽게 복귀 | `true` |
| `--play_sounds` | 이벤트를 음성으로 안내 | `true` |
| `--resume` | 이전 기록 세션 이어서 진행 | `false` |

> **경고** ⚠️ `WARN`
> <br>**`--duration`의 기본값은 `0`(무한)입니다.** 값을 주지 않으면 `ESC` 또는 `Ctrl+C`로 직접 멈출 때까지 계속 돕니다. 처음에는 반드시 `--duration=30` 정도로 짧게 지정하세요.

> **팁** 💡`TIP`
> <br>**`--fps`는 학습 데이터셋의 fps와 맞추세요.** 데이터셋보다 빠르게 돌리면 Policy가 학습한 것보다 짧은 시간 간격으로 행동이 소비되어 동작이 어색해집니다.

---

## 전략별 실습

다섯 절 모두 같은 골격으로 설명합니다: **언제 쓰는가 → 명령어 → 전용 옵션 → 조작·확인.**

### 1. Base — 기록 없이 굴려보기

**언제 쓰는가**

학습이 끝나고 가장 먼저 하는 일입니다. 데이터를 전혀 남기지 않고 Policy가 로봇을 어떻게 움직이는지만 관찰합니다. 빠른 성능 확인, 시연, 디버깅에 적합합니다.

**명령어**

```bash
lerobot-rollout \
  --strategy.type=base \
  --policy.path=${HF_USER}/${TASK_NAME}_act \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --task="${TASK_DESCRIPTION}" \
  --duration=30 \
  --device=cuda \
  --display_data=true
```

**전용 옵션**

Base 전략은 전용 옵션이 없습니다. 위의 공통 옵션만 사용합니다.

**조작·확인**

- `ESC` 또는 `Ctrl+C`로 언제든 중단할 수 있습니다.
- `--display_data=true`를 주면 Rerun 창에 카메라 영상과 Policy가 내보내는 행동값이 실시간으로 그려집니다. 로봇이 이상하게 움직일 때 "카메라가 물체를 제대로 보고 있는가"를 가장 먼저 확인할 수 있습니다.

> **경고** ⚠️ `WARN`
> <br>Base 전략에 `--dataset.*` 옵션을 함께 주면 실행이 즉시 오류로 중단됩니다. Base는 설계상 기록을 하지 않는 전략이기 때문입니다. 기록이 필요하면 `sentry`·`highlight`·`dagger`·`episodic` 중에서 고르세요.

---

### 2. Sentry — 쉬지 않고 돌면서 계속 기록하기

**언제 쓰는가**

Policy를 오래 켜 두고 그 사이의 모든 데이터를 남기고 싶을 때 씁니다. 야간 무인 실험, 장시간 안정성 테스트, 실패 사례 자동 수집 등에 적합합니다.

Sentry는 에피소드 경계를 카메라 해상도와 fps로부터 **자동 계산**합니다. 저장된 에피소드 하나가 완결된 비디오 파일 하나에 대응되도록 맞춰, 업로드가 효율적으로 이뤄지게 하기 위해서입니다. 또한 에피소드가 바뀌어도 Policy의 내부 상태(hidden state, RTC 큐)는 유지되므로 **로봇은 에피소드 사이에 초기화되지 않고 계속 이어서 움직입니다.**

**명령어**

```bash
lerobot-rollout \
  --strategy.type=sentry \
  --strategy.upload_every_n_episodes=5 \
  --policy.path=${HF_USER}/${TASK_NAME}_act \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --dataset.repo_id=${HF_USER}/${TASK_NAME}_rollout \
  --dataset.single_task="${TASK_DESCRIPTION}" \
  --duration=3600 \
  --device=cuda
```

**전용 옵션**

| 옵션 | 설명 | 기본값 |
| -- | -- | -- |
| `--strategy.upload_every_n_episodes` | N개 에피소드마다 Hub로 Push | `5` |
| `--strategy.target_video_file_size_mb` | 에피소드 분할 기준이 되는 목표 비디오 파일 크기(MB) | 자동 |
| `--dataset.repo_id` | **필수.** 기록될 데이터셋의 Hub Repo ID | -- |
| `--dataset.push_to_hub` | 종료 시 Hub 업로드 여부 | `true` |

**조작·확인**

- Sentry는 `streaming_encoding`을 **강제로 켭니다.** 디스크 I/O가 제어 루프를 막지 않도록 하기 위해서이며, `--dataset.streaming_encoding=false`를 주더라도 경고와 함께 `true`로 되돌아갑니다.
- 업로드를 원하지 않으면 `--dataset.push_to_hub=false`를 지정합니다. 이때 데이터는 로컬에만 쌓입니다.

---

### 3. Highlight — 좋은 장면만 잘라 담기

**언제 쓰는가**

로봇은 계속 돌아가되, **"방금 그 동작 좋았다" 싶은 순간만** 골라 저장하고 싶을 때 씁니다.

Highlight는 메모리 상의 링버퍼(ring buffer)에 최근 N초 분량의 데이터를 계속 덮어쓰며 담아 둡니다. 사용자가 저장 키를 누르면 **버퍼에 남아 있던 과거 N초가 먼저 저장되고**, 이어서 실시간 기록이 시작됩니다. 키를 다시 누르면 에피소드가 마감됩니다. 즉 "좋은 장면이 지나간 뒤에" 눌러도 그 장면을 놓치지 않습니다.

**명령어**

```bash
lerobot-rollout \
  --strategy.type=highlight \
  --strategy.ring_buffer_seconds=10 \
  --strategy.save_key=s \
  --strategy.push_key=h \
  --policy.path=${HF_USER}/${TASK_NAME}_act \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --dataset.repo_id=${HF_USER}/${TASK_NAME}_highlight \
  --dataset.single_task="${TASK_DESCRIPTION}" \
  --duration=600 \
  --device=cuda
```

**전용 옵션**

| 옵션 | 설명 | 기본값 |
| -- | -- | -- |
| `--strategy.ring_buffer_seconds` | 버퍼에 담아 둘 과거 데이터 길이(초) | `10.0` |
| `--strategy.ring_buffer_max_memory_mb` | 링버퍼 메모리 상한(MB) | `1024` |
| `--strategy.save_key` | 기록 시작/저장 토글 키 | `s` |
| `--strategy.push_key` | Hub Push 키 | `h` |

**키보드 조작**

| 키 | 동작 |
| -- | -- |
| `s` | 기록 시작(버퍼 flush) / 다시 누르면 에피소드 저장 |
| `h` | 데이터셋을 Hub로 Push |
| `ESC` | 세션 종료 |

> **팁** 💡`TIP`
> <br>`ring_buffer_seconds`를 늘리면 더 먼 과거까지 되살릴 수 있지만 메모리를 그만큼 더 씁니다. 640×480 카메라 2대·25fps 기준으로 기본값 10초는 여유 있게 동작합니다.

---

### 4. DAgger — 사람이 개입해 교정 데이터 만들기

**언제 쓰는가**

Policy가 자꾸 실패하는 지점이 있을 때, 그 지점에서만 사람이 끼어들어 올바른 동작을 보여 주고 그 데이터를 모으는 방식입니다. DAgger(Dataset Aggregation)라는 이름 그대로 **"Policy가 스스로 만든 상황 분포 위에서 사람의 정답을 덧붙이는"** 학습 데이터 수집 기법입니다.

자율 실행과 사람 개입을 번갈아 오가며, 개입 구간의 프레임에는 `intervention=True` 태그가 붙습니다.

> **경고** ⚠️ `WARN`
> <br>**DAgger는 `--teleop.type`이 반드시 필요합니다.** 사람이 개입할 때 로봇을 조종할 Leader Arm이 있어야 하기 때문입니다.

DAgger에는 두 가지 기록 모드가 있습니다.

**(1) 교정 구간만 기록 (기본값)**

사람이 개입한 구간만 저장되며, 개입 한 번이 에피소드 하나가 됩니다.

```bash
lerobot-rollout \
  --strategy.type=dagger \
  --strategy.num_episodes=20 \
  --policy.path=${HF_USER}/${TASK_NAME}_act \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --teleop.type=so101_leader \
  --teleop.port=/dev/so101_leader \
  --teleop.id=leader \
  --dataset.repo_id=${HF_USER}/${TASK_NAME}_dagger \
  --dataset.single_task="${TASK_DESCRIPTION}" \
  --device=cuda
```

**(2) 자율 구간까지 전부 기록**

`--strategy.record_autonomous=true`를 주면 자율 실행 구간과 교정 구간이 **모두** 기록되고, 에피소드는 Sentry와 같은 방식으로 자동 분할됩니다.

```bash
lerobot-rollout \
  --strategy.type=dagger \
  --strategy.record_autonomous=true \
  --strategy.num_episodes=50 \
  --policy.path=${HF_USER}/${TASK_NAME}_act \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --teleop.type=so101_leader \
  --teleop.port=/dev/so101_leader \
  --teleop.id=leader \
  --dataset.repo_id=${HF_USER}/${TASK_NAME}_dagger_full \
  --dataset.single_task="${TASK_DESCRIPTION}" \
  --device=cuda
```

**전용 옵션**

| 옵션 | 설명 | 기본값 |
| -- | -- | -- |
| `--strategy.num_episodes` | 수집할 교정 에피소드 수 | 미지정 시 `--dataset.num_episodes` 값을 사용 |
| `--strategy.record_autonomous` | 자율 구간도 기록할지 여부 | `false` |
| `--strategy.upload_every_n_episodes` | N개 에피소드마다 Hub Push | `5` |
| `--strategy.input_device` | 입력 장치 (`keyboard` 또는 `pedal`) | `keyboard` |
| `--teleop.type` | **필수.** 개입에 사용할 Leader 유형 | -- |

**키보드 조작**

| 키 | 동작 |
| -- | -- |
| `Space` | Policy 실행 일시정지 / 재개 |
| `Tab` | 사람 교정 시작 / 종료 |
| `Enter` | 데이터셋 Hub Push (교정 구간만 기록하는 모드) |
| `ESC` | 세션 종료 |

**풋페달 사용**

로봇을 두 손으로 조종하면서 키보드를 누르기는 어렵습니다. `--strategy.input_device=pedal`을 주면 발로 조작할 수 있습니다.

| 옵션 | 설명 | 기본값 |
| -- | -- | -- |
| `--strategy.pedal.device_path` | 페달 장치 경로 | `/dev/input/by-id/usb-PCsensor_FootSwitch-event-kbd` |
| `--strategy.pedal.pause_resume` | 일시정지/재개 페달 코드 | `KEY_A` |
| `--strategy.pedal.correction` | 교정 토글 페달 코드 | `KEY_B` |
| `--strategy.pedal.upload` | 업로드 페달 코드 | `KEY_C` |

---

### 5. Episodic — 에피소드 단위로 평가 기록하기

**언제 쓰는가**

`lerobot-record`로 데이터를 모을 때와 **똑같은 흐름**으로, 다만 사람 대신 Policy가 로봇을 조종하게 하는 전략입니다. "20회 시도 중 몇 번 성공했는가" 같은 정량 평가를 에피소드 단위로 남길 때 가장 적합합니다.

각 에피소드는 Policy가 주행하고, 에피소드 사이의 리셋 구간에서는 사람이 Leader Arm으로 로봇과 환경을 초기 상태로 되돌립니다.

**명령어**

```bash
lerobot-rollout \
  --strategy.type=episodic \
  --policy.path=${HF_USER}/${TASK_NAME}_act \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --teleop.type=so101_leader \
  --teleop.port=/dev/so101_leader \
  --teleop.id=leader \
  --dataset.repo_id=${HF_USER}/${TASK_NAME}_eval \
  --dataset.single_task="${TASK_DESCRIPTION}" \
  --dataset.num_episodes=20 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=10 \
  --dataset.push_to_hub=false \
  --device=cuda
```

**전용 옵션**

| 옵션 | 설명 | 기본값 |
| -- | -- | -- |
| `--dataset.num_episodes` | 기록할 에피소드 수 | `50` |
| `--dataset.episode_time_s` | 에피소드 한 개의 최대 길이(초) | `60` |
| `--dataset.reset_time_s` | 에피소드 사이 리셋 시간(초) | `60` |
| `--teleop.type` | 선택. 리셋 구간에 로봇을 움직일 Leader | -- |
| `--strategy.reset_to_initial_position` | Leader가 없을 때 시작 자세로 복귀할지 여부 | `true` |
| `--strategy.smooth_leader_to_follower_handover` | Leader → Follower 부드러운 인계 사용 여부 | `true` |

**키보드 조작**

| 키 | 동작 |
| -- | -- |
| `→` (오른쪽) | 현재 에피소드(또는 리셋 구간)를 조기 종료 |
| `←` (왼쪽) | 현재 에피소드를 폐기하고 다시 기록 |
| `ESC` | 세션 종료 |

> **팁** 💡`TIP`
> <br>Teleop은 선택 사항입니다. 지정하지 않으면 리셋 구간 동안 로봇이 시작 자세를 유지합니다(`--strategy.reset_to_initial_position=false`로 끄면 마지막 자세에 그대로 머무릅니다).

---

## 추론 백엔드 바꾸기

지금까지의 예시는 모두 기본값인 `sync` 백엔드로 동작했습니다. 여기서 두 번째 축을 바꿔 봅니다.

### Sync (기본값)

제어 주기마다 Policy를 한 번 호출하고, 행동이 계산될 때까지 메인 루프가 대기합니다. 모든 Policy에서 동작하며 별도 옵션이 필요 없습니다.

ACT처럼 추론이 빠른 모델은 이것으로 충분합니다. 하지만 π₀·SmolVLA 같은 대형 VLA는 한 번의 추론에 수백 ms가 걸려, 그 시간 동안 로봇이 멈춰 있게 됩니다.

### RTC (Real-Time Chunking)

`--inference.type=rtc`를 주면 백그라운드 스레드가 다음 행동 청크를 미리 만들어 두고, 메인 제어 루프는 이미 준비된 행동을 큐에서 꺼내 쓰기만 합니다. 추론 지연이 있어도 로봇은 멈추지 않습니다.

```bash
lerobot-rollout \
  --strategy.type=base \
  --inference.type=rtc \
  --inference.rtc.execution_horizon=10 \
  --inference.rtc.max_guidance_weight=10.0 \
  --policy.path=${HF_USER}/${TASK_NAME}_smolvla \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --task="${TASK_DESCRIPTION}" \
  --duration=60 \
  --device=cuda
```

| 옵션 | 설명 | 기본값 |
| -- | -- | -- |
| `--inference.rtc.execution_horizon` | 이전 청크와 이어 붙일 구간의 길이(스텝) | `10` |
| `--inference.rtc.max_guidance_weight` | 이전 청크와의 일관성을 강제하는 강도 | `10.0` |
| `--inference.rtc.prefix_attention_schedule` | 이어 붙이는 가중치 스케줄 (`LINEAR`·`EXP`·`ONES`·`ZEROS`) | `LINEAR` |
| `--inference.queue_threshold` | 큐가 이 크기 이하로 내려가면 다음 청크 생성 | `30` |

---

## Python API로 롤아웃하기

CLI로 표현하기 어려운 커스텀 파이프라인(예: 역기구학 프로세서를 끼워 넣는 경우)에서는 롤아웃 모듈을 직접 호출합니다.

```python
from lerobot.rollout import BaseStrategyConfig, RolloutConfig, build_rollout_context
from lerobot.rollout.inference import SyncInferenceConfig
from lerobot.rollout.strategies import BaseStrategy
from lerobot.utils.process import ProcessSignalHandler

cfg = RolloutConfig(
    robot=my_robot_config,
    policy=my_policy_config,
    strategy=BaseStrategyConfig(),
    inference=SyncInferenceConfig(),
    fps=30,
    duration=60,
    task="my task",
)

signal_handler = ProcessSignalHandler(use_threads=True)
ctx = build_rollout_context(
    cfg,
    signal_handler.shutdown_event,
    robot_action_processor=my_custom_action_processor,      # 선택
    robot_observation_processor=my_custom_obs_processor,    # 선택
)

strategy = BaseStrategy(cfg.strategy)
try:
    strategy.setup(ctx)
    strategy.run(ctx)
finally:
    strategy.teardown(ctx)
```

역기구학 프로세서를 포함한 완전한 예제는 LeRobot 저장소의 `examples/so100_to_so100_EE/rollout.py`와 `examples/phone_to_so100/rollout.py`에서 확인할 수 있습니다.

---

## 문제 해결

> **카메라 키가 학습 때와 다릅니다**
>
> 롤아웃에서 가장 흔한 실패 원인입니다. `--robot.cameras`의 키 이름(`top`, `wrist` 등)은 **Policy를 학습시킨 데이터셋의 카메라 키와 정확히 같아야** 합니다. 이름이 다르면 Policy가 기대하는 입력이 채워지지 않아 엉뚱하게 움직이거나 오류가 납니다. Hub 모델 페이지의 `config.json`에서 학습 당시의 관측 키를 확인하세요.

> **`Base strategy does not record data` 오류**
>
> `--strategy.type=base`에 `--dataset.*` 옵션을 함께 준 경우입니다. Base는 기록하지 않는 전략입니다. 기록이 필요하면 `sentry`·`highlight`·`dagger`·`episodic`을 사용하세요.

> **`... strategy requires --dataset.repo_id to be set` 오류**
>
> 반대로 `sentry`·`highlight`·`dagger`·`episodic`은 `--dataset.repo_id`가 **필수**입니다.

> **`DAgger strategy requires --teleop.type to be set` 오류**
>
> DAgger는 사람이 개입할 Leader Arm이 반드시 필요합니다. `--teleop.type`·`--teleop.port`·`--teleop.id`를 추가하세요.

> **로봇이 너무 빠르거나 느리게 움직입니다**
>
> `--fps`를 학습 데이터셋의 fps와 맞추세요. 미세 조정이 필요하면 `--interpolation_multiplier`로 행동 사이를 보간할 수 있습니다.

> **명령이 끝나지 않습니다**
>
> `--duration`의 기본값은 `0`(무한)입니다. 값을 지정하거나 `ESC`·`Ctrl+C`로 종료하세요.

> **로봇 Port·Calibration 관련 오류**
>
> `--robot.id`는 [Calibration](/docs/a-ba/start-calibration)에서 사용한 값과 **동일해야** 합니다. LeRobot은 이 `id`로 Calibration 파일을 찾습니다. Port 인식 문제는 [USB 포트 고정 세팅](/docs/a-ba/setup-hardware-usbport)을 참고하세요.

---

## 다음 단계

`lerobot-rollout`으로 학습한 Policy를 로봇 위에서 굴려 보았습니다.

하지만 모델이 커질수록 추론 한 번에 걸리는 시간이 길어지고, 그동안 로봇은 멈춰 있게 됩니다. 이 **추론 지연을 감추는 접근**으로는 추론을 별도 Server로 떼어내 예측과 실행을 분리하는 **비동기 추론(Async Inference)**, 그리고 위에서 소개한 **실시간 청킹(RTC)** 두 가지가 있습니다.

<div class="card-grid">
  <a href="/docs/a-ba/policy-act" class="card">
    <h3>🤖 ACT</h3>
    <p>Action Chunking Transformer <br>모델을 학습합니다</p>
  </a>
  <a href="/docs/a-ba/policy-smolvla" class="card">
    <h3>🧠 SmolVLA</h3>
    <p>Vision-Language-Action <br>모델을 학습합니다</p>
  </a>
  <a href="/docs/a-ba/policy-groot" class="card">
    <h3>🚀 GR00T N1.7</h3>
    <p>NVIDIA의 대규모 기반 <br>모델을 활용합니다</p>
  </a>
</div>

---

## 참고 자료

- [Policy Deployment (lerobot-rollout) — LeRobot Documentation](https://huggingface.co/docs/lerobot/inference)
