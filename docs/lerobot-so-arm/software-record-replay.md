# Record & Replay

## 개요

Record & Replay는 로봇 학습의 핵심 과정으로, 
<br>**텔레오퍼레이션을 통해 데이터를 수집(Record)** 하고 **수집된 데이터를 로봇이 재생(Replay)** 하는 기능입니다.

> **정보** ℹ️ `INFO`
>
> Record & Replay 과정을 통해 로봇은 인간의 시연을 학습하여 동일한 작업을 자율적으로 수행할 수 있게 됩니다.

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

Record & Replay를 시작하기 전에 다음 사항들을 확인해주세요:

### 하드웨어 준비

- SO-ARM Leader Arm과 Follower Arm이 캘리브레이션 완료된 상태
- USB 포트 연결 상태 확인 (`/dev/so101_leader`, `/dev/so101_follower`)
- 카메라 연결 (선택사항, 시각 데이터 수집용)
- 충분한 작업 공간 확보

### 소프트웨어 준비

#### 1. HuggingFace 계정 설정

먼저 HuggingFace 계정 설정과 환경 변수를 구성합니다:

```bash
# 1. HuggingFace CLI 토큰으로 로그인
hf auth login --add-to-git-credential --token YOUR_TOKEN_HERE
# 예시: hf auth login --add-to-git-credential --token YOUR_HUGGINGFACE_TOKEN_HERE

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

### 카메라를 포함한 데이터 수집

다음 데이터셋을 수집하는 코드입니다.

```bash
export TASK_NAME="pick_and_place"
export HF_USER="your_username"
```

따로 HuggingFace 자동 업로드를 비활성화하지 않았다면,
데이터 수집이 완료 후 곧바로 HuggingFace에서 자신의 데이터셋 레파지토리에
데이터셋이 자동으로 업로드 됩니다.

`--dataset.push_to_hub=false` 를 추가하면, 로컬 저장후, HuggingFace에 자동으로 업로드하지 않습니다.

### 자동 업로드

```bash
# 데이터 수집 후 허깅페이스에 자동 업로드
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
    --dataset.num_episodes=45 \
    --dataset.episode_time_s=15 \
    --dataset.reset_time_s=3 \
    --display_data=true
```

### 자동 업로드 비활성화

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
        top: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 25},
        wrist: {type: opencv, index_or_path: 4, width: 640, height: 480, fps: 25},
    }' \
    --dataset.single_task=${TASK_NAME} \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.num_episodes=45 \
    --dataset.episode_time_s=15 \
    --dataset.reset_time_s=3 \
    --display_data=true \
    --dataset.push_to_hub=false
```

> **팁** 💡`TIP`
> <br>**주요 Record 옵션 설명**
>
> 1. 로봇 설정
>    - `--robot.type=so101_follower`: 팔로워 로봇 타입
>    - `--robot.port=/dev/so101_follower`: 팔로워 로봇 포트
>    - `--robot.id=follower`: 팔로워 로봇 고유 ID
> 2. 텔레오퍼레이션 설정
>    - `--teleop.type=so101_leader`: 리더 로봇 타입
>    - `--teleop.port=/dev/so101_leader`: 리더 로봇 포트
>    - `--teleop.id=leader`: 리더 로봇 고유 ID
> 3. 데이터셋 설정
>    - `--dataset.repo_id`: HuggingFace Hub 데이터셋 이름 (`username/dataset_name`)
>    - `--dataset.num_episodes`: 수집할 에피소드 수
>    - `--dataset.single_task`: 작업에 대한 명확한 설명
>    - `--dataset.fps`: 데이터 수집 주파수 (기본값: 30Hz)
>    - `--dataset.episode_time_s`: 각 에피소드 녹화 시간 (기본값: 60초)
>    - `--dataset.reset_time_s`: 에피소드 간 리셋 시간 (기본값: 60초)
> 4. 추가 옵션
>    - `--display_data=true`: 실시간 데이터 시각화
>    - `--dataset.push_to_hub=true`: HuggingFace Hub에 자동 업로드 (기본값)
>    - `--dataset.video=true`: 비디오 인코딩 활성화 (기본값)

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

## Replay (재생)

수집된 데이터를 사용하여 로봇이 동일한 작업을 재생하도록 할 수 있습니다.

