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

### 1. 설치

> **경고** ⚠️ `WARN`
> <br>**Flash Attention 필수**
>
> GR00T N1.5는 Flash Attention이 **필수**입니다.
>
> **중요**: 반드시 아래 순서대로 설치해야 합니다:
> 1. PyTorch 설치
> 2. Flash Attention 설치
> 3. LeRobot 설치

#### PyTorch 설치

```bash
# CUDA 12.1 기준
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

#### Flash Attention 설치

```bash
# Flash Attention 빌드 (시간이 오래 걸릴 수 있음)
pip install flash-attn --no-build-isolation
```

> **팁** 💡`TIP`
> <br>**Flash Attention 설치 팁**
>
> - 빌드 시간: 약 10-30분 소요
> - CUDA 11.8 이상 필요
> - gcc 7 이상 필요
> - 빌드 실패 시 CUDA 버전 확인

#### LeRobot 설치

```bash
# GR00T N1.5 의존성 설치
uv pip install -e ".[groot]"
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
export TASK_NAME="pick_and_place"
export HF_USER="Your_HuggingFace_Account"
```

#### 기본 설정 (Single GPU)

```bash
# GR00T N1.5 모델 학습 기본 설정
CUDA_VISIBLE_DEVICES=0 lerobot-train \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_groot \
  --policy.path=nvidia/groot-n1.5-base \
  --policy.device=cuda \
  --job_name=groot_so101 \
  --output_dir=outputs/train/groot_so101/${TASK_NAME} \
  --wandb.enable=true \
  --rename_map='{"observation.images.top": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}'
```

#### 추가 설정 (커스터마이징)

```bash
# 추가 설정
CUDA_VISIBLE_DEVICES=0 lerobot-train \
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

> **경고** ⚠️ `WARN`
> <br>**메모리 주의**
>
> - GR00T N1.5는 3B 파라미터로 메모리 사용량이 큽니다
> - 배치 크기 4 기준 약 24GB VRAM 필요
> - 메모리 부족 시 배치 크기를 2로 줄이세요

#### Multi-GPU 학습

```bash
# Accelerate로 multi-gpu 학습
accelerate launch \
  --num_processes=4 \
  --multi_gpu \
  $(which lerobot-train) \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_groot \
  --policy.path=nvidia/groot-n1.5-base \
  --job_name=groot_so101 \
  --output_dir=outputs/train/groot_so101/${TASK_NAME} \
  --wandb.enable=true \
  --batch_size=16 \
  --steps=50_000 \
  --save_checkpoint=true \
  --save_freq=5_000 \
  --rename_map='{"observation.images.top": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}'
```

#### 학습 재개

```bash
# 학습 재개
CUDA_VISIBLE_DEVICES=0 lerobot-train \
  --config_path=outputs/train/groot_so101/${TASK_NAME}/checkpoints/last/pretrained_model/train_config.json \
  --resume=true
```

---

### 4. 평가 및 실행

#### 단일 팔 로봇

```bash
# 평가 및 실행 기본 설정
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{\
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},\
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},\
  }' \
  --policy.path=${HF_USER}/groot_${TASK_NAME} \
  --dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \
  --dataset.single_task="Pick up the red pen and place it in the pencil case" \
  --dataset.num_episodes=10 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=5 \
  --display_data=true
```

#### 양팔 로봇 (Bimanual)

```bash
# 양팔 로봇 실행
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower_left \
  --robot.id=follower_left \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower_right \
  --robot.id=follower_right \
  --robot.cameras='{\
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},\
      left_wrist: {type: opencv, index_or_path: /dev/cam_wrist_left, width: 640, height: 480, fps: 25},\
      right_wrist: {type: opencv, index_or_path: /dev/cam_wrist_right, width: 640, height: 480, fps: 25},\
  }' \
  --policy.path=${HF_USER}/groot_${TASK_NAME}_bimanual \
  --dataset.repo_id=${HF_USER}/eval_${TASK_NAME}_bimanual \
  --dataset.single_task="Pick up the box with both hands and place it on the shelf" \
  --dataset.num_episodes=10 \
  --dataset.episode_time_s=30 \
  --dataset.reset_time_s=5 \
  --display_data=true
```

