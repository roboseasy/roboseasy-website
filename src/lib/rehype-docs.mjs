// 문서(src/content/docs) 마크다운 렌더링 보정 rehype 플러그인.
// 외부 의존성 없이 HAST 를 직접 순회한다 (Astro 의 rehype-raw 보다 먼저 실행되므로
// 마크다운 안의 `<br>`·`<div>` 같은 HTML 은 아직 `raw` 노드다).
//
// 1) 콜아웃 — `> **팁** 💡`TIP`` / `> ℹ️ **제목**` / `> 🎯 **학습 목표**` 형태의 인용문을
//    종류별 클래스(callout--tip|warn|info|success|goal|note)와 제목줄로 바꾼다.
// 2) 표 — 가로 스크롤 래퍼(div.table-wrap)로 감싸 모바일에서 카드 밖으로 넘치지 않게 한다.
// 3) 이미지 — loading="lazy" · decoding="async".
// 4) 코드 블록 — div.code-block 으로 감싸고(복사 버튼 자리), 첫 줄이 `# 우분투` / `:: 윈도우`
//    주석이면 그 줄을 지우고 Ubuntu / Windows 라벨 바를 붙인다.
// 5) 이미지 — 원본 크기로 여는 링크로 감싼다 (모바일에서 터미널 캡처를 확대해 보기 위함).
// 6) 인라인 코드 줄바꿈 — 짧은 코드는 통째로 class="cw"(nowrap). 긴 코드는 `--옵션=` 머리만 nowrap 으로
//    묶고 '/' 뒤에 <wbr> 를 넣어, '--' 뒤나 단어 중간이 아니라 공백·경로 구분자에서만 줄이 바뀌게 한다.

const LABELS = {
  팁: 'tip',
  경고: 'warn',
  주의: 'warn',
  중요: 'warn',
  정보: 'info',
  참고: 'info',
  성공: 'success',
  노트: 'note',
  메모: 'note',
};

// 맨 앞 이모지 → 종류
const EMOJI = [
  ['💡', 'tip'],
  ['🔧', 'tip'],
  ['⚠', 'warn'],
  ['❗', 'warn'],
  ['🚨', 'warn'],
  ['ℹ', 'info'],
  ['📝', 'note'],
  ['📦', 'note'],
  ['📌', 'note'],
  ['✨', 'success'],
  ['✅', 'success'],
  ['🎯', 'goal'],
];

