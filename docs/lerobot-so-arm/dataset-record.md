# Dataset Record

데이터셋 기록(수집)하기

## 개요

Record 는 로봇 학습의 핵심 과정으로, 
<br>**텔레오퍼레이션을 통해 데이터를 수집(Record)** 하는 기능입니다.

데이터셋 구축은 로봇 학습의 핵심 과정으로, 텔레오퍼레이션을 통해 데이터(궤적 + 영상)를 수집(Record) 합니다.

> **정보** ℹ️ `INFO`
>
> Record 과정을 통해 로봇은 인간의 시연을 학습하여 동일한 작업을 자율적으로 수행할 수 있게 됩니다.

### 전체 워크플로우

1. **Calibration**: Leader Arm과 Follower Arm 캘리브레이션
2. **Record**: 텔레오퍼레이션으로 작업 데이터 수집
3. **Replay**: 수집된 데이터로 로봇 동작 재생
4. **Training**: 수집된 데이터로 AI 모델 학습

---

## 실습 영상

실습 영상을 함께 같이 보면서 같이 진행해 보세요!

<iframe width="100%" height="400" src="https://www.youtube.com/embed/Ape2Qg_waGA" title="데이터 수집과 재생 영상" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

---

## 준비 사항

`Record` 를 시작하기 전에 다음 사항들을 확인해주세요:

### 하드웨어 준비

- SO-ARM Leader Arm과 Follower Arm이 캘리브레이션 완료된 상태
- USB 포트 연결 상태 확인 (`/dev/so101_leader`, `/dev/so101_follower`)
- 카메라 연결 (선택사항, 시각 데이터 수집용)
- 충분한 작업 공간 확보

### 소프트웨어 준비

#### 0. 가상환경 활성화

```bash
cd lerobot

# 가상환경 활성화
conda activate lerobot
```

#### 1. HuggingFace 계정 설정

먼저 HuggingFace 계정 설정과 환경 변수를 구성합니다:

```bash
# 1. HuggingFace CLI 토큰으로 로그인
hf auth login --add-to-git-credential --token YOUR_TOKEN_HERE


# 2. 로그인 확인 및 환경 변수 설정
HF_USER=$(hf auth whoami | head -n 1)
echo $HF_USER
# 로그인이 성공했다면 본인의 HuggingFace 사용자명이 출력됩니다.
```

