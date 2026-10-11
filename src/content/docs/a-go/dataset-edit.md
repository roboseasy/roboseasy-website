---
title: "Edit & Upload"
category: "a-go"
group: "Dataset"
order: 170
---

# Dataset Edit & Hub 업로드

[데이터 기록](/docs/a-go/dataset-record)에서 기록하고 [데이터 시각화](/docs/a-go/dataset-visualization)에서 시각화해 본 데이터셋은 그대로 학습에 쓰기에 완벽하지 않은 경우가 많습니다. 실수한 에피소드가 섞여 있거나, 여러 날에 걸쳐 모은 데이터를 합쳐야 하거나, 학습용과 검증용을 나눠야 합니다. 이 페이지에서는 LeRobot의 데이터셋 편집 도구로 이런 작업을 처리하고, 완성된 데이터셋을 Hugging Face Hub에 올립니다.

> 🎯 **학습 목표**
>
> - 데이터셋을 편집하기 전에 정보를 확인하고, 원본을 보존하는 방식으로 편집할 수 있다.
> - 에피소드 삭제, 분할, 병합, 특성 제거를 목적에 맞게 골라 쓸 수 있다.
> - 편집한 데이터셋을 Hugging Face Hub에 업로드할 수 있다.

---

## 1. 데이터셋 편집이 필요한 이유

모방 학습에서 모델은 데이터셋에 있는 시범을 **그대로** 따라 배웁니다. 데이터의 품질이 곧 모델의 상한입니다. 기록 과정에서 흔히 생기는 상황과 대응은 다음과 같습니다.

| 상황 | 대응 | 도구 |
|---|---|---|
| 기록 중 물체를 떨어뜨리거나 실패한 에피소드가 있음 | 해당 에피소드만 제거 | 에피소드 삭제 |
| 여러 날, 여러 로봇으로 나눠 기록함 | 하나로 합침 | 병합 |
| 학습 데이터와 검증 데이터를 분리하고 싶음 | 비율이나 인덱스로 나눔 | 분할 |
| 카메라 하나를 쓰지 않기로 결정함 | 그 카메라 특성만 제거 | 특성 제거 |
| 작업 설명 문장을 잘못 입력함 | 문장만 수정 | 작업 설명 수정 |

이 작업들은 모두 `lerobot-edit-dataset` 이라는 하나의 명령으로 처리하며, `--operation.type` 으로 종류를 고릅니다.

### 1.1. 원본 보존 원칙

편집 명령에는 `--repo_id` (원본)와 `--new_repo_id` (결과) 두 이름이 있습니다. 두 값을 다르게 주면 **원본은 그대로 두고 새 데이터셋을 만듭니다.** 생략하거나 같게 주면 원본을 직접 고치고, 원본은 이름 뒤에 `_old` 가 붙은 폴더로 백업됩니다.

편집은 되돌리기 어려우니 이 가이드에서는 **항상 새 이름으로 결과를 만드는** 방식을 씁니다. 결과를 확인한 뒤 원본을 지우는 것은 언제든 할 수 있지만, 반대는 불가능합니다.

### 1.2. 환경 설정

[데이터 기록](/docs/a-go/dataset-record)과 같은 환경 변수를 씁니다. 매번 계정과 데이터셋 이름을 타이핑하지 않기 위한 것입니다.

```bash
# 우분투
conda activate lerobot060
export HF_USER="HueyWoo"
export TASK_NAME="lekiwi_pick_and_place"
```

```bat
:: 윈도우
conda activate lerobot060
set "HF_USER=HueyWoo"
set "TASK_NAME=lekiwi_pick_and_place"
```

편집 도구에 필요한 `dataset` 의존성은 LeRobot 설치([Ubuntu](/docs/a-go/setup-lerobot-ubuntu) · [Windows](/docs/a-go/setup-lerobot-windows))에서 넣은 `core_scripts`(실행용 PC)와 `training`(훈련용 PC) extras에 이미 들어 있어 따로 설치하지 않아도 됩니다. 실행할 때 `'datasets' is required but not installed` 오류가 나면 LeRobot을 설치한 방식에 맞는 명령 하나만 실행합니다.

