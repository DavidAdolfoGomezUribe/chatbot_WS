//http.ts//
// src/api/http.ts
// Wrapper HTTP 
// Requiere Node 18+ (fetch global). Si usas Node <18, instala node-fetch.

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type Query = Record<string, string | number | boolean | undefined>

export type HttpOpts = {
  path: string
  method?: Method
  query?: Query
  body?: unknown
  headers?: Record<string, string>
  timeoutMs?: number
  retries?: number
}

function withQuery(url: string, q?: Query) {
  if (!q) return url
  const sp = new URLSearchParams()
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== null) sp.set(k, String(v))
  })
  return `${url}?${sp.toString()}`
}

export async function http<T = unknown>(opts: HttpOpts): Promise<T> {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000'
  const method = opts.method ?? 'GET'
  const url = withQuery(`${baseUrl}${opts.path}`, opts.query)

  const timeoutMs = Number(opts.timeoutMs ?? process.env.API_TIMEOUT_MS ?? 8000)
  const retries = Number(opts.retries ?? process.env.API_RETRIES ?? 1)
  const bearer = process.env.API_TOKEN ? { Authorization: `Bearer ${process.env.API_TOKEN}` } : {}

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...bearer,
          ...(opts.headers ?? {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${res.statusText} :: ${text}`)
      }

      if (res.status === 204) return undefined as unknown as T
      const data = (await res.json()) as T
      return data
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        await sleep(250 * Math.pow(2, attempt)) // backoff exponencial
        continue
      }
      throw lastErr
    }
  }
  throw lastErr
}
