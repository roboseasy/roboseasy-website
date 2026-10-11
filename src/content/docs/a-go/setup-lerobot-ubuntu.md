---
title: "LeRobot 설치 (Ubuntu)"
category: "a-go"
group: "PC 환경 세팅"
order: 40
---

# [Ubuntu] LeRobot 라이브러리 환경 세팅

LeKiwi 실습에는 두 종류의 PC가 등장합니다. 한 대의 PC로 두 역할을 모두 해도 됩니다.

| 역할 | 하는 일 | 설치할 extras |
|---|---|---|
| **실행용 PC** | 리더 암 연결, 텔레오퍼레이션, 데이터 기록, 모델 추론 | `core_scripts,feetech,lekiwi` |
| **훈련용 PC** (GPU) | Hub에서 데이터셋을 받아 정책 학습 | `training` |

1~3단계는 두 PC 모두 같고, 4단계에서 역할에 맞는 extras를 설치합니다.

## 1. Miniconda 설치

OS나 CPU 아키텍처(하드웨어)와 상관없이 아래 명령어로 Miniconda를 설치합니다.

```bash
wget "https://repo.anaconda.com/miniconda/Miniconda3-latest-$(uname)-$(uname -m).sh"
bash Miniconda3-latest-$(uname)-$(uname -m).sh
```

내 컴퓨터에서는 어떤 값이 나오는지 궁금하다면 터미널에 아래 명령어를 각각 입력합니다.

```bash
echo $(uname)
echo $(uname -m)
```

| 변수 | 의미 | 대표적인 실제 값 |
|---|---|---|
| `$(uname)` | 운영체제(OS)의 이름 | `Linux` (리눅스/우분투 등), `Darwin` (macOS) |
| `$(uname -m)` | CPU 아키텍처 (하드웨어) | `x86_64` (인텔/AMD 64비트), `arm64` (애플 실리콘 M1/M2), `aarch64` (라즈베리 파이/젯슨) |

설치 중 라이선스 동의(`yes`), 설치 경로(기본값 그대로 `Enter`), 셸 초기화 여부(`yes`)를 묻습니다.

![](/img/a_go/setup-lerobot-ubuntu-m02.webp)

![](/img/a_go/setup-lerobot-ubuntu-m03.webp)

![](/img/a_go/setup-lerobot-ubuntu-m04.webp)

설치가 끝나면 설정을 적용합니다. 프롬프트 앞에 `(base)` 가 붙으면 정상입니다.

```bash
source ~/.bashrc
```

![](/img/a_go/setup-lerobot-ubuntu-m05.webp)

터미널을 열 때마다 `base` 환경이 자동으로 켜지지 않게 하려면 아래 명령을 실행합니다.

```bash
conda config --set auto_activate_base false
```

## 2. 가상환경 만들기

Python 3.12로 conda 가상환경을 생성합니다. 환경 이름에 LeRobot 버전(0.6.0)을 넣어 두면 나중에 다른 버전과 헷갈리지 않습니다.

```bash
conda create -n lerobot060 python=3.12 -y
```

그다음 conda 환경을 활성화합니다. 이후 lerobot을 구동할 때는 항상 이 환경에 진입한 상태여야 합니다.

```bash
conda activate lerobot060
```

이어서 `ffmpeg` 를 해당 환경에 설치합니다.

```bash
conda install ffmpeg -c conda-forge
```

