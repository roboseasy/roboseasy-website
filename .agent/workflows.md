# Workflows

자주 반복되는 작업 절차 모음.

## 1. 새 페이지 추가

예: `events.html` 추가

1. 기존 페이지(`news.html`)를 복제
2. `<title>`, OG/Twitter 메타 태그를 새 페이지에 맞게 수정
3. `css/events.css` 생성 후 HTML에 `<link>` 연결
4. 본문 마크업 작성
5. `_redirects`에 추가:
   ```
   /events    /events.html    200
   ```
6. (선택) `js/components/main-header.js`의 네비 리스트에 항목 추가
7. 로컬에서 `python3 -m http.server` 로 확인

## 2. 새 프로그램(Programs 카드 + 모달) 추가

`programs.html`에는 카드 그리드와 상세 모달이 함께 있습니다.

1. `img/<program-name>.png` 썸네일 추가 (정사각/가로형 통일)
2. `programs.html`에 카드 마크업 추가 — 기존 카드 복제 후 텍스트/이미지/링크 교체
3. 같은 파일 내 모달 컨테이너에 상세 콘텐츠 섹션 추가
4. 모달 트리거(data-attribute / id)를 카드와 일치시키기
5. 탭 네비게이션이 필요하면 기존 모달의 탭 패턴 재사용
6. `css/programs.css`에서 필요한 클래스 추가
7. 커밋: `FEAT: Add <Program Name> Entry to Programs Page`

## 3. 새 docsify 문서 카테고리 추가

예: `xlerobot` 가이드를 새로 추가

1. `docs/xlerobot/` 폴더 생성
2. 안에 `README.md`, `_sidebar.md`, 이미지 등 docsify 컨벤션으로 콘텐츠 작성
3. 기존 `docs-lerobot-so-arm.html` 복제 → `docs-xlerobot.html`
4. docsify 설정에서 `basePath`, `name`, 메타 태그를 새 문서에 맞게 수정
5. `documents.html`에 카드/링크 추가
6. `_redirects`에 매핑 추가
7. (필요 시) `img/xlerobot.png` 썸네일 추가

## 4. 메타 태그 / OpenGraph 업데이트

각 HTML 파일 상단의 다음 블록을 일관되게 유지하세요.

```html
<meta property="og:type" content="website">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="https://roboseasy.netlify.app/img/banner.png">
<meta property="og:url" content="https://roboseasy.netlify.app/<path>">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="...">
<meta name="twitter:description" content="...">
<meta name="twitter:image" content="https://roboseasy.netlify.app/img/banner.png">
```

`og:image`는 절대 URL이어야 SNS 미리보기가 정상 작동합니다.

## 5. 헤더 네비게이션 수정

`js/components/main-header.js`의 `connectedCallback` 내부 템플릿 문자열을 직접 수정합니다.
모바일 메뉴 동작은 같은 파일의 `initMobileMenu`에서 처리되므로 마크업만 바꾸면 됩니다.

## 6. 배포

`main` 브랜치에 푸시하면 Netlify가 자동 배포합니다.
- 커밋 → `git push origin main` → Netlify 빌드 로그 확인
- 별도 빌드 스텝이 없으므로 보통 30초 내 반영

## 7. 로컬 개발 루틴

```bash
# 서버 실행
python3 -m http.server 8000

# 다른 터미널에서 변경 사항 확인
# 브라우저에서 http://localhost:8000/index.html 접속
```

라이브 리로드는 VSCode Live Server 확장 권장.
