---
title: "Record"
category: "a-go"
group: "Dataset"
order: 140
---

# Dataset Record

지금까지는 로봇을 움직이는 방법을 익혔습니다. 이 페이지부터는 로봇이 **스스로** 움직이게 만들기 위한 재료, 즉 학습 데이터를 만듭니다. 방법은 단순합니다. [제어 스크립트](/docs/a-go/start-custom-scripts)의 텔레오퍼레이션을 그대로 하되, 그동안 오간 관측과 행동을 파일로 저장하는 것입니다. 이렇게 사람의 시범을 기록해 학습시키는 방식을 **모방 학습(imitation learning)** 이라고 합니다.

> 🎯 **학습 목표**
>
> - 에피소드가 무엇이고 데이터셋에 어떤 정보가 어떤 구조로 저장되는지 설명할 수 있다.
> - 기록 명령의 시간 설정과 조작키를 이해하고 실제 시범 데이터를 기록할 수 있다.
> - 기존 데이터셋에 이어서 기록하고 Hub에 업로드할 수 있다.

---

## 1. 데이터셋의 구조

### 1.1. 에피소드

작업을 처음부터 끝까지 한 번 수행한 것이 **에피소드(episode)** 입니다. "큐브를 집어 상자에 넣는다"를 한 번 하면 에피소드 하나입니다. 데이터셋은 이런 에피소드를 수십 개 모은 것이고, 모델은 이 시범들에서 공통된 패턴을 배웁니다.

