# Known Issues / 주의사항

작업 시 알아둬야 할 함정과 미해결 이슈를 모아둡니다.

## 절대 건드리지 말 것

- `googlef0b1a1e39ee27640.html` — Google Search Console 소유 인증 파일
- `naver7c406803e4247ba3ca91608608d9f54b.html`, `naver9135c1ba273dbc0521b00160be932a2f.html` — 네이버 웹마스터 인증 파일
- `_redirects` 의 기존 라인 — 잘못 수정하면 라우팅 깨짐. **추가만** 권장

## 알려진 오타 / 명명 불일치

- `css/hackaton-2026.css` — 파일명이 "hackaTon" (T 빠짐). 페이지(`hackathon-2026.html`)는 정상 철자.
  → 수정 시 양쪽 import 경로 모두 변경 필요. 현재는 그대로 유지 중.

## 로컬 ↔ 배포 차이

- 로컬에서는 `_redirects`가 동작하지 않아 `/programs` 같은 pretty URL 접근이 404.
  → 로컬에서는 `/programs.html` 직접 입력하거나, Netlify CLI(`netlify dev`)로 실행.
- Jekyll 템플릿 문법은 `feed.xml`, `site.xml`에만 있고 정적 서버에서는 처리되지 않음 (배포 후에만 정상 출력).

## 이미지 크기

- `og:image`로 사용하는 `img/banner.png`는 1200×630 권장. 변경 시 SNS 캐시 무효화 시간 고려.
- `videos/` 안에 큰 파일을 넣으면 Netlify 빌드 시간/용량 한도에 영향. 가능하면 외부 호스팅.

## 브라우저 호환성

- Web Components(Custom Elements) 사용 — IE 미지원. 최신 Chrome/Edge/Safari/Firefox만 타겟.
- `<main-header>` 등은 스크립트 로드 전까지 빈 영역으로 보일 수 있음 (FOUC). 필요 시 헤더에 placeholder 스타일 고려.

## 알려진 미해결 작업 (TODO)

- [ ] `documents-lekiwi.html` 등 docs- 페이지들의 메타 태그 일관화
- [ ] 모바일 메뉴 열린 상태에서 라우팅 시 닫힘 처리 점검
- [ ] `feed.xml` 실제 포스트 연동 여부 확인 (현재 Jekyll posts가 비어있을 가능성)

> 새 이슈를 발견하면 위 섹션에 추가하고, 해결되면 한 줄 요약과 함께 제거하세요.
