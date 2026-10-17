---
title: "고정 IP · 무선 연결"
category: "a-go"
group: "LeKiwi 세팅"
order: 70
---

# LeKiwi 고정 IP 세팅 및 무선 연결

[유선 연결](/docs/a-go/lekiwi-wired-connection)에서는 랜선으로 라즈베리파이에 접속했습니다. 하지만 LeKiwi는 바퀴 달린 이동 로봇입니다. 실제 운용에서는 선을 떼고 와이파이로 움직여야 하고, 그러면서도 PC가 로봇을 **항상 같은 주소로** 찾을 수 있어야 합니다. 이 페이지에서는 그 구조를 직접 만들어 봅니다.

> 🎯 **학습 목표**
>
> - DHCP와 고정 IP의 차이, 그리고 각각의 한계를 설명할 수 있다.
> - 여러 대의 로봇을 복제해도 서로 충돌하지 않게 초기화하는 이유를 이해한다.
> - 사용 장소와 와이파이가 바뀌어도 동작하는 IP 설계를 스크립트로 구현하고 검증할 수 있다.

---

## 1. 문제 정의: 로봇은 여러 대이고, 장소는 바뀐다

이동 로봇을 네트워크에 붙일 때는 두 가지 어려움이 있습니다.

1. **로봇이 한 대가 아닙니다.** 여러 대의 LeKiwi는 보통 같은 SD 카드 이미지에서 복제되므로, 그대로 켜면 이름과 내부 ID가 전부 같아 네트워크에서 서로를 구분할 수 없습니다.
2. **장소마다 공유기가 다릅니다.** 이동 로봇은 연구실, 사무실, 전시장, 집 등 어디서든 쓰이고, 어떤 곳은 `192.168.0.x`, 어떤 곳은 `192.168.1.x` 대역을 씁니다.

### 1.1. DHCP와 고정 IP

| 방식 | 장점 | 단점 |
|---|---|---|
| **DHCP** (공유기가 자동 배정) | 어느 공유기에나 붙는다 | 주소가 매번 바뀔 수 있다 |
| **고정 IP** (직접 지정) | 주소가 늘 같다 | 공유기 대역이 다르면 통신 불가 |

우리는 두 방식의 장점만 취합니다. **DHCP로 주소를 받은 뒤, 같은 대역에서 끝자리만 `200 + 로봇 번호`로 바꾼 주소를 하나 더 붙이는** 것입니다. 7번 로봇은 `192.168.0.x` 네트워크에서는 `192.168.0.207`, `192.168.1.x` 네트워크에서는 `192.168.1.207` 이 됩니다. 앞부분은 장소를 따라가고 끝자리는 로봇을 따라갑니다.

### 1.2. 세 가지 접속 방법

여기에 **mDNS**를 더해 `lekiwi07.local` 같은 이름으로도 접속할 수 있게 합니다. 결과적으로 세 가지 방법 중 상황에 맞는 것을 쓰면 됩니다.

| 접속 방법 | 예시 | 특징 |
|---|---|---|
| 로봇 번호 고정 IP | `ssh roboseasy@192.168.0.207` | 현재 네트워크 대역만 알면 됨 |
| 이름 (mDNS) | `ssh roboseasy@lekiwi07.local` | 대역을 몰라도 됨. 일부 공유기에서 차단 |
| DHCP 주소 | `ssh roboseasy@192.168.0.177` | 매번 바뀔 수 있음 |

---

## 2. 준비: 스크립트 작성

### 2.1. [PC] LeKiwi로 SSH 접속

[유선 연결](/docs/a-go/lekiwi-wired-connection)과 같이 랜선으로 접속한 상태에서 시작합니다.

```bash
ssh roboseasy@<Pi IP>
```

`<Pi IP>` 에는 유선 연결에서 찾은 주소를 넣습니다. 비밀번호는 스페이스 한 번입니다.

---

### 2.2. [Pi] netplan 기본 상태 확인