각 에피소드는 초당 30개의 **프레임**으로 이루어지며, 프레임 하나에는 [텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 본 관측과 행동이 짝으로 들어갑니다.

| 항목 | 내용 | 출처 |
|---|---|---|
| `observation.images.front` | 정면 카메라 프레임 | LeKiwi 카메라 |
| `observation.images.wrist` | 손목 카메라 프레임 | LeKiwi 카메라 |
| `observation.state` | 팔 관절 6개 위치 + 바퀴 3개 속도 (9차원) | LeKiwi 모터 |
| `action` | 같은 9차원의 목표값 | 리더 암 + 키보드 |
| `task` | 작업 설명 문장 | 기록 명령의 인자 |

15초짜리 에피소드 하나에 프레임 450개, 에피소드 20개면 9,000개의 관측·행동 쌍이 생깁니다. 영상은 MP4로 압축 저장되고 나머지는 표 형식으로 저장됩니다.

### 1.2. 좋은 데이터의 조건

모델은 데이터에 있는 것만 배웁니다. 기록 전에 다음을 정해 둡니다.

- **일관된 작업.** 매 에피소드 같은 작업을 같은 방식으로 수행합니다. 도중에 방법을 바꾸면 모델이 혼란을 겪습니다.
- **다양성.** 물체 위치를 매번 조금씩 바꿉니다. 항상 같은 자리에 두면 모델은 그 자리만 배웁니다.
- **깔끔한 시범.** 머뭇거리거나 실패한 에피소드는 다시 기록합니다. 조작키로 즉시 재기록할 수 있습니다.
- **충분한 수.** 처음에는 10개로 흐름을 익히고, 실제 학습용으로는 40~60개를 목표로 합니다.

---

## 2. [Pi] 호스트 실행

[제어 스크립트](/docs/a-go/start-custom-scripts)에서 만든 `start_lekiwi_host.sh` 로 호스트를 띄웁니다. 카메라 설정이 기록 데이터의 구조를 결정하므로, 이후 이어서 기록할 때도 **같은 설정**으로 띄워야 합니다.

```bash
./start_lekiwi_host.sh lekiwi07
```

---

## 3. [PC] Hugging Face 계정 준비

데이터셋은 로컬에 저장되지만, 다른 PC에서 학습하거나 공유하려면 **Hugging Face Hub** 에 올려야 합니다. [ACT 학습](/docs/a-go/train-act)에서 훈련용 PC가 이 데이터셋을 받아 씁니다.

1. 가입: [https://huggingface.co/join](https://huggingface.co/join) 에서 가입하고 이메일 인증까지 마칩니다.
2. 토큰: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) 에서 `Create new token` 을 누르고 **type을 Write 또는 Full Access** 로 만듭니다. 생성된 `hf_...` 문자열은 창을 닫으면 다시 볼 수 없으니 바로 복사합니다.
3. PC에서 로그인합니다.

```bash
hf auth login --token <hf_복사한토큰>
hf auth whoami
```

`whoami` 에 나오는 이름이 계정명이며, 데이터셋 이름 앞에 붙습니다.

> **경고** ⚠️ `WARN`
> <br>토큰은 비밀번호와 같습니다. 다른 사람과 공유하거나 문서와 코드에 적어 두지 않습니다.

---

## 4. [PC] 데이터 기록

### 4.1. 환경 변수

계정명과 데이터셋 이름을 환경 변수로 두면 이후 단계에서 같은 이름을 반복해서 쓰기 편합니다. 이 가이드는 끝까지 이 두 값을 씁니다. 예시의 `HueyWoo` 는 `hf auth whoami` 에 나온 **본인의 계정명**으로 바꿔 입력합니다. 다른 사람의 계정명으로는 Hub에 업로드할 수 없습니다.

```bash
# 우분투
conda activate lerobot060
cd ~/workspace/lekiwi
export HF_USER="HueyWoo"
export TASK_NAME="lekiwi_pick_and_place"
```

```bat
:: 윈도우
conda activate lerobot060
cd %USERPROFILE%\workspace\lekiwi
set "HF_USER=HueyWoo"
set "TASK_NAME=lekiwi_pick_and_place"
```

### 4.2. 기록 명령 (데이터셋 수집)

[제어 스크립트](/docs/a-go/start-custom-scripts) 텔레오퍼레이션 인자에 `--dataset.*` 인자가 더해진 형태입니다.

```bash
# 우분투
python lekiwi-record.py \
    --robot.remote_ip=192.168.0.207 \
    --robot.id=lekiwi07 \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=leader \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.single_task="Pick up the cube and place it in the box" \
    --dataset.num_episodes=10 \
    --dataset.episode_time_s=15 \
    --dataset.reset_time_s=3 \
    --display_data=true \
    --dataset.push_to_hub=false
```

```bat
:: 윈도우
python lekiwi-record.py ^
    --robot.remote_ip=192.168.0.207 ^
    --robot.id=lekiwi07 ^
    --teleop.port=COM22 ^
    --teleop.id=leader ^
    --dataset.repo_id=%HF_USER%/%TASK_NAME% ^
    --dataset.single_task="Pick up the cube and place it in the box" ^
    --dataset.num_episodes=10 ^
    --dataset.episode_time_s=15 ^
    --dataset.reset_time_s=3 ^
    --display_data=true ^
    --dataset.push_to_hub=false
```

| 인자 | 의미 |
|---|---|
| `--dataset.repo_id` | 데이터셋 이름. `계정/이름` 형식이며 Hub에 올릴 때 이 이름이 됩니다 |
| `--dataset.single_task` | 작업 설명 문장. 데이터셋에 저장되어 [ACT 학습](/docs/a-go/train-act)과 [ACT 추론](/docs/a-go/inference-act)에서 같은 문장을 씁니다 |
| `--dataset.num_episodes` | 이번에 기록할 에피소드 수 |
| `--dataset.episode_time_s` | 에피소드 하나의 최대 길이(초). 작업을 여유 있게 마칠 수 있는 시간으로 잡습니다 |
| `--dataset.reset_time_s` | 에피소드 사이에 물체를 제자리에 놓는 시간(초). 이 구간은 기록되지 않습니다 |
| `--dataset.push_to_hub` | 끝나고 Hub에 올릴지 여부. 처음에는 로컬에서 확인하기 위해 `false` |

- `--robot.*` 와 `--teleop.*` 는 [제어 스크립트](/docs/a-go/start-custom-scripts)와 같습니다. 기록 스크립트는 데이터셋 폴더를 만들기 **전에** 로봇에 먼저 연결하므로, 연결에 실패하면 빈 데이터셋이 남지 않습니다.

### 4.3. 기록 흐름과 조작키

실행하면 Rerun 창이 뜨고 첫 에피소드 기록이 바로 시작됩니다. 흐름은 다음이 반복됩니다.

1. **에피소드 기록** (최대 `episode_time_s`). 리더 암과 키보드로 작업을 수행합니다.
2. **리셋 구간** (`reset_time_s`). 기록이 멈추고 물체를 다음 시작 위치에 놓습니다.
3. 에피소드 저장 후 다음 에피소드로.

| 키 | 언제 | 동작 |
|---|---|---|
| `→` 또는 `N` | 에피소드 중 | 작업을 다 했으면 시간이 남아도 에피소드를 끝내고 리셋으로 |
| `←` | 에피소드 중, 리셋 중 | 방금 에피소드를 버리고 다시 기록 |
| `ESC` | 언제나 | 기록 전체 중단. 지금까지 저장된 에피소드는 유지 |
| `W/S/A/D`, `Q/E`, `R/F`, `SPACE` | 에피소드 중 | [제어 스크립트](/docs/a-go/start-custom-scripts)와 같은 바퀴 조종 |

작업이 끝나면 시간이 다 될 때까지 기다리지 말고 `→` 로 넘기는 것이 좋습니다. 가만히 있는 구간도 데이터로 남아 모델이 "멈춰 있기"를 배우기 때문입니다. 실수했다면 주저 없이 `←` 로 다시 합니다.

> **팁** 💡`TIP`
> <br>**R·Q 키로는 재기록·중단이 되지 않습니다** LeRobot 기본 기록 도구는 `←`·`ESC` 외에 글자 키 `R`(재기록)·`Q`(중단)도 받지만, LeKiwi에서는 이 키들이 바퀴 조종에 쓰입니다. 그래서 커스텀 스크립트는 재기록을 `←`, 중단을 `ESC` 에만 남겼습니다.

### 4.4. 결과 확인

기록이 끝나면 데이터셋 위치가 로그에 출력됩니다.

```text
~/.cache/huggingface/lerobot/HueyWoo/lekiwi_pick_and_place/
├── meta/      에피소드 수, 특성 구조, 통계
├── data/      관절 상태와 행동 (parquet)
└── videos/    카메라 영상 (mp4)
```

에피소드가 제대로 담겼는지는 [데이터 재생](/docs/a-go/dataset-replay)에서 로봇으로 재생해 보고, [데이터 시각화](/docs/a-go/dataset-visualization)에서 화면으로 확인합니다.

---

## 5. [PC] 이어서 기록하기

### 5.1. 같은 데이터셋에 추가

10개를 기록해 흐름을 익힌 뒤 학습용으로 더 쌓을 때는 `--resume=true` 를 붙입니다. 같은 이름의 기존 데이터셋 뒤에 에피소드가 이어집니다.

```bash
# 우분투
python lekiwi-record.py \
    --robot.remote_ip=192.168.0.207 \
    --robot.id=lekiwi07 \
    --teleop.port=/dev/ttyACM0 \
    --teleop.id=leader \
    --dataset.repo_id=${HF_USER}/${TASK_NAME} \
    --dataset.single_task="Pick up the cube and place it in the box" \
    --dataset.num_episodes=20 \
    --dataset.episode_time_s=15 \
    --dataset.reset_time_s=5 \
    --display_data=true \
    --resume=true \
    --dataset.push_to_hub=true
```

```bat
:: 윈도우
python lekiwi-record.py ^
    --robot.remote_ip=192.168.0.207 ^
    --robot.id=lekiwi07 ^
    --teleop.port=COM22 ^
    --teleop.id=leader ^
    --dataset.repo_id=%HF_USER%/%TASK_NAME% ^
    --dataset.single_task="Pick up the cube and place it in the box" ^
    --dataset.num_episodes=20 ^
    --dataset.episode_time_s=15 ^
    --dataset.reset_time_s=5 ^
    --display_data=true ^
    --resume=true ^
    --dataset.push_to_hub=true
```

- `--dataset.num_episodes` 는 **이번에 추가할 개수**입니다. 기존 10개에 20개를 더하면 총 30개가 됩니다.
- 기존 데이터셋과 카메라 이름, 해상도, FPS가 같아야 합니다. 호스트를 [제어 스크립트](/docs/a-go/start-custom-scripts)의 `start_lekiwi_host.sh` 로 똑같이 띄웠다면 문제없습니다.
- `--dataset.push_to_hub=true` 를 주면 끝난 뒤 **전체 데이터셋**이 Hub에 올라갑니다. 마지막 기록 세션에 붙이면 따로 업로드할 필요가 없습니다.

### 5.2. 처음부터 다시 시작

같은 이름으로 `--resume` 없이 다시 실행하면 이미 폴더가 있다는 오류가 납니다.

```text
FileExistsError: [Errno 17] File exists: '~/.cache/huggingface/lerobot/HueyWoo/lekiwi_pick_and_place'
```

기존 기록을 버리고 새로 시작하려면 폴더를 지웁니다. 지우기 전에 정말 버려도 되는지 확인하세요.

```bash
# 우분투
rm -rf ~/.cache/huggingface/lerobot/${HF_USER}/${TASK_NAME}
```

```bat
:: 윈도우
rmdir /s /q %USERPROFILE%\.cache\huggingface\lerobot\%HF_USER%\%TASK_NAME%
```

버리지 않고 별도 이름으로 새로 시작하려면 `TASK_NAME` 을 바꾸거나, 실행마다 이름 뒤에 날짜를 붙이는 `--stamp_repo_id=true` 를 씁니다.

---

## 6. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `FileExistsError` | 5.2절. 이어서 기록하려면 `--resume=true` |
| `--resume` 인데 폴더를 못 찾음 | 로그에 찍힌 경로 확인. 다른 곳에 있으면 `--dataset.root=/경로` |
| `--resume` 시 feature 불일치 오류 | 호스트 카메라 설정이 지난번과 다름. [제어 스크립트](/docs/a-go/start-custom-scripts)의 `start_lekiwi_host.sh` 로 같은 설정 사용 |
| 카메라 shape 경고 | [카메라 포트 고정](/docs/a-go/setup-cameraport) 별칭과 해상도 확인. 기본 설정은 실제 프레임에 맞춰 자동 보정됨 |
| 에피소드 저장이 오래 걸림 | 실시간 인코딩이 꺼진 경우. `--dataset.streaming_encoding=true` 가 기본 |
| 업로드 실패 | `hf auth whoami` 확인. 토큰 권한이 Write인지 확인 |
| 연결, 리더 암, 키보드 문제 | [제어 스크립트](/docs/a-go/start-custom-scripts) 문제 해결 참고 |

---

## 7. 정리

- 데이터셋은 **에피소드**의 모음이고, 각 프레임에 관측 9차원과 영상 2개, 행동 9차원이 짝으로 저장됩니다.
- 기록 명령은 [제어 스크립트](/docs/a-go/start-custom-scripts) 텔레오퍼레이션 인자에 데이터셋 이름, 작업 문장, 에피소드 수와 시간을 더한 것입니다.
- 작업이 끝나면 `→` 로 넘기고 실수하면 `←` 로 다시 합니다. 중단은 `ESC` 입니다.
- `--resume=true` 로 이어서 쌓고, 마지막에 `--dataset.push_to_hub=true` 로 Hub에 올립니다.

다음 페이지 [데이터 재생](/docs/a-go/dataset-replay)에서는 기록한 에피소드를 로봇에서 그대로 재생해 데이터가 온전한지 확인합니다.