#### 연속 실행 모드

```bash
# 에피소드 타임을 길게 설정하여 연속 실행
lerobot-record \
  --robot.type=so101_follower \
  --robot.port=/dev/so101_follower \
  --robot.id=follower \
  --robot.cameras='{\
      top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},\
      wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},\
  }' \
  --policy.path=${HF_USER}/groot_${TASK_NAME} \
  --dataset.repo_id=${HF_USER}/eval_${TASK_NAME} \
  --dataset.single_task="Continuously organize objects on the table" \
  --dataset.num_episodes=1 \
  --dataset.episode_time_s=10000 \
  --dataset.reset_time_s=1 \
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

## 실제 성능

### Libero 벤치마크 결과

> **성공** ✨ `SUCCESS` 
> <br>**GR00T N1.5 성능 (NVIDIA 공식 결과)**
>
> - **Libero-Spatial**: 92% 성공률
> - **Libero-Object**: 88% 성공률
> - **Libero-Goal**: 85% 성공률
> - **Libero-Long**: 78% 성공률 (10단계 이상 작업)

### 복잡한 명령 처리 예시

```python
# 조건부 작업
"If there is a red block, pick it up and place it in the basket. If not, pick up the blue one instead."

# 순차적 다단계 작업
"First, pick up the cup and fill it with water. Then, place it on the tray and move the tray to the table."

# 상대적 위치 및 공간 추론
"Stack the blocks in order of size, with the largest at the bottom and smallest on top."

# 물체 속성 기반 작업
"Find the heaviest object on the table and move it to the left corner."
```

---

## 문제 해결

### 일반적인 이슈

> **Flash Attention 설치 실패**
>
> **증상**: `ModuleNotFoundError: No module named 'flash_attn'`
>
> **해결책**:
> ```bash
> # CUDA 버전 확인
> nvcc --version
>
> # gcc 버전 확인 (7 이상 필요)
> gcc --version
>
> # Flash Attention 재설치
> pip uninstall flash-attn
> pip install flash-attn --no-build-isolation
> ```

> **CUDA Out of Memory**
>
> **해결책**:
> - 배치 크기를 4 → 2로 감소
> - Gradient checkpointing 활성화
> - Mixed precision training 사용 (자동 활성화됨)
> - 더 적은 GPU 사용 또는 더 큰 GPU로 업그레이드

> **낮은 명령 이해도**
>
> **해결책**:
> - 더 다양한 자연어 표현으로 데이터 증강
> - Instruction template 일관성 유지
> - 파인튜닝 스텝을 50,000 → 100,000으로 증가
> - Learning rate를 1e-5 → 5e-6으로 감소

> **모델 다운로드 실패**
>
> **해결책**:
> ```bash
> # HuggingFace 토큰 설정
> huggingface-cli login
>
> # 모델 수동 다운로드
> huggingface-cli download nvidia/groot-n1.5-base
> ```

---

## 추가 리소스

- [GR00T 공식 페이지](https://developer.nvidia.com/project-groot)
- [GR00T N1.5 논문](https://arxiv.org/abs/groot-n1.5)
- [HuggingFace 모델 허브](https://huggingface.co/nvidia/groot-n1.5-base)
- [NVIDIA Isaac Lab](https://developer.nvidia.com/isaac-lab)
- [LeRobot GR00T 문서](https://huggingface.co/docs/lerobot/main/en/groot)

---

*GR00T N1.5는 NVIDIA에서 지속적으로 개선하고 있습니다. 최신 업데이트는 [NVIDIA Project GR00T](https://developer.nvidia.com/project-groot)를 확인하세요.*
