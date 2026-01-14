# ACT (Action Chunking with Transformers)

ACT는 복잡한 로봇 조작 작업을 위한 혁신적인 모방 학습 알고리즘입니다. 
<br>단 10분의 인간 시연만으로 80-90%의 성공률을 달성할 수 있습니다.

> **팁** 💡`TIP`
> <br>**ACT의 특징**
>
> - **Action Chunking**: 단일 액션이 아닌 액션 시퀀스 예측
> - **Temporal Ensembling**: 부드러운 동작을 위한 시간적 앙상블
> - **빠른 학습**:
>   - RTX 3090에서 5시간 내 학습 완료
>   - A100에서 1.5시간 내 학습 완료
> - **SO-ARM101 성공 사례 다수**: 저가의 하드웨어에서도 간단한 작업이 완수된 사례가 많음

?> **필자 의견**
<br>**ACT 모델을 사용해본 개인적인 경험을 공유합니다**
<br>- Pre-Trained 모델이 아니라 바닥부터 학습해서 보통 사용합니다.
<br>- 아주 작고 효율적이라서 간단한 Task를 학습하고 구동할 수 있습니다.
<br>- 꽤 잘 되는데… **Overfit이 심합니다**. 조명이나 물체 등 환경이 변하면 안 되는 경우가 많습니다.
<br>- 그래도 처음 시작하기엔 아주 좋은 모델입니다! 👍

