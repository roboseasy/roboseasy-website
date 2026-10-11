---
title: "SmolVLA 학습"
category: "a-go"
group: "Training"
order: 190
---

# SmolVLA 파인튜닝

LeKiwi로 수집한 데이터셋에 `lerobot/smolvla_base`를 파인튜닝하는 과정을 단계별로 익힙니다. 실습 중 실제로 마주치는 오류와 그 원인을 소스코드 수준에서 함께 다룹니다. 학습은 [ACT 학습](/docs/a-go/train-act)과 마찬가지로 **훈련용 GPU PC**에서 진행합니다.

> **정보** ℹ️ `INFO`
> <br>이 페이지는 **LeRobot v0.6.0** 기준입니다. 데이터셋은 [Dataset Record](/docs/a-go/dataset-record)에서 기록하고 Hub에 올린 것을 사용합니다.

---

## 1. SmolVLA란?

**SmolVLA**(Small Vision-Language-Action)는 Hugging Face가 공개한 경량 VLA 정책입니다.

| 구성요소 | 내용 |
|---|---|
| VLM 백본 | `HuggingFaceTB/SmolVLM2-500M-Video-Instruct` (앞쪽 16개 레이어만 사용) |
| Action Expert | Flow-matching 기반 액션 디코더 (VLM hidden size의 0.75배 폭) |
| 입력 | 카메라 이미지 N장 + 로봇 관절 상태(state) + 자연어 태스크 문장 |
| 출력 | 액션 청크 50 스텝 (`chunk_size=50`) |
| 추론 메모리 | 약 2GB (참고: PI0는 약 14GB) |

**핵심 아이디어**: 대규모 로봇 데이터로 사전학습된 `smolvla_base`를 가져와, 내 로봇·내 태스크 데이터 수백 에피소드로 **파인튜닝**하면 밑바닥부터 학습하는 것보다 훨씬 적은 데이터로 동작하는 정책을 얻을 수 있습니다.

> 근거 파일: `src/lerobot/policies/smolvla/configuration_smolvla.py`

---

## 2. 사전 준비

### 2-1. 설치

훈련용 PC의 conda 환경(`lerobot060`)에서 설치합니다. 추론할 실행용 PC에도 같은 extra가 필요합니다.

```bash
conda activate lerobot060
cd ~/lerobot
pip install -e ".[smolvla]"    # 소스 설치인 경우
# 또는
pip install "lerobot[smolvla]==0.6.0"
```

`smolvla` extra에는 `transformers`, `num2words`, `accelerate` 등 VLM 백본에 필요한 패키지가 들어있습니다. 이 extra 없이 실행하면 import 에러가 납니다.

### 2-2. Hugging Face 로그인

학습 결과를 Hub에 올리려면(`--policy.push_to_hub=true`) 토큰이 필요합니다.

```bash
hf auth login          # write 권한 토큰 입력
hf auth whoami         # 확인
```

### 2-3. 데이터셋 카메라 키 확인 ⭐ 가장 중요

학습을 시작하기 **전에** 반드시 내 데이터셋의 관측(observation) 키 이름을 확인하세요. 3절의 `rename_map`을 정하는 근거가 됩니다.

```bash
python -c "
from lerobot.datasets.lerobot_dataset import LeRobotDatasetMetadata
m = LeRobotDatasetMetadata('roboseasy/lekiwi_pick_and_place')
print('에피소드 수 :', m.total_episodes)
print('프레임 수   :', m.total_frames)
print('FPS        :', m.fps)
for k, v in m.features.items():
    print(f'  {k:45s} {v[\"dtype\"]:10s} {v[\"shape\"]}')
"
```

50 에피소드를 기록한 `lekiwi_pick_and_place` 데이터셋의 출력 예시:

