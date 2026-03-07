# LeRobot 라이브러리 설치 


## From Source

먼저, repository를 clone하고 해당 directory로 이동합니다:

```bash

git clone https://github.com/huggingface/lerobot.git

cd lerobot

```

그다음, 라이브러리를 수정 가능(Editable) 모드로 설치합니다. 소스 코드를 직접 수정하거나 기여하려는 사용자에게 권장되는 방식입니다.

```bash

pip install -e .

# uv 가상환경인 경우
# uv pip install -e .

```

## Installation from PyPI

**Core Library:** 다음과 같이 base package를 설치할 수 있습니다.

```bash

pip install lerobot

# uv 가상환경인 경우
# uv pip install lerobot

```

해당 설치는 default 종속성만 설치합니다.

## Optional dependencies

LeRobot은 특정 기능을 위한 선택적 추가 기능을 제공합니다. 여러 추가 기능을 조합하여 lerobot 라이브러리를 사용할 수 있습니다(예: `.[aloha,feetech]`). 사용 가능한 모든 추가 기능은 `pyproject.toml` 파일을 참고해 주시기 바랍니다.

### Simulations

시뮬레이션을 위한 환경 패키지가 있습니다. 해당 패키지를 설치합니다: `aloha` ([gym-aloha](https://github.com/huggingface/gym-aloha)), or `pusht` ([gym-pusht](https://github.com/huggingface/gym-pusht))

예시:
```bash

pip install -e ".[aloha]" # or "[pusht]" for example

```

### Motor Control

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