# LeRobot 설치 가이드

!> **시작하기 전에**
LeRobot 설치 전에 Python 3.10과 Git이 설치되어 있는지 확인하세요.

## 시스템 요구사항

### 필수 요구사항

- **Python 3.10**, 환경과 함께 설치하면 됨.
- **Git**

### 권장 요구사항

- **CUDA 지원 GPU** (학습 시에 없으면 너무 느림…)
- **USB 가 많은 컴퓨터** (카메라, 로봇 모두 USB 인데 허브 통하면 프레임 밀리는 문제 많음)

?> **필자의 추천 시스템 구성**<br>
**입문자**: Macbook 또는 리눅스 노트북으로 시작하셔도 됩니다. 학습은 클라우드 GPU를 빌려서 하시면 됩니다.<br>
**본격파**: 안정적으로 시도하시려면 다음 사양의 데스크탑을 추천합니다:
- NVIDIA GPU 최소 30시리즈 이상 (ex. 3070)
- USB 포트 4개 이상 (허브 사용 시 프레임 드롭 주의)
- Jetson 도 좋음

## 설치 과정

### 1단계: 가상환경 세팅


#### 1.1. Conda 가상환경 

##### miniforge 설치 
OS나 CPU 아키텍처 (하드웨어)와 상관없이 아래와 같은 명령어를 통해 Miniforge를 설치합니다.

```bash

wget "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"

bash Miniforge3-$(uname)-$(uname -m).sh

```

##### miniconda 설치

OS나 CPU 아키텍처 (하드웨어)와 상관없이 아래와 같은 명령어를 통해 Miniconda를 설치합니다.

```bash

wget "https://repo.anaconda.com/miniconda/Miniconda3-latest-$(uname)-$(uname -m).sh"  

bash Miniconda3-latest-$(uname)-$(uname -m).sh

```

내 컴퓨터에서는 어떤 값이 나오는지 궁금하다면 터미널에 아래 명령어를 각각 입력합니다.

```bash
echo $(uname)
echo $(uname -m)
```

---
| 변수 | 의미 | 대표적인 실제 값 |
|--|--| -- |
| `$(uname)` | 운영체제(OS)의 이름 | Linux(리눅스/우분투 등), Darwin (macOS)  |
| `$(uname -m)` | CPU 아키텍처 (하드웨어) | `x86_64` (인텔/AMD 64비트), `arm64` (애플 실리콘 M1/M2), `aarch64` (라즈베리 파이/제슨)  |

#### 가상환경 셋업 
Python 3.10으로 conda를 이용해서 가상환경을 생성합니다.

```bash

conda create -n lerobot python=3.13 -y

```

그다음, conda 환경을 활성화합니다. 이후 lerobot 구동 시에는 항상 이 환경에 진입한 상태여야 합니다.

```bash

conda activate lerobot

```

### 2단계: ffmpeg 설치

영상 처리를 위해 ffmpeg가 필요합니다.

**Ubuntu/Linux:**

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
> -   _[리눅스에서만]_ 자체 ffmpeg를 사용하려면: [ffmpeg 빌드 종속성을 설치](https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu#GettheDependencies)하고 [libsvtav1을 사용하여 소스에서 ffmpeg를 컴파일](https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu#libsvtav1)한 다음, `which ffmpeg` 명령어를 사용하여 설치 환경에 맞는 ffmpeg 바이너리를 사용해야 합니다.


### 3단계: LeRobot 소스 코드 다운로드

```bash
# LeRobot 저장소 클론
git clone https://github.com/huggingface/lerobot.git
cd lerobot
```


### 5단계: LeRobot 설치

#### From Source

라이브러리를 수정 가능(Editable) 모드로 설치합니다. 소스 코드를 직접 수정하거나 기여하려는 사용자에게 권장되는 방식입니다.

```bash
pip install -e .
```

#### Installation from PyPI

**Core Library:** 다음과 같이 base package를 설치할 수 있습니다.

```bash

pip install lerobot

# uv 가상환경인 경우
# uv pip install lerobot

```

### 로봇 하드웨어 드라이버

실제 로봇 하드웨어를 사용할 예정이니 드라이버를 설치하세요:

실제로 사용할 로봇의 모터에 맞게 필요한 드라이버를 설치하세요.

```bash
# Feetech 모터 (SO-ARM100, SO-ARM101)
pip install -e ".[feetech]"

# Dynamixel 모터 (Koch, etc.)
pip install -e ".[dynamixel]"
```

## 선택적 설치 옵션

LeRobot은 특정 기능을 위한 선택적 추가 기능을 제공합니다. 여러 추가 기능을 조합하여 lerobot 라이브러리를 사용할 수 있습니다(예: `.[aloha,feetech]`). 사용 가능한 모든 추가 기능은 `pyproject.toml` 파일을 참고해 주시기 바랍니다.

### 시뮬레이션 환경

특정 시뮬레이션 환경을 사용하려면 추가 패키지를 설치하세요:

```bash
# ALOHA 시뮬레이션 환경
uv pip install -e ".[aloha]"

# Push-T 시뮬레이션 환경
uv pip install -e ".[pusht]"

# 모든 시뮬레이션 환경
uv pip install -e ".[aloha,pusht,xarm]"
```

### 실험 추적 도구

모델 학습 과정을 추적하려면 Weights & Biases를 설정하세요:

```bash
# W&B 설치
uv pip install wandb

# W&B 로그인
wandb login
```

## 설치 확인

설치가 완료되었는지 확인해봅시다:

```python
# Python 인터프리터 실행
python

# LeRobot 임포트 테스트
>>> import lerobot
>>> print(lerobot.__version__)
>>> exit()
```

!> **설치 완료!**
LeRobot이 성공적으로 설치되었습니다. 이제 하드웨어를 연결하고 로봇을 제어할 준비가 되었습니다.

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

?> **추가 리소스**
더 자세한 정보는 [LeRobot 공식 설치 문서](https://huggingface.co/docs/lerobot/main/en/installation)를 참조하세요.