```text
에피소드 수 : 50
프레임 수   : 11386
FPS        : 30
  action                                        float32    (9,)
  observation.state                             float32    (9,)
  observation.images.front                      video      (480, 640, 3)
  observation.images.wrist                      video      (480, 640, 3)
  timestamp / frame_index / episode_index / index / task_index    (메타데이터)
```

여기서 읽어낼 것 두 가지:

1. **카메라 키는 `front`, `wrist` 2개** → 3절의 `rename_map`을 이렇게 정합니다.
2. **state/action이 9차원** → LeKiwi는 팔 6축 + 모바일 베이스 3축이기 때문입니다.

```bash
# 차원별 이름 확인
python -c "
from lerobot.datasets.lerobot_dataset import LeRobotDatasetMetadata
m = LeRobotDatasetMetadata('roboseasy/lekiwi_pick_and_place')
print(m.features['action']['names'])
"
```

```text
['arm_shoulder_pan.pos', 'arm_shoulder_lift.pos', 'arm_elbow_flex.pos',
 'arm_wrist_flex.pos',   'arm_wrist_roll.pos',    'arm_gripper.pos',   # 팔 6축
 'x.vel', 'y.vel', 'theta.vel']                                        # 베이스 3축
```

> **팁** 💡`TIP`
> <br>**9차원인데 `smolvla_base`는 6차원으로 학습됐는데 괜찮나요?** 괜찮습니다. 5-1절에서 설명합니다.

---

## 3. 학습 명령어 (최종본)

```bash
export HF_USER="roboseasy"        # 본인의 Hugging Face 계정명으로 변경
export TASK_NAME="lekiwi_pick_and_place"

lerobot-train \
  --policy.path=lerobot/smolvla_base \
  --dataset.repo_id=${HF_USER}/${TASK_NAME} \
  --rename_map='{"observation.images.front": "observation.images.camera1", "observation.images.wrist": "observation.images.camera2"}' \
  --policy.repo_id=${HF_USER}/${TASK_NAME}_smolvla \
  --policy.device=cuda \
  --job_name=${TASK_NAME}_smolvla \
  --output_dir=outputs/train/smolvla_lekiwi/${TASK_NAME} \
  --steps=20_000 \
  --batch_size=16 \
  --num_workers=8 \
  --save_checkpoint=true \
  --save_freq=5_000 \
  --wandb.enable=false \
  --policy.push_to_hub=true
```

> **경고** ⚠️ `WARN`
> <br>`--rename_map`의 JSON은 **반드시 작은따옴표로 감싸고 한 줄로** 작성하세요. 줄바꿈이 들어가면 셸이 다른 인자로 쪼개서 파싱 에러가 납니다.

### 인자 해설

| 인자 | 의미 | 팁 |
|---|---|---|
| `--policy.path` | 파인튜닝할 사전학습 체크포인트 | `lerobot/smolvla_base`가 공식 베이스. 이 값이 있으면 `--policy.type`은 생략 가능 |
| `--dataset.repo_id` | 학습 데이터셋 | Hub id 또는 `--dataset.root`로 로컬 경로 지정 |
| `--rename_map` | 데이터셋 키 → 정책 키 이름 변환 | **4절 참고**. 사전학습 체크포인트가 있을 때만 사용 가능 |
| `--policy.repo_id` | Hub 업로드 대상 repo | `--policy.push_to_hub=true`일 때 필수 |
| `--policy.device` | `cuda` / `mps` / `cpu` | 사용 불가한 값이면 자동으로 대체 장치로 전환됨 |
| `--steps` | 총 학습 스텝(에폭 아님) | 20k는 소규모 데이터셋용. 데이터가 많으면 50k~100k |
| `--batch_size` | 배치 크기 | OOM 나면 8 → 4로 낮추기 |
| `--num_workers` | DataLoader 워커 수 | 비디오 디코딩이 병목. CPU 코어 수의 절반 정도 |
| `--save_freq` | 체크포인트 저장 주기(스텝) | 20k 학습에 5k면 총 4개 + 마지막 |
| `--wandb.enable` | Weights & Biases 로깅 | `true`로 켜면 loss 곡선을 웹에서 확인 가능 (권장) |

