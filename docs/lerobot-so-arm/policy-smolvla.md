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
  --save_freq=5_000 \
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


기본으로 제공되는 평가 및 실행 코드는 기본적으로 record 코드와 같습니다.

따라서 평가 에피소드를 실행하면 해당 에피소드는 데이터셋 record와 같이 저장됩니다.

이때, 코드 자체에서 훈련 데이터셋과 평가 데이터셋을 구분하기 위해, 

반드시 `--dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \` 이 옵션에서 `eval_` 을 붙여줘야 합니다.

그렇지 않으면, 오류가 발생합니다.

또한, 만약 매 에피소드 별로 끊어지고 저장되는게 싫다면 에피소드 타임을 아주 길게 하면 됩니다.

```bash
export HF_USER="roboseasy" 
export TASK_NAME="pick_and_place" 
export TASK_DESCRIPTION="Pick a ball and place"
```

<!-- tabs:start -->

#### **기본 설정**

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
  --dataset.single_task=${TASK_NAME} \
  --dataset.num_episodes=50 \
  --dataset.episode_time_s=15 \
  --dataset.reset_time_s=1 \
  --display_data=true
```

#### **시간 늘리기**

```bash
# 평가 및 실행 시간 설정을 길게 해서 끊기지 않고 반복 작업 수행
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
  --dataset.single_task=${TASK_NAME} \
  --dataset.num_episodes=1 \
  --dataset.episode_time_s=10000 \
  --dataset.reset_time_s=1 \
  --display_data=true
```

<!-- tabs:end -->

---
### 4. 추론 및 실행

모델을 추론하기 위해서 `lerobot-record` 명령어를 사용하게 되면 옵션으로 정해준 episode_time_s 안에 수행하지 못하면 마지막 포지션에서 멈추어 연속적인 데모를 보여주지 못합니다. 

또한, 매 에피소드 별로 데이터셋을 저장하기 때문에 실행할 때마다 저장된 데이터셋을 삭제해주어야하는 번거로움이 있습니다.

이러한 문제들을 해결하기 위해 로보시지는 추론 코드를 따로 작성하여 사용하였습니다.

해당 코드는 매 에피소드 별로 데이터셋을 저장하지 않으며, 에피소드 시간에 구애받지 않습니다.

아래와 같은 명령어를 통해 연속적인 추론을 실행할 수 있습니다:

```bash
lerobot-inference \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
  }' \
  --policy.path=${HF_USER}/smolvla_${TASK_NAME} \
  --instruction="${TASK_DESCRIPTION}" \
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
