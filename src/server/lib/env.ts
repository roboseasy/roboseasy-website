// Netlify Functions 런타임(process.env)과 Vite 빌드(import.meta.env) 양쪽에서 읽는다.
export const getEnv = (key: string): string =>
  (import.meta.env[key] as string | undefined) ?? process.env[key] ?? '';
