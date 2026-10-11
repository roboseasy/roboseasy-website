---
title: "USB 포트 고정"
category: "a-go"
group: "Start"
order: 120
---

# LeKiwi USB 포트 고정

[카메라 포트 고정](/docs/a-go/setup-cameraport)에서 카메라 번호가 바뀌는 문제를 해결했다면, 이번에는 **모터 제어 보드**의 시리얼 포트를 고정합니다. 라즈베리파이에서 모터 보드는 보통 `/dev/ttyACM0` 으로 잡히지만, USB를 다시 꽂거나 다른 USB 장치가 먼저 인식되면 `/dev/ttyACM1` 로 바뀔 수 있습니다. 그러면 호스트가 모터를 찾지 못합니다.

이 페이지에서는 모터 보드의 **시리얼 번호**를 기준으로 `/dev/lekiwi` 라는 고정 이름을 만듭니다.

> 🎯 **학습 목표**
>
> - 시리얼 장치의 고유 시리얼 번호를 확인할 수 있다.
> - udev 규칙으로 모터 보드에 고정 이름(`/dev/lekiwi`)을 붙일 수 있다.

---

## 1. [Pi] 시리얼 포트 권한 확인

라즈베리파이에 SSH로 접속해 진행합니다. 먼저 모터 보드가 어떤 이름으로 잡혀 있는지 확인합니다.

```bash
ls /dev/ttyACM*
```

현재 사용자를 `dialout` 그룹에 추가하면 루트 권한 없이도 시리얼 포트에 접근할 수 있습니다. 추가한 뒤에는 SSH 접속을 끊었다가 다시 접속해야 적용됩니다.

```bash
sudo usermod -aG dialout $USER
```

> **팁** 💡`TIP`
> <br>**Permission denied 오류 해결**
> <br>`Permission denied: '/dev/ttyACM0'` 오류는 대부분 `dialout` 그룹 권한이 없어서 생깁니다. 재접속 전에 당장 테스트해야 한다면 `sudo chmod 666 /dev/ttyACM0` 로 임시 권한을 줄 수 있습니다(재부팅하면 사라짐).

---

## 2. [Pi] 시리얼 번호 확인

모터 보드의 고유 시리얼 번호를 확인합니다.

```bash
udevadm info -a -n /dev/ttyACM0 | grep '{serial}' -m 1
```

```text
ATTRS{serial}=="5AB0183022"
```

카메라는 저가형 웹캠에 시리얼 번호가 없는 경우가 많아 USB 포트 위치로 구분했지만, 모터 보드는 고유 시리얼 번호가 있으므로 **어느 USB 포트에 꽂아도** 같은 이름을 붙일 수 있습니다.

---

## 3. [Pi] udev 규칙 작성

[카메라 포트 고정](/docs/a-go/setup-cameraport)에서 만든 규칙 파일을 엽니다.

```bash
sudo nano /etc/udev/rules.d/99-serial.rules
```

파일 끝에 아래 줄을 추가합니다. `ATTRS{serial}` 값은 2절에서 확인한 내 보드의 값으로 바꿉니다.

```text
SUBSYSTEM=="tty", ATTRS{serial}=="5AB0183022", SYMLINK+="lekiwi"
```

| 항목 | 의미 |
|---|---|
| `SUBSYSTEM=="tty"` | 시리얼 장치만 대상 |
| `ATTRS{serial}=="..."` | 이 시리얼 번호를 가진 장치만 대상 |
| `SYMLINK+="lekiwi"` | `/dev/lekiwi` 라는 별칭 생성 |

---

## 4. [Pi] 규칙 적용 및 확인

규칙을 다시 읽어 들이고 기존 장치에도 적용합니다.

```bash
sudo udevadm control --reload-rules
sudo udevadm trigger
ls -l /dev/lekiwi
```

```text
lrwxrwxrwx 1 root root 7 10월 11 22:35 /dev/lekiwi -> ttyACM0
```

별칭이 모터 보드의 포트를 가리키면 완료입니다. 이제 USB를 다시 꽂거나 꽂는 순서가 바뀌어도 모터 보드는 항상 `/dev/lekiwi` 로 인식됩니다.

---

## 5. 고정 포트 사용하기

이후 명령에서 `/dev/ttyACM0` 대신 `/dev/lekiwi` 를 씁니다.

```bash
# 캘리브레이션
lerobot-calibrate \
    --robot.type=lekiwi \
    --robot.id=lekiwi07 \
    --robot.port=/dev/lekiwi \
    --robot.cameras='{}'
```

호스트를 띄울 때도 `--robot.port=/dev/lekiwi` 를 추가합니다. 다음 페이지 [제어 스크립트](/docs/a-go/start-custom-scripts)에서 만드는 `start_lekiwi_host.sh` 에 이 옵션을 넣어 두면 매번 신경 쓸 필요가 없습니다.

> **팁** 💡`TIP`
> <br>우분투 PC에 연결하는 **리더 암**도 같은 방법으로 고정할 수 있습니다. PC에서 리더 암의 시리얼 번호를 확인해 `SYMLINK+="so101_leader"` 규칙을 만들면 `--teleop.port=/dev/so101_leader` 로 쓸 수 있습니다.

---

## 6. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `ls -l /dev/lekiwi` 에 아무것도 없음 | 규칙 파일의 시리얼 번호 오타. `udevadm info` 출력과 대조 |
| `grep '{serial}'` 결과가 비어 있음 | `udevadm info -a -n /dev/ttyACM0` 전체 출력에서 `ATTRS{serial}` 줄을 직접 찾기 |
| 모터 보드를 교체한 뒤 별칭이 사라짐 | 보드마다 시리얼 번호가 다름. 새 보드의 번호로 규칙 수정 |
| `Permission denied` | `dialout` 그룹 추가 후 SSH 재접속 |