---

## 4. 핵심 개념 — `rename_map`은 왜 필요한가?

### 문제 상황

`lerobot/smolvla_base`는 카메라를 `camera1`, `camera2`, `camera3`이라는 **일반화된 이름**으로 학습했습니다. 그런데 내 데이터셋은 `front`, `wrist`입니다.

그대로 실행하면:

```text
ValueError: Feature mismatch between dataset/environment and policy config.
- Missing features: ['observation.images.camera1', 'observation.images.camera2',
                     'observation.images.camera3']
- Extra features:   ['observation.images.front', 'observation.images.wrist']
```

### 검증 로직

`src/lerobot/policies/utils.py`의 `validate_visual_features_consistency()`는 아래 **둘 중 하나**를 만족하면 통과시킵니다.

```python
policy_subset_of_dataset = expected_visuals.issubset(provided_visuals)   # 정책 ⊆ 데이터셋
dataset_subset_of_policy = provided_visuals.issubset(expected_visuals)   # 데이터셋 ⊆ 정책

if not (policy_subset_of_dataset or dataset_subset_of_policy):
    raise_feature_mismatch_error(...)
```

`{front, wrist}`와 `{camera1, camera2, camera3}`는 교집합이 아예 없으므로 둘 다 실패 → 에러.

`rename_map`으로 `front→camera1`, `wrist→camera2`를 적용하면 `{camera1, camera2} ⊆ {camera1, camera2, camera3}` 이 되어 통과합니다.

> 참고: `src/lerobot/policies/factory.py`에서 `rename_map`이 비어있지 않으면 이 검증 자체를 건너뜁니다. 즉 rename_map을 쓰면 이름은 사용자 책임입니다.

### 카메라가 2개뿐이어도 되는 이유

`camera3`이 없어도 괜찮습니다. `modeling_smolvla.py`의 `prepare_images()`를 보면:

```python
present_img_keys = [key for key in self.config.image_features if key in batch]
missing_img_keys = [key for key in self.config.image_features if key not in batch]

if len(present_img_keys) == 0:
    raise ValueError("All image features are missing from the batch. At least one expected.")

for key in present_img_keys:      # 있는 것만 사용
    ...
for num_empty_cameras in range(len(missing_img_keys)):
    if num_empty_cameras >= self.config.empty_cameras:   # 기본값 0
        break                                            # → 더미로 채우지 않음
```

**최소 1개의 카메라만 있으면 동작**하고, 없는 카메라는 그냥 제외됩니다.

### 매핑 순서를 정하는 기준

| 데이터셋 키 | 매핑 대상 | 이유 |
|---|---|---|
| `front` (외부/전방 뷰) | `camera1` | 사전학습에서 첫 번째 슬롯이 주(main) 시점 역할 |
| `wrist` (손목 뷰) | `camera2` | 보조 시점 |

> **팁** 💡`TIP`
> <br>**정답이 하나로 정해진 것은 아닙니다.** 중요한 것은 **학습과 추론에서 동일한 매핑을 쓰는 것**입니다. 학습 때 `front→camera1`로 했는데 추론 때 `wrist→camera1`로 하면 정책이 전혀 다른 그림을 보게 됩니다. (학습 시 지정한 rename은 preprocessor에 함께 저장되므로, 같은 체크포인트를 그대로 불러 쓰면 자동 적용됩니다.)

---

## 5. 차원·설정 이해하기

### 5-1. state/action 차원이 달라도 되는 이유

학습 로그 맨 위에 찍히는 config를 보면 이렇게 나옵니다.

```text
'input_features':  {'observation.images.camera1': ... ,
                    'observation.state': {'shape': [6], ...}},
'output_features': {'action': {'shape': [6], ...}},
```

