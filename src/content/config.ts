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

export const collections = { programs };
