# 원터치 세팅

> **왜 원터치 세팅이 필요한가?**
>
> LeRobot 환경을 수동으로 설정하려면 여러 단계를 거쳐야 합니다.
> <br>이 가이드에서는 **uv 설치, LeRobot 다운로드, 가상환경 구성, USB 포트 권한 설정, 로봇 포트 고정, 카메라 포트 고정**까지
> <br>모든 과정을 **단 한 번의 스크립트 실행**으로 완료할 수 있는 방법을 제공합니다.

---

## 목적 및 개요

LeRobot을 사용하기 위해서는 다음과 같은 여러 설정 단계가 필요합니다.

- Python 가상환경 구성 (uv 설치 및 Python 3.10 환경 생성)
- LeRobot 소스 코드 다운로드 및 설치
- ffmpeg 및 v4l-utils 설치
- USB 포트 권한 설정
- udev 규칙을 통한 로봇 포트 고정
- udev 규칙을 통한 카메라 포트 고정

이 모든 과정을 **하나의 셸 스크립트**로 자동화하여,
<br>처음 시작하는 사용자도 간편하게 LeRobot 환경을 구축할 수 있도록 합니다.

---

## 1. 스크립트 파일 생성

터미널을 열고 아래 명령어를 입력하여 스크립트 파일을 생성합니다.

```bash
nano setup_lerobot.sh
# 또는
# gedit setup_lerobot.sh
```

---

## 2. 스크립트 내용 입력

아래 내용을 복사하여 파일에 붙여넣습니다.

```bash
#!/bin/bash
set -e  # 오류 발생 시 즉시 종료

echo "🚀 LeRobot 설치 및 설정을 시작합니다..."

# 1단계: uv 설치
echo "📦 uv 설치 중..."
curl -LsSf https://astral.sh/uv/install.sh | sh

# uv 경로 반영
export PATH="$HOME/.local/bin:$PATH"

# 2단계: LeRobot 소스 코드 다운로드
echo "📥 LeRobot 소스 다운로드 중..."
if [ ! -d "lerobot" ]; then
    git clone https://github.com/huggingface/lerobot.git
fi
cd lerobot

# 3단계: Python 3.10 가상환경 생성
echo "🐍 Python 3.10 환경 생성 중..."
uv venv --python 3.10
source .venv/bin/activate

# 4단계: ffmpeg 및 v4l-utils 설치
echo "🎞 ffmpeg 및 v4l-utils 설치 중..."
sudo apt update -y
sudo apt install -y ffmpeg v4l-utils

# 5단계: LeRobot 설치
echo "🤖 LeRobot 설치 중..."
uv pip install -e .
uv pip install -e ".[feetech]"
uv pip install rerun-sdk


# 6단계: USB 포트 권한 설정
echo "🔌 USB 포트 권한 설정 중..."
for port in /dev/ttyACM*; do
    if [ -e "$port" ]; then
        echo "  권한 부여: $port"
        sudo chmod 666 "$port"
    fi
done

sudo usermod -a -G dialout $USER
echo "✅ 현재 사용자를 dialout 그룹에 추가했습니다. (재로그인 필요)"

# 7단계: 로봇 포트 udev 규칙 설정
echo "⚙️ 로봇 포트 udev 규칙 생성 중..."
read -p "리더 보드(leader)의 포트 이름을 입력하세요 (예: /dev/ttyACM0): " leader_port
read -p "팔로워 보드(follower)의 포트 이름을 입력하세요 (예: /dev/ttyACM1): " follower_port

leader_serial=$(udevadm info -a -n "$leader_port" | grep '{serial}' -m 1 | cut -d'"' -f2)
follower_serial=$(udevadm info -a -n "$follower_port" | grep '{serial}' -m 1 | cut -d'"' -f2)

if [ -z "$leader_serial" ] || [ -z "$follower_serial" ]; then
    echo "❌ 시리얼 번호를 찾을 수 없습니다. USB 연결을 확인하세요."
    exit 1
fi

echo "📄 /etc/udev/rules.d/99-serial.rules 생성 중..."
sudo bash -c "cat > /etc/udev/rules.d/99-serial.rules" <<EOF
# 로봇 포트 설정
SUBSYSTEM=="tty", ATTRS{serial}=="$leader_serial", SYMLINK+="so101_leader"
SUBSYSTEM=="tty", ATTRS{serial}=="$follower_serial", SYMLINK+="so101_follower"
EOF

# 8단계: 카메라 포트 udev 규칙 설정
echo ""
echo "📹 카메라 포트 udev 규칙 생성 중..."
echo "📌 연결된 비디오 장치 목록:"
v4l2-ctl --list-devices

read -p "첫 번째 카메라의 포트 이름을 입력하세요 (예: /dev/video2): " cam1_port
read -p "두 번째 카메라의 포트 이름을 입력하세요 (예: /dev/video4): " cam2_port

cam1_kernels=$(udevadm info -a -n "$cam1_port" | grep 'KERNELS==' | grep -E '[0-9]-[0-9]' | head -n 1 | cut -d'"' -f2)
cam2_kernels=$(udevadm info -a -n "$cam2_port" | grep 'KERNELS==' | grep -E '[0-9]-[0-9]' | head -n 1 | cut -d'"' -f2)

if [ -z "$cam1_kernels" ] || [ -z "$cam2_kernels" ]; then
    echo "⚠️ 카메라 KERNELS 정보를 찾을 수 없습니다. 카메라 포트 설정을 건너뜁니다."
else
    read -p "첫 번째 카메라의 심볼릭 링크 이름 (예: cam_top): " cam1_name
    read -p "두 번째 카메라의 심볼릭 링크 이름 (예: cam_wrist): " cam2_name

    echo "📄 카메라 규칙을 /etc/udev/rules.d/99-serial.rules에 추가 중..."
    sudo bash -c "cat >> /etc/udev/rules.d/99-serial.rules" <<EOF

# 카메라 포트 설정
SUBSYSTEM=="video4linux", KERNELS=="$cam1_kernels", ATTR{index}=="0", SYMLINK+="$cam1_name"
SUBSYSTEM=="video4linux", KERNELS=="$cam2_kernels", ATTR{index}=="0", SYMLINK+="$cam2_name"
EOF
    echo "✅ 카메라 포트 규칙이 추가되었습니다."
fi

# 9단계: udev 규칙 적용
echo ""
echo "🔄 udev 규칙 적용 중..."
sudo udevadm control --reload-rules
sudo udevadm trigger

echo "🔍 적용된 심볼릭 링크 확인:"
echo "로봇 포트:"
ls -l /dev/so101_* 2>/dev/null || echo "  링크가 아직 생성되지 않았습니다. USB를 재연결하세요."

if [ -n "$cam1_name" ]; then
    echo "카메라 포트:"
    ls -l /dev/$cam1_name /dev/$cam2_name 2>/dev/null || echo "  링크가 아직 생성되지 않았습니다. 카메라를 재연결하세요."
fi

echo ""
echo "🎉 모든 설정이 완료되었습니다!"
echo "📌 새 터미널을 열거나 'source ~/.bashrc' 후 다음 명령을 실행하세요:"
echo "cd lerobot && source .venv/bin/activate"
echo ""
```