우분투는 네트워크 설정을 **netplan**이라는 YAML 파일로 관리합니다. 먼저 현재 상태를 열어 봅니다.

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

복제용 원본 이미지의 초기 상태는 아래처럼 유선(eth0)만 있고 와이파이 항목이 없어야 합니다.

```yaml
network:
  version: 2
  ethernets:
    eth0:
      optional: true
      dhcp4: true
```

- `dhcp4: true` : 주소를 직접 적지 않고 상대(PC 또는 공유기)에게 받겠다는 뜻입니다. 앞서 설명한 "앞부분은 장소를 따라간다"를 실현하는 핵심입니다.
- `optional: true` : 케이블이 빠져 있어도 부팅이 네트워크 연결을 기다리며 멈추지 않게 합니다. 이 줄이 없으면 랜선 없이 켤 때 부팅이 2분가량 멈춥니다.
- `wifis` 항목이 없는 이유 : 와이파이 이름과 비밀번호는 장소마다 다르고, 이미지에 남기면 배포 시 유출됩니다. 와이파이는 별도 스크립트로 넣습니다.

---

### 2.3. [Pi] 개체 초기화 스크립트: clone_init.sh

복제된 로봇을 **하나의 독립된 개체**로 만드는 스크립트입니다. 로봇 한 대당 딱 한 번 실행합니다. 하는 일은 네 가지입니다.

1. **호스트명 변경** : `lekiwi07` 처럼 로봇 번호가 들어간 이름을 붙입니다.
2. **machine-id 와 SSH 호스트 키 재생성** : 복제본끼리 같은 ID를 가지면 DHCP가 같은 주소를 주거나 SSH가 보안 경고를 냅니다. 새로 만들어 충돌을 막습니다.
3. **로봇 번호 저장** : `/etc/kit-number` 에 숫자 하나를 기록합니다.
4. **부팅 훅 설치** : 와이파이가 붙을 때마다 자동으로 실행되어, 받은 주소의 대역에 `.(200 + 로봇 번호)` 를 추가합니다.

> ℹ️ **SD 카드 이미지로 만든 카드라면 이미 있습니다**
> <br>[SD 카드 굽기](/docs/a-go/lekiwi-sd-card)의 이미지에는 `~/clone_init.sh` 가 이미 들어 있습니다. `ls ~/clone_init.sh` 로 확인되면 이 절의 붙여넣기와 문법 검사는 건너뛰고 2.4절로 넘어갑니다. `set_wifi.sh` 는 이미지에 없으므로 2.4절에서 직접 만듭니다.

```bash
nano ~/clone_init.sh
```

