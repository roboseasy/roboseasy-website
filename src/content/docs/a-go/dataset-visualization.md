---
title: "Visualization"
category: "a-go"
group: "Dataset"
order: 160
---

# Dataset Visualization

[데이터 재생](/docs/a-go/dataset-replay)처럼 로봇으로 데이터셋을 모두 확인하는 방법은 확실하지만 느립니다. 에피소드 50개를 전부 로봇으로 돌려 보기는 어렵습니다. 이 페이지에서는 로봇 없이 **화면에서** 데이터셋을 확인합니다. 카메라 영상과 관절 값이 시간에 따라 어떻게 변했는지 보면서 이상한 에피소드를 빠르게 골라내는 것이 목적이며, 여기서 찾은 에피소드 번호는 [데이터셋 편집](/docs/a-go/dataset-edit)에서 삭제할 때 씁니다.

> 🎯 **학습 목표**
>
> - Hub에 올린 데이터셋을 브라우저에서, 로컬 데이터셋을 Rerun에서 확인할 수 있다.
> - 시각화 화면에서 잘못된 에피소드를 판별하는 기준을 설명할 수 있다.

---

## 1. 온라인 시각화

[데이터 기록](/docs/a-go/dataset-record) 마지막에 `--dataset.push_to_hub=true` 로 올렸거나 [데이터셋 편집](/docs/a-go/dataset-edit)의 방법으로 업로드한 데이터셋은 브라우저에서 바로 볼 수 있습니다. 설치가 필요 없어 다른 사람에게 데이터를 보여 줄 때 편합니다.

Hugging Face가 제공하는 시각화 페이지 [LeRobot Dataset Visualizer](https://huggingface.co/spaces/lerobot/visualize_dataset)를 엽니다.

![LeRobot Dataset Visualizer 첫 화면](/img/a_go/dataset-visualization-01.webp)

자신의 계정 페이지에서 데이터셋 이름(`HueyWoo/lekiwi_pick_and_place` 형식)을 복사해 입력란에 붙여 넣고 **Go** 를 누릅니다.

![Hugging Face 데이터셋 페이지](/img/a_go/dataset-visualization-02.webp)

에피소드 목록이 나오고, 하나를 고르면 카메라 영상과 관절 값 그래프가 함께 재생됩니다.

![에피소드 재생 화면](/img/a_go/dataset-visualization-03.webp)

위 화면은 SO-101 팔로 기록한 예시 데이터셋이라 영상이 `front`, `side` 로 나옵니다. LeKiwi 데이터셋에서는 `front`, `wrist` 두 영상이 보이고, 관절 값에 바퀴 속도(`x.vel`, `y.vel`, `theta.vel`)가 더해집니다.

---

## 2. 로컬 시각화

업로드하지 않은 데이터셋이나 방금 기록한 데이터셋은 PC에서 직접 봅니다. [텔레오퍼레이션](/docs/a-go/start-teleoperation)부터 써 온 Rerun 창이 그대로 열립니다.

### 2.1. 환경 설정

```bash
# 우분투
conda activate lerobot060
export HF_USER="HueyWoo"
export TASK_NAME="lekiwi_pick_and_place"
```

```bash
:: 윈도우
conda activate lerobot060
set "HF_USER=HueyWoo"
set "TASK_NAME=lekiwi_pick_and_place"
```

### 2.2. 시각화하기

```bash
# 우분투
lerobot-dataset-viz \
    --repo-id=${HF_USER}/${TASK_NAME} \
    --episode-index=0 \
    --display-compressed-images
```

```bash
:: 윈도우
lerobot-dataset-viz ^
    --repo-id=%HF_USER%/%TASK_NAME% ^
    --episode-index=0 ^
    --display-compressed-images
```

| 옵션 | 의미 |
|---|---|
| `--repo-id` | 데이터셋 이름. 로컬 캐시에 있으면 그것을, 없으면 Hub에서 받아 씁니다 |
| `--episode-index` | 볼 에피소드 번호. 0부터 시작 |
| `--display-compressed-images` | 영상을 JPEG로 압축해 표시. 값 없이 붙이기만 하며, 붙이면 화면이 가볍게 돌아갑니다 |

이 도구는 밑줄 대신 **하이픈**(`--repo-id`)을 씁니다. 다른 LeRobot 명령과 다르니 주의합니다.

### 2.3. 화면 읽는 법

Rerun 창에 다음이 시간축을 공유하며 표시됩니다.

| 영역 | 내용 |
|---|---|
| `observation.images.front`, `wrist` | 두 카메라 영상 |
| `observation.state` | 팔 관절 6개와 바퀴 3개의 실제 값 |
| `action` | 같은 9채널의 목표값 |

아래쪽 타임라인을 드래그하면 특정 순간의 영상과 값을 함께 볼 수 있습니다. 확인할 것은 다음과 같습니다.

- **두 영상이 서로 바뀌지 않았는가.** front에 그리퍼가, wrist에 작업 공간이 보이면 두 카메라가 뒤바뀐 것입니다. 그 에피소드는 쓸 수 없으니, 다음 기록 전에 [카메라 포트 고정](/docs/a-go/setup-cameraport)의 별칭 설정을 다시 확인합니다.
- **행동과 상태가 나란히 가는가.** `action` 선을 `observation.state` 선이 조금 늦게 따라가면 정상입니다. 한쪽만 튀거나 평평하면 기록 오류입니다.
- **에피소드가 너무 길거나 멈춰 있는 구간이 있는가.** 작업이 끝난 뒤 가만히 있는 구간이 길면 [데이터 기록](/docs/a-go/dataset-record)에서 `→` 로 일찍 끝내지 않은 것입니다.
- **작업이 실제로 성공했는가.** 물체를 놓치거나 상자에 못 넣은 에피소드는 모델에 나쁜 시범이 됩니다.

문제가 있는 에피소드 번호를 메모해 둡니다. `--episode-index` 를 바꿔 가며 전체를 훑습니다.

---

## 3. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `the following arguments are required: --repo-id` | 옵션을 밑줄(`--repo_id`, `--episode_index`)로 적음. 이 도구는 하이픈(`--repo-id`, `--episode-index`)을 씀 |
| 데이터셋을 찾지 못함 | 로컬 캐시 이름 확인. Hub에서 받으려면 `hf auth whoami` 로 로그인 확인 |
| Rerun 창이 안 뜸 | `pip install "lerobot[viz]==0.6.0"` 으로 시각화 의존성 설치 |
| 영상이 느리거나 끊김 | `--display-compressed-images` 추가 |
| 온라인 페이지에서 데이터셋을 못 찾음 | 업로드 여부와 이름 확인. 비공개 데이터셋은 로그인 필요 |

---

## 4. 정리

- Hub에 올린 데이터셋은 브라우저에서, 로컬 데이터셋은 `lerobot-dataset-viz` 로 Rerun에서 확인합니다.
- 영상 위치, 행동과 상태의 대응, 멈춰 있는 구간, 작업 성공 여부를 기준으로 에피소드를 판별합니다.
- 문제 있는 에피소드 번호를 메모해 두면 [데이터셋 편집](/docs/a-go/dataset-edit)에서 바로 삭제할 수 있습니다.

다음 페이지 [데이터셋 편집](/docs/a-go/dataset-edit)에서는 메모한 에피소드를 지우고 데이터셋을 정리해 Hub에 올립니다.