const DEFAULT_ICON = { tip: '💡', warn: '⚠️', info: 'ℹ️', success: '✨', goal: '🎯', note: '📝' };
const TAG_RE = /^(TIP|WARN|WARNING|INFO|SUCCESS|NOTE|DANGER|CAUTION)$/i;
// `> 참고: 본문` / `> 주의: 본문` 처럼 굵게 없이 접두어만 붙인 인용문
const PREFIX_RE = /^\s*(팁|참고|주의|경고|정보|중요|노트|메모)\s*[:：]\s*/;
// 짧은 인라인 코드 기준 (이보다 길면 줄바꿈 허용) — 36자 ≈ 286px, 모바일 본문 폭 안
const SHORT_CODE = 36;
const OS_LABEL = [
  [/^\s*(#|::|REM)\s*(우분투|ubuntu)(\s.*)?$/i, 'Ubuntu'],
  [/^\s*(#|::|REM)\s*(윈도우|windows)(\s.*)?$/i, 'Windows'],
];

const el = (tagName, className, children = [], extra = {}) => ({
  type: 'element',
  tagName,
  properties: { className: className ? [className] : undefined, ...extra },
  children,
});

const textOf = (node) => {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(textOf).join('');
  return '';
};

const isBr = (n) => n && n.type === 'raw' && /^<br\s*\/?>$/i.test(n.value.trim());
const isBlank = (n) => n && n.type === 'text' && n.value.trim() === '';
const isEl = (n, tag) => n && n.type === 'element' && (!tag || n.tagName === tag);

function leadingEmoji(str) {
  const s = str.trimStart();
  for (const [e, kind] of EMOJI) {
    if (s.startsWith(e)) {
      // 이모지 + 선택적 VS16(U+FE0F)
      let len = e.length;
      if (s[len] === '️') len += 1;
      return { kind, emoji: s.slice(0, len), rest: s.slice(len) };
    }
  }
  return null;
}

// 문단 앞쪽의 공백·<br> 를 걷어낸다
function trimLeading(children) {
  while (children.length && (isBlank(children[0]) || isBr(children[0]))) children.shift();
  if (children.length && children[0].type === 'text') {
    children[0] = { ...children[0], value: children[0].value.replace(/^\s+/, '') };
    if (!children[0].value) children.shift();
  }
}

// 제목 끝의 ':' / '：' 제거 (예: **Resume 사용 시 주의사항:** → 'Resume 사용 시 주의사항')
function stripTrailingColon(nodes) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.type === 'text') {
      const v = n.value.replace(/\s*[:：]\s*$/, '');
      if (v !== n.value) nodes[i] = { ...n, value: v };
      if (v.trim()) return;
    } else {
      return;
    }
  }
}

function transformCallout(bq) {
  const firstP = bq.children.find((c) => c.type === 'element');
  if (!isEl(firstP, 'p')) return;
  const kids = [...firstP.children];
  let kind = null;
  let icon = null;
  let title = null; // 제목줄 children

  trimLeading(kids);
  const head = kids[0];

  if (isEl(head, 'strong') && LABELS[textOf(head).trim()]) {
    // `**팁** 💡`TIP`` 형식
    kind = LABELS[textOf(head).trim()];
    kids.shift();
    if (kids[0] && kids[0].type === 'text') {
      const em = leadingEmoji(kids[0].value);
      if (em) {
        icon = em.emoji;
        kids[0] = { ...kids[0], value: em.rest };
      }
    }
    trimLeading(kids);
    if (isEl(kids[0], 'code') && TAG_RE.test(textOf(kids[0]).trim())) kids.shift();
    trimLeading(kids);
    // 본문이 굵은 소제목으로 시작하면 그것을 제목으로 승격
    if (isEl(kids[0], 'strong')) {
      title = kids.shift().children;
      trimLeading(kids);
    }
  } else if (head && head.type === 'text' && leadingEmoji(head.value)) {
    // `ℹ️ **제목**` / `🎯 **학습 목표**` / `💡 `TIP` 본문` 형식
    const em = leadingEmoji(head.value);
    kind = em.kind;
    icon = em.emoji;
    kids[0] = { ...head, value: em.rest };
    trimLeading(kids);
    if (isEl(kids[0], 'code') && TAG_RE.test(textOf(kids[0]).trim())) {
      kids.shift();
      trimLeading(kids);
    }
    if (isEl(kids[0], 'strong')) {
      title = kids.shift().children;
      trimLeading(kids);
    }
  } else if (head && head.type === 'text' && PREFIX_RE.test(head.value)) {
    // `> 참고: 본문` → 접두어를 제목으로
    const m = head.value.match(PREFIX_RE);
    kind = LABELS[m[1]];
    title = [{ type: 'text', value: m[1] }];
    kids[0] = { ...head, value: head.value.slice(m[0].length) };
    trimLeading(kids);
  } else if (isEl(head, 'strong')) {
    // `**실습 준비**` + 줄바꿈 → 제목 있는 노트
    const after = kids.slice(1).find((n) => !(n.type === 'text' && n.value === ''));
    const endsLine = !after || isBr(after) || (after.type === 'text' && /^\s*\n/.test(after.value));
    if (!endsLine) return;
    kind = 'note';
    title = kids.shift().children;
    trimLeading(kids);
  } else {
    return;
  }

  icon = icon || DEFAULT_ICON[kind];
  if (title) stripTrailingColon(title);
  if (!title) {
    const label = Object.keys(LABELS).find((k) => LABELS[k] === kind);
    title = [{ type: 'text', value: kind === 'goal' ? '학습 목표' : label || '' }];
  }

  const titleEl = el('p', 'callout__title', [
    el('span', 'callout__icon', [{ type: 'text', value: icon }], { ariaHidden: 'true' }),
    el('span', 'callout__label', title),
  ]);

  const rest = bq.children.slice(bq.children.indexOf(firstP) + 1);
  const newFirst = kids.length && !kids.every((n) => isBlank(n) || isBr(n)) ? [{ ...firstP, children: kids }] : [];
  bq.children = [titleEl, ...newFirst, ...rest];
  bq.properties = { ...(bq.properties || {}), className: ['callout', `callout--${kind}`] };
}

// Shiki 출력 앞뒤의 빈 줄(span.line) 제거 — 원본 펜스 안 공백 줄 때문에 아래 여백이 커지는 것 방지
function trimEmptyLines(code) {
  const isEmptyLine = (n) => isEl(n, 'span') && textOf(n).trim() === '';
  const isNl = (n) => n && n.type === 'text' && n.value.trim() === '';
  while (code.children.length && (isEmptyLine(code.children[code.children.length - 1]) || isNl(code.children[code.children.length - 1]))) {
    code.children.pop();
  }
  while (code.children.length && (isEmptyLine(code.children[0]) || isNl(code.children[0]))) {
    code.children.shift();
  }
}

function transformCodeBlock(pre, parent, index) {
  const code = pre.children.find((c) => isEl(c, 'code'));
  let label = null;
  if (code) {
    const firstLineIdx = code.children.findIndex((c) => isEl(c, 'span'));
    const firstLine = firstLineIdx >= 0 ? code.children[firstLineIdx] : null;
    const lineText = firstLine ? textOf(firstLine) : '';
    for (const [re, name] of OS_LABEL) {
      if (re.test(lineText)) {
        label = name;
        // 첫 줄과 그 뒤 줄바꿈 텍스트 노드를 제거
        const removeCount = code.children[firstLineIdx + 1] && code.children[firstLineIdx + 1].type === 'text' ? 2 : 1;
        code.children.splice(firstLineIdx, removeCount);
        break;
      }
    }
  }
  if (code) trimEmptyLines(code);
  const children = [];
  if (label) {
    children.push(el('div', 'code-block__label', [{ type: 'text', value: label }]));
  }
  children.push(pre);
  const wrapper = el('div', 'code-block', children);
  if (label) wrapper.properties.className.push('code-block--labeled');
  parent.children[index] = wrapper;
}

// 긴 인라인 코드 쪼개기 (텍스트는 그대로 — 복사 결과 동일)
function splitLongCode(node) {
  const out = [];
  for (const part of textOf(node).split(/(\s+)/)) {
    if (!part) continue;
    if (/^\s+$/.test(part)) {
      out.push({ type: 'text', value: part });
      continue;
    }
    let rest = part;
    const head = rest.match(/^--?[\w.-]+=?/);
    if (head) {
      out.push(el('span', 'cw', [{ type: 'text', value: head[0] }]));
      rest = rest.slice(head[0].length);
    }
    rest.split(/(?<=\/)/).forEach((seg, i) => {
      if (!seg) return;
      if (i > 0 || (head && out.length)) out.push(el('wbr', null, []));
      out.push({ type: 'text', value: seg });
    });
  }
  node.children = out;
}

function walk(node, visit) {
  if (!node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const replaced = visit(node.children[i], node, i);
    if (replaced !== 'skip') walk(node.children[i], visit);
  }
}

export default function rehypeDocs() {
  return (tree, file) => {
    // 문서 컬렉션에만 적용 (뉴스·약관 등 다른 마크다운은 그대로)
    const path = (file && (file.path || (file.history && file.history[0]))) || '';
    if (path && !/[\\/]content[\\/]docs[\\/]/.test(path)) return;

    const visit = (node, parent, index) => {
      if (!isEl(node)) return undefined;
      if (node.tagName === 'blockquote') {
        transformCallout(node);
      } else if (node.tagName === 'table') {
        walk(node, visit); // 표 안의 이미지 등도 처리한 뒤 감싼다
        parent.children[index] = el('div', 'table-wrap', [node]);
        return 'skip';
      } else if (node.tagName === 'img') {
        node.properties = { loading: 'lazy', decoding: 'async', ...node.properties };
        if (!isEl(parent, 'a') && node.properties.src) {
          parent.children[index] = el('a', 'img-link', [node], {
            href: node.properties.src,
            target: '_blank',
            rel: 'noopener',
            title: '원본 크기로 보기',
          });
          return 'skip';
        }
      } else if (node.tagName === 'code') {
        // pre 안의 code 는 'pre' 분기에서 skip 하므로 여기는 인라인 코드만 온다
        if (textOf(node).length <= SHORT_CODE) {
          const cls = node.properties && node.properties.className ? [].concat(node.properties.className) : [];
          node.properties = { ...(node.properties || {}), className: [...cls, 'cw'] };
        } else {
          splitLongCode(node);
        }
        return 'skip';
      } else if (node.tagName === 'pre') {
        transformCodeBlock(node, parent, index);
        return 'skip';
      }
      return undefined;
    };
    walk(tree, visit);
  };
}