> **팁** 💡`TIP`
> <br>**Jupyter Notebook 예제**
>
> **Colab에서 돌려보기:**
> - GPU가 없으신 분들을 위해 Colab에서 자신의 데이터셋을 올리고 
<br>학습을 진행한 뒤 모델을 허깅페이스에 업로드 하세요.
> - 그리고 자신의 Host PC에서 모델을 GPU 없이 실행할 수 있습니다.
>
> [ACT 노트북 열기](https://colab.research.google.com/drive/1yTr0jfilDxL_kzf0froSZ6d9Whz4Ya5M)

---

## 개요

ACT는 Stanford에서 개발한 알고리즘으로, 다음과 같은 핵심 혁신을 통해 정밀한 로봇 조작을 가능하게 합니다.

## 핵심 개념

### Action Chunking

전통적인 방법이 한 번에 하나의 액션만 예측하는 것과 달리, ACT는 미래의 k개 액션을 한 번에 예측합니다.

### Temporal Ensembling

부드러운 로봇 동작을 위해 겹치는 액션 청크들을 가중 평균합니다.

> **정보** ℹ️ `INFO`
> <br>**작동 원리**
>
> 시간 t에서 여러 정책 쿼리의 예측을 결합:
> - 시간 (t-2)에서 예측한 액션
> - 시간 (t-1)에서 예측한 액션
> - 현재 시간 t에서 예측한 액션
>
> 이들을 exponential weighting으로 평균하여 최종 액션 결정

---

## 실습 영상

실습 영상을 함께 같이 보면서 같이 진행해 보세요!

<iframe width="100%" height="400" src="https://www.youtube.com/embed/ILz0K2XjZF8" title="ACT 학습과 실행 가이드 영상" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

---

## 프로세스

### 1. 데이터셋 준비

Record & Replay 페이지를 참고하여 데이터셋을 수집하세요.

<div class="card-grid">
  <a href="#/software-record-replay" class="card">
    <h3>📹 Record & Replay</h3>
    <p>ACT 모델을 훈련시키기 위해 데이터셋을 수집합니다</p>
  </a>
</div>

> **팁** 💡`TIP`
> <br>**데이터 수집 권장사항**
>
> - 최소 50개 에피소드 (10분 분량, 에피소드 길이마다 다를 수 있음)
> - 일관된 속도로 부드럽게 동작
> - 다양한 물체 위치와 상황 포함

### 2. 학습

```bash
export TASK_NAME="pick_and_place"
export HF_USER="Your_HuggingFace_Account"
```

#### 기본 설정

```bash
# ACT 모델 학습 기본 설정
lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.type=act \
  --policy.device=cuda \
  --job_name=act_so101 \
  --output_dir=outputs/train/act_so101/${TASK_NAME} \
  --wandb.enable=true
```

#### 추가 설정

```bash
# 추가 설정
lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.type=act \
  --policy.device=cuda \
  --job_name=act_so101 \
  --output_dir=outputs/train/act_so101/${TASK_NAME} \
  --wandb.enable=true \
  --batch_size=8 \
  --steps=100_000 \
  --save_checkpoint=true \
  --save_freq=10_000
```

#### 학습 재개

```bash
# 학습 재개
lerobot-train \
  --config_path=outputs/train/act_so101/${TASK_NAME}/checkpoints/last/pretrained_model/train_config.json \
  --resume=true
```

#### Accelerate (Multi-GPU)

```bash
# Accelerate로 multi-gpu를 사용하여 학습
accelerate launch \
  --num_processes=2 \
  --multi_gpu \
  $(which lerobot-train) \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.type=act \
  --job_name=act_so101 \
  --output_dir=outputs/train/act_so101/${TASK_NAME} \
  --wandb.enable=true \
  --batch_size=32 \
  --steps=100_000 \
  --save_checkpoint=true \
  --save_freq=10_000
```

### 3. 평가 및 실행

기본으로 제공되는 평가 및 실행 코드는 기본적으로 record 코드와 같습니다.

따라서 평가 에피소드를 실행하면 해당 에피소드는 데이터셋 record와 같이 저장됩니다.

이때, 코드 자체에서 훈련 데이터셋과 평가 데이터셋을 구분하기 위해, 

반드시 `--dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \` 이 옵션에서 `eval_` 을 붙여줘야 합니다.

그렇지 않으면, 오류가 발생합니다.

또한, 만약 매 에피소드 별로 끊어지고 저장되는게 싫다면 에피소드 타임을 아주 길게 하면 됩니다.

```bash
export TASK_NAME="pick_and_place"
export HF_USER="Your_HuggingFace_Account"
```

#### 기본 설정

```bash
# 평가 및 실행 기본 설정
lerobot-record \
  --policy.path=${HF_USER}/${TASK_NAME} \
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

#### 시간 늘리기

```bash
# 평가 및 실행 시간 설정을 길게 해서 끊기지 않고 반복 작업 수행
lerobot-record \
    --policy.path=${HF_USER}/${TASK_NAME} \
    --robot.type=so101_follower \
    --robot.port=/dev/so101_follower \
    --robot.id=follower \
    --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
    --dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \
    --dataset.single_task=eval_${TASK_NAME} \
    --dataset.episode_time_s=100_000 \
    --dataset.reset_time_s=1 \
    --display_data=true
```

### 4. 추론 및 실행

async_inference에 필요한 의존성을 설치하세요:

```bash
pip install --upgrade pip setuptools wheel
pip install -e ".[async]"
```

이 명령은 다음 패키지들을 설치합니다:
- `grpcio==1.73.1`
- `protobuf==6.31.0`
- `matplotlib>=3.10.3,<4.0.0`

```bash
export TASK_NAME="pick_and_place"
export HF_USER="Your_HuggingFace_Account"
```

#### 4.1. Policy Server 실행 (GPU가 있는 서버)

```bash
python -m lerobot.async_inference.policy_server \
    --host=127.0.0.1 \
    --port=8080 \
    --fps=25 \
    --inference_latency=0.033 \
    --obs_queue_timeout=1
```

#### 4.2. Robot Client 실행 (로봇이 연결된 PC)

robot pc에서 어떤 모델을 사용하고 어떤 gpu를 사용할것인지 지정해줍니다.

```bash
python -m lerobot.async_inference.robot_client \
    --robot.type=so101_follower \
    --robot.port=/dev/so101_follower \
    --robot.id=follower \
    --robot.cameras='{
        top: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 25},
        wrist: {type: opencv, index_or_path: 4, width: 640, height: 480, fps: 25},
    }' \
    --task=${TASK_NAME} \
    --server_address=127.0.0.1:8080 \
    --policy_type=act \
    --pretrained_name_or_path=${HF_USER}/${TASK_NAME} \
    --policy_device=cuda \
    --actions_per_chunk=100 \
    --chunk_size_threshold=0.5 \
    --aggregate_fn_name=weighted_average \
    --debug_visualize_queue_size=True
```

**참고**
- 서버와 클라이언트가 같은 PC라면 둘 다 같은 환경에 설치하면 됩니다. 
- 만약 다른 PC라면 각각에 `pip install -e ".[async]"` 를 실행해야 합니다.

---

## SmolVLA와의 비교

| 특징 | ACT | SmolVLA |
|---------|---------|---------|
| 자연어 명령 | ❌ 미지원 | ✅ 지원 |
| 파라미터 수 | ~80M | 450M |
| 학습 속도 | 빠름 | 느림 |
| 정밀도 | 매우 높음 | 높음 |
| 작업 특화성 | 단일 작업 | 다중 작업 |

---

## 실제 성능

### 검증된 작업들 (ALOHA 기준)

- **배터리 삽입**: 90% 성공률
- **벨크로 부착**: 85% 성공률
- **물체 집어 담기**: 95% 성공률
- **정밀 조립**: 80% 성공률

> **성공** ✨ `SUCCESS` 
> <br>**ACT 활용 시나리오**
>
> - **정밀 조작**: 밀리미터 단위 정확도가 필요한 작업
> - **빠른 학습**: 제한된 데이터로 높은 성능 달성
> - **실시간 제어**: 100Hz 제어 루프 지원

---

## 추가 리소스

- [ACT 원본 논문](https://arxiv.org/abs/2304.13469)
- [Stanford ALOHA 프로젝트](https://tonyzhaozh.github.io/aloha/)
- [구현 세부사항](https://github.com/tonyzhaozh/act)
- [LeRobot ACT 예제](https://github.com/huggingface/notebooks/blob/main/lerobot/training-act.ipynb)

---

*ACT는 Stanford의 Tony Z. Zhao 등이 개발했으며, LeRobot에서 최적화된 구현을 제공합니다.*