소스 설치한 경우 (`lerobot` 폴더에서):

```bash
pip install -e ".[dataset]"
```

pip 패키지로 설치한 경우:

```bash
pip install "lerobot[dataset]==0.6.0"
```

편집 명령의 `--push_to_hub` 기본값은 `false` 입니다. 결과는 아래 로컬 캐시 폴더에만 생기고, 업로드는 4절에서 따로 합니다.

```text
~/.cache/huggingface/lerobot/<HF_USER>/<데이터셋 이름>/
```

---

## 2. 편집 전 데이터셋 정보 확인

무엇을 지우고 나눌지 정하려면 먼저 데이터셋의 상태를 알아야 합니다. `info` 명령은 에피소드 수, 프레임 수, FPS, 그리고 어떤 특성(feature)이 들어 있는지 보여 줍니다.

```bash
# 우분투
lerobot-edit-dataset \
    --repo_id=${HF_USER}/${TASK_NAME} \
    --operation.type=info \
    --operation.show_features=true
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --repo_id=%HF_USER%/%TASK_NAME% ^
    --operation.type=info ^
    --operation.show_features=true
```

출력에서 특히 볼 것은 두 가지입니다.

- **에피소드 수와 인덱스 범위.** 인덱스는 0부터 시작합니다. 10개를 기록했다면 0부터 9까지입니다.
- **특성 이름.** `observation.images.front`, `observation.images.wrist`, `observation.state`, `action` 같은 키가 나옵니다. 카메라 키의 `front`, `wrist` 는 호스트 스크립트([제어 스크립트](/docs/a-go/start-custom-scripts)의 `CAMERAS_CONFIG`)에서 정한 카메라 이름입니다. 특성을 제거할 때 이 이름을 씁니다.

어느 에피소드가 실패했는지는 [데이터 시각화](/docs/a-go/dataset-visualization)에서 에피소드를 하나씩 재생해 보며 인덱스를 메모해 둡니다.

---

## 3. 데이터셋 편집

### 3.1. 에피소드 삭제

실패한 에피소드를 빼고 새 데이터셋을 만듭니다.

```bash
# 우분투
lerobot-edit-dataset \
    --repo_id=${HF_USER}/${TASK_NAME} \
    --new_repo_id=${HF_USER}/${TASK_NAME}_after_delete \
    --operation.type=delete_episodes \
    --operation.episode_indices="[0, 2, 5]"
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --repo_id=%HF_USER%/%TASK_NAME% ^
    --new_repo_id=%HF_USER%/%TASK_NAME%_after_delete ^
    --operation.type=delete_episodes ^
    --operation.episode_indices="[0, 2, 5]"
```

| 매개변수 | 의미 |
|---|---|
| `--repo_id` | 원본 데이터셋 |
| `--new_repo_id` | 결과가 저장될 새 이름 |
| `--operation.type=delete_episodes` | 에피소드 삭제 작업 |
| `--operation.episode_indices` | 삭제할 에피소드 인덱스 목록 |

삭제 후 남은 에피소드는 **0부터 다시 번호가 매겨집니다.** 인덱스 0, 2, 5를 지우면 원래의 1번이 새 데이터셋의 0번이 됩니다. 여러 번 나눠 삭제할 때 이 점을 잊으면 엉뚱한 에피소드를 지우게 되니, 지울 인덱스를 한 번에 모아서 한 번만 실행하는 것이 안전합니다.

### 3.2. 데이터셋 분할

학습이 잘 되었는지 평가하려면 학습에 쓰지 않은 데이터가 필요합니다. 비율로 나누는 방법과 인덱스를 직접 지정하는 방법이 있습니다.

