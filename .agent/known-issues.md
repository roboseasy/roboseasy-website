# Known Issues / 주의사항

작업 시 알아둬야 할 함정과 미해결 이슈.

## 절대 건드리지 말 것

- `public/googlef0b1a1e39ee27640.html` — Google Search Console 소유 인증 파일
- `public/naver7c406803e4247ba3ca91608608d9f54b.html`, `public/naver9135c1ba273dbc0521b00160be932a2f.html` — 네이버 웹마스터 인증
- `public/_redirects`의 기존 라인 — 외부 인바운드 링크 SEO 호환에 사용. 추가만 권장

## Astro 4 + Node 버전

- `package.json`이 `astro@^4.16.19`로 핀 (Astro 5는 Node 20+ 강제 요구하나 시스템에 따라 미설치)
- `.nvmrc`는 Node 20. Netlify 빌드는 항상 Node 20 사용
- 로컬에서 Node 18.20.8 이상이면 동작은 하지만 `nvm use`로 20을 맞추는 게 권장

## 모바일 UX

- **모바일 가로 스크롤(확인됨)**: 모바일에서 상하 외에 **좌우 스크롤바가 생김**. contact 페이지의 "로봇 구매 문의" 폼/전체 폼이 뷰포트 폭을 초과하는 게 주원인 (768/1024 미디어쿼리가 있으나 폼 요소 폭 보강이 부족). 고정 width·min-width·padding 합을 점검해 뷰포트 안으로 맞춰야 함
- **제품 상세 `/products/<id>`**: `product-detail.css` 브레이크포인트가 768px 1개뿐. 갤러리 썸네일 `repeat(4,1fr)`이 모바일서도 4열 유지(과밀), ≤480 전용 처리 없음 → 모바일 보강 필요
- `/programs/<slug>` 상세 페이지: 원래 모달이 PC 전용이었음. 라우트 전환 시 모바일 가드 제거됨 → 모바일에서 진입 가능하나 CSS가 PC 기반이라 일부 어긋남
- `/docs/<slug>` 페이지: 1024px 이하에서 사이드바가 오버레이로 토글됨 (우하단 ☰ 버튼) — 정상 동작 확인
- 모바일 디자인 보강은 별도 작업으로 진행 필요
- **products 페이지 라이트/다크 토큰 혼재**: 일부 요소는 라이트, 일부는 다크 디자인 토큰을 써서 톤이 섞여 보임. 토큰 정합 필요 (라이트/다크 토글 구조와 연계 확인)
- **랜딩페이지 히어로 아크 라인**: 아크 라인 렌더 시 빛이 한 곳에 집중되는(glare) 현상이 미해결

## docsify 호환

- 옛 `?> ...` `!> ...` 콜아웃 → `> ℹ️ ...` `> ⚠️ ...` blockquote로 변환됨
- 옛 docsify-tabs 마크업(`<!-- tabs:start/end -->`)이 `policy-act.md`·`dataset-record.md`·`policy-smolvla.md`에 잔존 — Astro에선 주석으로 무시돼 탭 내용이 평면 나열됨 (정리 필요)
- 검색은 docsify 시 클라이언트 사이드였으나 현재는 미구현. Pagefind 도입 검토 가능

## CMS (Sveltia) 운영 주의

- 콘텐츠 편집은 `/admin` (Sveltia CMS, GitHub OAuth 로그인 — 설정 완료). **저장 시 `main`에 바로 커밋**되어 즉시 라이브에 반영됨(PR 검수 없음) → 잘못 저장하면 곧장 노출되니 신중히 (검수가 필요하면 config.yml에 `publish_mode: editorial_workflow` 복원)
- **잘못된 입력 → 빌드 실패/라이브 사고 가능**: 필수값(제품 `id`/`name`/`category`/`price`) 누락 시 빌드가 깨질 수 있음. **직접 커밋이라 저장 즉시 main에 반영**되어 PR 미리보기로 거를 단계가 없으므로 — 저장 전 필수값 확인, 저장 후 배포된 사이트에서 재확인
- **제품 `id` 변경 = URL 변경**: `/products/<id>`가 바뀌어 외부 링크가 깨질 수 있으니 가급적 고정
- **스키마 이중 관리**: `src/data/products.ts`의 타입과 `public/admin/config.yml` 필드를 함께 맞춰야 함. 한쪽만 바꾸면 입력 누락/타입 불일치 발생
- 미디어 업로드는 `public/img/uploads`에 누적 → 대용량 이미지는 WebP 권장

## SSR 엔드포인트 / 환경변수

- `output: 'hybrid'`로 `src/pages/api/*`만 SSR (Netlify Functions)
- **`/api/contact`는 `RESEND_API_KEY` 환경변수 필요** — Netlify Site configuration에 설정. 미설정 시 빌드는 통과해도 런타임에 폼 전송 실패

## 빌드 / 라우팅

- **커스텀 404 페이지 없음**: `src/pages/404.astro` 부재 → 잘못된 URL 진입 시 헤더/브랜딩 없는 Netlify 기본 404 노출. `BaseLayout` 기반 404 추가 권장
- **빌드 경고(노이즈)**: `@astrojs/netlify`의 "assets" experimental 지원 경고가 매 빌드 출력됨. 동작엔 문제없는 업스트림 경고 — 무시 가능

## 알려진 미해결 작업 (TODO)

- [ ] LeKiwi, XLeRobot docs 실제 콘텐츠 작성 (현재 placeholder)
- [ ] contact 폼 모바일 가로 오버플로우 수정 (좌우 스크롤 제거)
- [ ] 제품 상세 `/products/<id>` 모바일 반응형 보강
- [ ] `/programs/<slug>` 모바일 반응형 보강
- [ ] products 페이지 라이트/다크 토큰 정합
- [ ] 랜딩 히어로 아크 라인 빛 집중(glare) 현상 수정
- [ ] 커스텀 404 페이지(`src/pages/404.astro`) 추가
- [ ] 도메인 정합(SEO): `site`→roboseasy.ai + robots/SeoMeta 정렬 + netlify.app→ai 301
- [ ] (선택) Pagefind 검색 통합 (`postbuild`에 `npx pagefind --site dist`)
- [ ] (선택) `hackathon-2026` 페이지를 공통 헤더/푸터 사용으로 통일 (현재 chrome={false})

> 새 이슈 발견 시 위 섹션에 추가, 해결되면 한 줄 요약과 함께 제거.
