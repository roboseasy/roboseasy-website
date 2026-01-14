# SO-AMR 101 조립 가이드

> **정보** ℹ️ `INFO`
>
> 이 문서는 HuggingFace LeRobot SO-Arm 101 공식 가이드를 기반으로, 
> <br>RoboSEasy 스타일로 재구성한 한국어 조립 안내서입니다.

## 1. 개요

SO-101은 6축 오픈소스 로봇 팔로, 3D 프린팅 부품과 STS3215 서보 모터를 사용하여 직접 조립할 수 있습니다.

## 2. 준비 단계

### 2.1 부품 소싱 및 3D 프린팅

- [SO-ARM100/101 README](https://github.com/TheRobotStudio/SO-ARM100)에서 부품 목록(BOM)과 3D 프린팅 파일을 확인하세요.
- 로보시지는 로보시지만의 3D 프린팅을 제공합니다. 더욱 넓은 확장성과 불편한 부분을 개선하였습니다.
- [3D 파츠 구매하기](https://smartstore.naver.com/roboseasy/products/12361795642)
- [SO-ARM 풀패키지 구매하기](https://smartstore.naver.com/roboseasy/products/12169101368?nl-query=lerobot%20%EA%B5%AC%EB%A7%A4&nl-au=0bf4503d107c402f90b0e21dfbf29ca9)

### 2.2 LeRobot 설치

- [설치 가이드](../software/installation)를 참고하여 LeRobot을 설치하세요.
- Feetech SDK도 추가로 설치해야 합니다.

**가상환경 활성화**

```bash
cd lerobot

# 가상환경 활성화
source .venv/bin/activate
```

**Feetech SDK 설치**

```bash
pip install -e ".[feetech]"
```

---

## 3. 모터 설정

> **팁** 💡`TIP`
>
> 반드시 조립 전, 모터 설정을 먼저해주세요. 
> <br>조립 후 모터 설정을 하게 되면 모터 케이블을 다시 빼고 하나씩 모터 설정을 해야합니다.

### 3.1 USB 포트 찾기

Leader 보드와 Follower 보드를 자신의 PC와 USB 케이블로 연결한 후, 아래 명령어로 포트를 확인하세요.

```bash
ls /dev/ttyACM*
```

```bash
lerobot-find-port
```

Leader 보드와 연결된 USB 케이블을 PC에서 뽑고 Enter를 누릅니다. 그러면 아래와 같은 결과를 확인할 수 있습니다.

```bash
The port of this MotorsBus is '/dev/ttyACM0'
Reconnect the USB cable
```

해당 보드의 포트는 '/dev/ttyACM0'입니다.

이제 Follower 보드와 PC와 연결된 USB 케이블만 남겨두고 같은 명령어를 실행합니다.

```bash
lerobot-find-port
```

Follower 보드와 연결된 USB 케이블을 PC에서 뽑고 Enter를 누릅니다. 그러면 아래와 같은 결과를 확인할 수 있습니다.

```bash
The port of this MotorsBus is '/dev/ttyACM1'
Reconnect the USB cable
```

해당 보드의 포트는 '/dev/ttyACM1'입니다.

각 포트가 어떤 팔(Leader/Follower)에 해당하는지 구분하세요.

> **팁** 💡`TIP`
>
> Ubuntu에서는 기본적으로 포트 사용 권한이 제한되어 있습니다. 
> <br>따라서 **사용자를 `dialout` 그룹에 추가** 해 두면, 
> <br>매번 포트 권한을 직접 설정하지 않아도 되어 훨씬 편리하게 사용할 수 있습니다.

dialout 그룹 권한 부여

```bash
sudo chmod 666 /dev/ttyACM0
sudo chmod 666 /dev/ttyACM1
```

```bash
sudo usermod -a -G dialout $USER
```

### 3.2 모터 ID 및 Baudrate 설정

각 모터는 고유 ID가 필요하며, 통신을 위해 동일한 Baudrate로 설정해야 합니다.

아래 명령어를 실행하고 터미널에서 보이는 가이드에 따라서 모터와 순서를 따르세요.

> **팁** 💡`TIP`
>
> 미리 모터를 순서대로 배열하고 아래 명령어를 실행합니다. 
> <br>아래 첨부한 이미지를 참고하여 순서를 잘 지켜 진행하세요.

| Leader Arm Joint 6 | Leader Arm Joint 5 | Leader Arm Joint 4 |
|--------------------|--------------------|--------------------|
| ![Leader Arm Joint 6 Calibration](../../img/assembly/cal_L6.jpg) | ![Leader Arm Joint 5 Calibration](../../img/assembly/cal_L5.jpg) | ![Leader Arm Joint 4 Calibration](../../img/assembly/cal_L4.jpg) |
| **Leader Arm Joint 3** | **Leader Arm Joint 2** | **Leader Arm Joint 1** |
| ![Leader Arm Joint 3 Calibration](../../img/assembly/cal_L3.jpg) | ![Leader Arm Joint 2 Calibration](../../img/assembly/cal_L2.jpg) | ![Leader Arm Joint 1 Calibration](../../img/assembly/cal_L1.jpg) |

---

| Follower Arm Joint 6 | Follower Arm Joint 5 | Follower Arm Joint 4 |
|----------------------|----------------------|----------------------|
| ![Follower Arm Joint 6 Calibration](../../img/assembly/cal_F6.jpg) | ![Follower Arm Joint 5 Calibration](../../img/assembly/cal_F5.jpg) | ![Follower Arm Joint 4 Calibration](../../img/assembly/cal_F4.jpg) |
| **Follower Arm Joint 3** | **Follower Arm Joint 2** | **Follower Arm Joint 1** |
| ![Follower Arm Joint 3 Calibration](../../img/assembly/cal_F3.jpg) | ![Follower Arm Joint 2 Calibration](../../img/assembly/cal_F2.jpg) | ![Follower Arm Joint 1 Calibration](../../img/assembly/cal_F1.jpg) |

#### Leader 예시

```bash
lerobot-setup-motors \
    --teleop.type=so101_leader \
    --teleop.port=/dev/ttyACM0
```

#### Follower 예시

```bash
lerobot-setup-motors \
    --robot.type=so101_follower \
    --robot.port=/dev/ttyACM1
```

> **팁** 💡`TIP`
>
> 각 모터를 하나씩 연결하여 `ID`와 `Baudrate`를 설정하세요. 
> <br>케이블 연결 상태를 반드시 확인하세요.

---

## 4. 단계별 조립 가이드

아래는 각 관절(Joint)별 조립 방법과 참고 동영상입니다.

### Joint 1 (베이스)

1. 첫 번째 모터를 베이스에 넣고, M2x6mm 나사 4개(위 2개, 아래 2개)로 고정합니다.
2. 모터 홀더를 끼우고, M2x6mm 나사 2개(양쪽 각 1개)로 고정합니다.
3. 모터 혼 2개를 설치하고, 상단 혼은 M3x6mm 나사로 고정합니다.
4. 숄더 부품을 부착하고, M3x6mm 나사 4개(위 4개, 아래 4개)로 고정합니다.
5. 숄더 모터 홀더를 추가합니다.

**참고 영상:**

<video width="100%" controls>
  <source src="../../videos/Joint1_v2.mp4" type="video/mp4">
  브라우저가 video 태그를 지원하지 않습니다.
</video>

### Joint 2 (숄더)

1. 두 번째 모터를 위에서 삽입합니다.
2. M2x6mm 나사 4개로 고정합니다.
3. 모터 혼 2개를 설치하고, M3x6mm 혼 나사로 고정합니다.
4. 상완 부품을 M3x6mm 나사 4개씩 양쪽에 고정합니다.

**참고 영상:**

<video width="100%" controls>
  <source src="../../videos/Joint2_v2.mp4" type="video/mp4">
  브라우저가 video 태그를 지원하지 않습니다.
</video>

### Joint 3 (엘보)

1. 세 번째 모터를 삽입하고, M2x6mm 나사 4개로 고정합니다.
2. 모터 혼 2개를 설치하고, M3x6mm 혼 나사로 고정합니다.
3. 전완 부품을 M3x6mm 나사 4개씩 양쪽에 고정합니다.

**참고 영상:**

<video width="100%" controls>
  <source src="../../videos/Joint3_v2.mp4" type="video/mp4">
  브라우저가 video 태그를 지원하지 않습니다.
</video>

### Joint 4 (손목 굽힘)

1. 모터 홀더 4번을 끼웁니다.
2. 네 번째 모터를 삽입합니다.
3. M2x6mm 나사 4개로 고정하고, 모터 혼을 설치한 뒤 M3x6mm 혼 나사로 고정합니다.

**참고 영상:**

<video width="100%" controls>
  <source src="../../videos/Joint4_v2.mp4" type="video/mp4">
  브라우저가 video 태그를 지원하지 않습니다.
</video>

### Joint 5 (손목 회전)

1. 다섯 번째 모터를 손목 홀더에 넣고, M2x6mm 전면 나사 2개로 고정합니다.
2. 모터 혼 1개를 설치하고, M3x6mm 혼 나사로 고정합니다.
3. 손목 부품을 M3x6mm 나사 4개씩 양쪽에 고정합니다.

**참고 영상:**

<video width="100%" controls>
  <source src="../../videos/Joint5_v2.mp4" type="video/mp4">
  브라우저가 video 태그를 지원하지 않습니다.
</video>

### Gripper (그리퍼)

1. 그리퍼를 5번 모터에 부착하고, 손목의 모터 혼에 M3x6mm 나사 4개로 고정합니다.
2. 그리퍼 모터를 삽입하고, M2x6mm 나사 2개씩 양쪽에 고정합니다.
3. 모터 혼을 설치하고, M3x6mm 혼 나사로 고정합니다.
4. 그리퍼 클로를 M3x6mm 나사 4개씩 양쪽에 고정합니다.

**참고 영상:**

<video width="100%" controls>
  <source src="../../videos/Gripper_v2.mp4" type="video/mp4">
  브라우저가 video 태그를 지원하지 않습니다.
</video>

---

## 5. 조립 영상

조립 영상을 같이 보면서 진행해 보세요!

### 팔로워암 조립 영상

<iframe width="100%" height="400" src="https://www.youtube.com/embed/I2O7ipTH5VI" title="SO-Arm Max 팔로워암 조립 영상" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

### 리더암 조립 영상

<iframe width="100%" height="400" src="https://www.youtube.com/embed/WuzyrXT91Qg" title="SO-Arm Max 리더암 조립 영상" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

---

## 6. 참고 및 문제해결

- [공식 GitHub 문서](https://github.com/huggingface/lerobot/blob/main/docs/source/so101.mdx)
- [RoboSEasy Discord](https://discord.com/invite/s3KuuzsPFb)

> **경고** ⚠️ `WARN`
>
> 조립 및 설정 중 문제가 발생하면, 전원/케이블 연결 상태를 반드시 점검하세요. 
> <br> Waveshare 보드를 사용할 경우 점퍼가 B 채널(USB)에 위치해야 합니다.

## 다음 단계

조립이 완료되었다면, 다음 중 하나를 선택하여 진행하세요:

<div class="card-grid">
  <a href="#/quick-setup" class="card">
    <h3>⚡ 원터치 세팅 (추천)</h3>
    <p>모든 설정을 한 번에 자동으로 완료합니다</p>
  </a>
  <a href="#/software-installation" class="card">
    <h3>🔌 단계별 진행</h3>
    <p>소프트웨어 설치부터, USB 포트와 카메라까지 하나씩 설정합니다</p>
  </a>
</div>
