---
title: "소프트웨어 설치"
category: "a-ba"
group: "Setup"
order: 20
---

# LeRobot 설치 가이드

> ⚠️ **시작하기 전에**
LeRobot 설치 전에 Python 3.12과 Git이 설치되어 있는지 확인하세요.

## 시스템 요구사항

### 필수 요구사항

- **Python 3.12**, 환경과 함께 설치하면 됨.
- **Git**

### 권장 요구사항

- **CUDA 지원 GPU** (학습 시에 없으면 너무 느림…)
- **USB 가 많은 컴퓨터** (카메라, 로봇 모두 USB 인데 허브 통하면 프레임 밀리는 문제 많음)

> ℹ️ **필자의 추천 시스템 구성**<br>
**입문자**: Macbook 또는 리눅스 노트북으로 시작하셔도 됩니다. 학습은 클라우드 GPU를 빌려서 하시면 됩니다.<br>
**본격파**: 안정적으로 시도하시려면 다음 사양의 데스크탑을 추천합니다:
- NVIDIA GPU 최소 30시리즈 이상 (ex. 3070)
- USB 포트 4개 이상 (허브 사용 시 프레임 드롭 주의)
- Jetson 도 좋음

## 2.1 라이브러리 설치하기

다음 3가지 방법 중 하나를 선택하여 가상환경을 준비합니다.

- conda
- uv
- python venv

그리고 lerobot 라이브러리를 각 가상환경에 맞게 설치합니다.

## 1. 가상환경 준비

### 1.1. Conda 가상환경

#### Miniforge 설치
OS나 CPU 아키텍처 (하드웨어)와 상관없이 아래와 같은 명령어를 통해 Miniforge를 설치합니다:

```bash

wget "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"
bash Miniforge3-$(uname)-$(uname -m).sh

```

#### Miniconda 설치

OS나 CPU 아키텍처 (하드웨어)와 상관없이 아래와 같은 명령어를 통해 Miniconda를 설치합니다:

```bash

wget "https://repo.anaconda.com/miniconda/Miniconda3-latest-$(uname)-$(uname -m).sh"
bash Miniconda3-latest-$(uname)-$(uname -m).sh

```

내 컴퓨터에서는 어떤 값이 나오는지 궁금하다면 터미널에 아래 명령어를 각각 입력합니다:

```bash
echo $(uname)
echo $(uname -m)
```

---
| 변수 | 의미 | 대표적인 실제 값 |
|--|--| -- |
| `$(uname)` | 운영체제(OS)의 이름 | Linux(리눅스/우분투 등), Darwin (macOS)  |
| `$(uname -m)` | CPU 아키텍처 (하드웨어) | `x86_64` (인텔/AMD 64비트), `arm64` (애플 실리콘 M1/M2), `aarch64` (라즈베리 파이/제슨)  |

#### 환경 셋업
Python 3.12으로 conda를 이용해서 가상환경을 생성합니다:

```bash

conda create -n lerobot python=3.12 -y

```

그다음, conda 환경을 활성화합니다. 이후 lerobot 구동 시에는 항상 이 환경에 진입한 상태여야 합니다:

```bash

conda activate lerobot

```

이어서 `ffmpeg` 를 해당 환경에 설치합니다:

```bash

conda install ffmpeg -c conda-forge

```

> 💡`TIP` 일반적으로 이 명령은 `libsvtav1 encoder`를 사용하여 컴파일된 `ffmpeg 7.x` 버전을 해당 플랫폼에 설치합니다. `libsvtav1`이 지원되지 않는 경우 (`ffmpeg - encoders` 명령으로 지원되는 인코더 목록을 확인하세요), 다음 방법을 시도해 볼 수 있습니다:
> 
> -   _[모든 플랫폼]_ Explicitly install `ffmpeg 7.X` using:
> 
> ```bash
> conda install ffmpeg=7.1.1 -c conda-forge
> ```
> 
> -   _[리눅스에서만]_ 자체 ffmpeg를 사용하려면 ffmpeg 빌드 종속성을 설치[1]하고 libsvtav1을 사용하여 소스에서 ffmpeg를 컴파일[2]한 다음, `which ffmpeg` 명령어를 사용하여 설치 환경에 맞는 ffmpeg 바이너리를 사용해야 합니다.


