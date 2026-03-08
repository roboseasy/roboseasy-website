# Dataset Replay

데이터셋 재생하기 

## 데이터(에피소드) 재생하기 (Replay an episode)

기록된 데이터가 올바른지 확인하려면 로봇에서 재생해 볼 수 있습니다.

수집된 데이터를 사용하여 로봇이 동일한 작업을 재생하도록 할 수 있습니다.

### 가상환경 활성화

```bash
cd lerobot

# 가상환경 활성화
conda activate lerobot
```

### CLI 사용법

```bash

export HF_USER="roboseasy" 
export TASK_NAME="pick_and_place" 
export TASK_DESCRIPTION="Pick a ball and place"

```

```bash
lerobot-replay \
    --robot.type=so101_follower \
    --robot.port=/dev/so101_follower \
    --robot.id=follower \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.episode=0
```

**주요 Replay 옵션 설명**
-   `--dataset.repo_id`: 재생할 데이터셋 이름
-   `--dataset.episode`: 재생할 특정 에피소드 번호 (0부터 시작)


> **Replay 주의사항:**
> 
> -   재생 전 로봇 주변 환경이 녹화 시와 유사한지 확인하세요
> -   로봇이 장애물과 충돌하지 않도록 안전한 공간을 확보하세요
> -   비상시 Ctrl+C로 즉시 중단할 수 있도록 준비하세요



다음 시간은 구축한 데이터셋으로 직접 로봇의 움직임을 replay 하는것이 아니라 rerun을 통해 영상으로 확인해보겠습니다.


## 다음 단계

Record & Replay 설정이 완료되었다면, 이제 Policy 모델을 학습하고 실행해보세요:

<div class="card-grid">
  <a href="#/policy-act" class="card">
    <h3>🤖 ACT</h3>
    <p>Action Chunking Transformer 모델을 <br>학습합니다</p>
  </a>
  <a href="#/policy-smolvla" class="card">
    <h3>🧠 SmolVLA</h3>
    <p>Vision-Language-Action <br>모델을 학습합니다</p>
  </a>
  <a href="#/policy-groot" class="card">
    <h3>🚀 GR00T N1.5</h3>
    <p>NVIDIA의 대규모 기반 <br>모델을 활용합니다</p>
  </a>
</div>
