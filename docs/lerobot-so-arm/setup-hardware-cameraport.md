# 카메라 포트 번호 고정 가이드

> **왜 카메라 포트 고정이 필요한가?**
>
> USB 카메라를 매번 연결할 때마다 `/dev/video0`, `/dev/video2` 등의 번호가 달라지는 문제가 있습니다.
> <br>이로 인해 상단 카메라와 손목 카메라가 바뀌어 인식되면, <br>**녹화 데이터가 뒤섞이거나 학습에 잘못된 영상이 사용될 위험**이 있습니다.
> <br>이 문제를 **udev 규칙**을 통해 간단히 해결할 수 있습니다.

---

## 목적 및 개요

LeRobot 텔레오퍼레이션을 진행할 때, 여러 대의 카메라가 USB 포트를 통해 PC와 연결됩니다.
하지만 Ubuntu에서는 <br>카메라를 연결할 때마다 포트 번호(`/dev/video0`, `/dev/video2`)가 자동으로 바뀌는 경우가 있습니다.

이로 인해 다음과 같은 문제가 발생할 수 있습니다.

- **카메라 혼선 문제**: 상단 카메라와 손목 카메라가 서로 바뀌어 인식되어 잘못된 시점의 영상이 녹화됩니다.
- **데이터셋 오류**: 각 카메라의 고유 위치가 바뀌면, 저장된 영상 데이터가
  잘못 매핑되어 **정확한 학습이 불가능**해집니다.
- **반복 실험 비효율**: 매번 카메라를 다시 확인하고 수정해야 하므로 **연구·개발 효율이 저하**됩니다.

이 가이드에서는 위 문제를 해결하기 위해,
<br>각 카메라의 **USB 포트 위치(KERNELS)** 를 기반으로 고정 포트를 지정하는 **udev 규칙 설정 방법**을 설명합니다.

이 과정을 완료하면,
USB 케이블을 재연결하더라도 항상 아래처럼 고정된 경로로 인식됩니다.

---

## 1. 카메라 정보 확인

먼저 연결된 카메라들의 장치 경로를 확인해야 합니다.

v4l2-ctl 도구를 설치합니다.

```bash
sudo apt install v4l-utils
```

연결된 비디오 장치 목록을 확인합니다.

```bash
v4l2-ctl --list-devices
```

출력 결과에서 확인하려는 카메라의 `/dev/videoX` 번호를 찾습니다.
일반적으로 `/dev/video2`, `/dev/video4`와 같은 짝수 번호가 USB 카메라입니다.

> **팁** 💡`TIP`
> <br>**비디오 장치가 여러 개 표시되는 이유**
>
> 각 카메라는 보통 2개의 장치(`/dev/video2`, `/dev/video3`)로 표시됩니다.
> <br>하나는 실제 영상 스트림용이고, 하나는 메타데이터용입니다. 
> <br>짝수 번호가 일반적으로 영상 스트림용입니다.

---

## 2. 포트 위치(KERNELS) 확인

일부 저가형 웹캠은 시리얼 번호가 없거나 동일하게 표기될 수 있습니다.
<br>이 경우 시리얼 번호 대신 **USB 포트 위치(KERNELS)** 정보를 사용해야 합니다.

각 카메라가 연결된 고유한 하드웨어 경로를 확인합니다.

```bash
udevadm info -a -n /dev/video2 | grep 'KERNELS=="[0-9]' | head -n 1
```

예시 출력:

```plaintext
KERNELS=="1-1:1.0"
```

다른 카메라도 동일하게 확인합니다.

```bash
udevadm info -a -n /dev/video4 | grep 'KERNELS=="[0-9]' | head -n 1
```

출력 예시:

```plaintext
KERNELS=="1-2:1.0"
```

> **경고** ⚠️ `WARN`
> <br>**KERNELS 값이 안 보인다면**
>
> `grep 'KERNELS=="[0-9]'` 대신 `grep 'KERNELS'`만 사용해서 전체 결과를 확인해보세요. 
> <br>USB 버스 위치를 나타내는 값을 찾으시면 됩니다.

---

## 3. udev 규칙 파일 생성

이제 확인한 KERNELS 값을 기반으로, 고정된 심볼릭 링크(/dev/cam_top, /dev/cam_wrist)를 생성합니다.

```bash
sudo nano /etc/udev/rules.d/99-serial.rules
```

다음 내용을 추가합니다:

```plaintext
SUBSYSTEM=="video4linux", KERNELS=="1-1:1.0", ATTR{index}=="0", SYMLINK+="cam_top"
SUBSYSTEM=="video4linux", KERNELS=="1-2:1.0", ATTR{index}=="0", SYMLINK+="cam_wrist"
```

> **팁** 💡`TIP`
> <br>**심볼릭 링크 이름 변경**
>
> `cam_top`, `cam_wrist` 대신 `cam_left`, `cam_right` 또는 `cam_hand` 등 
> <br>본인이 구분하기 쉬운 이름으로 정하셔도 됩니다.

---

## 4. 규칙 적용 및 확인

규칙을 적용합니다.

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
```

적용 후, 새로운 경로를 확인합니다.

```bash
ls -l /dev/cam_*
```

예시 출력:

```bash
lrwxrwxrwx 1 root root 7 1월 10 15:30 /dev/cam_top -> video2
lrwxrwxrwx 1 root root 7 1월 10 15:30 /dev/cam_wrist -> video4
```

> **성공** ✨ `SUCCESS` 
> <br>**이제 완벽히 고정되었습니다!**
>
> 이제 카메라를 재연결하더라도 `/dev/cam_top`, `/dev/cam_wrist`로 항상 동일하게 인식됩니다.

---

## 주의사항

> **경고** ⚠️ `WARN`
> <br>**물리적 USB 포트 위치 고정**
>
> 이 방식은 **물리적인 USB 포트 위치**를 기준으로 고정하는 방식입니다.
> <br>따라서 **카메라 케이블을 다른 USB 포트에 꽂으면 인식이 되지 않거나 경로가 바뀔 수 있습니다.**
> <br>앞으로는 정해진 포트에만 해당 카메라를 꽂아서 사용해야 합니다.

- **Index 번호**: `ATTR{index}=="0"` 조건은 각 카메라의 첫 번째 장치(영상 스트림용)만 선택하기 위한 것입니다.
- **시리얼 번호 방식**: 만약 카메라에 고유 시리얼 번호가 있다면, USB 포트 방식 대신 시리얼 번호 방식을 사용할 수도 있습니다.

---

## 다음 단계

<div class="card-grid">
  <a href="#/software-calibration" class="card">
    <h3>⚙️ Calibration</h3>
    <p>로봇을 보정하고 사용 준비를 완료합니다</p>
  </a>
</div>