### 1.2. uv 가상환경

uv는 Rust로 작성된 초고속 Python 패키지 관리자로, pip보다 10-100배 빠르며, 가상환경을 자동으로 관리하는 기능을 제공합니다.

#### uv 설치

```bash

# uv 설치
curl -LsSf https://astral.sh/uv/install.sh | sh
# 설치 확인
uv --version

```


#### 환경 셋업
Python 3.12으로 uv를 이용해서 가상환경을 생성합니다:

```bash

uv venv lerobot --python 3.12

```

그다음, 가상환경을 활성화합니다. 이후 lerobot 구동 시에는 항상 이 환경에 진입한 상태여야 합니다:

```bash

source lerobot/bin/activate

```

이어서 `ffmpeg` 를 해당 환경에 설치합니다:

```bash

# apt로 설치
sudo apt update
sudo apt install ffmpeg

```

### 1.3. venv 가상환경

venv는 Python 표준 라이브러리로, 별도의 설치 없이 가상환경을 생성하고 관리할 수 있습니다.

#### 환경 셋업
Python 3.12으로 venv를 이용해서 가상환경을 생성합니다:

```bash

python3.12 -m venv lerobot

```

그다음, 가상환경을 활성화합니다. 이후 lerobot 구동 시에는 항상 이 환경에 진입한 상태여야 합니다:

```bash

source lerobot/bin/activate

```

이어서 `ffmpeg` 를 해당 환경에 설치합니다:

```bash

# apt로 설치
sudo apt update
sudo apt install ffmpeg

```

## 2. LeRobot 라이브러리 설치


### 2.1. From Source

먼저, repository를 clone하고 해당 directory로 이동합니다:

```bash

git clone https://github.com/huggingface/lerobot.git
cd lerobot

```

그다음, 라이브러리를 수정 가능(Editable) 모드로 설치합니다. 소스 코드를 직접 수정하거나 기여하려는 사용자에게 권장되는 방식입니다:

```bash

pip install -e .
# uv 가상환경인 경우
# uv pip install -e .

```

버전 확인 

```
python -c "import lerobot; print(lerobot.__version__)"
```

또는 

```
grep -m1 version pyproject.toml
```


### 2.2. Installation from PyPI

**Core Library:** 다음과 같이 base package를 설치할 수 있습니다:

```bash

pip install lerobot
# uv 가상환경인 경우
# uv pip install lerobot

```

해당 설치는 default 종속성만 설치합니다.


버전확인 
```
pip show lerobot | grep -i version
```


### 2.3 특정 버전 설치

특정 버전(예: `v0.5.1`)을 설치하고 싶다면, clone 시 `--branch` 옵션으로 해당 버전의 태그를 지정할 수 있습니다:

```bash
git clone --branch v0.6.0 --depth 1 https://github.com/huggingface/lerobot.git 

cd lerobot
```

또는 이미 clone한 repository에서 특정 버전 태그로 checkout할 수도 있습니다:

```bash
cd lerobot 

git fetch --tags 

git checkout v0.5.1
```

버전확인
```

python -c "import lerobot; print(lerobot.__version__)"

```

그다음, 라이브러리를 수정 가능(Editable) 모드로 설치합니다. 소스 코드를 직접 수정하거나 기여하려는 사용자에게 권장되는 방식입니다:

```bash
pip install --index-url https://download.pytorch.org/whl/cu128 torch torchvision

pip install -e ".[core_scripts]"  # For robot workflows (recording, replaying, calibrate)
pip install -e ".[training]"      # For training policies
pip install -e ".[all]"           # Everything (all policies, envs, hardware, dev tools)
# uv 가상환경인 경우
# uv pip install -e .
```
PyPI를 통해 라이브러리를 설치할 때, 특정 버전만 설치하고 싶다면, 

