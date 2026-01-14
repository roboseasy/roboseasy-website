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
# SmolVLA 의존성 설치
uv pip install -e ".[smolvla]"
```

### 2. 데이터셋 준비

act 모델 학습을 위해 수집한 데이터셋과 달리, 
<br>` --dataset.single_task`에피소드를 명확한 자연어 명령 레이블링을 해주어야 합니다.

<div class="card-grid">
  <a href="#/software-record-replay" class="card">
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

### 3. 파인튜닝

act 모델과 달리 사전 학습된 모델을 load해서 파인튜닝하기 때문에, 사전 학습된 모델이 필요합니다.

해당 위치에 사전 학습된 모델이 없다면, 코드에서 자동으로 허깅페이스의 사전 학습된 모델을 다운로드 합니다.

```bash
export TASK_NAME="pick_and_place"
export HF_USER="Your_HuggingFace_Account"
```

#### 기본 설정

```bash
# SmolVLA 모델 학습 기본 설정
CUDA_VISIBLE_DEVICES=0 lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME}_aug \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_smolvla \
  --policy.path=roboseasy/smolvla_base \
  --policy.device=cuda \
  --job_name=smolvla_so101 \
  --output_dir=outputs/train/smolvla_so101/${TASK_NAME} \
  --wandb.enable=true \
  --rename_map='{"observation.images.top": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}'
```

#### 추가 설정

```bash
# 추가 설정
CUDA_VISIBLE_DEVICES=0 lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_smolvla \
  --policy.path=roboseasy/smolvla_base \
  --policy.device=cuda \
  --policy.freeze_vision_encoder=false \
  --job_name=smolvla_so101 \
  --output_dir=outputs/train/smolvla_so101/${TASK_NAME} \
  --wandb.enable=true \
  --batch_size=8 \
  --steps=100_000 \
  --save_checkpoint=true \
  --save_freq=10_000 \
  --rename_map='{"observation.images.top": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}'
```

#### 학습 재개

```bash
# 학습 재개
CUDA_VISIBLE_DEVICES=0 lerobot-train \
  --config_path=outputs/train/smolvla_so101/${TASK_NAME}/checkpoints/last/pretrained_model/train_config.json \
  --resume=true
```

### 4. 평가 및 실행

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
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --policy.path=${HF_USER}/smolvla_${TASK_NAME} \
  --dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \
  --dataset.single_task="Pick up the red pen and place it in the pencil case" \
  --dataset.num_episodes=10 \
  --dataset.episode_time_s=15 \
  --dataset.reset_time_s=1 \
  --display_data=true
```

#### 시간 늘리기

```bash
# 평가 및 실행 시간 설정을 길게 해서 끊기지 않고 반복 작업 수행
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      camera1: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 25},
      camera2: {type: opencv, index_or_path: 4, width: 640, height: 480, fps: 25},
  }' \
  --policy.path=${HF_USER}/smolvla_${TASK_NAME} \
  --dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \
  --dataset.single_task="Pick up the red pen and place it in the pencil case" \
  --dataset.num_episodes=1 \
  --dataset.episode_time_s=10000 \
  --dataset.reset_time_s=1 \
  --display_data=true
```

---

## 성능 최적화

### 학습 팁

> **팁** 💡`TIP`
> <br>**학습 시간 단축**
>
> - **A100 GPU**: ~4시간 (20,000 steps)
> - **RTX 3090**: ~8시간
> - **배치 크기**: GPU 메모리에 따라 조정

### 데이터 증강

```python
# 다양한 자연어 표현 사용
instructions = [
    "Pick up the red block",
    "Grab the red cube",
    "Get the red object and put it in the basket",
    "Move the red block to the container"
]
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

## 실제 활용 예시

### 복잡한 명령 처리

```python
# 조건부 작업
"If there is a red block, pick it up, otherwise pick the blue one"

# 순차적 작업
"First pick up the cup, then place it on the shelf"

# 상대적 위치
"Move the object to the left of the basket"
```

> **성공** ✨ `SUCCESS` 
> <br>**SmolVLA 활용 시나리오**
>
> - **다양한 물체 조작**: 자연어로 유연한 작업 지시
> - **멀티태스크 로봇**: 하나의 모델로 여러 작업 수행
> - **인간-로봇 협업**: 직관적인 음성/텍스트 명령

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

*SmolVLA는 지속적으로 개선되고 있습니다. 최신 업데이트는 [HuggingFace LeRobot](https://github.com/huggingface/lerobot) 저장소를 확인하세요.*