```bash
#!/usr/bin/env bash
# SD 카드 복제 후 개체 초기화 스크립트 (로봇 한 대당 한 번만 실행)
# - 호스트명 변경 + machine-id/SSH 호스트키 재생성 (복제 개체 충돌 방지)
# - 로봇 번호 저장: 부팅마다 wlan0이 DHCP로 받은 서브넷의 .(200+N)을 보조 주소로 추가
#   예) 공유기가 192.168.0.x면 192.168.0.207, 192.168.1.x면 192.168.1.207
# - mDNS로 <호스트명>.local 접속도 가능 (avahi-daemon 필요)
# 와이파이 설정은 set_wifi.sh로 별도 실행
# 사용법: sudo ./clone_init.sh <새_호스트명> <로봇번호(1~54)>
#   예) sudo ./clone_init.sh lekiwi07 7
set -e

NETPLAN_FILE=/etc/netplan/50-cloud-init.yaml
HOOK_FILE=/etc/networkd-dispatcher/routable.d/50-kit-ip

if [ "$(id -u)" -ne 0 ]; then
        echo "error: run with sudo"
        exit 1
fi
if [ -z "$1" ] || [ -z "$2" ]; then
        echo "Usage: sudo ./clone_init.sh <new_hostname> <kit_number>"
        echo "  e.g. sudo ./clone_init.sh lekiwi07 7"
        exit 1
fi

NEW_HOSTNAME="$1"
KIT_NUMBER="$2"

echo "[clone_init] setting hostname: $NEW_HOSTNAME"
# cloud-init이 부팅마다 user-data의 호스트명으로 되돌리는 것 방지 (실측)
echo 'preserve_hostname: true' > /etc/cloud/cloud.cfg.d/99_preserve_hostname.cfg
hostnamectl set-hostname "$NEW_HOSTNAME"
if grep -q '^127.0.1.1' /etc/hosts; then
        sed -i "s/^127.0.1.1.*/127.0.1.1 $NEW_HOSTNAME/" /etc/hosts
else
        echo "127.0.1.1 $NEW_HOSTNAME" >> /etc/hosts
fi

echo "[clone_init] regenerating machine-id"
rm -f /etc/machine-id /var/lib/dbus/machine-id
systemd-machine-id-setup

echo "[clone_init] regenerating ssh host keys"
rm -f /etc/ssh/ssh_host_*
dpkg-reconfigure -f noninteractive openssh-server

echo "[clone_init] checking netplan has no static address"
if grep -qE 'addresses:.*192\.168\.' "$NETPLAN_FILE"; then
        echo "error: $NETPLAN_FILE still has a static address."
        echo "       remove 'addresses:' / 'routes:' / 'nameservers:' and set 'dhcp4: true'"
        exit 1
fi

echo "[clone_init] saving kit number: $KIT_NUMBER"
echo "$KIT_NUMBER" > /etc/kit-number

echo "[clone_init] installing kit-ip hook: $HOOK_FILE"
mkdir -p "$(dirname "$HOOK_FILE")"
cat > "$HOOK_FILE" <<'EOF'
#!/usr/bin/env bash
# wlan0이 DHCP 주소를 받은 뒤, 같은 서브넷의 .(200+로봇번호)를 보조 주소로 추가
[ "$IFACE" = "wlan0" ] || exit 0
KIT=$(cat /etc/kit-number 2>/dev/null) || exit 0

# 예: 192.168.1.37/24
DHCP_ADDR=$(ip -4 -o addr show dev wlan0 | awk '/dynamic/{print $4; exit}')
[ -n "$DHCP_ADDR" ] || exit 0

PREFIX=${DHCP_ADDR#*/}      # 24
BASE=${DHCP_ADDR%.*}        # 192.168.1
ip addr replace "$BASE.$((200 + KIT))/$PREFIX" dev wlan0
EOF
chmod +x "$HOOK_FILE"
systemctl enable --now networkd-dispatcher >/dev/null 2>&1 || true

if ! command -v avahi-daemon >/dev/null 2>&1; then
        echo "[clone_init] warning: avahi-daemon not installed. '$NEW_HOSTNAME.local' will not work."
        echo "             run: sudo apt install -y avahi-daemon"
fi

echo "[clone_init] done."
echo "[clone_init] next: sudo ./set_wifi.sh <SSID> <PASSWORD>  then  sudo reboot"
echo "[clone_init] after reboot:"
echo "  ssh roboseasy@$NEW_HOSTNAME.local"
echo "  or ssh roboseasy@<현재 서브넷>.$((200 + KIT_NUMBER))  (e.g. 192.168.0.$((200 + KIT_NUMBER)) / 192.168.1.$((200 + KIT_NUMBER)))"
```

저장 후 실행 권한을 주고, 붙여넣기가 깨지지 않았는지 문법 검사를 합니다.

```bash
chmod +x ~/clone_init.sh
bash -n ~/clone_init.sh && echo OK
```

> **경고** ⚠️ `WARN`
> <br>**붙여넣기 주의** 스크립트 중간의 `cat > "$HOOK_FILE" <<'EOF'` 부터 `EOF` 까지가 훅 파일의 내용입니다. 닫는 `EOF` 는 줄 맨 앞에 공백 없이 있어야 하고, 여는 쪽의 작은따옴표 `'EOF'` 는 안쪽의 `$IFACE`, `$KIT` 같은 변수가 지금 치환되지 않고 훅 파일에 글자 그대로 들어가게 하는 장치입니다.