내 데이터셋은 9차원인데 6차원이라고 나와서 당황할 수 있는데, **이 로그는** **`make_policy()`가 호출되기 전(`lerobot_train.py`의 config 출력 시점)의 사전학습 config를 그대로 찍은 것**입니다. 실제 정책 생성 시 두 가지가 일어납니다.

**① output_features는 데이터셋 기준으로 항상 덮어써집니다** — `policies/factory.py`:

```python
cfg.output_features = {key: ft for key, ft in features.items() if ft.type is FeatureType.ACTION}
if not cfg.input_features:          # 사전학습 config에 이미 있으면 유지
    cfg.input_features = {...}
```

→ `action`은 `(9,)`로 교체됩니다. 모델이 출력하는 액션 차원도 9가 됩니다 (`modeling_smolvla.py`의 `original_action_dim = self.config.action_feature.shape[0]`).

**② state/action은 실행 시점에 32차원으로 패딩됩니다** — `modeling_smolvla.py`:

```python
def prepare_state(self, batch):
    state = batch[OBS_STATE][:, -1, :] if batch[OBS_STATE].ndim > 2 else batch[OBS_STATE]
    return pad_vector(state, self.config.max_state_dim)    # max_state_dim = 32

def prepare_action(self, batch):
    return pad_vector(batch[ACTION], self.config.max_action_dim)   # max_action_dim = 32
```

6차원이든 9차원이든 32차원으로 zero-padding되어 모델에 들어가고, 출력에서 앞쪽 9차원만 잘라 씁니다. **그래서 로봇마다 관절 수가 달라도 같은 베이스 모델을 파인튜닝할 수 있습니다.** 이것이 SmolVLA가 범용 베이스 모델로 기능하는 핵심 장치입니다.

> 단, `input_features`의 `observation.state` shape는 사전학습 값(6)이 그대로 남습니다. 정규화(normalizer)는 feature shape가 아니라 **데이터셋 stats 텐서**를 기준으로 동작하므로 실제 학습에는 문제가 없습니다.

### 5-2. 파인튜닝 기본 설정

`SmolVLAConfig`의 파인튜닝 관련 기본값입니다. 대부분 **그대로 두는 것이 좋습니다.**

```python
freeze_vision_encoder: bool = True    # 비전 인코더 동결 (메모리·과적합 감소)
train_expert_only:     bool = True    # Action Expert만 학습, VLM은 동결
train_state_proj:      bool = True    # state 투영층은 학습 (로봇마다 관절이 다르므로)
```

학습 프리셋(옵티마이저/스케줄러)도 config에 내장되어 있습니다:

```python
optimizer_lr:            1e-4          # AdamW
optimizer_grad_clip_norm: 10
scheduler_warmup_steps:  1_000         # Cosine decay with warmup
scheduler_decay_steps:   30_000
scheduler_decay_lr:      2.5e-6
```

- `--use_policy_training_preset=true`(기본값)이면 위 값이 자동 적용됩니다. 개별 조정은 `--policy.optimizer_lr=5e-5` 처럼 할 수 있습니다.

### 5-3. 자주 만지는 하이퍼파라미터

```bash
--policy.freeze_vision_encoder=false   # 데이터가 충분히 많을 때 비전까지 학습 (VRAM ↑)
--policy.train_expert_only=false       # VLM까지 전체 파인튜닝 (VRAM 대폭 ↑)
--policy.chunk_size=50                 # 액션 청크 길이
--policy.n_action_steps=50             # 한 번 추론으로 실행할 스텝 수 (≤ chunk_size)
--policy.optimizer_lr=1e-4             # 학습률
```

---

## 6. 자주 겪는 오류와 해결법

### 오류 ① `unrecognized arguments: --policy.dtype=bfloat16`

```text
lerobot-train: error: unrecognized arguments: --dtype=bfloat16
```

**원인**: `dtype` 필드는 모든 정책에 있는 게 아닙니다. `pi0`, `pi05`, `pi0_fast`, `eo1`, `xvla`, `lingbot_va`에만 있고 **`smolvla`에는 없습니다.**