### 특정 에피소드 Replay

```bash
lerobot-replay \
    --robot.type=so101_follower \
    --robot.port=/dev/so101_follower \
    --robot.id=follower \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.episode=0
```

> **팁** 💡`TIP`
> <br>**주요 Replay 옵션 설명**
>
> - `--dataset.repo_id`: 재생할 데이터셋 이름
> - `--dataset.episode`: 재생할 특정 에피소드 번호 (0부터 시작)
> - `--dataset.fps`: 재생 속도 조절 (기본값: 원본 데이터의 FPS)
> - `--dataset.root`: 로컬 데이터셋 경로 (선택사항)
> - `--play_sounds=true`: 음성 안내 활성화 (기본값)

> **경고** ⚠️ `WARN`
> <br>**Replay 주의사항**
>
> - 재생 전 로봇 주변 환경이 녹화 시와 유사한지 확인하세요
> - 로봇이 장애물과 충돌하지 않도록 안전한 공간을 확보하세요
> - 비상시 Ctrl+C로 즉시 중단할 수 있도록 준비하세요

---

## Resume (데이터셋 추가)

데이터 수집 중 불가피한 상황으로 중단되거나, 기존 데이터셋에 더 많은 에피소드를 추가하고 싶을 때 `--resume=true` 옵션을 사용할 수 있습니다.

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
        top: {type: opencv, index_or_path: 2, width: 640, height: 480, fps: 25},
        wrist: {type: opencv, index_or_path: 4, width: 640, height: 480, fps: 25},
    }' \
    --dataset.single_task=${TASK_NAME} \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.num_episodes=5 \
    --dataset.episode_time_s=15 \
    --dataset.reset_time_s=3 \
    --display_data=true \
    --resume=true
```

> **경고** ⚠️ `WARN`
> <br>**Resume 사용 시 주의사항:**
>
> - `--dataset.num_episodes`는 **추가로 수집할** 에피소드 수를 입력합니다
> - 5개를 추가 수집하려면 `--dataset.num_episodes=5`로 설정
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

## Visualization (데이터셋 확인)

수집된 데이터를 시각적으로 확인하는 것은 데이터 품질 검증과 문제 진단에 매우 중요합니다.
<br>허깅페이스 웹페이지를 통해 확인할 수도 있고, 
<br>앞서 설치한 **Rerun**을 사용하여 수집 완료 후 데이터를 상세히 분석할 수 있습니다.

### 방법 1: HuggingFace 웹 플랫폼 사용하기

[HuggingFace 웹 플랫폼](https://huggingface.co/spaces/lerobot/visualize_dataset)

여기서 데이터셋을 업로드한 허깅페이스 레파지토리 ID를 입력합니다.

### 방법 2: 로컬 시각화 (기본)

가장 간단한 방법으로, 로컬 머신에서 즉시 Rerun 뷰어를 띄워 데이터를 확인합니다

```bash
lerobot-dataset-viz \
    --repo-id=${HF_USER}/${TASK_NAME} \
    --episode-index=0
```

이 명령어를 실행하면:
1. 지정된 에피소드의 데이터를 로드
2. 자동으로 Rerun 뷰어 창이 열림
3. 카메라 영상, 로봇 액션, 상태 정보를 실시간으로 시각화

> **팁** 💡`TIP`
> <br>**로컬 시각화 권장 상황**
>
> - 데이터가 로컬 머신에 저장되어 있을 때
> - 빠른 확인이 필요할 때
> - GUI 환경에서 작업할 때

### 방법 3: 원격 시각화 (Distant Mode)

서버에 데이터가 있고 로컬에서 확인하고 싶을 때 유용합니다:

#### Step 1: 서버에서 시각화 서버 실행

```bash
lerobot-dataset-viz \
    --repo-id=${HF_USER}/${TASK_NAME} \
    --episode-index=0 \
    --mode=distant \
    --web-port=9090 \
    --ws-port=9087
