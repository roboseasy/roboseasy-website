---
title: "LeRobot 설치 (Windows)"
category: "a-go"
group: "PC 환경 세팅"
order: 50
---

# [Windows] LeRobot 라이브러리 환경 세팅

LeKiwi 실습에는 두 종류의 PC가 등장합니다. 한 대의 PC로 두 역할을 모두 해도 됩니다.

| 역할 | 하는 일 | 설치할 extras |
|---|---|---|
| **실행용 PC** | 리더 암 연결, 텔레오퍼레이션, 데이터 기록, 모델 추론 | `core_scripts,lekiwi,pynput-dep,viz,dataset` |
| **훈련용 PC** (GPU) | Hub에서 데이터셋을 받아 정책 학습 | `training` |

1~3단계는 두 PC 모두 같고, 4단계에서 역할에 맞는 extras를 설치합니다.

## 1. Miniconda 설치

### 1.1. Miniconda 설치 파일 다운로드 및 설치

참고: [https://www.anaconda.com/docs/getting-started/miniconda/install/windows-cli-install](https://www.anaconda.com/docs/getting-started/miniconda/install/windows-cli-install)

명령 프롬프트(cmd)를 열고 아래 명령어로 설치 파일을 다운로드합니다.

```bash
curl https://repo.anaconda.com/miniconda/Miniconda3-latest-Windows-x86_64.exe --output .\Miniconda3-latest-Windows-x86_64.exe
```

![](/img/a_go/setup-lerobot-windows-01.webp)

다운로드가 끝나면 사용자 폴더(`C:\Users\<사용자명>`)에 설치 파일이 생깁니다. 더블클릭해서 실행합니다.

![](/img/a_go/setup-lerobot-windows-02.webp)

설치 마법사가 뜨면 `Next` 를 누릅니다.

![](/img/a_go/setup-lerobot-windows-03.webp)

설치 위치는 기본값 그대로 두고 `Next` 를 누릅니다.

![](/img/a_go/setup-lerobot-windows-04.webp)

`Add installation to my PATH environment variable` 를 체크한 뒤 `Install` 을 누릅니다.

![](/img/a_go/setup-lerobot-windows-05.webp)

설치가 끝날 때까지 기다립니다.

![](/img/a_go/setup-lerobot-windows-06.webp)

`Finish` 를 눌러 설치를 마칩니다.

![](/img/a_go/setup-lerobot-windows-07.webp)

### 1.2. 적용

명령 프롬프트를 새로 연 뒤 아래 명령어를 입력합니다. 프롬프트 앞에 `(base)` 가 붙으면 정상입니다.

```bash
conda activate
```

![](/img/a_go/setup-lerobot-windows-08.webp)

## 2. 가상환경 만들기

Python 3.12로 conda 가상환경을 생성합니다.

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
> <br>일반적으로 이 명령은 `libsvtav1` 인코더를 사용하여 컴파일된 `ffmpeg 7.x` 버전을 설치합니다. `libsvtav1`이 지원되지 않는 경우(`ffmpeg -encoders` 명령으로 지원되는 인코더 목록을 확인하세요) `ffmpeg 7.x` 버전을 명시해서 설치해 봅니다.
>
> ```bash
> conda install ffmpeg=7.1.1 -c conda-forge
> ```

### 2.1. Windows에서 ffmpeg 설치 오류가 날 때

Windows에서는 ffmpeg 설치 중 아래처럼 `gdk-pixbuf` 관련 오류(`libintl_bindtextdomain` 시작 지점 없음, `UnicodeDecodeError('cp949' ...)`)가 나며 설치가 롤백되는 경우가 있습니다.

![](/img/a_go/setup-lerobot-windows-09.webp)

![](/img/a_go/setup-lerobot-windows-10.webp)

이때는 만들던 환경을 지우고, **conda-forge 채널만 사용**해 Python과 ffmpeg를 한 번에 설치합니다.

```bash
conda deactivate
conda env remove -n lerobot060
conda create -y -n lerobot060 -c conda-forge --override-channels python=3.12 ffmpeg=7.1.1
conda activate lerobot060
```

## 3. LeRobot 라이브러리 설치

소스에서 설치하는 방법을 권장합니다. 이후 [텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 저장소 안의 예제 스크립트(`examples/lekiwi/teleoperate.py`)를 사용하기 때문입니다.

```bash
cd %USERPROFILE%
git clone --branch v0.6.0 --depth 1 https://github.com/huggingface/lerobot.git
cd lerobot
pip install -e .
```

또는 pip 패키지로 설치할 수도 있습니다.

```bash
pip install lerobot==0.6.0
```

설치된 버전을 확인합니다.

```bash
pip show lerobot
```

## 4. 역할별 추가 기능(extras) 설치

LeRobot은 특정 기능을 위한 선택적 추가 기능(extras)을 제공합니다. 여러 extras를 조합해 설치할 수 있으며(예: `.[aloha,feetech]`), 사용 가능한 전체 목록은 `pyproject.toml` 파일에서 확인할 수 있습니다.

### 4.1. 실행용 PC

```bash
:: 소스 설치한 경우 (lerobot 폴더에서)
pip install -e ".[core_scripts,lekiwi,pynput-dep,viz,dataset]"

:: pip 패키지로 설치한 경우
pip install "lerobot[core_scripts,lekiwi,pynput-dep,viz,dataset]==0.6.0"
```

### 4.2. 훈련용 PC

```bash
:: 소스 설치한 경우 (lerobot 폴더에서)
pip install -e ".[training]"

:: pip 패키지로 설치한 경우
pip install "lerobot[training]==0.6.0"
```

## 5. PyTorch GPU 인식 확인 (훈련용 PC)

GPU 드라이버와 CUDA는 [Windows PC 세팅](/docs/a-go/setup-pc-windows)에서 미리 설치해 둡니다.

### 5.1. PyTorch 설치

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128
```

### 5.2. 최종 점검

```bash
python -c "import torch; print(f'PyTorch 버전: {torch.__version__}'); print(f'GPU 사용 가능 여부: {torch.cuda.is_available()}'); print(f'사용 중인 GPU: {torch.cuda.get_device_name(0)}')"
```

`GPU 사용 가능 여부: True` 와 GPU 이름이 출력되면 정상입니다.

![](/img/a_go/setup-lerobot-windows-12.webp)
