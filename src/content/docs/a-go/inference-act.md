---
title: "ACT 추론"
category: "a-go"
group: "Inference"
order: 200
prev: "train-act"
next: "train-smolvla"
---

# Model Inference (ACT)

[ACT 학습](/docs/a-go/train-act)에서 학습한 모델을 이제 로봇에 올립니다. 리더 암을 잡은 사람 대신 **정책이 관측을 보고 행동을 결정**하고, LeKiwi가 그 행동을 실행합니다. 이 페이지는 이 과정을 실행용 PC에서 돌리고, 정책이 얼마나 잘 하는지 성공률로 측정하는 방법까지 다룹니다.

> 🎯 **학습 목표**
>
> - 추론 루프가 텔레오퍼레이션 루프와 어떻게 같고 어떻게 다른지 설명할 수 있다.
> - Hub 또는 로컬 체크포인트의 모델로 LeKiwi를 자율 실행하고 안전하게 멈출 수 있다.
> - 여러 체크포인트의 성공률을 같은 조건에서 비교할 수 있다.

---

## 1. 추론이란

[텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 돌린 제어 루프를 떠올려 보세요. 초당 30번, PC가 관측을 받고 행동을 보냈습니다. 그때 행동을 만든 것은 리더 암을 쥔 사람의 손이었습니다. 추론은 그 자리에 **정책**을 넣은 것입니다. 나머지 구조는 같습니다.

|  | [텔레오퍼레이션](/docs/a-go/start-teleoperation) | 추론 (이 페이지) |
|---|---|---|
| 관측 | 카메라 2개 + 관절 상태 9차원 | 같음 |
| 행동을 만드는 주체 | 사람 (리더 암 + 키보드) | 정책 (ACT) |
| 행동 | 팔 목표 위치 6 + 바퀴 속도 3 | 같음 |
| 주기 | 30 FPS | 같음 |

ACT는 [ACT 학습](/docs/a-go/train-act)에서 본 대로 행동을 100스텝 묶음으로 예측합니다. 매 스텝 새로 판단하는 것이 아니라 묶음을 순서대로 실행하다가 다 쓰면 다시 예측합니다. 그래서 동작이 부드럽지만, 환경이 갑자기 바뀌면 반응이 3초가량 늦을 수 있습니다. 안전 수칙에서 이 점을 다시 다룹니다.

### 1.1. 왜 전용 스크립트를 쓰는가

LeRobot 0.6.0의 표준 추론 명령은 `lerobot-rollout` 이지만(v0.5.1까지는 `lerobot-record`), LeKiwi에는 그대로 쓸 수 없습니다.

- `lekiwi_client` 를 불러오지 않아 `--robot.type=lekiwi_client` 를 인식하지 못합니다.
- 정책에 넘기는 관측과 행동에 팔 관절 위치(`.pos`)만 남기고 바퀴 속도(`x.vel`, `y.vel`, `theta.vel`)를 빼 버려, 9차원 LeKiwi 정책과 채널 수가 맞지 않고 바퀴도 움직이지 않습니다.

그래서 [제어 스크립트](/docs/a-go/start-custom-scripts)에서 받은 커스텀 저장소의 스크립트를 씁니다. 9채널 행동을 그대로 쓰면서 사전 검사, 바퀴 속도 제한, 일시정지, 시작 자세 복귀 같은 안전 장치를 더했습니다. 추론에 쓰는 스크립트는 세 가지이고 목적에 따라 고릅니다.

| 스크립트 | 언제 끝나는가 | 끝난 뒤 | 용도 |
|---|---|---|---|
| `lekiwi-rollout.py` | 지정한 시간 또는 ESC | 시작 자세로 복귀 | 실험, 디버깅 |
| `lekiwi-inference.py` | **ESC를 누를 때만** | 시작 자세로 복귀 | 시연, 계속 돌려 두기 |
| `lekiwi-evaluate.py` | N 에피소드 | 그 자리에 정지 | 성공률 측정 |

이 페이지에서는 `lekiwi-inference.py` 로 시연하고 `lekiwi-evaluate.py` 로 측정합니다.

---

## 2. [PC] 준비

실행용 PC로 돌아옵니다. [ACT 학습](/docs/a-go/train-act)의 훈련용 PC가 아니라 [텔레오퍼레이션](/docs/a-go/start-teleoperation)부터 로봇을 조작하던 PC입니다.

### 2.1. 환경과 모델 확인

```bash
# 우분투
conda activate lerobot060
cd ~/workspace/lekiwi
hf auth login --token <hf_복사한토큰>
hf auth whoami
```

```bat
:: 윈도우
conda activate lerobot060
cd %USERPROFILE%\workspace\lekiwi
hf auth login --token <hf_복사한토큰>
hf auth whoami
```

[ACT 학습](/docs/a-go/train-act)에서 Hub에 올린 모델을 쓰려면 로그인이 되어 있어야 합니다. 환경 변수는 [데이터 기록](/docs/a-go/dataset-record)부터 쓰던 것에 [ACT 학습](/docs/a-go/train-act)의 작업 설명을 더합니다.

```bash
# 우분투
export HF_USER="HueyWoo"
export TASK_NAME="lekiwi_pick_and_place"
export TASK_DESCRIPTION="Pick up the cube and place it in the box"
```

```bat
:: 윈도우
set "HF_USER=HueyWoo"
set "TASK_NAME=lekiwi_pick_and_place"
set "TASK_DESCRIPTION=Pick up the cube and place it in the box"
```

모델 위치는 두 가지 중 하나입니다.

| 상황 | `--policy.path` 값 |
|---|---|
| 훈련용 PC가 따로 있고 Hub에 올림 | `${HF_USER}/${TASK_NAME}_act` (처음 실행 시 자동 다운로드) |
| 같은 PC에서 학습함 | `outputs/train/act_lekiwi/${TASK_NAME}/checkpoints/last/pretrained_model` |

### 2.2. 환경 세팅

정책은 **학습 데이터와 비슷한 상황**에서만 잘 동작합니다. [데이터 기록](/docs/a-go/dataset-record)에서 기록할 때와 같은 조건을 맞춥니다.

- 물체와 상자의 위치, 책상 높이, 로봇의 시작 위치
- 조명과 배경. 카메라에 들어오는 장면이 크게 다르면 정책이 혼란을 겪습니다
- 카메라 각도. [카메라 포트 고정](/docs/a-go/setup-cameraport)에서 고정한 포트에 같은 카메라가 꽂혀 있어야 합니다

---

## 3. [Pi] 호스트 실행

텔레오퍼레이션과 같습니다. [제어 스크립트](/docs/a-go/start-custom-scripts)에서 만든 스크립트로 호스트를 띄우고 창을 그대로 둡니다.

```bash
./start_lekiwi_host.sh lekiwi07
```

---

## 4. [PC] 추론 실행

### 4.1. 명령

로봇 주변을 비우고, 손은 키보드 위에 둔 채 실행합니다. 처음에는 바퀴 속도를 30%로 낮춥니다.

```bash
# 우분투
python lekiwi-inference.py \
    --robot.remote_ip=192.168.0.207 \
    --robot.id=lekiwi07 \
    --policy.path=${HF_USER}/${TASK_NAME}_act \
    --task="${TASK_DESCRIPTION}" \
    --base_speed_scale=0.3 \
    --display_data=true
```

```bat
:: 윈도우
python lekiwi-inference.py ^
    --robot.remote_ip=192.168.0.207 ^
    --robot.id=lekiwi07 ^
    --policy.path=%HF_USER%/%TASK_NAME%_act ^
    --task="%TASK_DESCRIPTION%" ^
    --base_speed_scale=0.3 ^
    --display_data=true
```

| 옵션 | 의미 |
|---|---|
| `--robot.remote_ip`, `--robot.id` | [텔레오퍼레이션](/docs/a-go/start-teleoperation)부터 쓰던 LeKiwi 주소와 id |
| `--policy.path` | 모델 위치. Hub 이름 또는 로컬 체크포인트 경로 |
| `--task` | 작업 설명 문장. ACT는 언어 입력을 쓰지 않아 무시하지만, 언어 조건 정책으로 바꿀 때를 대비해 데이터셋과 같은 문장을 넘깁니다 |
| `--base_speed_scale` | 바퀴 속도 배율. `0.3` 으로 시작해 익숙해지면 `1.0`. `0` 이면 바퀴를 굴리지 않고 팔만 씁니다 |
| `--warmup_s` | 시작 시 현재 자세에서 첫 목표 자세까지 천천히 이동하는 시간. 기본 2초 |
| `--device` | 추론 장치. 생략하면 GPU가 있으면 GPU, 없으면 CPU를 자동 선택 |
| `--display_data` | Rerun 창에 카메라와 행동 그래프 표시 |

### 4.2. 실행 중 일어나는 일

스크립트는 로봇을 움직이기 전에 **사전 검사**를 합니다. 정책이 기대하는 행동 차원이 LeKiwi의 9채널과 맞는지, 정책이 기대하는 카메라 이름이 로봇이 주는 이름과 같은지 확인하고, 다르면 움직이지 않고 멈춥니다. 행동이 6차원인 정책이라면 팔만 학습한 것이니 [ACT 학습](/docs/a-go/train-act)으로 돌아가 다시 학습해야 합니다. 관측 상태 차원이 다를 때는 경고만 출력하고 계속합니다. 사전학습 모델을 파인튜닝한 정책(예: SmolVLA)은 config에 사전학습 때의 상태 차원이 남아 있을 수 있기 때문입니다.

검사를 통과하면 연결 직후의 팔 자세를 **시작 자세**로 기억해 두고, 준비 시간 동안 첫 목표 자세로 천천히 이동한 뒤 30 FPS 루프에 들어갑니다. Rerun 창에서 [텔레오퍼레이션](/docs/a-go/start-teleoperation)과 같은 화면이 보이고, 이번에는 `action` 그래프가 사람이 아니라 정책이 만든 값입니다.

### 4.3. 조작키

| 키 | 동작 |
|---|---|
| `SPACE` | 일시정지 / 재개. 정지 중에는 팔을 현재 자세로 고정하고 바퀴를 멈춥니다. 재개하면 남은 행동 묶음을 버리고 현재 관측부터 다시 예측합니다 |
| `ESC` | 정상 종료. 바퀴를 세우고 시작 자세로 천천히 복귀한 뒤 연결을 끊습니다. 복귀 중에 한 번 더 누르면 복귀를 즉시 중단합니다 |
| `Ctrl + C` | 비상 정지. 복귀 없이 그 자리에서 멈춥니다 |

정상 종료와 비상 정지의 차이가 중요합니다. 복귀도 사람이 개입하지 않는 자율 동작이므로, 로봇 상태를 모르거나 위험을 느껴 멈춘 상황에서는 하지 않는 것이 원칙입니다. 그래서 오류로 끝났을 때와 `Ctrl + C` 는 복귀하지 않습니다. 복귀 자체를 끄려면 `--return_home=false` 를 붙입니다.

---

## 5. [PC] 정책 평가

시연이 되는 것과 **얼마나 자주** 성공하는지는 다른 문제입니다. [ACT 학습](/docs/a-go/train-act)에서 체크포인트를 여러 개 저장해 둔 이유가 여기 있습니다. 평가 스크립트는 정해진 횟수만큼 에피소드를 돌리고, 사람이 매번 성공과 실패를 판정하면 성공률과 추론 지연을 리포트로 남깁니다.

```bash
# 우분투
python lekiwi-evaluate.py \
    --robot.remote_ip=192.168.0.207 \
    --robot.id=lekiwi07 \
    --policy.path=${HF_USER}/${TASK_NAME}_act \
    --task="${TASK_DESCRIPTION}" \
    --eval.n_episodes=10 \
    --eval.episode_time_s=30 \
    --eval.reset_time_s=10
```

```bat
:: 윈도우
python lekiwi-evaluate.py ^
    --robot.remote_ip=192.168.0.207 ^
    --robot.id=lekiwi07 ^
    --policy.path=%HF_USER%/%TASK_NAME%_act ^
    --task="%TASK_DESCRIPTION%" ^
    --eval.n_episodes=10 ^
    --eval.episode_time_s=30 ^
    --eval.reset_time_s=10
```

| 옵션 | 의미 |
|---|---|
| `--eval.n_episodes` | 평가 에피소드 수 |
| `--eval.episode_time_s` | 에피소드 최대 길이. 지나면 판정을 물어봅니다 |
| `--eval.reset_time_s` | 에피소드 사이 리셋 시간. 로봇은 멈춰 있고 사람이 물체를 제자리에 돌려놓습니다 |
| `--eval.tag` | 리포트 파일 이름 꼬리표. 체크포인트 비교에 씁니다 |

| 키 | 언제 | 동작 |
|---|---|---|
| `S` / `F` | 에피소드 중, 판정 대기 중 | 성공 / 실패로 기록하고 종료 |
| `→` | 에피소드 중 | 판정 보류하고 종료. 나중에 다시 물어봅니다 |
| `→` | 리셋 구간 | 리셋을 끝내고 다음 에피소드로 |
| `SPACE` | 에피소드 중 | 일시정지. 정지 중에는 에피소드 시간이 흐르지 않습니다 |
| `ESC` | 언제나 | 평가 전체 중단 |

리포트는 `outputs/eval/` 아래 JSON으로 저장되고 터미널에도 표로 나옵니다.

```text
  ep      판정   길이(s)     스텝   추론(ms)   루프(Hz)
   1      성공      12.4      372       18.2       29.8
   2      실패      30.0      900       17.9       29.9
...
성공률: 7/10 = 70.0%
평균 추론 18.1 ms | 평균 루프 29.8 Hz
```

**체크포인트 비교**는 같은 조건으로 두 번 돌려 성공률을 나란히 놓는 것입니다. 위 평가 명령에서 `--policy.path` 를 비교할 체크포인트 경로로 바꾸고, 리포트를 구분할 `--eval.tag` 를 붙입니다. 3만 스텝 체크포인트라면 다음과 같습니다.

```bash
# 우분투
python lekiwi-evaluate.py \
    --robot.remote_ip=192.168.0.207 \
    --robot.id=lekiwi07 \
    --policy.path=outputs/train/act_lekiwi/${TASK_NAME}/checkpoints/030000/pretrained_model \
    --task="${TASK_DESCRIPTION}" \
    --eval.n_episodes=10 \
    --eval.episode_time_s=30 \
    --eval.reset_time_s=10 \
    --eval.tag=step030k
```

```bat
:: 윈도우
python lekiwi-evaluate.py ^
    --robot.remote_ip=192.168.0.207 ^
    --robot.id=lekiwi07 ^
    --policy.path=outputs/train/act_lekiwi/%TASK_NAME%/checkpoints/030000/pretrained_model ^
    --task="%TASK_DESCRIPTION%" ^
    --eval.n_episodes=10 ^
    --eval.episode_time_s=30 ^
    --eval.reset_time_s=10 ^
    --eval.tag=step030k
```

같은 명령에서 `030000` 을 `050000` 으로, `step030k` 를 `step050k` 로 바꿔 한 번 더 실행하고 두 리포트의 성공률을 비교합니다. 중간 체크포인트는 Hub에 올라가지 않고 학습한 PC에만 있으므로, 훈련용 PC가 따로 있다면 비교할 `pretrained_model` 폴더를 실행용 PC로 옮긴 뒤 그 경로를 `--policy.path` 에 넣습니다.

[ACT 학습](/docs/a-go/train-act)에서 말한 대로 스텝이 많은 쪽이 항상 좋지는 않습니다. 데이터가 적을 때는 중간 체크포인트가 더 안정적인 경우도 있으니 숫자로 확인하고 고릅니다.

> **팁** 💡`TIP`
> <br>추론 지연(ms)이 33ms를 넘으면 30 FPS를 못 맞추는 것입니다. 루프 Hz가 30에 못 미치면 `--device` 를 확인하거나 GPU가 있는 PC로 옮깁니다. ACT는 CPU에서도 대체로 30 FPS 안에 들어옵니다.

---

## 6. 안전 수칙

정책은 학습 때 보지 못한 상황에서 어떤 행동을 할지 알 수 없습니다. 자율 실행을 할 때는 다음을 지킵니다.

1. 로봇 주변에 사람과 물건을 두지 않습니다. 바퀴가 달린 로봇이라 팔뿐 아니라 몸체도 움직입니다.
2. 처음 돌리는 모델은 `--base_speed_scale=0.3` 이하로 시작합니다. 팔만 확인하려면 `0` 으로 둡니다.
3. 손은 항상 `SPACE` 와 `ESC` 위에 둡니다. 행동 묶음 때문에 반응이 늦을 수 있어 사람이 먼저 멈춰야 합니다.
4. 위험하다고 느끼면 `Ctrl + C` 로 즉시 멈춥니다. 복귀 동작을 기다릴 필요가 없습니다.
5. 배터리가 낮으면 모터 힘이 약해져 학습 때와 다른 동작이 나옵니다. 충분히 충전된 상태에서 실행합니다.

---

## 7. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 사전 검사에서 행동 차원 불일치 | 6차원이면 팔만 학습된 모델. [ACT 학습](/docs/a-go/train-act)에서 LeKiwi 데이터셋으로 다시 학습 |
| 카메라 키 불일치 | 호스트의 카메라 이름이 `front`, `wrist` 인지 확인. 다른 이름의 데이터셋으로 학습했다면 `--rename_map='{"observation.images.front": "observation.images.<학습때이름>"}'` |
| 모델을 찾지 못함 | `hf auth whoami` 로 로그인 확인. `--policy.path` 오타. 로컬 경로면 `pretrained_model` 폴더까지 지정 |
| 연결 대기 후 timeout | Pi 호스트가 떠 있는지, `--robot.remote_ip` 가 맞는지, PC와 Pi가 같은 와이파이에 있는지. [텔레오퍼레이션](/docs/a-go/start-teleoperation) 문제 해결 참고 |
| 루프가 30 Hz에 못 미침 | `--device=cuda` 확인. CPU만 있으면 Rerun을 끄고(`--display_data=false`) 재시도 |
| 로봇이 엉뚱하게 움직임 | 물체 위치, 조명, 카메라 각도가 학습 데이터와 다른지 확인. 데이터 수가 적으면 [데이터 기록](/docs/a-go/dataset-record)에서 에피소드 추가 |
| 팔이 시작 자세로 안 돌아옴 | 오류 또는 `Ctrl + C` 로 끝난 경우 정상. `ESC` 로 끝내면 복귀 |

---

## 8. 정리

- 추론은 텔레오퍼레이션 루프에서 **사람 자리에 정책을 넣은 것**이며 관측, 행동, 주기는 같습니다.
- LeKiwi는 9차원 행동과 안전한 종료가 필요해 전용 스크립트를 쓰며, 시연은 `lekiwi-inference.py`, 측정은 `lekiwi-evaluate.py` 입니다.
- 처음에는 바퀴 속도를 낮추고, `SPACE` 와 `ESC` 를 언제든 누를 수 있게 준비합니다.
- 성공률은 같은 조건에서 체크포인트별로 측정해 비교합니다.

여기까지가 LeKiwi 한 사이클입니다. 연결, 캘리브레이션, 텔레오퍼레이션, 데이터 기록, 학습, 추론을 모두 거쳤습니다. 성공률이 낮다면 대개 모델보다 데이터가 원인이니, [데이터 기록](/docs/a-go/dataset-record)으로 돌아가 에피소드를 늘리고 [데이터셋 편집](/docs/a-go/dataset-edit)에서 실패한 에피소드를 걸러내는 것이 다음 단계입니다.

언어 명령을 이해하는 VLA 정책도 써 보고 싶다면 [SmolVLA 학습](/docs/a-go/train-smolvla) → [SmolVLA 추론](/docs/a-go/inference-smolvla)으로 이어집니다.