| 매개변수 | 의미 |
|---|---|
| `--operation.type=split` | 분할 작업 |
| `--operation.splits` | 분할 이름과 기준. 비율이면 합이 1, 인덱스면 에피소드 번호 목록 |

분할 이름은 자유롭게 정할 수 있고, 결과는 **원본 이름 뒤에 분할 이름이 붙어** 저장됩니다. 분할은 결과 이름을 이렇게 자동으로 정하므로 `--new_repo_id` 를 주어도 무시됩니다. 아래 결과 화면은 `pick_and_place` 라는 데이터셋으로 실행한 예시입니다.

#### 비율로 나누기

```bash
# 우분투
lerobot-edit-dataset \
    --repo_id=${HF_USER}/${TASK_NAME} \
    --operation.type=split \
    --operation.splits='{"train": 0.7, "val": 0.2, "test": 0.1}'
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --repo_id=%HF_USER%/%TASK_NAME% ^
    --operation.type=split ^
    --operation.splits="{\"train\": 0.7, \"val\": 0.2, \"test\": 0.1}"
```

결과로 `lekiwi_pick_and_place_train`, `_val`, `_test` 세 개가 생깁니다.

![비율로 나눈 결과 폴더](/img/a_go/dataset-edit-01.webp)

> **팁** 💡`TIP`
> <br>비율로 나눌 때 에피소드가 10개면 7 : 2 : 1로 나뉩니다. 에피소드 수가 적으면 `0.1` 같은 작은 비율은 0개가 되어 그 분할이 만들어지지 않으니, 결과 로그의 에피소드 수를 확인하세요.

#### 인덱스로 나누기

```bash
# 우분투
lerobot-edit-dataset \
    --repo_id=${HF_USER}/${TASK_NAME} \
    --operation.type=split \
    --operation.splits='{"task1": [0, 1, 2, 3], "task2": [4, 5]}'
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --repo_id=%HF_USER%/%TASK_NAME% ^
    --operation.type=split ^
    --operation.splits="{\"task1\": [0, 1, 2, 3], \"task2\": [4, 5]}"
```

결과로 `lekiwi_pick_and_place_task1`, `_task2` 두 개가 생깁니다.

![인덱스로 나눈 결과 폴더](/img/a_go/dataset-edit-02.webp)

### 3.3. 데이터셋 병합

나눠서 기록한 데이터셋을 하나로 합칩니다. 병합은 원본이 여러 개이므로 `--repo_id` 대신 `--operation.repo_ids` 로 목록을 주고, 결과 이름 `--new_repo_id` 가 **필수**입니다.

```bash
# 우분투
lerobot-edit-dataset \
    --new_repo_id=${HF_USER}/${TASK_NAME}_merged \
    --operation.type=merge \
    --operation.repo_ids="['${HF_USER}/${TASK_NAME}_train', '${HF_USER}/${TASK_NAME}_val']"
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --new_repo_id=%HF_USER%/%TASK_NAME%_merged ^
    --operation.type=merge ^
    --operation.repo_ids="['%HF_USER%/%TASK_NAME%_train', '%HF_USER%/%TASK_NAME%_val']"
```

![병합 결과 폴더](/img/a_go/dataset-edit-03.webp)

| 매개변수 | 의미 |
|---|---|
| `--new_repo_id` | 병합 결과가 저장될 이름 (필수) |
| `--operation.type=merge` | 병합 작업 |
| `--operation.repo_ids` | 합칠 데이터셋 목록. 이 순서대로 에피소드가 이어 붙습니다 |

합치려는 데이터셋들은 **특성 구조가 같아야** 합니다. 카메라 이름과 해상도, FPS, 관절 수가 모두 같아야 한다는 뜻입니다. 같은 로봇으로 같은 호스트 명령을 써서 기록했다면 문제없지만, 중간에 호스트 스크립트의 `CAMERAS_CONFIG` 에서 카메라 이름이나 해상도를 바꾼 뒤 기록한 데이터는 합쳐지지 않습니다. 확실하지 않으면 2절의 `info` 로 두 데이터셋의 특성을 비교해 봅니다.