```bash

pip install lerobot==0.6.0 
# uv 가상환경인 경우 # 
uv pip install lerobot==0.6.0

```






### 2.4 Optional dependencies

LeRobot은 특정 기능을 위한 선택적 추가 기능을 제공합니다. 여러 추가 기능을 조합하여 lerobot 라이브러리를 사용할 수 있습니다(예: `.[aloha,feetech]`). 사용 가능한 모든 추가 기능은 `pyproject.toml` 파일을 참고해 주시기 바랍니다.

#### Simulations

시뮬레이션을 위한 환경 패키지가 있습니다. 해당 패키지를 설치합니다: `aloha` (gym-aloha[3]), or `pusht` (gym-pusht[4])

예시:
```bash

pip install -e ".[aloha]" # or "[pusht]" for example

```

#### Motor Control

Koch v1.1 로봇 플랫폼은 Dynamixel SDK를, SO100/SO101/Moss 로봇 플랫폼은 Feetech SDK를 설치합니다:

```bash

pip install -e ".[feetech]" # or "[dynamixel]" for example

```

---

**Extra Features:** 추가 기능 설치

```bash

pip install 'lerobot[all]' # All available features 
pip install 'lerobot[aloha,pusht]' # Specific features (Aloha & Pusht) 
pip install 'lerobot[feetech]' # Feetech motor support
pip install 'lerobot[dynamixel]' # Dynamixel motor support
pip install -e ".[smolvla]"
pip install -e ".[pi]"
pip install lerobot[groot]
pip install lerobot[xvla]
# ....

```

### 각주
[1] FFmpeg Wiki. (n.d.). CompilationGuide/Ubuntu: Get the Dependencies.
(https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu)

[2] FFmpeg Wiki. (n.d.). CompilationGuide/Ubuntu: libsvtav1.<br>
(https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu)

[3] Hugging Face. (2024). gym-aloha [GitHub repository].<br>
(https://github.com/huggingface/gym-aloha)

[4] Hugging Face. (2024). gym-pusht [GitHub repository].<br>
(https://github.com/huggingface/gym-pusht)

## 문제 해결

### 일반적인 문제와 해결 방법

<details>
<summary>ImportError: No module named 'lerobot'</summary>

LeRobot이 제대로 설치되지 않았습니다. 다음을 확인하세요:

- 가상환경이 활성화되었는지 확인 (`source .venv/bin/activate`)
- `uv pip install -e .` 명령을 lerobot 폴더 내에서 실행했는지 확인

</details>

<details>
<summary>CUDA 관련 오류</summary>

GPU를 사용하려면 CUDA와 PyTorch가 올바르게 설치되어야 합니다:

```bash
# CUDA 버전 확인
nvidia-smi
```

CUDA 가 정상적으로 설치되어 있지 않다면, CUDA 셋업부터… 다시 하셔야 합니다.

</details>

<details>
<summary>ffmpeg 관련 오류</summary>

ffmpeg가 올바르게 설치되지 않았을 수 있습니다:

```bash
# ffmpeg 버전 확인
ffmpeg -version

# 시스템 패키지 매니저로 재설치
# macOS: brew reinstall ffmpeg
# Linux: sudo apt reinstall ffmpeg
```

</details>

## 다음 단계

<div class="card-grid">
  <a href="#/hardware-usbport" class="card">
    <h3>🔌 USB 포트 고정</h3>
    <p>USB 포트 한 번의 설정으로 계속 사용 가능하게 합니다</p>
  </a>
</div>

> ℹ️ **추가 리소스**
더 자세한 정보는 [LeRobot 공식 설치 문서](https://huggingface.co/docs/lerobot/main/en/installation)를 참조하세요.
