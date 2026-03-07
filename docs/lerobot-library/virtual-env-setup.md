# 가상환경 세팅하기

다음 3가지 방법 중 하나를 선택하여 가상환경을 준비합니다.

- conda
- uv
- python venv

그리고 lerobot 라이브러리를 각 가상환경에 맞게 설치합니다.

# 1. 가상환경 준비

## 1.1. Conda 가상환경 

### miniforge 설치 
OS나 CPU 아키텍처 (하드웨어)와 상관없이 아래와 같은 명령어를 통해 Miniforge를 설치합니다.

```bash

wget "https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-$(uname)-$(uname -m).sh"

bash Miniforge3-$(uname)-$(uname -m).sh

```

### miniconda 설치

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

### 환경 셋업 
Python 3.10으로 conda를 이용해서 가상환경을 생성합니다.

```bash

conda create -n lerobot python=3.13 -y

```

그다음, conda 환경을 활성화합니다. 이후 lerobot 구동 시에는 항상 이 환경에 진입한 상태여야 합니다.

```bash

conda activate lerobot

```

이어서 `ffmpeg` 를 해당 환경에 설치합니다.

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


## 1.2. uv 가상환경 

uv는 Rust로 작성된 초고속 Python 패키지 관리자로, pip보다 10-100배 빠르며, 가상환경을 자동으로 관리하는 기능을 제공합니다.

### uv 설치

```bash

# uv 설치 
curl -LsSf https://astral.sh/uv/install.sh | sh


# 설치 확인
uv --version

```


### 환경 셋업 
Python 3.10으로 uv를 이용해서 가상환경을 생성합니다.

```bash

uv venv lerobot --python 3.13

```

그다음, conda 환경을 활성화합니다. 이후 lerobot 구동 시에는 항상 이 환경에 진입한 상태여야 합니다.

```bash

source lerobot/bin/activate

```

이어서 `ffmpeg` 를 해당 환경에 설치합니다.

```bash

# apt로 설치
sudo apt update
sudo apt install ffmpeg

```

## 1.3. venv 가상환경 

venv는 Python 표준 라이브러리로, 별도의 설치 없이 가상환경을 생성하고 관리할 수 있습니다.

### 환경 셋업 
Python 3.10으로 venv를 이용해서 가상환경을 생성합니다.

```bash

python3.10 -m venv lerobot

```

그다음, 가상환경을 활성화합니다. 이후 lerobot 구동 시에는 항상 이 환경에 진입한 상태여야 합니다.

```bash

source lerobot/bin/activate

```

이어서 `ffmpeg` 를 해당 환경에 설치합니다.

```bash

# apt로 설치
sudo apt update
sudo apt install ffmpeg

```
