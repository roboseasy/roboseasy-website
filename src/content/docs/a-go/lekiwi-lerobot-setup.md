---
title: "LeRobot 설치 (Pi)"
category: "a-go"
group: "LeKiwi 세팅"
order: 80
---

# LeKiwi LeRobot 라이브러리 세팅

[LeRobot 설치](/docs/a-go/setup-lerobot-ubuntu)에서는 PC에 LeRobot을 설치했고, [고정 IP · 무선 연결](/docs/a-go/lekiwi-wifi-static-ip)에서는 LeKiwi의 라즈베리파이에 무선으로 접속할 수 있게 만들었습니다. 이 페이지에서는 **라즈베리파이 쪽에도 LeRobot을 설치**합니다. 로봇이 PC와 대화하려면 양쪽 모두 같은 언어를 알아야 하기 때문입니다.

> **정보** ℹ️ `INFO`
> <br>🎯 **학습 목표**
>
> - LeKiwi가 호스트와 클라이언트로 나뉘어 동작하는 구조를 설명할 수 있다.
> - 라즈베리파이에 Python 가상환경을 만들고 활성화할 수 있다.
> - 의존성 충돌을 피하며 LeRobot을 설치하고, 설치가 올바른지 검증할 수 있다.

---

## 1. LeKiwi의 소프트웨어 구조: 호스트와 클라이언트

LeKiwi는 프로그램 하나가 로봇을 통째로 움직이는 방식이 아닙니다. 역할이 두 컴퓨터에 나뉘어 있습니다.

| 역할 | 실행 위치 | 하는 일 |
|---|---|---|
| **호스트(host)** | 라즈베리파이 | 모터와 카메라에 직접 연결. 명령을 받아 실행하고 관측값을 보냄 |
| **클라이언트(client)** | PC | 텔레오퍼레이션, 데이터 기록, 학습된 정책 실행. 호스트에 명령을 보냄 |

두 프로그램은 와이파이를 통해 **ZeroMQ**라는 메시징 라이브러리로 통신합니다. 이렇게 나누는 이유는 라즈베리파이의 연산 능력이 제한적이기 때문입니다. 무거운 계산은 PC가 맡고, 라즈베리파이는 센서와 모터를 다루는 일에 집중합니다. [고정 IP · 무선 연결](/docs/a-go/lekiwi-wifi-static-ip)에서 고정 IP를 만든 것도 결국 클라이언트가 호스트를 안정적으로 찾기 위해서였습니다.

따라서 라즈베리파이에는 호스트 프로그램이 들어 있는 LeRobot 패키지가 필요합니다. 이 페이지의 목표는 이것을 설치하고 호스트 프로그램이 실행 가능한 상태인지 확인하는 것입니다.

---

## 2. [PC] LeKiwi 접속

[고정 IP · 무선 연결](/docs/a-go/lekiwi-wifi-static-ip)에서 만든 접속 경로로 라즈베리파이에 들어갑니다. 이 페이지의 나머지 명령은 모두 이 SSH 창 안에서 실행합니다.

```bash
ssh roboseasy@lekiwi07.local
```

`.local` 접속이 되지 않는 환경이라면 고정 IP(`192.168.x.207` 형태)로 접속합니다. 패키지를 내려받아야 하므로 라즈베리파이가 **인터넷에 연결된 상태**여야 합니다. 와이파이 연결이 되어 있거나, [유선 연결](/docs/a-go/lekiwi-wired-connection)의 유선 인터넷 공유 상태면 됩니다.

---

## 3. [Pi] 가상환경 만들기

### 3.1. 왜 venv를 쓰는가

PC에서는 conda를 썼지만 라즈베리파이에서는 Python에 기본 내장된 **venv**를 씁니다.

- conda는 자체 패키지 저장소와 환경 관리자를 함께 설치하므로 ARM 기반 소형 보드에서는 무겁습니다.
- 우분투 24.04에는 이미 Python 3.12가 들어 있어, 별도 Python을 설치할 이유가 없습니다.
- venv는 표준 라이브러리의 일부라 추가 설치 없이 바로 쓸 수 있습니다.

목적은 conda와 같습니다. 시스템 Python을 건드리지 않고, 프로젝트 전용으로 격리된 패키지 공간을 만드는 것입니다. 우분투는 시스템 Python에 직접 `pip install` 하는 것을 막아 두었기 때문에 가상환경은 선택이 아니라 필수입니다.

### 3.2. 생성과 활성화

가상환경 이름에 LeRobot 버전을 넣어 두면 나중에 다른 버전을 함께 두어도 헷갈리지 않습니다.

```bash
python3 -m venv ~/lerobot060_venv
source ~/lerobot060_venv/bin/activate
```

활성화되면 프롬프트 앞에 `(lerobot060_venv)` 가 붙습니다. 이 상태에서 실행하는 `python` 과 `pip` 는 시스템 것이 아니라 가상환경 안의 것입니다.

```text
(lerobot060_venv) roboseasy@lekiwi07:~$
```

> **팁** 💡`TIP`
> <br>접속할 때마다 자동으로 활성화되게 하려면 `.bashrc` 끝에 활성화 명령을 추가합니다. 한 번 해 두면 이후 단계에서 매번 입력할 필요가 없습니다.
>
> ```bash
> echo 'source ~/lerobot060_venv/bin/activate' >> ~/.bashrc
> ```

pip 자체를 최신으로 올려 둡니다. 오래된 pip는 최신 패키지 형식을 처리하지 못해 설치가 실패할 수 있습니다.

```bash
pip install -U pip
```

---

