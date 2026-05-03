# Known Issues / 주의사항

작업 시 알아둬야 할 함정과 미해결 이슈.

## 절대 건드리지 말 것

- `public/googlef0b1a1e39ee27640.html` — Google Search Console 소유 인증 파일
- `public/naver7c406803e4247ba3ca91608608d9f54b.html`, `public/naver9135c1ba273dbc0521b00160be932a2f.html` — 네이버 웹마스터 인증
- `public/_redirects`의 기존 라인 — 외부 인바운드 링크 SEO 호환에 사용. 추가만 권장

## Astro 4 + Node 버전

- `package.json`이 `astro@^4.16.18`로 핀 (Astro 5는 Node 20+ 강제 요구하나 시스템에 따라 미설치)
- `.nvmrc`는 Node 20. Netlify 빌드는 항상 Node 20 사용
- 로컬에서 Node 18.20.8 이상이면 동작은 하지만 `nvm use`로 20을 맞추는 게 권장

## 모바일 UX

- `/programs/<slug>` 상세 페이지: 원래 모달이 PC 전용이었음. 라우트 전환 시 모바일 가드 제거됨 → 모바일에서 진입 가능하나 CSS가 PC 기반이라 일부 어긋남
- `/docs/<slug>` 페이지: 1024px 이하에서 사이드바가 오버레이로 토글됨 (우하단 ☰ 버튼)
- 모바일 디자인 보강은 별도 작업으로 진행 필요

## docsify 호환

- 옛 `?> ...` `!> ...` 콜아웃 → `> ℹ️ ...` `> ⚠️ ...` blockquote로 변환됨
- 옛 docsify-tabs 등 일부 플러그인 markup이 콘텐츠에 남아 있을 수 있음 (현재 파일에는 미사용으로 확인됨)
- 검색은 docsify 시 클라이언트 사이드였으나 현재는 미구현. Pagefind 도입 검토 가능

## phase0-check 페이지

Phase 1 검증용 임시 페이지였고 Phase 6에서 제거됨. 재생성 불필요.

## Jekyll 잔재 없음

- 옛 `feed.xml`, `site.xml` (Jekyll Liquid 템플릿) 모두 삭제됨
- 사이트맵은 `@astrojs/sitemap`이 빌드 시 `dist/sitemap-index.xml` 자동 생성
- RSS 피드가 다시 필요해지면 `@astrojs/rss` 추가 검토

## 알려진 미해결 작업 (TODO)

- [ ] LeKiwi, XLeRobot docs 실제 콘텐츠 작성 (현재 placeholder)
- [ ] `/programs/<slug>` 모바일 반응형 보강
- [ ] (선택) Pagefind 검색 통합 (`postbuild`에 `npx pagefind --site dist`)
- [ ] (선택) 큰 PNG 이미지 (`keyboard-teleop-gui.png` 8MB 등) WebP 압축
- [ ] (선택) `hackathon-2026` 페이지를 공통 헤더/푸터 사용으로 통일 (현재 chrome={false})

> 새 이슈 발견 시 위 섹션에 추가, 해결되면 한 줄 요약과 함께 제거.