> **팁** 💡`TIP`
> <br>**훅은 어떻게 동작할까?** `networkd-dispatcher` 는 네트워크 상태가 바뀔 때마다 지정된 폴더의 스크립트를 실행해 주는 서비스입니다. 우리 훅은 wlan0이 주소를 받으면(`routable`) 깨어나서, `192.168.1.37/24` 처럼 받은 주소에서 마지막 한 칸을 잘라 `192.168.1` 을 얻고, 거기에 `.207` 을 붙여 보조 주소로 등록합니다. 그래서 장소가 바뀌어도 사람이 손댈 것이 없습니다.

---

### 2.4. [Pi] 와이파이 설정 스크립트: set_wifi.sh

와이파이 이름과 비밀번호를 netplan에 써 넣고 즉시 적용하는 스크립트입니다. 초기화와 달리 **연결할 와이파이가 바뀔 때마다 다시 실행**합니다.

```bash
nano ~/set_wifi.sh
```

```bash
#!/usr/bin/env bash
# 와이파이 설정 스크립트 (연결할 와이파이가 바뀔 때마다 다시 실행 가능)
# - wlan0을 DHCP로 붙이고, 부팅 시 훅이 같은 서브넷의 .(200+로봇번호)를 추가함
# 사용법: sudo ./set_wifi.sh <SSID> <비밀번호>
#   예) sudo ./set_wifi.sh MyWiFi mypassword
set -e

NETPLAN_FILE=/etc/netplan/50-cloud-init.yaml

if [ "$(id -u)" -ne 0 ]; then
        echo "error: run with sudo"
        exit 1
fi
if [ -z "$1" ] || [ -z "$2" ]; then
        echo "Usage: sudo ./set_wifi.sh <SSID> <PASSWORD>"
        exit 1
fi

SSID="$1"
PASSWORD="$2"

# cloud-init이 다음 부팅에 netplan을 덮어쓰지 않도록 고정
echo 'network: {config: disabled}' > /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg

echo "[set_wifi] writing $NETPLAN_FILE for SSID: $SSID"
cat > "$NETPLAN_FILE" <<EOF
network:
  version: 2
  ethernets:
    eth0:
      optional: true
      dhcp4: true
  wifis:
    wlan0:
      optional: true
      dhcp4: true
      regulatory-domain: "KR"
      access-points:
        "$SSID":
          password: "$PASSWORD"
EOF
chmod 600 "$NETPLAN_FILE"

echo "[set_wifi] applying"
netplan apply
sleep 5

echo "[set_wifi] wlan0 addresses:"
ip -4 -o addr show dev wlan0 | awk '{print "  " $4}'
echo "[set_wifi] done. ssh roboseasy@$(hostname).local"
```

```bash
chmod +x ~/set_wifi.sh
bash -n ~/set_wifi.sh && echo OK
```

> **경고** ⚠️ `WARN`
> <br>이 스크립트의 `<<EOF` 에는 작은따옴표가 **없습니다.** clone_init.sh 와 반대입니다. 여기서는 `$SSID` 와 `$PASSWORD` 가 실제 값으로 바뀌어 netplan 파일에 들어가야 하기 때문입니다. 두 스크립트를 비교해 보면 셸의 here-document 에서 따옴표 유무가 어떤 차이를 만드는지 알 수 있습니다.

---

### 2.5. [Pi] mDNS 서비스 확인

`lekiwi07.local` 처럼 이름으로 접속하려면 라즈베리파이가 "나는 lekiwi07이고 주소는 이것이다"라고 같은 네트워크에 스스로 알려야 합니다. 이 역할을 하는 것이 **avahi-daemon** 입니다.

```bash
sudo apt install -y avahi-daemon
systemctl is-active avahi-daemon
```

`active` 가 나오면 준비된 것입니다. 이미 설치되어 있으면 `already the newest version` 이 뜨고 넘어갑니다.

---

## 3. 실행하기

준비가 끝났으니 순서대로 실행합니다. 로봇 번호에 맞게 이름과 숫자를 바꿉니다.