> **정보** ℹ️ `INFO`
> <br>**토큰 생성 방법**
>
> 1. [HuggingFace 토큰 설정 페이지](https://huggingface.co/settings/tokens)에서 새 토큰 생성
> 2. 권한은 "Write" 선택 (데이터셋 업로드용)
> 3. 생성된 토큰을 위 명령어에 사용

#### 2. 영구 환경 변수 설정 (선택사항)

매번 설정하지 않도록 `.bashrc` 파일에 추가:

```bash
# ~/.bashrc 맨 아래 추가
export HF_USER=$(python - <<'PY'
from huggingface_hub import whoami
print(whoami().get("name", ""))
PY
)

# 변경사항 적용
source ~/.bashrc

# 설정 확인
echo $HF_USER
```

> **팁** 💡`TIP`
> <br>**환경 변수 설정 팁**
>
> - `HF_USER` 환경 변수를 설정하면 모든 명령어에서 `${HF_USER}`를 사용할 수 있습니다
> - 한 번만 설정하면 모든 LeRobot 명령어에서 자동으로 적용됩니다
> - 팀으로 작업할 때 각자의 계정이 자동으로 적용되어 편리합니다

#### 3. Rerun 시각화 도구 설치

LeRobot은 데이터 수집과 시각화를 위해 **Rerun**을 사용합니다. 데이터 수집 중 실시간 모니터링(`--display_data=true`)과 수집 완료 후 데이터 분석 모두 Rerun을 통해 이루어집니다.

```bash
pip install rerun-sdk
```

> **Rerun이란?**
>
> Rerun은 로봇공학, 컴퓨터 비전, 시뮬레이션 데이터를 위한 강력한 시각화 도구입니다. 
> <br>시계열 데이터, 이미지, 3D 포인트 클라우드 등을 인터랙티브하게 탐색할 수 있으며, 
> <br>LeRobot의 모든 시각화 기능의 기반이 됩니다.

> **팁** 💡`TIP`
> <br>**Rerun 특징**
>
> 1. 카메라 영상
>    - 모든 카메라 피드가 실시간으로 표시됨
>    - 프레임별로 이미지 탐색 가능
>    - 압축된 비디오에서 디코딩된 이미지 확인
> 2. 로봇 액션 (Action)
>    - 각 관절의 목표 위치를 시계열 그래프로 표시
>    - 프레임별 액션 값 확인
>    - 액션 궤적 분석
> 3. 로봇 상태 (State)
>    - 각 관절의 현재 위치 (관절 공간)
>    - 센서 데이터
>    - 엔드 이펙터 위치
> 4. 추가 정보
>    - `done`: 에피소드 종료 플래그
>    - `reward`: 보상 값 (있는 경우)
>    - `next.success`: 성공 여부 (있는 경우)

---

## Record (데이터 수집)

원격조작(Teleoperation)이 익숙해졌다면 데이터셋을 기록할 차례입니다

고품질의 인공지능 모델을 만들기 위해서는 무턱대고 기록하기보다 아래와 같은 체계적인 계획을 세우는 것이 중요합니다.

1. **Task 정의:** 로봇이 수행할 구체적인 목표를 정합니다. (예: 물건 들어 옮기기, 물체 박스에 넣기 등)
2. **궤적 최적화 및 연습:** 정의한 Task를 가장 일관되고 효율적으로 수행할 수 있는 이동 경로(궤적)을 고민하고 충분히 연습합니다.
3. **수행 시간 측정:** 일관된 동작으로 Task를 한 번 완료하는 데 소요되는 평균 시간을 확인합니다.
4. **에피소드 간 준비 시간 확인:** 한 번의 Task를 마친 뒤, 다음 에피소드(데이터 수집)를 시작하기 위해 로봇과 환경을 초기 상태로 되돌리는 데 걸리는 시간을 체크합니다.

이번 시간에는 인터넷 클라우드 업로드 없이, 아주 간단하게 에피소드 별 데이터셋을 쌓아보겠습니다.

하나의 Task를 위해 최소 약 50개의 에피소드를 쌓아야 하지만, 우선 이번 시간에는 10개의 에피소드만 쌓아보겠습니다.

시작하기 전 터미널에 아래와 같이 정보를 각각 입력하여 설정합니다. 
- '허깅페이스 유저 이름'
- '쌓을 데이터셋의 Task 이름 (=데이터셋 레포 이름)' 
- '쌓을 데이터셋의 Task 설명'

### 가상환경 활성화

```bash
cd lerobot

# 가상환경 활성화
conda activate lerobot
```


### CLI 사용법

다음 데이터셋을 수집하는 코드입니다.


따로 HuggingFace 자동 업로드를 비활성화하지 않았다면,
데이터 수집이 완료 후 곧바로 HuggingFace에서 자신의 데이터셋 레파지토리에
데이터셋이 자동으로 업로드 됩니다.

```bash
export HF_USER="roboseasy" 
export TASK_NAME="pick_and_place" 
export TASK_DESCRIPTION="Pick a ball and place"
```


<!-- tabs:start -->

#### **자동 업로드 비활성화**

```bash
# 데이터 수집 후 허깅페이스에 자동 업로드 비활성화
lerobot-record \
    --teleop.type=so101_leader \
    --teleop.port=/dev/so101_leader \
    --teleop.id=leader \
    --robot.type=so101_follower \
    --robot.port=/dev/so101_follower \
    --robot.id=follower \
    --robot.cameras='{
        top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
        wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
    --dataset.single_task=${TASK_NAME} \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.num_episodes=10 \
    --dataset.episode_time_s=15 \
    --dataset.reset_time_s=3 \
    --display_data=true \
    --dataset.push_to_hub=false
```

#### **자동 업로드 활성화**

```bash
# 데이터 수집 후 허깅페이스에 자동 업로드 활성화
lerobot-record \
    --teleop.type=so101_leader \
    --teleop.port=/dev/so101_leader \
    --teleop.id=leader \
    --robot.type=so101_follower \
    --robot.port=/dev/so101_follower \
    --robot.id=follower \
    --robot.cameras='{
        top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
        wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
    --dataset.single_task=${TASK_NAME} \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.num_episodes=10 \
    --dataset.episode_time_s=15 \
    --dataset.reset_time_s=3 \
    --display_data=true \
    --dataset.push_to_hub=true
```

<!-- tabs:end -->

**주요 Record 옵션 설명**

1.  로봇 설정
    -   `--robot.type=so101_follower`: 팔로워 로봇 타입
    -   `--robot.port=/dev/so101_follower`: 팔로워 로봇 포트
    -   `--robot.id=follower`: 팔로워 로봇 고유 ID
2.  텔레오퍼레이션 설정
    -   `--teleop.type=so101_leader`: 리더 로봇 타입
    -   `--teleop.port=/dev/so101_leader`: 리더 로봇 포트
    -   `--teleop.id=leader`: 리더 로봇 고유 ID
3.  데이터셋 설정
    -   `--dataset.repo_id`: HuggingFace Hub 데이터셋 이름 (`username/dataset_name`)
    -   `--dataset.single_task`: 작업에 대한 명확한 설명
    -   `--dataset.fps`: 데이터 수집 주파수 (기본값: 30Hz)
    -   `--dataset.num_episodes=10`: 수집할 에피소드 수
    -   `--dataset.episode_time_s=15`: 각 에피소드 녹화 시간 (기본값: 60초)
    -   `--dataset.reset_time_s=3`: 에피소드 간 리셋 시간 (기본값: 60초)
4.  추가 옵션
    -   `--display_data=true`: 실시간 데이터 시각화 (기본값: false)
    -  `--dataset.video=true`: 비디오 인코딩 활성화 (기본값: true)
    -   `--dataset.push_to_hub=true`: HuggingFace Hub에 자동 업로드 (기본값: true)

### Record 과정

1. **명령어 실행**
   명령어를 실행하면 다음과 같은 메시지가 표시됩니다:

   ```plaintext
   Recording episode 0
   Press 'q' to quit early, 'r' to rerecord episode
   ```

2. **데이터 수집 수행**
   - Leader Arm을 조작하여 원하는 작업을 수행
   - Follower Arm이 실시간으로 동작을 따라함
   - 카메라가 시각 정보를 동시에 기록

3. **에피소드 완료**
   - 설정된 시간이 지나거나 수동으로 중단
   - 환경을 리셋할 시간 제공
   - 다음 에피소드 자동 시작

4. **데이터 저장**
   각 에피소드 완료 후 다음 위치에 저장:

   ```plaintext
   ~/.cache/huggingface/datasets/${HF_USER}/${TASK_NAME}/
   ```

> **팁** 💡`TIP`
> <br>**효과적인 데이터 수집 팁**
>
> - 작업을 천천히, 부드럽게 수행하세요
> - 실패한 시도도 포함하여 다양성을 확보하세요
> - 동일한 작업을 다양한 각도와 방법으로 반복하세요
> - 카메라 시야에 중요한 객체들이 잘 보이도록 하세요

### 로컬 저장 후 나중에 허깅페이스 수동 업로드

로컬에서 작업 완료 후 선택적으로 HuggingFace Hub에 업로드할 수 있습니다:

```bash
# Python을 사용한 수동 업로드
python -c "
from lerobot.datasets.lerobot_dataset import LeRobotDataset
dataset = LeRobotDataset('local_dataset/so101_pick_place', root='./my_datasets')
dataset.push_to_hub('${HF_USER}/so101_pick_place', private=False)
print('Upload completed!')
"
```

---

## 데이터셋 추가로 쌓기 (Resume)

위 과정을 통해 10개의 에피소드를 수행하며, 데이터셋을 성공적으로 구축하셨을 겁니다. 
어느 정도 감을 잡으셨다면, 이제 해당 Task의 데이터셋을 총 50개까지 늘려보겠습니다.

이때 단순히 CLI 명령어에서 `--dataset.num_episodes=50`으로 수정하여 실행하면 될까요? 아쉽게도 위에서 배운 CLI에서 num_episodes 값을 바꿔 실행하면 아래와 같은 오류 로그가 발생합니다. 

오류 로그를 살펴보면, 이미 해당 repo_id로 데이터셋 이름이 있다고 뜹니다.
이 오류를 해결하는 가장 단순한 방법은 로컬 경로 (`~/.cache/huggingface/lerobot/roboseasy/pick_and_place_after_deletion`)에 저장된 기존 데이터셋을 삭제하고 처음부터 다시 50개를 수집하는 것입니다. 

하지만 지금까지 공들여 쌓은 데이터를 삭제하는 것은 매우 비효율적입니다. lerobot은 이러한 상황을 위해 기존 데이터에 이어서 새로운 에피소드를 추가할 수 있는 기능을 제공합니다. `--resume=true` 옵션을 추가하면, 아래와 같이 기존에 저장된 데이터셋 이후부터 학습 데이터를 이어서 쌓을 수 있습니다. 

### Resume 기본 사용법

5개를 추가로 수집하고 싶다면:

```bash
lerobot-record \
    --teleop.type=so101_leader \
    --teleop.port=/dev/so101_leader \
    --teleop.id=leader \
    --robot.type=so101_follower \
    --robot.port=/dev/so101_follower \
    --robot.id=follower \
    --robot.cameras='{
        top: {type: opencv, index_or_path: /dev/cam_top, width: 640, height: 480, fps: 25},
        wrist: {type: opencv, index_or_path: /dev/cam_wrist, width: 640, height: 480, fps: 25},
    }' \
    --dataset.single_task=${TASK_NAME} \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.num_episodes=10 \
    --dataset.episode_time_s=15 \
    --dataset.reset_time_s=3 \
    --display_data=true \
    --dataset.push_to_hub=false \
    --resume=true
```

> **경고** ⚠️ `WARN`
> <br>**Resume 사용 시 주의사항:**
>
> - `--dataset.num_episodes`는 **추가로 수집할** 에피소드 수를 입력합니다
> - 10개를 추가 수집하려면 `--dataset.num_episodes=10`로 설정
> - 모든 다른 설정(카메라, 태스크 등)은 기존과 동일하게 유지해야 합니다

### 키보드 단축키

> **정보** ℹ️ `INFO`
> <br>**데이터 수집 중 키보드 단축키**
>
> - **→ (오른쪽 화살표 키)**: 현재 에피소드를 조기 종료하고 다음 에피소드로 이동
> - **← (왼쪽 화살표 키)**: 현재 에피소드를 취소하고 다시 기록
> - **ESC (Esc 키)**: 즉시 세션을 중단하고, 영상을 인코딩한 뒤 데이터셋을 업로드

### 데이터 수집 모범 사례

> **팁** 💡`TIP`
> <br>**효과적인 데이터 수집 팁:**
>
> - **일관된 환경**: 항상 동일한 조명과 배경에서 데이터 수집
> - **정확한 집기**: 항상 일정한 부분을 집어 일관성 유지
> - **카메라 고정**: 카메라 위치를 변경하지 말고 고정 유지
> - **다양성 확보**: 같은 작업이라도 다양한 각도와 방법으로 시도
> - **실패 포함**: 완벽한 성공뿐만 아니라 실패 케이스도 포함하여 학습 효과 향상

---

## **HuggingFace LeRobot이 공식 제공하는 데이터 수집을 위한 팁!!**

데이터 기록에 익숙해졌다면 학습을 위한 더 큰 데이터셋을 만들 수 있습니다. 시작하기 좋은 작업은 물체를 여러 위치에서 집어 보관함에 넣는 것입니다. 최소 50개의 에피소드를 기록하고, 위치당 10개의 에피소드를 녹화할 것을 권장합니다. 기록하는 동안 카메라는 고정된 상태를 유지하고 일관된 집기 동작을 유지하세요. 또한 조작하는 물체가 카메라에 잘 보이는지 확인해야 합니다. 좋은 기준은 카메라 이미지만 보고도 스스로 작업을 수행할 수 있어야 한다는 것입니다.

다음 섹션에서는 신경망을 훈련하게 됩니다. 신뢰할 수 있는 집기 성능을 달성한 후에는 데이터 수집 중에 추가적인 집기 위치, 다른 집기 기술, 카메라 위치 변경과 같은 더 많은 변동성을 도입하기 시작할 수 있습니다.

급격하게 많은 변동성을 부여할 경우 결과 도출에 방해가 될 수 있으므로 피하도록 합니다.

이 중요한 주제에 대해 더 자세히 알아보고 싶다면, 무엇이 좋은 데이터셋을 만드는지에 대해 저희가 작성한 블로그 포스트를 확인하실 수 있습니다.

---


## 일반적인 오류 해결

### FileExistsError 해결

다음과 같은 오류가 발생할 때:

```plaintext
FileExistsError: [Errno 17] File exists: '/home/sw/.cache/huggingface/lerobot/swp4065/grab_sock'
```

**해결 방법:**

```bash
# 캐시 디렉토리에서 해당 데이터셋 폴더 삭제
rm -rf ~/.cache/huggingface/lerobot/${HF_USER}/grab_sock

# 또는 전체 캐시 정리
rm -rf ~/.cache/huggingface/lerobot/
```

또는 resume 옵션으로 이어서 데이터셋 수집

---

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
