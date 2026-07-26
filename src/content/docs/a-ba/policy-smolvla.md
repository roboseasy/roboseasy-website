---
title: "SmolVLA"
category: "a-ba"
group: "Policies"
order: 130
---

# SmolVLA

SmolVLA는 HuggingFace에서 개발한 경량화된 Vision-Language-Action (VLA) 모델입니다. 
<br>자연어 명령을 이해하고 로봇의 동작을 제어할 수 있는 강력한 기반 모델입니다.

> **팁** 💡`TIP`
> <br>**SmolVLA의 특징**
>
> - **경량화**: 450M 파라미터로 일반 GPU에서도 학습 가능
> - **다중 입력**: 카메라 뷰, 로봇 상태, 자연어 명령 동시 처리
> - **빠른 파인튜닝**: 적은 데이터로도 새로운 작업 학습 가능

> **팁** 💡`TIP`
> <br>**Jupyter Notebook 예제**
>
> **Colab에서 돌려보기:**
> - GPU가 없으신 분들을 위해 Colab에서 자신의 데이터셋을 올리고 
<br>학습을 진행한 뒤 모델을 허깅페이스에 업로드 하세요.
> - 그리고 자신의 Host PC에서 모델을 GPU 없이 실행할 수 있습니다.
>
> [SmolVLA 노트북 열기](https://github.com/roboseasy/notebook/blob/main/lerobot/training-smolvla.ipynb)

---

## 개요

SmolVLA는 로봇공학을 위해 특별히 설계된 기반 모델로, 다음 세 가지 입력을 통합하여 처리합니다:

1. **멀티뷰 카메라 입력**: 여러 각도의 시각 정보
2. **로봇 상태 정보**: 현재 센서모터 상태
3. **자연어 명령**: 수행할 작업에 대한 텍스트 지시

---

## 모델 아키텍처

SmolVLA는 다음과 같은 입력을 통합하여 처리합니다:

- **비전 입력**: 멀티뷰 카메라로부터의 이미지
- **로봇 상태**: 현재 관절 각도 및 센서 정보
- **언어 명령**: 자연어로 된 작업 지시
- **출력**: 로봇의 다음 동작 시퀀스

---

## 프로세스

### 1. 설치

```bash
cd lerobot

# 가상환경 활성화
conda activate lerobot
```


```bash
# SmolVLA 의존성 설치
pip install -e ".[smolvla]"
```

### 2. 데이터셋 준비

act 모델 학습을 위해 수집한 데이터셋과 달리, 
<br>` --dataset.single_task`에피소드를 명확한 자연어 명령 레이블링을 해주어야 합니다.

<div class="card-grid">
  <a href="#/dataset-record" class="card">
    <h3>📹 Record & Replay</h3>
    <p>SmolVLA 모델을 훈련시키기 위해 데이터셋을 수집합니다</p>
  </a>
</div>

> **팁** 💡`TIP`
> <br>**데이터 수집 권장사항**
>
> - 최소 50개 에피소드 (10분 분량, 에피소드 길이마다 다를 수 있음)
> - 일관된 속도로 부드럽게 동작
> - 다양한 물체 위치와 상황 포함
> - **명확한 자연어 명령 레이블링**

### 학습 환경 설정
학습을 위해서는 몇 가지 환경을 설정해주어야 합니다. 먼저, 학습의 결과물인 모델을 허깅페이스에 업로드하기 위해 허깅페이스에 로그인해줍니다:

```bash
hf auth login
```

다음은 학습할 모델에 대한 환경 변수를 설정해주어야 합니다:

```bash
export HF_USER="roboseasy" 
export TASK_NAME="pick_and_place" 
export TASK_DESCRIPTION="Pick a ball and place"
```


### 3. 파인튜닝

act 모델과 달리 사전 학습된 모델을 load해서 파인튜닝하기 때문에, 사전 학습된 모델이 필요합니다.

해당 위치에 사전 학습된 모델이 없다면, 코드에서 자동으로 허깅페이스의 사전 학습된 모델을 다운로드 합니다.

<!-- tabs:start -->

#### **기본 설정**

```bash
# SmolVLA 모델 학습 기본 설정
lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_smolvla \
  --policy.type=smolvla \
  --policy.pretrained_path=lerobot/smolvla_base \
  --policy.device=cuda \
  --job_name=smolvla_so101  \
  --output_dir=outputs/train/so101/smolvla/${TASK_NAME}
```

#### **추가 설정**

```bash
# 추가 설정
lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_smolvla \
  --policy.type=smolvla \
  --policy.pretrained_path=lerobot/smolvla_base \
  --policy.device=cuda \
  --job_name=smolvla_so101  \
  --output_dir=outputs/train/so101/smolvla/${TASK_NAME} \
  --steps=50_000 \
  --save_checkpoint=true \
  --save_freq=10_000 \
  --batch_size=8 \
  --num_workers=8 \
  --wandb.enable=true
```

#### **학습 재개**

```bash
# 학습 재개
lerobot-train \
  --config_path=outputs/train/so101/smolvla/${TASK_NAME}/checkpoints/last/pretrained_model/train_config.json \
  --resume=true
```

<!-- tabs:end -->

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
  --policy.path=${HF_USER}/${TASK_NAME}_smolvla \
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

---
### 5. 추론 및 실행

추론(Inference)은 학습된 정책을 로봇 위에서 실제로 구동하는 과정입니다. v0.6.0부터는 로보시지가 따로 작성했던 추론 코드 대신, LeRobot이 공식 제공하는 **`lerobot-rollout`** 명령어를 사용합니다.

`lerobot-rollout`은 `--strategy.type` 옵션으로 실행 방식을 선택합니다.

| 전략 | 설명 |
|------|------|
| `base` | 데이터 기록 없이 정책만 연속 실행 (데모·빠른 확인용) |
| `episodic` | 에피소드 단위로 기록 (기존 `lerobot-record` 평가 방식과 동일) |
| `sentry` | 연속 기록 + 주기적 Hub 업로드 (대규모 평가용) |

데모나 빠른 확인에는 `base` 전략을 사용합니다. 이 전략은 **데이터셋을 저장하지 않으며**, 에피소드 시간에 구애받지 않습니다. 실행 시간은 `--duration`(초)으로 지정하고, `0`이면 무한 실행합니다.

```bash
lerobot-rollout \
  --strategy.type=base \
  --policy.path=${HF_USER}/${TASK_NAME}_smolvla \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
  --task="${TASK_DESCRIPTION}" \
  --duration=0 \
  --display_data=true
```

> **팁** 💡`TIP`
> <br>**느린 VLA 모델은 `--inference.type=rtc`**
> <br>SmolVLA처럼 추론 지연이 큰 VLA 모델은 `--inference.type=rtc`(Real-Time Chunking) 옵션을 함께 주면 백그라운드에서 액션 청크를 미리 계산해 끊김 없이 부드럽게 동작합니다.

```bash
lerobot-rollout \
  --strategy.type=base \
  --inference.type=rtc \
  --policy.path=${HF_USER}/${TASK_NAME}_smolvla \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
  --task="${TASK_DESCRIPTION}" \
  --duration=0 \
  --display_data=true
```



---

## ACT와의 비교

| 특징 | SmolVLA | ACT |
|------|---------|-----|
| 자연어 명령 | ✅ 지원 | ❌ 미지원 |
| 파라미터 수 | 450M | ~100M |
| 학습 시간 | 더 김 | 빠름 |
| 일반화 능력 | 높음 | 보통 |
| 메모리 사용량 | 높음 | 낮음 |

---


## 문제 해결

### 일반적인 이슈

> **메모리 부족**
>
> **해결책**:
> - 배치 크기 감소
> - Gradient accumulation 사용
> - Mixed precision training 활성화

> **낮은 명령 이해도**
>
> **해결책**:
> - 더 다양한 자연어 표현으로 데이터 증강
> - Instruction template 일관성 유지
> - 파인튜닝 스텝 증가

---

## 추가 리소스

- [SmolVLA 논문](https://huggingface.co/papers/smolvla)
- [HuggingFace 모델 허브](https://huggingface.co/lerobot/smolvla_base)
- [공식 문서](https://huggingface.co/docs/lerobot/main/en/smolvla)
- [예제 노트북](https://github.com/huggingface/notebooks/blob/main/lerobot/smolvla_examples.ipynb)

---
