# Astro Migration — Phase 0 (스캐폴딩)

- Status: done (local 검증 완료, 배포 미연동)
- Started: 2026-05-02
- Owner: khw
- Plan: [.agent/refactor-astro-plan.md](../refactor-astro-plan.md)

## 목표
Astro 빌드 파이프라인을 저장소에 도입하고 로컬에서 `npm run build`가 통과하는지 검증.
**라이브 사이트는 변경하지 않는다** (Netlify 배포 설정 그대로 유지).

## 추가/수정된 파일
- `package.json` (신규) — Astro 4.16 핀
- `astro.config.mjs` (신규) — `site` 만 설정
- `tsconfig.json` (신규) — `astro/tsconfigs/strict` 확장
- `.nvmrc` (신규) — `20`
- `.gitignore` — `node_modules`, `dist`, `.astro` 추가
- `src/pages/phase0-check.astro` (신규, 임시) — 빌드 검증용. Phase 1에서 제거 예정

## 결정 사항

### Astro 5 → Astro 4로 다운그레이드 핀
- 시스템 Node가 18.19.1이고 Astro 5는 Node 20+ 요구
- 로컬에서 즉시 검증 가능하도록 Astro 4.16.x로 핀
- `.nvmrc`는 20으로 두어 Netlify/팀 표준은 Node 20을 따르게 함
- **다음 작업 시점에 사용자가 Node 20으로 업그레이드 후 Astro 5로 bump 권장**

### Netlify 배포 설정 미변경
- `netlify.toml` 추가 보류
- 이유: `publish = "dist"`로 바꾸는 순간 라이브 사이트가 hello-world로 교체됨
- Phase 1에서 첫 페이지(`index.astro`)가 정상 렌더되면 그 PR과 함께 Netlify 설정 전환

## 검증 결과
```
npm install   # 280 packages, 경고 없음
npm run build # 1 page(s) built in 351ms → dist/phase0-check/index.html
```

## 다음 (Phase 1)
1. Node 20 업그레이드 + `astro` 5로 bump
2. `BaseLayout.astro` 작성 (메타·헤더·푸터 통합)
3. `MainHeader`/`MainFooter`/`MainBanner`를 `.astro`로 포팅
4. `tokens.css` + `reset.css` + `global.css` 정리
5. 검증 후 Phase 2로

## Follow-ups
- [ ] `phase0-check.astro` 제거 (Phase 1 첫 커밋에서)
- [ ] Node 20 업그레이드 가이드를 README에 추가
- [ ] `npm audit` 결과의 3개 취약점 검토 (transitive, Astro 4 의존성)