```

서버가 실행되면 다음과 같은 메시지가 표시됩니다:

```plaintext
100%|████████████████████| 12/12 [00:05<00:00,  2.06it/s]
Serving at http://0.0.0.0:9090 (WebSocket at ws://0.0.0.0:9087)
```

#### Step 2: 로컬에서 Rerun 뷰어로 접속

**같은 네트워크에 있는 경우:**

```bash
rerun ws://localhost:9087
```

**SSH 포트 포워딩을 사용하는 경우:**

```bash
# 1. SSH 터널 생성 (로컬 머신에서)
ssh -L 9087:localhost:9087 username@remote-server

# 2. 새 터미널에서 Rerun 실행
rerun ws://localhost:9087
```

> **경고** ⚠️ `WARN`
> <br>**Rerun 프로세스 충돌 해결**
>
> 다음과 같은 오류가 발생하면:
> ```plaintext
> [WARN] The following URLs can't be passed to already open viewers yet
> ```
>
> 기존 Rerun 프로세스를 종료하고 다시 시도하세요:
> ```bash
> pkill -f rerun
> rerun ws://localhost:9087
> ```

### 방법 4: 파일로 저장하여 시각화

데이터를 `.rrd` 파일로 저장하여 나중에 확인하거나 공유할 수 있습니다:

#### Step 1: .rrd 파일 생성

```bash
lerobot-dataset-viz \
    --repo-id=${HF_USER}/${TASK_NAME} \
    --episode-index=0 \
    --save=1 \
    --output-dir=./visualizations
```

이 명령어는 다음 경로에 파일을 생성합니다:

```plaintext
./visualizations/${HF_USER}_${TASK_NAME}_episode_0.rrd
```

#### Step 2: .rrd 파일 열기

```bash
rerun ./visualizations/${HF_USER}_${TASK_NAME}_episode_0.rrd
```

> **팁** 💡`TIP`
> <br>**.rrd 파일의 장점**
>
> - 네트워크 연결 없이 오프라인으로 확인 가능
> - 다른 팀원과 파일 공유 가능
> - 데이터 아카이빙 및 문서화에 유용

### 주요 옵션 설명

#### 필수 옵션
- `--repo-id`: 시각화할 데이터셋의 HuggingFace 레포지토리 이름
- `--episode-index`: 시각화할 에피소드 번호 (0부터 시작)

#### 시각화 모드
- `--mode`: 시각화 모드 선택
  - `local` (기본값): 로컬에서 즉시 뷰어 실행
  - `distant`: 원격 서버 모드로 실행

#### 네트워크 포트
- `--web-port`: 웹 브라우저 접속용 HTTP 포트 (기본값: 9090)
- `--ws-port`: Rerun 뷰어 접속용 WebSocket 포트 (기본값: 9087)

#### 파일 저장
- `--save`: .rrd 파일로 저장 (0: 비활성화, 1: 활성화)
- `--output-dir`: .rrd 파일 저장 경로

#### 성능 조정
- `--batch-size`: DataLoader 배치 크기 (기본값: 32)
- `--num-workers`: DataLoader 워커 프로세스 수 (기본값: 4)
- `--tolerance-s`: 타임스탬프 허용 오차 (기본값: 1e-4)

### 로컬 데이터셋 시각화

HuggingFace Hub 대신 로컬에 저장된 데이터셋을 시각화:

```bash
lerobot-dataset-viz \
    --repo-id=${HF_USER}/${TASK_NAME} \
    --root=./local_datasets \
    --episode-index=0
```

### 데이터 품질 검증 체크리스트

시각화를 통해 다음 사항들을 확인하세요:

> **성공** ✨ `SUCCESS` 
> <br>**확인해야 할 항목:**
>
> - ✅ 카메라 영상이 선명하고 조명이 적절한가?
> - ✅ 중요한 객체가 카메라 시야에 잘 들어오는가?
> - ✅ 로봇 동작이 부드럽고 자연스러운가?
> - ✅ 액션과 상태가 동기화되어 있는가?
> - ✅ 에피소드가 성공적으로 완료되었는가?
> - ✅ 비디오 압축 아티팩트가 학습에 영향을 줄 정도로 심한가?

> **경고** ⚠️ `WARN`
> <br>**주의해야 할 신호:**
>
> - ❌ 블러(blur)가 심한 이미지
> - ❌ 급격한 로봇 동작 변화
> - ❌ 카메라 시야에서 벗어난 중요 객체
> - ❌ 타임스탬프 불일치
> - ❌ 노이즈가 많은 센서 데이터

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