### 3.4. 특성 제거

특정 카메라를 쓰지 않는 모델을 학습시키거나 용량을 줄이려 할 때, 해당 특성만 제거한 데이터셋을 만듭니다.

```bash
# 우분투
lerobot-edit-dataset \
    --repo_id=${HF_USER}/${TASK_NAME} \
    --new_repo_id=${HF_USER}/${TASK_NAME}_no_wrist \
    --operation.type=remove_feature \
    --operation.feature_names="['observation.images.wrist']"
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --repo_id=%HF_USER%/%TASK_NAME% ^
    --new_repo_id=%HF_USER%/%TASK_NAME%_no_wrist ^
    --operation.type=remove_feature ^
    --operation.feature_names="['observation.images.wrist']"
```

| 매개변수 | 의미 |
|---|---|
| `--operation.type=remove_feature` | 특성 제거 작업 |
| `--operation.feature_names` | 제거할 특성 이름 목록. 2절의 `info` 출력에 나온 이름 그대로 |

### 3.5. 작업 설명 수정

[데이터 기록](/docs/a-go/dataset-record)에서 `--dataset.single_task` 로 넣은 작업 설명 문장은 데이터셋에 저장되어, 언어 조건 모델을 학습할 때 입력으로 쓰입니다. 오타가 있거나 문장을 바꾸고 싶을 때 수정합니다. 이 작업은 새 데이터셋을 만들지 않고 **원본을 직접 수정**하며, 1.1절의 `_old` 백업도 만들지 않으므로 주의합니다.

```bash
# 우분투
lerobot-edit-dataset \
    --repo_id=${HF_USER}/${TASK_NAME} \
    --operation.type=modify_tasks \
    --operation.new_task="Pick up the cube and place it in the box"
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --repo_id=%HF_USER%/%TASK_NAME% ^
    --operation.type=modify_tasks ^
    --operation.new_task="Pick up the cube and place it in the box"
```

에피소드별로 다른 문장을 주려면 `--operation.episode_tasks` 로 에피소드 인덱스와 문장의 대응을 넘깁니다.

```bash
# 우분투
lerobot-edit-dataset \
    --repo_id=${HF_USER}/${TASK_NAME} \
    --operation.type=modify_tasks \
    --operation.episode_tasks='{"0": "Task A", "1": "Task B"}'
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --repo_id=%HF_USER%/%TASK_NAME% ^
    --operation.type=modify_tasks ^
    --operation.episode_tasks="{\"0\": \"Task A\", \"1\": \"Task B\"}"
```

---

## 4. Hugging Face Hub에 업로드

편집이 끝난 데이터셋을 Hub에 올립니다. [데이터 기록](/docs/a-go/dataset-record)에서 로그인해 둔 계정으로 업로드되며, [ACT 학습](/docs/a-go/train-act)에서 학습할 때 이 이름으로 데이터셋을 받아 씁니다. 기록할 때 `--dataset.push_to_hub=false` 로 둔 원본도 같은 방법으로 올릴 수 있습니다.

### 4.1. 편집과 동시에 업로드

편집 명령에 `--push_to_hub=true` 를 붙이면 결과가 만들어진 직후 자동으로 업로드됩니다.

```bash
# 우분투
lerobot-edit-dataset \
    --repo_id=${HF_USER}/${TASK_NAME} \
    --new_repo_id=${HF_USER}/${TASK_NAME}_after_delete \
    --operation.type=delete_episodes \
    --operation.episode_indices="[0, 2, 5]" \
    --push_to_hub=true
```