## 4. [Pi] LeRobot 설치

### 4.1. PyTorch를 먼저 고정하기

LeRobot을 바로 설치하면 의존성으로 **가장 최신 PyTorch**를 끌어옵니다. 라즈베리파이의 ARM 아키텍처에서는 최신 버전이 아직 빌드되어 있지 않거나, 다른 패키지와 버전이 맞지 않는 일이 종종 생깁니다. 그래서 검증된 버전을 **먼저** 설치해 고정해 둡니다. 이미 설치된 패키지는 pip가 다시 바꾸지 않으므로, 뒤에 오는 LeRobot 설치가 이 버전을 그대로 씁니다.

```bash
pip install 'torch==2.7.1' 'torchvision==0.22.1'
```

용량이 수백 MB라 몇 분 걸립니다. 이것은 로봇 제어에 필요한 최소한의 PyTorch이며, 학습에 쓰는 GPU 버전이 아닙니다. 학습은 [LeRobot 설치](/docs/a-go/setup-lerobot-ubuntu)에서 세팅한 PC에서 합니다.

> **팁** 💡`TIP`
> <br>**왜 순서가 중요할까?** pip는 요청받은 패키지의 의존성을 풀 때 이미 설치된 것은 조건을 만족하는 한 그대로 둡니다. 순서를 바꿔 LeRobot을 먼저 설치하면 최신 PyTorch가 들어온 뒤라서, 나중에 2.7.1로 내리려면 관련 패키지를 전부 다시 맞춰야 합니다. 의존성이 복잡한 라이브러리는 이렇게 **핵심 패키지를 먼저 고정하는 것**이 정석입니다.

### 4.2. LeRobot 설치

```bash
pip install 'lerobot[lekiwi]==0.6.0'
```

- `[lekiwi]` 는 [LeRobot 설치](/docs/a-go/setup-lerobot-ubuntu)에서 본 **선택적 의존성(extras)** 입니다. LeKiwi 호스트에 필요한 모터 드라이버(feetech)와 통신 라이브러리(pyzmq)가 함께 설치됩니다. ZeroMQ를 따로 설치할 필요가 없습니다.
- `==0.6.0` 은 PC와 **같은 버전**으로 맞추기 위해서입니다. 호스트와 클라이언트의 버전이 다르면 메시지 형식이 달라 통신이 깨질 수 있습니다.

---

## 5. [Pi] 설치 검증

설치가 끝났다는 메시지만 믿지 말고, 실제로 불러와지는지 확인합니다.

### 5.1. 모듈 불러오기 확인

핵심 모듈 네 가지를 한 번에 import 하고 버전을 출력합니다.

```bash
python -c "import torch, lerobot, lerobot.robots.lekiwi, zmq; print(lerobot.__version__, torch.__version__)"
```

```text
0.6.0 2.7.1+cpu
```

이 두 숫자가 나오면 LeRobot, PyTorch, LeKiwi 모듈, ZeroMQ가 모두 정상입니다. 하나라도 빠지면 `ModuleNotFoundError` 와 함께 어떤 모듈인지 알려 주므로 그 부분만 다시 설치하면 됩니다.

### 5.2. 호스트 프로그램 확인

LeKiwi 호스트는 Python 모듈로 실행합니다. 도움말이 출력되면 프로그램이 온전히 설치된 것입니다.

```bash
python -m lerobot.robots.lekiwi.lekiwi_host --help
```

옵션 목록이 길게 출력되면 성공입니다. 실제로 호스트를 띄우는 것은 [캘리브레이션](/docs/a-go/start-calibration)과 [텔레오퍼레이션](/docs/a-go/start-teleoperation)에서 합니다.

> **팁** 💡`TIP`
> <br>가상환경을 활성화하지 않은 상태에서도 실행하고 싶다면 경로를 직접 지정하면 됩니다. 스크립트나 자동 실행 설정에서 유용합니다.
>
> ```bash
> ~/lerobot060_venv/bin/python -m lerobot.robots.lekiwi.lekiwi_host --help
> ```

---

## 6. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `externally-managed-environment` 오류 | 가상환경이 활성화되지 않은 상태. 프롬프트에 `(lerobot060_venv)` 가 있는지 확인 |
| `No matching distribution found for torch==2.7.1` | 인터넷 연결 또는 pip 버전. `pip install -U pip` 후 재시도 |
| 설치 중 `Killed` 로 중단 | 메모리 부족. 다른 프로그램을 종료하고 재시도하거나 스왑을 늘림 |
| `ModuleNotFoundError: No module named 'zmq'` | `pip install 'lerobot[lekiwi]==0.6.0'` 에서 대괄호를 빼먹었는지 확인 |
| 버전이 `0.6.0` 이 아님 | `pip install 'lerobot[lekiwi]==0.6.0' --force-reinstall` 로 재설치 |

---

## 7. 정리

- LeKiwi는 라즈베리파이의 **호스트**와 PC의 **클라이언트**로 나뉘어 ZeroMQ로 통신합니다.
- 라즈베리파이에서는 가볍고 내장된 **venv**로 가상환경을 만듭니다.
- 의존성 충돌을 피하려면 **PyTorch를 먼저 고정**한 뒤 LeRobot을 설치합니다.
- PC와 **같은 버전**(0.6.0)을 맞추고, import 와 `--help` 로 설치를 검증합니다.

이제 로봇 쪽 소프트웨어가 준비되었습니다. 다음 페이지 [캘리브레이션](/docs/a-go/start-calibration)에서는 모터의 기준 위치를 맞추는 캘리브레이션을 진행합니다.
