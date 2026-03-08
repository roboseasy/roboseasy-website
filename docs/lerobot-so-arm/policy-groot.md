# GR00T N1.5

GR00T N1.5는 NVIDIA에서 개발한 3B 파라미터 규모의 범용 로봇 기반 모델입니다. 
<br>자연어 명령을 이해하고 다양한 로봇 플랫폼에서 복잡한 조작 작업을 수행할 수 있습니다.

> **팁** 💡`TIP`
> <br>**GR00T N1.5의 특징**
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
> [GR00T N1.5 노트북 열기](https://github.com/roboseasy/notebook/blob/main/lerobot/training-groot.ipynb)

---

## 개요

GR00T N1.5는 NVIDIA의 Project GR00T에서 개발된 최신 로봇 기반 모델로, 다음과 같은 입력을 통합 처리합니다:

1. **멀티뷰 카메라**: 여러 각도의 시각 정보
2. **로봇 상태**: 현재 관절 각도 및 센서 정보
3. **자연어 명령**: 수행할 작업에 대한 텍스트 지시
4. **출력**: 로봇의 다음 동작 시퀀스

---

## 모델 아키텍처

GR00T N1.5는 Vision-Language-Action (VLA) 아키텍처를 기반으로:

- **비전 인코더**: 멀티뷰 이미지 처리
- **언어 인코더**: 자연어 명령 이해
- **상태 인코더**: 로봇 상태 정보 처리
- **액션 디코더**: 다음 동작 시퀀스 생성

---

## 프로세스

```bash
cd lerobot

# 가상환경 활성화
conda activate lerobot
```

### 1. 환경 설정

현재 GR00T N1.5는 내부 작동을 위해 Flash Attention이 필요합니다.

1.  [설치 가이드](https://notebooklm.google.com/notebook/installation)의 환경 설정을 따르십시오. 
	- **[주의]** 이 단계에서 `lerobot`을 설치하지 마십시오.
2.  다음을 실행하여 [Flash Attention](https://github.com/Dao-AILab/flash-attention)을 설치하십시오:

```bash

# Check <https://pytorch.org/get-started/locally/> for your system

pip install "torch>=2.2.1,<2.8.0" "torchvision>=0.21.0,<0.23.0" # --index-url <https://download.pytorch.org/whl/cu1XX>
pip install ninja "packaging>=24.2,<26.0" # flash attention dependencies
pip install "flash-attn>=2.5.9,<3.0.0" --no-build-isolation

python -c "import flash_attn; print(f'Flash Attention {flash_attn.__version__} imported successfully')"

```

1.  [설치 가이드](https://notebooklm.google.com/notebook/installation)에 따라 LeRobot을 설치합니다.
2.  다음 명령어를 실행하여 GR00T N1.5 의존성을 설치합니다:

```bash
pip install lerobot[groot]
```

---

### 2. 데이터셋 준비

GR00T N1.5는 SmolVLA와 유사하게 자연어 명령 레이블링이 필요합니다.

<div class="card-grid">
  <a href="#/software-record-replay" class="card">
    <h3>📹 Record & Replay</h3>
    <p>GROOT N1.5 모델을 훈련시키기 위해 데이터셋을 수집합니다</p>
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

GR00T N1.5는 사전 학습된 기반 모델을 파인튜닝하여 사용합니다.

```bash
export HF_USER="roboseasy" 
export TASK_NAME="pick_and_place" 
export TASK_DESCRIPTION="Pick a ball and place"
```

<!-- tabs:start -->

#### **기본 설정 (Single GPU)**

```bash
# GR00T N1.5 모델 학습 기본 설정
lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_groot \
  --policy.path=nvidia/groot-n1.5-base \
  --policy.device=cuda \
  --job_name=groot_so101 \
  --output_dir=outputs/train/groot_so101/${TASK_NAME} \
  --wandb.enable=true \
  --rename_map='{"observation.images.top": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}'
```

#### **추가 설정 (커스터마이징)**

```bash
# 추가 설정
lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_groot \
  --policy.path=nvidia/groot-n1.5-base \
  --policy.device=cuda \
  --policy.freeze_vision_encoder=false \
  --job_name=groot_so101 \
  --output_dir=outputs/train/groot_so101/${TASK_NAME} \
  --wandb.enable=true \
  --batch_size=4 \
  --steps=50_000 \
  --save_checkpoint=true \
  --save_freq=5_000 \
  --learning_rate=1e-5 \
  --rename_map='{"observation.images.top": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}'
```


#### **학습 재개**

```bash
# 학습 재개
lerobot-train \
  --config_path=outputs/train/groot_so101/${TASK_NAME}/checkpoints/last/pretrained_model/train_config.json \
  --resume=true
```

<!-- tabs:end -->

---

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
  --policy.repo_id=${HF_USER}/${TASK_NAME}_act \
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

#### **시간 늘리기**

```bash
# 평가 및 실행 시간 설정을 길게 해서 끊기지 않고 반복 작업 수행
lerobot-record \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_act \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
  --dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \
  --dataset.single_task=${TASK_NAME} \
  --dataset.num_episodes=1 \
  --dataset.episode_time_s=10000 \
  --dataset.reset_time_s=1 \
  --display_data=true
```

<!-- tabs:end -->

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
  --policy.path=${HF_USER}/${TASK_NAME}_act \
  --instruction="${TASK_DESCRIPTION}" \
  --display_data=true
```


---

## 성능 최적화

### 학습 팁

> **팁** 💡`TIP`
> <br>**학습 시간 및 리소스**
>
> - **A100 (80GB)**: ~12시간 (50,000 steps, batch_size=8)
> - **A100 4-GPU**: ~4시간 (50,000 steps, batch_size=32)
> - **RTX 4090**: ~20시간 (batch_size=4)
> - **메모리**: 최소 24GB VRAM 권장

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

### 하이퍼파라미터 튜닝

```bash
# 더 나은 성능을 위한 하이퍼파라미터 조정
lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_groot \
  --policy.path=nvidia/groot-n1.5-base \
  --policy.device=cuda \
  --job_name=groot_so101_tuned \
  --output_dir=outputs/train/groot_so101_tuned/${TASK_NAME} \
  --wandb.enable=true \
  --batch_size=8 \
  --steps=100_000 \
  --learning_rate=5e-6 \
  --warmup_steps=1000 \
  --weight_decay=0.01 \
  --gradient_clip_norm=1.0 \
  --save_checkpoint=true \
  --save_freq=5_000
```

---

## SmolVLA와의 비교

| 특징 | GR00T N1.5 | SmolVLA |
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

로컬 컴퓨터에 강력한 GPU가 없는 경우, [GR00T N1.5 학습 노트북](https://colab.research.google.com/github/huggingface/notebooks/blob/main/lerobot/training-smolvla.ipynb)을 따라 Google Colab을 활용하여 모델을 학습할 수 있습니다.

### 파인 튜닝 옵션

다음을 실행하여 파인 튜닝 옵션에 대한 전체 개요를 볼 수 있습니다:

```bash
lerobot-train --help
```

## GR00T N1.5 평가

학습이 완료되면 `lerobot-record` 명령어를 사용하여 학습된 GR00T N1.5 모델의 정책을 평가할 수 있습니다. 이렇게 하면 추론이 실행되고 평가 에피소드가 기록됩니다:

```bash
lerobot-record \
  --robot.type=so101_follower  \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{
  front: {type: opencv, index_or_path: 0, width: 640, height: 480, fps: 25},
  side: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 25},
  }' \
  --policy.path=${HF_USER}/${TASK_NAME}_groot15 \
  --dataset.repo_id=${HF_USER}/${TASK_NAME}_eval \
  --dataset.single_task=${TASK_NAME}
  --dataset.num_episodes=10 \
  --dataset.episode_time_s=15 \
  --dataset.reset_time_s=1 \
  --display_data=true \
```

## GR00T N1.5 추론

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
  --policy.path=${HF_USER}/${TASK_NAME}_grootn15 \
  --instruction="${TASK_DESCRIPTION}" \
  --display_data=true
```

## **Performance Results**

### **Libero Benchmark Results**

[!참고] Libero 사용 지침을 따르십시오: [Libero](https://notebooklm.google.com/libero)

GR00T는 Libero 벤치마크 제품군에서 강력한 성능을 입증했습니다. LeRobot 구현을 비교하고 테스트하기 위해, 우리는 GR00T N1.5 모델을 Libero 데이터세트에서 3만(30k) 스텝 동안 미세 조정하고 그 결과를 GR00T 참조 결과와 비교했습니다.

| 벤치마크 | LeRobot 구현 | GR00T 참조 |
| -- | -- | -- |
| Libero Spatial | 82.0% | 92.0% |
| Libero Object | 99.0% | 92.0% |
| Libero Long | 82.0% | 76.0% |
| 평균 | 87.0% | 87.0% |

이러한 결과는 다양한 로봇 조작 작업 전반에 걸친 GR00T의 강력한 일반화 능력을 입증합니다. 이 결과를 재현하려면 [Libero](https://huggingface.co/docs/lerobot/libero) 섹션의 지침을 따를 수 있습니다.

---

## 추가 리소스

- [GR00T 공식 페이지](https://developer.nvidia.com/project-groot)
- [GR00T N1.5 논문](https://arxiv.org/abs/groot-n1.5)
- [HuggingFace 모델 허브](https://huggingface.co/nvidia/groot-n1.5-base)
- [NVIDIA Isaac Lab](https://developer.nvidia.com/isaac-lab)
- [LeRobot GR00T 문서](https://huggingface.co/docs/lerobot/main/en/groot)

---

*GR00T N1.5는 NVIDIA에서 지속적으로 개선하고 있습니다. 최신 업데이트는 [NVIDIA Project GR00T](https://developer.nvidia.com/project-groot)를 확인하세요.*