`src/lerobot/scripts/lerobot_train.py`:

```python
# Drive Accelerate's autocast from policy.dtype (bf16/fp16 activate it; float32/absent -> launcher default).
policy_dtype = getattr(cfg.trainable_config, "dtype", None)
mixed_precision = {"bfloat16": "bf16", "float16": "fp16", "float32": "no"}.get(policy_dtype)
```

**해결**: 해당 인자를 빼면 됩니다. bf16 혼합정밀 학습이 꼭 필요하면 accelerate 런처로 지정:

```bash
accelerate launch --mixed_precision=bf16 $(which lerobot-train) \
  --policy.path=lerobot/smolvla_base \
  ...  # 나머지 동일
```

> 주의: `--policy.use_amp=true`는 **파싱은 되지만 학습 스크립트에서 사용되지 않습니다.** 이 플래그는 `lerobot_eval.py`에서만 쓰입니다. 학습에서 AMP를 쓰려면 위 방법을 쓰세요.

---

### 오류 ② `Feature mismatch between dataset/environment and policy config`

4절 참고. `--rename_map`으로 해결합니다.

체크리스트:

1. 2-3절 명령으로 데이터셋의 실제 카메라 키를 확인했는가?
2. rename_map JSON이 한 줄이고 작은따옴표로 감싸졌는가?
3. 매핑 결과가 `camera1`, `camera2`, `camera3` 중 일부인가?

---

### 오류 ③ `FileExistsError: Output directory ... already exists`

```text
FileExistsError: Output directory outputs/train/... already exists and resume is False.
```

**원인**: `TrainPipelineConfig.validate()`가 덮어쓰기를 막습니다.

**해결** — 셋 중 하나:

```bash
rm -rf outputs/train/smolvla_lekiwi/${TASK_NAME}   # ① 지우고 새로 학습
--output_dir=outputs/train/smolvla_lekiwi/run2     # ② 다른 경로 사용
--resume=true                                       # ③ 이어서 학습 (7절 참고)
```

---

### 오류 ④ CUDA out of memory

우선순위대로 시도하세요.

```bash
--batch_size=8                          # ① 배치 절반으로
--num_workers=4                         # ② 워커 줄이기 (프리페치 메모리 감소)
--policy.freeze_vision_encoder=true     # ③ 기본값 확인 (true여야 함)
--policy.train_expert_only=true         # ④ 기본값 확인 (true여야 함)
--policy.resize_imgs_with_padding="[256, 256]"   # ⑤ 입력 해상도 축소 (성능 저하 감수)
```

---

## 7. 체크포인트 구조와 이어서 학습하기

### 저장 구조

```text
outputs/train/smolvla_lekiwi/lekiwi_pick_and_place/
└── checkpoints/
    ├── 005000/
    │   ├── pretrained_model/      # 정책 가중치 + config + preprocessor
    │   └── training_state/        # 옵티마이저·스케줄러·스텝 (resume용)
    ├── 010000/
    ├── 015000/
    ├── 020000/
    └── last -> 020000             # 최신 체크포인트 심볼릭 링크
```

> 상수 정의: `src/lerobot/utils/constants.py` (`CHECKPOINTS_DIR`, `LAST_CHECKPOINT_LINK`, `PRETRAINED_MODEL_DIR`, `TRAINING_STATE_DIR`)

### 이어서 학습

- `--config_path`로 체크포인트를 가리키고 `--resume=true`를 붙입니다.

```bash
# 로컬 체크포인트에서 재개
lerobot-train \
  --config_path=outputs/train/smolvla_lekiwi/${TASK_NAME}/checkpoints/last/pretrained_model \
  --resume=true

# Hub repo에서 재개 (최신 체크포인트를 자동으로 내려받음)
lerobot-train --config_path=${HF_USER}/${TASK_NAME}_smolvla --resume=true
```

