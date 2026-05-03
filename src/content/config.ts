import { defineCollection, z } from 'astro:content';

const programs = defineCollection({
  type: 'data',
  schema: z.object({
    /** 카드/모달 트리거에 쓰이는 식별자 (예: 'sts3215-motor-test') */
    slug: z.string(),
    /** 카드 제목 */
    title: z.string(),
    /** 카드 설명 (\n으로 줄바꿈) */
    description: z.string(),
    /** 썸네일 이미지 (예: '/img/...png') */
    thumbnail: z.string(),
    /** 다운로드 URL (Google Drive 등). 비워두면 다운로드 버튼 숨김 */
    downloadUrl: z.string().url().optional(),
    /** 카드 표시 순서 */
    order: z.number(),
  }),
});

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    /** 페이지 제목 (사이드바·hero에서 사용) */
    title: z.string(),
    /** 카테고리 — URL 첫 segment와 일치 (/docs/<category>/...) */
    category: z.enum(['lerobot-library', 'lerobot-so-arm', 'lekiwi', 'xlerobot']),
    /** 사이드바 그룹 라벨 (예: 'Setup', 'Dataset') */
    group: z.string(),
    /** 카테고리 내 표시 순서 (오름차순) */
    order: z.number(),
    /** SEO description (선택) */
    description: z.string().optional(),
  }),
});

export const collections = { programs, docs };