### 3.1. [Pi] 개체 초기화 (한 번만)

```bash
sudo ~/clone_init.sh lekiwi07 7
```

SSH 호스트 키를 새로 만드는 과정에서 `Creating SSH2 RSA key ...` 같은 줄이 출력되는 것이 정상입니다. 마지막에 `[clone_init] done.` 이 보이면 성공입니다.

### 3.2. [Pi] 와이파이 연결 (와이파이가 바뀔 때마다)

```bash
sudo ~/set_wifi.sh <SSID> <PW>
```

예를 들어 SSID가 `MyWiFi`, 비밀번호가 `mypassword` 인 공유기라면 다음과 같습니다.

```bash
sudo ~/set_wifi.sh MyWiFi mypassword
```

### 3.3. [Pi] 주소 확인

와이파이가 실제로 붙었는지 봅니다.

```bash
iw dev wlan0 link
```

`Connected to ... SSID: MyWiFi` 가 나오면 무선 연결 성공입니다. `Not connected` 면 이름이나 비밀번호를 다시 확인합니다.

이어서 주소를 확인합니다. 와이파이 연결과 DHCP는 10~20초 걸릴 수 있으니 바로 안 보이면 잠시 후 다시 실행합니다.

```bash
hostname -I
```

```text
10.42.0.62 192.168.0.177 192.168.0.207
```

세 주소는 각각 다음을 뜻합니다.

| 주소 | 출처 | 의미 |
|---|---|---|
| `10.42.0.62` | eth0 | 랜선으로 PC와 연결된 주소. 선을 빼면 사라짐 |
| `192.168.0.177` | wlan0, DHCP | 공유기가 준 주소. 재부팅하면 바뀔 수 있음 |
| `192.168.0.207` | wlan0, 훅 | 로봇 번호 7로 만든 고정 주소. 앞 세 칸은 공유기를 따라감 |

`ip -4 addr show wlan0` 으로 보면 `192.168.0.177` 에는 `dynamic`, `192.168.0.207` 에는 `secondary` 라는 표시가 붙어 있어 출처를 구분할 수 있습니다.

유선 주소는 [유선 연결](/docs/a-go/lekiwi-wired-connection)에서 본 `10.42.0.61` 과 다를 수 있습니다. 이 주소는 PC가 DHCP로 그때그때 빌려주는 것이라 고정되어 있지 않고, 개체 초기화로 machine-id 가 바뀌면 PC가 라즈베리파이를 새 장치로 보고 다른 주소를 주기도 합니다.

---

### 3.4. [PC] 무선으로 접속하기

이제 랜선을 빼고 PC를 같은 와이파이에 연결한 뒤, 아래 세 줄 중 하나를 골라 접속합니다. 위에서부터 로봇 번호 고정 IP, 이름(mDNS), DHCP 주소(매번 바뀔 수 있음)입니다.

```bash
ssh roboseasy@192.168.0.207
ssh roboseasy@lekiwi07.local
ssh roboseasy@192.168.0.177
```

> **팁** 💡`TIP`
> <br>초기화 과정에서 SSH 호스트 키를 새로 만들었기 때문에, 이전에 접속한 적이 있는 PC에서는 `REMOTE HOST IDENTIFICATION HAS CHANGED` 경고가 나올 수 있습니다. [유선 연결](/docs/a-go/lekiwi-wired-connection)에서 배운 대로 이전 기록을 지우고 다시 접속합니다.
>
> ```bash
> ssh-keygen -R 192.168.0.207
> ssh-keygen -R lekiwi07.local
> ```

### 3.5. [Pi] 재부팅 후 확인

마지막으로 **재부팅 후에도 유지되는지** 확인해야 진짜 완료입니다. 훅은 부팅할 때 자동으로 돌아야 하고, 호스트명은 되돌아가면 안 됩니다.

```bash
sudo reboot
```

재부팅 후 다시 접속해서 `hostname` 이 `lekiwi07` 이고 `hostname -I` 에 `.207` 이 보이면 세팅이 끝난 것입니다.

