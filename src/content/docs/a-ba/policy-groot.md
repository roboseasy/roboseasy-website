---
title: "GR00T N1.7"
category: "a-ba"
group: "Policies"
order: 140
---

# GR00T N1.7

GR00T N1.7은 NVIDIA에서 개발한 3B 파라미터 규모의 범용 로봇 기반 모델입니다. 
<br>자연어 명령을 이해하고 다양한 로봇 플랫폼에서 복잡한 조작 작업을 수행할 수 있습니다.

> **경고** ⚠️ `WARN`
> <br>**GR00T N1.5 → N1.7 (Breaking Change)**
> <br>LeRobot v0.6.0부터 **GR00T N1.5 지원이 제거되고 N1.7만 지원**합니다. N1.5 체크포인트·설정은 더 이상 로드되지 않습니다.
> <br>계속 N1.5를 사용하려면 `pip install 'lerobot==0.5.1'`로 마지막 지원 버전을 고정하고, 최신 버전을 쓰려면 기반 모델 [`nvidia/GR00T-N1.7-3B`](https://huggingface.co/nvidia/GR00T-N1.7-3B)로 마이그레이션하세요.

> **팁** 💡`TIP`
> <br>**GR00T N1.7의 특징**
>
> - **대규모 모델**: 3B 파라미터로 강력한 일반화 능력
> - **다중 로봇 지원**: 단일 팔, 양팔 로봇 모두 지원
> - **자연어 제어**: 복잡한 명령 이해 및 실행
> - **전이 학습**: 사전 학습된 모델에서 빠른 파인튜닝

> **팁** 💡`TIP`
> <br>**Jupyter Notebook 예제**
>
> **Colab에서 돌려보기:**
> - GPU가 없으신 분들을 위해 Colab에서 자신의 데이터셋을 올리고 <br>학습을 진행한 뒤 모델을 허깅페이스에 업로드 하세요.
> - 그리고 자신의 Host PC에서 모델을 GPU 없이 실행할 수 있습니다.
>
> [GR00T N1.7 노트북 열기](https://github.com/roboseasy/notebook/blob/main/lerobot/training-groot.ipynb)

---

## 개요

GR00T N1.7은 NVIDIA의 Project GR00T에서 개발된 최신 로봇 기반 모델로, 다음과 같은 입력을 통합 처리합니다:

1. **멀티뷰 카메라**: 여러 각도의 시각 정보
2. **로봇 상태**: 현재 관절 각도 및 센서 정보
3. **자연어 명령**: 수행할 작업에 대한 텍스트 지시
4. **출력**: 로봇의 다음 동작 시퀀스

---

## 모델 아키텍처

GR00T N1.7은 Vision-Language-Action (VLA) 아키텍처를 기반으로, Cosmos-Reason2/Qwen3-VL 백본과 flow matching 액션 트랜스포머를 사용합니다:

- **비전 인코더**: 멀티뷰 이미지 처리
- **언어 인코더**: 자연어 명령 이해
- **상태 인코더**: 로봇 상태(proprioception) 정보 처리
- **액션 디코더**: flow matching으로 다음 동작 청크 생성

---

## 프로세스

```bash
cd lerobot

# 가상환경 활성화
conda activate lerobot
```

### 1. 환경 설정

GR00T는 NVIDIA GPU 환경을 전제로 합니다. LeRobot을 `groot` 추가 기능과 함께 설치합니다:

```bash
# PyPI 설치
pip install "lerobot[groot]"

# 소스 설치인 경우
# pip install -e ".[groot]"
```

---

### 2. 데이터셋 준비

GR00T N1.7은 SmolVLA와 유사하게 자연어 명령 레이블링이 필요합니다.

<div class="card-grid">
  <a href="#/software-record-replay" class="card">
    <h3>📹 Record & Replay</h3>
    <p>GR00T N1.7 모델을 훈련시키기 위해 데이터셋을 수집합니다</p>
  </a>
</div>

> **팁** 💡`TIP`
> <br>**데이터 수집 권장사항**
>
> - 최소 100개 에피소드 (대규모 모델이므로 더 많은 데이터 권장)
> - 일관된 속도로 부드럽게 동작
> - 다양한 물체 위치와 상황 포함
> - **명확한 자연어 명령 레이블링**
> - 다양한 표현 방식으로 같은 작업 기록

---

### 3. 파인튜닝

GR00T N1.7은 사전 학습된 기반 모델(`nvidia/GR00T-N1.7-3B`)을 파인튜닝하여 사용합니다.

먼저 학습 의존성을 설치하고 로그인합니다:

```bash
pip install "lerobot[training]"

hf auth login
wandb login
```

```bash
export HF_USER="roboseasy"
export TASK_NAME="pick_and_place"
export TASK_DESCRIPTION="Pick a ball and place"
export REPO_ID="${HF_USER}/${TASK_NAME}_grootn1.7"          # 학습 후 업로드될 모델
export OUTPUT_DIR="outputs/train/so101/grootn1.7/${TASK_NAME}"
```

<!-- tabs:start -->

#### **기본 설정 (SO-101)**

```bash
# GR00T N1.7 파인튜닝 (SO-101은 new_embodiment 태그 사용)
lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --dataset.image_transforms.enable=true \
  --policy.type=groot \
  --policy.device=cuda \
  --policy.base_model_path=nvidia/GR00T-N1.7-3B \
  --policy.embodiment_tag=new_embodiment \
  --policy.chunk_size=16 \
  --policy.n_action_steps=16 \
  --policy.use_relative_actions=true \
  --policy.relative_exclude_joints='["gripper"]' \
  --policy.use_bf16=true \
  --policy.push_to_hub=true \
  --policy.repo_id=${REPO_ID} \
  --seed=42 \
  --batch_size=64 \
  --steps=20000 \
  --save_checkpoint=true \
  --save_freq=5000 \
  --use_policy_training_preset=true \
  --env_eval_freq=0 \
  --eval_steps=0 \
  --log_freq=10 \
  --output_dir=${OUTPUT_DIR} \
  --job_name=${TASK_NAME} \
  --wandb.enable=true \
  --wandb.disable_artifact=true
```

#### **학습 재개**

```bash
# 학습 재개
lerobot-train \
  --config_path=${OUTPUT_DIR}/checkpoints/last/pretrained_model/train_config.json \
  --resume=true
```

<!-- tabs:end -->

> **팁** 💡`TIP`
> <br>**주요 옵션**
> <br>- `--policy.base_model_path=nvidia/GR00T-N1.7-3B`: N1.7 기반 모델
> <br>- `--policy.embodiment_tag=new_embodiment`: SO-101 같은 신규 임베디먼트에 사용
> <br>- `--policy.use_relative_actions=true` + `--policy.relative_exclude_joints='["gripper"]'`: 그리퍼를 제외한 상대 액션 학습
> <br>- `--policy.use_bf16=true`: bf16으로 메모리 절약

---

### 4. 평가 및 실행

v0.6.0부터 학습된 정책의 평가·실행은 `lerobot-record`가 아니라 **`lerobot-rollout`** 명령어로 수행합니다.

평가 에피소드를 데이터셋으로 남기려면 `--strategy.type=episodic` 전략을 사용합니다. 이 전략은 기존 `lerobot-record`처럼 에피소드 단위로 기록하고, 에피소드 사이에 리셋 구간(`--dataset.reset_time_s`)을 둡니다.

이때 훈련 데이터셋과 평가 데이터셋을 구분하기 위해 `--dataset.repo_id`에 `eval_` 접두사를 붙이는 것을 권장합니다.

```bash
export HF_USER="roboseasy"
export TASK_NAME="pick_and_place"
export TASK_DESCRIPTION="Pick a ball and place"
```

```bash
# 평가 (에피소드 기록) - episodic 전략
lerobot-rollout \
  --strategy.type=episodic \
  --policy.path=${HF_USER}/${TASK_NAME}_grootn1.7 \
  --policy.base_model_path=nvidia/GR00T-N1.7-3B \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
  --dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \
  --dataset.single_task=${TASK_NAME} \
  --dataset.num_episodes=50 \
  --dataset.episode_time_s=15 \
  --dataset.reset_time_s=1 \
  --display_data=true
```

> **팁** 💡`TIP`
> <br>기록 없이 정책을 끊김 없이 연속 실행하려면 아래 **추론 및 실행**의 `base` 전략을 사용하세요.

### 5. 추론 및 실행

추론(Inference)은 학습된 정책을 로봇 위에서 실제로 구동하는 과정입니다. v0.6.0부터는 로보시지가 따로 작성했던 추론 코드 대신, LeRobot이 공식 제공하는 **`lerobot-rollout`** 명령어를 사용합니다.

`lerobot-rollout`은 `--strategy.type` 옵션으로 실행 방식을 선택합니다.

| 전략 | 설명 |
|------|------|
| `base` | 데이터 기록 없이 정책만 연속 실행 (데모·빠른 확인용) |
| `episodic` | 에피소드 단위로 기록 (기존 `lerobot-record` 평가 방식과 동일) |
| `sentry` | 연속 기록 + 주기적 Hub 업로드 (대규모 평가용) |

데모나 빠른 확인에는 `base` 전략을 사용합니다. 이 전략은 **데이터셋을 저장하지 않으며**, 에피소드 시간에 구애받지 않습니다. 실행 시간은 `--duration`(초)으로 지정하고, `0`이면 무한 실행합니다.

GR00T N1.7은 대규모 VLA 모델이라 추론 지연이 큽니다. `--inference.type=rtc`(Real-Time Chunking)를 함께 주면 백그라운드에서 액션 청크를 미리 계산해 끊김 없이 부드럽게 동작합니다.

```bash
lerobot-rollout \
  --strategy.type=base \
  --policy.path=${HF_USER}/${TASK_NAME}_grootn1.7 \
  --policy.base_model_path=nvidia/GR00T-N1.7-3B \
  --policy.n_action_steps=8 \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
  --task="${TASK_DESCRIPTION}" \
  --duration=0 \
  --device=cuda \
  --display_data=true \
  --inference.type=rtc \
  --inference.rtc.execution_horizon=8 \
  --inference.queue_threshold=0
```

> **경고** ⚠️ `WARN`
> <br>안정적인 추론을 위해 `--inference.rtc` 사용 시 `--inference.queue_threshold` 값은 **5를 넘지 않도록** 설정하세요. 추론이 불안정하면 `--inference.rtc.enabled=False`로 끌 수 있습니다.

---

## 성능 최적화

### 학습 팁

> **팁** 💡`TIP`
> <br>**학습 시간 및 리소스 (대략치)**
>
> - **A100 (80GB)**: batch_size가 클수록 빠르지만 VRAM 사용량 증가
> - **RTX 4090**: batch_size를 줄여서 학습 (VRAM 여유에 맞게 조정)
> - **메모리**: 최소 24GB VRAM 권장 (`--policy.use_bf16=true`로 메모리 절약)

### 데이터 증강

```python
# 다양한 자연어 표현 사용
instructions = [
    "Pick up the red block and place it in the basket",
    "Grab the red cube and put it into the container",
    "Move the red object to the basket",
    "Take the red block and drop it in the bin",
    "Get the crimson cube and place it inside the basket"
]
```

---

## SmolVLA와의 비교

| 특징 | GR00T N1.7 | SmolVLA |
|------|------------|---------|
| 파라미터 수 | 3B | 450M |
| 자연어 명령 | ✅ 지원 | ✅ 지원 |
| 학습 시간 | 매우 김 | 김 |
| 일반화 능력 | 매우 높음 | 높음 |
| 메모리 사용량 | 매우 높음 | 높음 |
| 다중 로봇 지원 | ✅ 강력 | ⚠️ 제한적 |
| 복잡한 명령 | ✅ 우수 | ✅ 보통 |

---

### Google Colab을 사용하여 훈련하기

로컬 컴퓨터에 강력한 GPU가 없는 경우, [GR00T N1.7 학습 노트북](https://colab.research.google.com/github/huggingface/notebooks/blob/main/lerobot/training-smolvla.ipynb)을 따라 Google Colab을 활용하여 모델을 학습할 수 있습니다.

### 파인 튜닝 옵션

다음을 실행하여 파인 튜닝 옵션에 대한 전체 개요를 볼 수 있습니다:

```bash
lerobot-train --help
```

## **Performance Results**

### **LIBERO Benchmark Results**

> **정보** ℹ️ `INFO`
> <br>LIBERO 설정은 [LeRobot LIBERO 가이드](https://huggingface.co/docs/lerobot/libero)를 먼저 따르세요.

GR00T N1.7은 LIBERO 벤치마크에서 강력한 성능을 보입니다. 아래는 LeRobot 통합 예비 결과입니다(suite당 `eval.n_episodes >= 50`):

| Suite | 성공률 |
| -- | -- |
| LIBERO Spatial | 91% |
| LIBERO Object | 81% |
| LIBERO Goal | 97% |
| LIBERO 10 (Long) | 84% |
| **평균** | **88.25%** |

시뮬레이션 평가는 `lerobot-eval`로 재현할 수 있습니다:

```bash
export MODEL_ID=your_trained_model_on_huggingface

lerobot-eval \
  --policy.type=groot \
  --policy.base_model_path=${MODEL_ID} \
  --policy.embodiment_tag=libero_sim \
  --env.type=libero \
  --env.task=libero_spatial \
  --eval.n_episodes=50
```

---

## 추가 리소스

- [GR00T 공식 페이지](https://developer.nvidia.com/project-groot)
- [GR00T N1.7 기반 모델 (HuggingFace)](https://huggingface.co/nvidia/GR00T-N1.7-3B)
- [NVIDIA Isaac GR00T](https://github.com/NVIDIA/Isaac-GR00T)
- [LeRobot GR00T 문서](https://huggingface.co/docs/lerobot/main/en/groot)

---

*GR00T N1.7은 NVIDIA에서 지속적으로 개선하고 있습니다. 최신 업데이트는 [NVIDIA Project GR00T](https://developer.nvidia.com/project-groot)를 확인하세요.*