파일을 저장하고 닫습니다 (nano에서는 `Ctrl+X` → `Y` → `Enter`).

---

## 3. 실행 권한 부여

스크립트 파일에 실행 권한을 부여합니다.

```bash
chmod +x setup_lerobot.sh
```

---

## 4. 로봇 및 카메라 연결

스크립트를 실행하기 전에, USB 케이블로 로봇과 카메라를 연결합니다.

> **경고** ⚠️ `WARN` 
> <br>**연결 순서 주의**
>
> **Leader Arm(검정색)** 을 먼저 연결한 후, **Follower Arm(보라색)** 을 연결합니다.
> <br>그 다음 **카메라 2대**를 연결합니다. 이렇게 하면 스크립트 실행 시 포트 번호를 쉽게 확인할 수 있습니다.

---

## 5. 스크립트 실행

이제 스크립트를 실행합니다.

```bash
./setup_lerobot.sh
```

스크립트가 실행되면 다음 작업이 자동으로 진행됩니다:

1. uv 설치
2. LeRobot 소스 코드 다운로드
3. Python 3.10 가상환경 생성
4. ffmpeg 및 v4l-utils 설치
5. LeRobot 및 Feetech 라이브러리 설치
6. USB 포트 권한 설정
7. 로봇 포트 udev 규칙 생성 (리더/팔로워 포트 입력 필요)
8. 카메라 포트 udev 규칙 생성 (카메라 포트 및 이름 입력 필요)
9. udev 규칙 적용

> **팁** 💡`TIP` 
> <br>**포트 입력 안내**
>
> 스크립트 실행 중 다음 정보를 입력해야 합니다:
> - **로봇 포트**: 리더와 팔로워의 포트 이름 (예: `/dev/ttyACM0`, `/dev/ttyACM1`)
> - **카메라 포트**: 각 카메라의 포트 이름 (예: `/dev/video2`, `/dev/video4`)
> - **카메라 이름**: 각 카메라의 심볼릭 링크 이름 (예: `cam_top`, `cam_wrist`)

---

## 6. 설정 완료 확인

스크립트가 성공적으로 완료되면, 다음과 같이 고정된 포트가 생성됩니다.

로봇 포트 확인:

```bash
ls -l /dev/so101_*
```

예시 출력:

```plaintext
lrwxrwxrwx 1 root root 7 1월 10 15:30 /dev/so101_follower -> ttyACM1
lrwxrwxrwx 1 root root 7 1월 10 15:30 /dev/so101_leader -> ttyACM0
```

카메라 포트 확인:

```bash
ls -l /dev/cam_*
```

예시 출력:

```plaintext
lrwxrwxrwx 1 root root 7 1월 10 15:30 /dev/cam_top -> video2
lrwxrwxrwx 1 root root 7 1월 10 15:30 /dev/cam_wrist -> video4
```

> **성공** ✨ `SUCCESS`
>
> 이제 LeRobot 환경이 완벽하게 구성되었습니다!
> <br>새 터미널을 열거나 `source ~/.bashrc`를 실행한 후,
> <br>`cd lerobot && source .venv/bin/activate` 명령으로 가상환경을 활성화하여 사용할 수 있습니다.

---

## 문제 해결

### Permission denied 오류

```bash
sudo chmod 666 /dev/ttyACM*
sudo usermod -a -G dialout $USER
```

명령 실행 후, **로그아웃했다가 다시 로그인**하세요.

### 시리얼 번호를 찾을 수 없다는 오류

USB 연결을 확인하고, 다음 명령으로 장치가 제대로 인식되는지 확인하세요.

```bash
ls /dev/ttyACM*
udevadm info -a -n /dev/ttyACM0 | grep '{serial}'
```

### udev 규칙이 적용되지 않음

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

명령을 다시 실행하거나, USB를 재연결해 보세요.

---

## 다음 단계

<div class="card-grid">
  <a href="#/software-calibration" class="card">
    <h3>⚙️ Calibration</h3>
    <p>로봇을 보정하고 사용 준비를 완료합니다</p>
  </a>
</div>