```bat
:: 윈도우
lerobot-edit-dataset ^
    --repo_id=%HF_USER%/%TASK_NAME% ^
    --new_repo_id=%HF_USER%/%TASK_NAME%_after_delete ^
    --operation.type=delete_episodes ^
    --operation.episode_indices="[0, 2, 5]" ^
    --push_to_hub=true
```

### 4.2. 이미 있는 데이터셋 업로드

편집 없이 로컬에 있는 데이터셋을 올릴 때는 Python 한 줄로 합니다. [데이터 기록](/docs/a-go/dataset-record)에서 기록한 원본을 올리는 경우가 여기에 해당합니다.

```bash
# 우분투
python -c "from lerobot.datasets.lerobot_dataset import LeRobotDataset; LeRobotDataset('${HF_USER}/${TASK_NAME}').push_to_hub()"
```

```bat
:: 윈도우
python -c "from lerobot.datasets.lerobot_dataset import LeRobotDataset; LeRobotDataset('%HF_USER%/%TASK_NAME%').push_to_hub()"
```

업로드가 끝나면 브라우저에서 확인할 수 있습니다.

```text
https://huggingface.co/datasets/<HF_USER>/<데이터셋 이름>
```

[데이터 시각화](/docs/a-go/dataset-visualization)의 온라인 시각화 도구에 이 이름을 넣으면 업로드된 데이터셋을 바로 재생해 볼 수 있습니다.

> **경고** ⚠️ `WARN`
> <br>Hub에 올린 데이터셋은 기본적으로 **공개**입니다. 비공개로 올리려면 위 Python 명령에서 `push_to_hub(private=True)` 로 호출합니다.

---

## 5. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `'datasets' is required but not installed` 또는 `pyarrow` 오류 | `pip install "lerobot[dataset]==0.6.0"` (소스 설치는 1.2절 참고) |
| 데이터셋을 찾지 못함 | `ls ~/.cache/huggingface/lerobot/${HF_USER}/` 로 로컬 이름 확인. 환경 변수 오타 |
| 병합 시 특성 불일치 오류 | `info` 로 두 데이터셋의 특성 비교. 카메라 이름, 해상도, FPS |
| 분할 하나가 만들어지지 않음 (`has no episodes, skipping` 경고) | 에피소드 수 대비 비율이 너무 작아 0개가 됨. 비율을 키우거나 인덱스 지정 방식으로 변경 |
| 업로드 시 인증 오류 | `hf auth whoami` 로 로그인 상태 확인. 토큰 권한이 Write인지 확인 |
| 지우려던 에피소드가 아닌 것이 지워짐 | 삭제 후 인덱스가 다시 매겨짐. 원본에서 한 번에 삭제 |

---

## 6. 정리

- 데이터셋 편집은 `lerobot-edit-dataset` 하나로 하며 `--operation.type` 으로 작업을 고릅니다.
- 편집 전에 `info` 로 에피소드 수와 특성 이름을 확인합니다.
- `--new_repo_id` 로 **항상 새 이름에 결과를 만들어** 원본을 보존합니다.
- 삭제 후에는 인덱스가 다시 매겨지고, 병합에는 같은 특성 구조가 필요합니다.
- 완성된 데이터셋은 `--push_to_hub=true` 또는 Python 한 줄로 Hub에 올립니다.

> **정보** ℹ️ `INFO`
> <br>**특성 추가(add feature)는 이 페이지에서 다루지 않습니다** 공식 문서는 `lerobot-edit-dataset` 으로 특성 추가도 할 수 있다고 소개하지만 CLI 예시가 없습니다. 필요하면 `lerobot.datasets.dataset_tools` 모듈의 `add_features` 함수를 Python에서 직접 호출합니다.

다음 단계에서는 이렇게 준비한 데이터셋으로 정책을 학습시킵니다. 처음이라면 [ACT 학습](/docs/a-go/train-act)부터, 언어 명령을 이해하는 VLA 모델을 써 보려면 [SmolVLA 학습](/docs/a-go/train-smolvla)으로 진행합니다.
