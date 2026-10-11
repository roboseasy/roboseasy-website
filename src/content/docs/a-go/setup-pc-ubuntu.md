---
title: "Ubuntu PC 세팅"
category: "a-go"
group: "PC 환경 세팅"
order: 20
---

# Ubuntu 24.04 PC 세팅 (GPU 드라이버 · CUDA)

> **정보** ℹ️ `INFO`
> <br>이 페이지는 **모델 학습을 할 GPU PC(훈련용 PC)** 에만 필요합니다. 로봇을 조작만 하는 실행용 PC라면 건너뛰고 [LeRobot 설치 (Ubuntu)](/docs/a-go/setup-lerobot-ubuntu)로 넘어가세요. Windows PC라면 [Windows PC 세팅](/docs/a-go/setup-pc-windows)을 보세요.

## 1. NVIDIA 드라이버 설치

### 1.1. 기존 NVIDIA 관련 패키지 삭제

```bash
sudo apt-get --purge remove "*nvidia*"
sudo apt-get autoremove
sudo apt-get autoclean
```

### 1.2. NVIDIA 드라이버 설치 준비 및 확인

```bash
sudo apt update
sudo apt upgrade
ubuntu-drivers devices
```

### 1.3. 드라이버 설치 (Open 버전 추천)

`ubuntu-drivers devices` 출력에서 `recommended` 로 표시된 버전을 설치합니다. (PC마다 숫자가 다를 수 있습니다)

```bash
sudo apt install nvidia-driver-580-open
```

### 1.4. PC 재부팅

```bash
sudo reboot
```

### 1.5. 확인

```bash
nvidia-smi
```

## 2. CUDA 설치

### 2.1. CUDA 12.8.0 설치 (Runfile 방식)

```bash
wget https://developer.download.nvidia.com/compute/cuda/12.8.0/local_installers/cuda_12.8.0_570.86.10_linux.run

# 설치 실행
sudo sh cuda_12.8.0_570.86.10_linux.run
```

1. **Continue**를 누르고 **accept**를 입력합니다.
2. **설치 옵션 선택(Installer Item Selection):**
   - `[X] Driver` 라고 되어 있는 부분에서 **스페이스바**를 눌러 `[ ] Driver` (체크 해제) 상태로 만드세요.
   - 1단계에서 이미 NVIDIA 드라이버를 설치했으므로, 여기서 또 설치하면 충돌이 납니다.
3. **Install**로 내려가서 엔터를 누릅니다.

![](/img/a_go/setup-pc-ubuntu-01.webp)

### 2.2. 환경 변수 설정

`~/.bashrc` 를 엽니다.

```bash
nano ~/.bashrc
```

파일 맨 아래에 다음 세 줄을 추가한 뒤 저장합니다 (`Ctrl+O` → `Enter` → `Ctrl+X`).

```bash
export CUDA_HOME=/usr/local/cuda-12.8
export PATH="$CUDA_HOME/bin:$PATH"
export LD_LIBRARY_PATH="$CUDA_HOME/lib64:${LD_LIBRARY_PATH:-}"
```

### 2.3. 설정 적용 및 확인

```bash
source ~/.bashrc
sudo apt update
nvcc -V
```

## 3. cuDNN 설치

### 3.1. cuDNN 설치

CUDA 12.x 계열을 지원하는 cuDNN을 설치합니다.

```bash
wget https://developer.download.nvidia.com/compute/cudnn/9.6.0/local_installers/cudnn-local-repo-ubuntu2404-9.6.0_1.0-1_amd64.deb

sudo dpkg -i cudnn-local-repo-ubuntu2404-9.6.0_1.0-1_amd64.deb
sudo cp /var/cudnn-local-repo-ubuntu2404-9.6.0/cudnn-*-keyring.gpg /usr/share/keyrings/
sudo apt-get update
sudo apt-get -y install cudnn-cuda-12
```

### 3.2. GPU 동작 확인 (deviceQuery)

CUDA와 함께 설치된 예제 프로그램 `deviceQuery` 로 GPU가 정상 인식되는지 확인합니다. 출력 마지막 줄에 `Result = PASS` 가 나오면 정상입니다.

```bash
/usr/local/cuda-12.8/extras/demo_suite/deviceQuery
```

## 다음 단계

GPU 드라이버·CUDA·cuDNN 준비가 끝났습니다. Miniconda 설치, 가상환경 생성, PyTorch GPU 인식 확인은 아래 페이지에서 이어서 진행합니다.

<div class="card-grid">
  <a href="/docs/a-go/setup-lerobot-ubuntu" class="card">
    <h3>📦 LeRobot 설치 (Ubuntu)</h3>
    <p>Miniconda · 가상환경 · LeRobot 0.6.0 · PyTorch GPU 확인</p>
  </a>
</div>
