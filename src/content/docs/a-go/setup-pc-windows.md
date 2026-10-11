---
title: "Windows PC 세팅"
category: "a-go"
group: "PC 환경 세팅"
order: 30
---

# Windows 11 PC 세팅 (GPU 드라이버 · CUDA)

> **정보** ℹ️ `INFO`
> <br>이 페이지는 **모델 학습을 할 GPU PC(훈련용 PC)** 에만 필요합니다. 로봇을 조작만 하는 실행용 PC라면 건너뛰고 [LeRobot 설치 (Windows)](/docs/a-go/setup-lerobot-windows)로 넘어가세요.

## 1. NVIDIA 드라이버 설치

### 1.1. 내 그래픽카드에 맞는 드라이버 찾기

[NVIDIA 드라이버 다운로드 페이지](https://www.nvidia.com/ko-kr/drivers/)에서 그래픽카드 제품군·모델과 운영체제(Windows 11)를 선택해 검색합니다.

![](/img/a_go/setup-pc-windows-01.webp)

![](/img/a_go/setup-pc-windows-02.webp)

### 1.2. 드라이버 설치 파일 다운로드

검색 결과에서 최신 드라이버를 내려받습니다.

![](/img/a_go/setup-pc-windows-03.webp)

![](/img/a_go/setup-pc-windows-04.webp)

### 1.3. 드라이버 설치

내려받은 설치 파일(`.exe`)을 실행합니다.

![](/img/a_go/setup-pc-windows-05.webp)

설치 프로그램의 안내에 따라 드라이버를 설치합니다.

![](/img/a_go/setup-pc-windows-06.webp)

![](/img/a_go/setup-pc-windows-07.webp)

![](/img/a_go/setup-pc-windows-08.webp)

설치가 완료되었는지 확인합니다.

![](/img/a_go/setup-pc-windows-09.webp)

### 1.4. 확인

명령 프롬프트(또는 PowerShell)에서 아래 명령을 입력해 GPU와 드라이버 버전이 표시되는지 확인합니다.

```bash
nvidia-smi
```

![](/img/a_go/setup-pc-windows-10.webp)

## 2. CUDA 설치

### 2.1. CUDA Toolkit 설치

[NVIDIA CUDA Toolkit 페이지](https://developer.nvidia.com/cuda/toolkit)에서 **Download Now** 를 누릅니다.

![](/img/a_go/setup-pc-windows-11.webp)

`Windows` → `x86_64` → `11` → `exe (local)` 또는 `exe (network)` 를 선택하고 설치 파일을 내려받습니다.

![](/img/a_go/setup-pc-windows-12.webp)

설치 프로그램을 실행해 라이선스 계약에 동의합니다.

![](/img/a_go/setup-pc-windows-13.webp)

설치 옵션은 **빠른 설치(권장)** 를 선택합니다.

![](/img/a_go/setup-pc-windows-14.webp)

Visual Studio가 없다는 안내가 나오면 체크박스를 선택하고 **NEXT** 를 누릅니다. LeRobot 사용에는 Visual Studio 연동이 필요 없습니다.

![](/img/a_go/setup-pc-windows-15.webp)

![](/img/a_go/setup-pc-windows-16.webp)

![](/img/a_go/setup-pc-windows-17.webp)

설치가 완료되면 **닫기** 를 누릅니다.

![](/img/a_go/setup-pc-windows-18.webp)

### 2.2. 설치 확인

새 명령 프롬프트를 열고 CUDA 컴파일러 버전이 출력되는지 확인합니다.

```bash
nvcc -V
```

![](/img/a_go/setup-pc-windows-19.webp)

## 3. cuDNN 설치

### 3.1. cuDNN 설치

[NVIDIA cuDNN 페이지](https://developer.nvidia.com/cudnn)에서 **Download cuDNN Library** 를 누릅니다.

![](/img/a_go/setup-pc-windows-20.webp)

`Windows` → `x86_64` → `11` → `exe (local)` 을 선택하고 설치 파일을 내려받습니다.

![](/img/a_go/setup-pc-windows-21.webp)

설치 프로그램을 실행해 라이선스 계약에 동의하고, **빠른 설치(권장)** 로 진행합니다.

![](/img/a_go/setup-pc-windows-22.webp)

![](/img/a_go/setup-pc-windows-23.webp)

설치가 완료되면 **닫기** 를 누릅니다.

![](/img/a_go/setup-pc-windows-24.webp)

## 다음 단계

GPU 드라이버와 CUDA 준비가 끝났습니다. Miniconda 설치, 가상환경 생성, PyTorch GPU 인식 확인은 다음 페이지에서 이어서 진행합니다.

<div class="card-grid">
  <a href="/docs/a-go/setup-lerobot-windows" class="card">
    <h3>📦 LeRobot 설치 (Windows)</h3>
    <p>Miniconda · 가상환경 · LeRobot 0.6.0 · PyTorch GPU 확인</p>
  </a>
</div>