> **팁** 💡`TIP`
> <br>일반적으로 이 명령은 `libsvtav1` 인코더를 사용하여 컴파일된 `ffmpeg 7.x` 버전을 해당 플랫폼에 설치합니다. `libsvtav1`이 지원되지 않는 경우 (`ffmpeg -encoders` 명령으로 지원되는 인코더 목록을 확인하세요), 다음 방법을 시도해 볼 수 있습니다:
>
> - *[모든 플랫폼]* `ffmpeg 7.x` 버전을 명시해서 설치합니다:
>
> ```bash
> conda install ffmpeg=7.1.1 -c conda-forge
> ```
>
> - *[리눅스에서만]* 자체 ffmpeg를 사용하려면 [ffmpeg 빌드 종속성을 설치](https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu#GettheDependencies)하고 [libsvtav1을 사용하여 소스에서 ffmpeg를 컴파일](https://trac.ffmpeg.org/wiki/Encode/AV1#SVT-AV1)한 다음, `which ffmpeg` 명령어로 설치 환경에 맞는 ffmpeg 바이너리를 사용하는지 확인해야 합니다.

## 3. LeRobot 라이브러리 설치

소스에서 설치하는 방법을 권장합니다. 이후 [텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 저장소 안의 예제 스크립트(`examples/lekiwi/teleoperate.py`)를 사용하기 때문입니다.

```bash
cd ~
git clone --branch v0.6.0 --depth 1 https://github.com/huggingface/lerobot.git
cd lerobot
pip install -e .
```

또는 pip 패키지로 설치할 수도 있습니다.

```bash
pip install lerobot==0.6.0
```

## 4. 역할별 추가 기능(extras) 설치

LeRobot은 특정 기능을 위한 선택적 추가 기능(extras)을 제공합니다. 여러 extras를 조합해 설치할 수 있으며(예: `.[aloha,feetech]`), 사용 가능한 전체 목록은 `pyproject.toml` 파일에서 확인할 수 있습니다.

### 4.1. 실행용 PC

```bash
# 소스 설치한 경우 (~/lerobot 폴더에서)
pip install -e ".[core_scripts,feetech,lekiwi]"

# pip 패키지로 설치한 경우
pip install "lerobot[core_scripts,feetech,lekiwi]==0.6.0"
```

> **팁** 💡`TIP`
> <br>`core_scripts` 에는 데이터셋(`dataset`)·시각화(`viz`) extras와 키보드 입력용 `pynput` 이 이미 포함되어 있습니다. 그래서 실행용 PC에서도 [Dataset Visualization](/docs/a-go/dataset-visualization)·[Edit](/docs/a-go/dataset-edit)을 추가 설치 없이 바로 할 수 있습니다.

### 4.2. 훈련용 PC

```bash
# 소스 설치한 경우 (~/lerobot 폴더에서)
pip install -e ".[training]"

# pip 패키지로 설치한 경우
pip install "lerobot[training]==0.6.0"
```

## 5. PyTorch GPU 인식 확인 (훈련용 PC)

GPU 드라이버와 CUDA는 [Ubuntu PC 세팅](/docs/a-go/setup-pc-ubuntu)에서 미리 설치해 둡니다.

### 5.1. PyTorch 설치

3·4단계에서 LeRobot과 함께 설치된 PyTorch를 GPU(CUDA 12.8) 빌드로 교체합니다. PyTorch가 이미 설치되어 있으므로 버전을 `+cu128` 까지 정확히 지정해야 실제로 교체됩니다. `2.11.0` 은 LeRobot 0.6.0이 지원하는 범위(2.7 이상 2.12 미만) 안의 버전입니다.

```bash
pip install torch==2.11.0+cu128 torchvision==0.26.0+cu128 --index-url https://download.pytorch.org/whl/cu128
```

### 5.2. 최종 점검

```bash
python -c "import torch; print(f'PyTorch 버전: {torch.__version__}'); print(f'GPU 사용 가능 여부: {torch.cuda.is_available()}'); print(f'사용 중인 GPU: {torch.cuda.get_device_name(0)}')"
```

`GPU 사용 가능 여부: True` 와 GPU 이름이 출력되면 정상입니다. 출력 예시는 다음과 같습니다(GPU 이름은 PC마다 다릅니다).

```text
PyTorch 버전: 2.11.0+cu128
GPU 사용 가능 여부: True
사용 중인 GPU: NVIDIA GeForce RTX 5070 Ti Laptop GPU
```

## 다음 단계

PC 준비가 끝났습니다. 이제 LeKiwi의 라즈베리파이를 PC와 연결합니다. 사이드바의 바로 다음 페이지는 Windows용 설치 안내이므로, Ubuntu PC라면 건너뛰고 아래 페이지로 이동합니다.

<div class="card-grid">
  <a href="/docs/a-go/lekiwi-wired-connection" class="card">
    <h3>📡 유선 연결</h3>
    <p>랜선으로 PC와 라즈베리파이를 직접 연결하고 SSH로 원격 접속</p>
  </a>
</div>