---

## 4. 공유기 대역이 다르면?

이 설계의 장점은 대역이 무엇이든 자동으로 따라간다는 점입니다. 현장에서 만나는 대역은 생각보다 다양합니다.

| 대역 | 흔히 만나는 곳 | 7번 로봇의 고정 주소 |
|---|---|---|
| `192.168.0.x` | 국내 공유기(iptime 등) 기본값 | `192.168.0.207` |
| `192.168.1.x` | 해외 제조사 공유기 기본값 | `192.168.1.207` |
| `192.168.2.x`, `192.168.10.x` 등 | 통신사 모뎀, 관리자가 바꾼 경우 | `192.168.2.207` 등 |
| `10.x.x.x` | 학교, 회사 전산망 | `10.x.x.207` |
| `192.168.43.x` / `172.20.10.x` | 안드로이드 / 아이폰 핫스팟 | 아래 ‘예외 상황’ 참고 |

훅은 DHCP로 받은 주소에서 **마지막 한 칸만** 바꾸므로 위 어느 경우든 별도 설정이 필요 없습니다.

> **경고** ⚠️ `WARN`
> <br>**예외 상황**
>
> - 서브넷 마스크가 `/24` 보다 넓은 큰 조직망(`/16` 등)에서는 `.207` 을 이미 다른 기기가 쓰고 있을 수 있습니다. 이때는 `.local` 접속을 쓰는 것이 안전합니다.
> - 아이폰 핫스팟처럼 마스크가 `/28` 로 좁으면 `.207` 이 범위 밖이라 통신이 되지 않습니다. 역시 `.local` 이나 DHCP 주소로 접속합니다.
> - 공용 공유기 중에는 기기 간 통신을 막는 **AP 격리** 가 켜진 경우가 있어 `.local` 이 안 될 수 있습니다. 그래서 고정 IP와 `.local` 을 둘 다 준비해 둔 것입니다.

---

## 5. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| `bash -n` 에서 `here-document ... delimited by end-of-file` 경고 | 닫는 `EOF` 줄이 빠졌거나 앞에 공백이 있음. `grep -n "^EOF$" 파일명` 으로 확인 |
| `set_wifi.sh` 후 wlan0 에 주소가 없음 | 20초 기다린 뒤 재확인. `iw dev wlan0 link` 로 SSID 연결 여부, `rfkill list` 로 무선 차단 여부 확인 |
| DHCP 주소는 있는데 `.207` 이 없음 | `cat /etc/kit-number` 확인 후 `sudo netplan apply` 또는 재부팅 |
| 재부팅 후 호스트명이 원래대로 돌아감 | `/etc/cloud/cloud.cfg.d/99_preserve_hostname.cfg` 존재 여부 확인 |
| `lekiwi07.local` 접속 불가 | 공유기 AP 격리 가능성. 고정 IP로 접속. 윈도우는 최신 버전이면 mDNS 기본 지원 |

---

## 6. 정리

- 복제한 로봇은 **호스트명, machine-id, SSH 키**를 새로 만들어야 서로 구분됩니다.
- **DHCP + 로봇 번호 보조 주소** 조합으로 장소가 바뀌어도 늘 같은 끝자리로 접속할 수 있습니다.
- `clone_init.sh` 는 로봇당 한 번, `set_wifi.sh` 는 와이파이가 바뀔 때마다 실행합니다.
- 접속 경로는 고정 IP, `.local` 이름, DHCP 주소 세 가지이며 상황에 따라 골라 씁니다.

> 📦 **배포용 이미지를 만드는 사람을 위한 메모**
> <br>이미지를 굽기 전에는 이 페이지에서 넣은 개체 정보를 다시 지워야 합니다. `/etc/kit-number` 삭제, netplan 에서 `wifis` 블록 제거, `~/.bash_history` 정리가 최소 항목입니다. 두 스크립트와 avahi-daemon 은 이미지에 남겨 둡니다.