> 재개 시에는 **체크포인트에 저장된 설정이 기본으로 사용**됩니다. 바꾸고 싶은 값만 CLI 플래그로 덮어쓰면 됩니다 (예: `--steps=40_000`).

---

---

## 8. 0.6.0 데이터로딩 개선 — 무엇이 자동이고 무엇이 수동인가

0.6.0 릴리스 노트는 "비디오 데이터셋 학습이 최대 2배 빨라졌다"고 말합니다. **교육 목적상 중요한 것은 어느 것이 기본으로 켜져 있고 어느 것이 직접 켜야 하는지**입니다.

| 개선 사항 | 기본 동작 | 근거 |
|---|---|---|
| **멀티캠 병렬 디코딩** | ✅ **자동** (카메라 2개 이상일 때) | `datasets/dataset_reader.py` |
| **persistent worker 디코더 캐시** | ✅ **자동** (`persistent_workers: bool = True`) | `configs/train.py` |
| **결정적·재개 가능 샘플링** | ✅ **자동** | `compute_sampler_state()` + `sampler.load_state_dict()` |
| **uint8 프레임 전달** | ❌ **수동 (기본 `False`)** | `configs/default.py`: `return_uint8: bool = False` |

멀티캠 병렬 디코딩은 이렇게 동작합니다:

```python
# 카메라 1개: 스레딩 오버헤드 없이 그대로
if len(items) <= 1:
    return {vid_key: _decode_single(vid_key, query_ts)[1] for vid_key, query_ts in items}

# 카메라 2개 이상: 병렬 디코딩 (비디오 디코딩은 GIL을 놓음)
with ThreadPoolExecutor(max_workers=len(items)) as pool:
    futures = [pool.submit(_decode_single, k, ts) for k, ts in items]
    return dict(f.result() for f in futures)
```

우리 LeKiwi 데이터셋은 `front` + `wrist` **2캠**이므로 이 경로를 자동으로 탑니다.

### uint8 전달은 직접 켜야 합니다

워커 프로세스가 float32 대신 uint8로 프레임을 넘기면 IPC 전송량이 1/4로 줄어 데이터로딩 병목이 있을 때 효과가 큽니다. **기본값이 `False`이므로 플래그를 추가하세요.**

```bash
lerobot-train \
  ... \
  --dataset.return_uint8=true \
  --num_workers=8 \
  --persistent_workers=true
```

> 앞선 학습 로그를 다시 보면 `'return_uint8': False`, `'persistent_workers': True`로 찍혀 있습니다. 설정이 실제로 어떻게 들어갔는지는 항상 이 config 덤프로 확인하세요.

**효과 판단법**: 9절의 wandb 지표에서 `dataloading_s`가 `update_s`보다 크면 데이터로딩 병목입니다. 이때 `--dataset.return_uint8=true`와 `--num_workers` 증가가 듣습니다. 반대로 `update_s`가 훨씬 크면 GPU 병목이라 이 옵션으로는 거의 달라지지 않습니다.

---

## 9. 학습이 잘 되고 있는지 판단하기

- `--wandb.enable=true`를 켜고 다음을 봅니다.

| 지표 | 정상 패턴 |
|---|---|
| `loss` | 초반 급락 후 완만한 하강. 1k 스텝 부근까지는 warmup이라 불안정해도 정상 |
| `lr` | 0 → 1e-4 (1k 스텝 warmup) → cosine으로 2.5e-6까지 감소 |
| `grad_norm` | 10 근처에서 clipping. 계속 10에 붙어있으면 lr을 낮춰볼 것 |
| `dataloading_s` | 이 값이 `update_s`보다 크면 데이터 로딩 병목 → `--num_workers` 증가 |

**현실적인 기준**: loss 숫자보다 **실제 로봇에서의 성공률**이 진짜 지표입니다. 5k / 10k / 20k 체크포인트를 각각 로봇에 올려 비교해 보세요. 소규모 데이터셋에서는 20k보다 10k가 더 나은 경우도 흔합니다(과적합).

