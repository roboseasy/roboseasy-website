# USB 포트 번호 고정 가이드

> **왜 포트 고정이 필요한가?**
>
> USB 장치를 매번 연결할 때마다 `/dev/ttyACM0`, `/dev/ttyACM1` 등의 번호가 달라지는 문제가 있습니다.<br>
> 이로 인해 Leader Arm과 Follower Arm이 바뀌어 인식되면, <br>**칼리브레이션 데이터가 뒤섞이거나 모터가 잘못 움직여 손상될 위험**이 있습니다.
> <br>이 문제를 **udev 규칙**을 통해 간단히 해결할 수 있습니다.

---

## 목적 및 개요

리더-팔로워 텔레오퍼레이션을 진행할 때, 두 로봇은 USB 포트를 통해 PC와 연결됩니다.
하지만 Ubuntu에서는 장치를 연결할 때마다 포트 번호(`/dev/ttyACM0`, `/dev/ttyACM1`)가 자동으로 바뀌는 경우가 있습니다.

이로 인해 다음과 같은 문제가 발생할 수 있습니다:

- **포트 혼선 문제**: Leader Arm과 Follower Arm이 서로 바뀌어 인식되어 로봇이 오작동하거나,
  잘못된 모터가 구동되어 **기계적 손상**이 발생할 수 있습니다.
- **칼리브레이션 데이터 오류**: 각 암의 고유 포트가 바뀌면, 저장된 보정(calibration) 데이터가
  잘못 적용되어 **정확한 동작 재현이 불가능**해집니다.
- **반복 실험 비효율**: 매번 포트를 다시 확인하고 수정해야 하므로 **연구·개발 효율이 저하**됩니다.

이 가이드에서는 위 문제를 해결하기 위해,
각 장치의 **시리얼 넘버(Serial Number)** 를 기반으로 고정 포트를 지정하는 **udev 규칙 설정 방법**을 설명합니다.

이 과정을 완료하면,
USB 케이블을 어떤 순서로 꽂더라도 항상 아래처럼 고정된 경로로 인식됩니다.

---

## 1. 장치 정보 확인

먼저 각 장치의 시리얼 넘버(Serial Number)를 확인해야 합니다.

```bash
ls /dev/ttyACM*
```

각 포트의 접근 권한을 설정합니다.

```bash
sudo chmod 666 /dev/ttyACM0
sudo chmod 666 /dev/ttyACM1
```

현재 사용자를 dialout 그룹에 추가하면, 루트 권한 없이도 시리얼 포트 접근이 가능합니다.

```bash
sudo usermod -a -G dialout $USER
```

> **팁** 💡`TIP` 
> <br>**Permission denied 에러 해결**
>
> `Permission denied: '/dev/ttyACM0'` 오류가 발생한다면 `dialout` 그룹 권한이 없거나
> <br>`chmod` 설정이 누락된 경우일 가능성이 높습니다.

---

## 2. 시리얼 넘버 확인

각 장치의 고유 시리얼 넘버를 확인합니다.

```bash
udevadm info -a -n /dev/ttyACM0 | grep '{serial}' -m 1
```

예시 출력:

```plaintext
ATTRS{serial}=="5AB0183022"
```

다른 포트도 동일하게 확인합니다.

```bash
udevadm info -a -n /dev/ttyACM1 | grep '{serial}' -m 1
```

출력 예시:

```plaintext
ATTRS{serial}=="5AB0182087"
```

---

## 3. udev 규칙 파일 생성

이제 이 시리얼 번호를 기반으로, 고정된 심볼릭 링크(/dev/so101_leader, /dev/so101_follower)를 생성합니다.

```bash
sudo nano /etc/udev/rules.d/99-serial.rules
```

다음 내용을 추가합니다:

```plaintext
SUBSYSTEM=="tty", ATTRS{serial}=="5AB0183022", SYMLINK+="so101_leader"
SUBSYSTEM=="tty", ATTRS{serial}=="5AB0182087", SYMLINK+="so101_follower"
```

---

## 4. 규칙 적용 및 확인

규칙을 적용합니다.

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

적용 후, 새로운 경로를 확인합니다.

```bash
ls -l /dev/so101_*
```

예시 출력:

```bash
lrwxrwxrwx 1 root root 7 10월 11 22:35 /dev/so101_follower -> ttyACM1
lrwxrwxrwx 1 root root 7 10월 11 22:35 /dev/so101_leader -> ttyACM0
```

> **성공** ✨ `SUCCESS` 
> <br>**이제 완벽히 고정되었습니다!**
>
> 이제 USB 포트를 꽂는 순서가 바뀌더라도 `/dev/so101_leader`, `/dev/so101_follower`로 항상 동일하게 인식됩니다.

## 다음 단계

<div class="card-grid">
  <a href="#/hardware-camera" class="card">
    <h3>📷 카메라 포트 고정 (선택)</h3>
    <p>카메라가 있다면 카메라 포트도 고정하세요</p>
  </a>
  <a href="#/software-calibration" class="card">
    <h3>⚙️ Calibration</h3>
    <p>카메라가 없다면 바로 캘리브레이션으로 넘어갑니다</p>
  </a>
</div>
