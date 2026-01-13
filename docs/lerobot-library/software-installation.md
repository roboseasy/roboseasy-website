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

### 1단계: uv 설치 (필자 권장)

uv는 Rust로 작성된 초고속 Python 패키지 관리자로, pip보다 10-100배 빠르고 가상환경을 자동으로 관리해줍니다.

```bash
# uv 설치
curl -LsSf https://astral.sh/uv/install.sh | sh

# 또는 Homebrew 사용 (macOS)
brew install uv

# 설치 확인
uv --version
```

### 2단계: LeRobot 소스 코드 다운로드

```bash
# LeRobot 저장소 클론
git clone https://github.com/huggingface/lerobot.git
cd lerobot
```

### 3단계: Python 환경 설정

```bash
# Python 3.10 설치 및 가상환경 생성 (uv가 자동으로 처리)
uv venv --python 3.10

# 가상환경 활성화
source .venv/bin/activate
```

?> **Python 환경 관리 도구에 대해**<br>
HuggingFace 공식 설치 가이드에서는 Miniconda를 추천하지만, <br>Python 가상환경을 관리할 수 있는 도구라면 무엇을 사용하든 상관없습니다.
<br>이 가이드에서는 최근 인기를 얻고 있는 **uv**를 사용합니다. <br>uv는 설치 속도가 매우 빠르고 사용이 간편합니다.
<br>uv는 프로젝트별로 독립된 가상환경을 자동으로 관리합니다. <br>프로젝트 디렉토리에서 `uv pip` 명령을 사용하면 자동으로 올바른 환경을 사용합니다.
<br><br>**다른 옵션들**
<br>**Miniconda/Anaconda**: 전통적이고 안정적인 선택
<br>**pyenv + virtualenv**: 여러 Python 버전 관리에 유용
<br>**Poetry**: 의존성 관리가 강력한 도구

### 4단계: ffmpeg 설치

영상 처리를 위해 ffmpeg가 필요합니다.

**Ubuntu/Linux:**

```bash
# apt로 설치
sudo apt update
sudo apt install ffmpeg
```

**macOS:**

```bash
# Homebrew로 설치
brew install ffmpeg
```

### 5단계: LeRobot 설치

```bash
# uv를 사용한 설치 (매우 빠름!)
uv pip install -e .
```

### 로봇 하드웨어 드라이버

실제 로봇 하드웨어를 사용할 예정이니 드라이버를 설치하세요:

실제로 사용할 로봇의 모터에 맞게 필요한 드라이버를 설치하세요.

```bash
# Feetech 모터 (SO-100, SO-101)
uv pip install -e ".[feetech]"

# Dynamixel 모터 (Koch, etc.)
uv pip install -e ".[dynamixel]"
```

## 선택적 설치 옵션

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

## 다음 추천 문서

설치가 완료되었으니 이제 다음 단계로 진행하세요:

<div class="card-grid">
  <div class="card">
    <h3>🎮 So-Arm 101 Max</h3>
    <p>So-Arm 101 Max로 Physical AI를 체험해보아요.</p>
  </div>
</div>

?> **추가 리소스**
더 자세한 정보는 [LeRobot 공식 설치 문서](https://huggingface.co/docs/lerobot/main/en/installation)를 참조하세요.
