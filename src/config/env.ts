// src/config/env.ts
import 'dotenv/config'

const required = (v: string | undefined, name: string) => {
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export const ENV = {
  API_BASE_URL: required(process.env.API_BASE_URL, 'API_BASE_URL'), // ej: http://localhost:8000
  API_TIMEOUT_MS: Number(process.env.API_TIMEOUT_MS ?? 8000),
  API_RETRIES: Number(process.env.API_RETRIES ?? 1),
  API_TOKEN: process.env.API_TOKEN ?? '', // si tu API lo requiere
}
