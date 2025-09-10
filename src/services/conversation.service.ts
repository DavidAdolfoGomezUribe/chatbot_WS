import { promises as fs } from 'fs'
import { join } from 'path'

/**
 * Directorio donde se guardan los logs.
 * .env: LOG_DIR=./logs
 */
const LOG_DIR = process.env.LOG_DIR ?? './logs'

/**
 * (Opcional) Si quieres guardar SOLO un número específico,
 * pon TRACK_NUMBER en .env, por ej: TRACK_NUMBER=573001234567
 * Si no se define, se guardan todos.
 */
const TRACK_NUMBER = (process.env.TRACK_NUMBER ?? '').replace(/\D/g, '')

export type MessageRecord = {
  at: string                       // ISO timestamp
  direction: 'inbound' | 'outbound'
  number: string                   // teléfono E.164 (normalizado a dígitos)
  body: string
  mediaUrl?: string | null
  flowTag?: string                 // etiqueta opcional del flow/endpoint
  meta?: Record<string, any>       // info adicional que quieras guardar
}

// ---------- helpers ----------
async function ensureDir() {
  await fs.mkdir(LOG_DIR, { recursive: true })
}

function normalizeNumber(number: string) {
  // +57 300-123-4567 -> 573001234567
  return (number ?? '').replace(/\D/g, '')
}

function fileFor(number: string) {
  const n = normalizeNumber(number) || 'unknown'
  return join(LOG_DIR, `${n}.jsonl`)
}

function shouldTrack(number: string) {
  if (!TRACK_NUMBER) return true
  return normalizeNumber(number) === TRACK_NUMBER
}

// ---------- API principal ----------
/** Guarda un registro (append JSONL) */
export async function saveMessage(rec: MessageRecord) {
  if (!shouldTrack(rec.number)) return
  await ensureDir()
  const line = JSON.stringify(rec) + '\n'
  await fs.appendFile(fileFor(rec.number), line, 'utf8')
}

/** Lee toda la conversación de un número (útil para debug o endpoints de consulta) */
export async function readConversation(number: string): Promise<MessageRecord[]> {
  try {
    const content = await fs.readFile(fileFor(number), 'utf8')
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch (err: any) {
    if (err.code === 'ENOENT') return []
    throw err
  }
}

// ---------- Conveniencias para tu app ----------

/**
 * Loguea un mensaje ENTRANTE usando el ctx que provee Builderbot.
 * Llama esto dentro de tus flows (.addAction / callbacks de .addAnswer)
 */
export async function logInbound(ctx: any, opts?: { flowTag?: string; meta?: Record<string, any> }) {
  const mediaUrl =
    ctx?.message?.mediaUrl ??
    ctx?.message?.image?.url ??
    ctx?.message?.audio?.url ??
    ctx?.message?.video?.url ??
    ctx?.message?.document?.url ??
    null

  await saveMessage({
    at: new Date().toISOString(),
    direction: 'inbound',
    number: ctx?.from ?? 'unknown',
    body: ctx?.body ?? '',
    mediaUrl,
    flowTag: opts?.flowTag,
    meta: { messageId: ctx?.id, ...(opts?.meta ?? {}) },
  })
}

/**
 * Loguea un mensaje SALIENTE cuando tú envías algo manualmente con bot.sendMessage
 * (o desde tus propios endpoints HTTP si los tienes).
 */
export async function logOutbound(
  number: string,
  body: string,
  mediaUrl?: string | null,
  opts?: { flowTag?: string; meta?: Record<string, any> }
) {
  await saveMessage({
    at: new Date().toISOString(),
    direction: 'outbound',
    number,
    body: body ?? '',
    mediaUrl: mediaUrl ?? null,
    flowTag: opts?.flowTag,
    meta: opts?.meta ?? {},
  })
}

/**
 * Azúcar: envía y loguea en una sola llamada.
 * Útil si quieres centralizar TODOS tus envíos por aquí.
 */
export function makeSendAndLog(bot: any) {
  return async function sendAndLog(
    number: string,
    message: string,
    options?: { media?: string | null; flowTag?: string; meta?: Record<string, any> }
  ) {
    await bot.sendMessage(number, message, { media: options?.media ?? null })
    await logOutbound(number, message, options?.media ?? null, {
      flowTag: options?.flowTag ?? 'sendAndLog',
      meta: options?.meta,
    })
  }
}