### 데이터 양과 스텝 수 감

이번 실습 데이터셋은 **50 에피소드 / 11,386 프레임**입니다. batch_size 16 기준으로 20,000 스텝이면 약 320,000 샘플 = 전체 데이터를 **약 28회 반복**하는 셈입니다.

| 데이터 규모 | 권장 steps | 비고 |
|---|---|---|
| ~50 에피소드 | 15k ~ 20k | 이번 실습. 과적합 주의, 중간 체크포인트 비교 필수 |
| 100~200 에피소드 | 30k ~ 50k | `scheduler_decay_steps` 기본값 30k와 잘 맞음 |
| 500+ 에피소드 | 50k ~ 100k | `--policy.freeze_vision_encoder=false` 고려 |

> 성능이 안 나올 때 스텝을 늘리는 것보다 **데이터를 더 모으는 것**이 거의 항상 효과적입니다. 특히 실패·복구 상황이 담긴 에피소드가 정책을 크게 개선합니다.

---

## 10. 실습 과제

1. 2-3절 스크립트로 자기 데이터셋의 카메라 키를 출력하고, 알맞은 `rename_map`을 직접 작성해 보기
2. 일부러 `--rename_map`을 빼고 실행해서 오류 ②를 재현하고, 에러 메시지를 읽어 보기
3. `--steps=1000 --save_freq=500`으로 짧게 돌려 체크포인트 디렉터리 구조 확인하기
4. `--resume=true`로 이어 학습이 되는지 확인하기
5. `--batch_size`를 2배로 올려 VRAM 사용량 변화를 `nvidia-smi`로 관찰하기
6. `--dataset.return_uint8=true`를 켜고 끄며 wandb의 `dataloading_s` 변화 비교하기

---

## 부록 — 빠른 참조

```bash
# 데이터셋 정보 확인 (에피소드 수, feature 키, 태스크 문장)
python -c "from lerobot.datasets.lerobot_dataset import LeRobotDatasetMetadata as M; \
           m=M('HF_USER/DATASET'); print(m.total_episodes, list(m.features), list(m.tasks.index))"

# 사용 가능한 정책 인자 전체 보기
lerobot-train --policy.path=lerobot/smolvla_base --help

# 학습 (핵심 4개 인자)
lerobot-train --policy.path=lerobot/smolvla_base \
              --dataset.repo_id=HF_USER/DATASET \
              --rename_map='{"observation.images.front": "observation.images.camera1"}' \
              --output_dir=outputs/train/my_run

# 재개
lerobot-train --config_path=outputs/train/my_run/checkpoints/last/pretrained_model --resume=true
```

### 관련 소스 파일

| 경로 | 역할 |
|---|---|
| `src/lerobot/policies/smolvla/configuration_smolvla.py` | SmolVLA 하이퍼파라미터 정의 |
| `src/lerobot/policies/smolvla/modeling_smolvla.py` | 모델 구현 (`prepare_images` 등) |
| `src/lerobot/policies/utils.py` | feature 일치 검증 |
| `src/lerobot/policies/factory.py` | 정책 생성 (`make_policy`) |
| `src/lerobot/configs/train.py` | `TrainPipelineConfig` — 학습 전반 설정 |
| `src/lerobot/scripts/lerobot_train.py` | 학습 루프 |
| `src/lerobot/processor/rename_processor.py` | `rename_map` 적용 |
| `src/lerobot/datasets/dataset_reader.py` | 멀티캠 병렬 디코딩 |

---

## 다음 단계

<div class="card-grid">
  <a href="/docs/a-go/inference-smolvla" class="card">
    <h3>🤖 SmolVLA 추론</h3>
    <p>학습한 SmolVLA 정책으로 LeKiwi를 자율 실행합니다 (lerobot-rollout · RTC)</p>
  </a>
</div>
