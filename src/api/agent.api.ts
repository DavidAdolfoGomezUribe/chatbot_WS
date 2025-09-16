// src/api/agent.api.ts
import { http } from './http'

/** --- Tipos --- */
export type ChatResponse = {
  id: number
  phone_number: string | null
  email: string | null
  user_id: number | null
  last_message?: string | null
  created_at?: string
  last_activity?: string
}

export type CreateChatPayload = {
  phone_number?: string | null
  email?: string | null
  user_id?: number | null
}

export type AgentProcessBackendResponse = {
  chat_id: number
  user_id: number | null
  message: string
  intent?: string | null
  confidence?: number
  detected_keywords?: string[]
  response_type?: string
  timestamp?: string
  processing_steps?: string[]
  response: string
  agent_used?: string
  requires_agent?: boolean
  cost?: number
  model_used?: string
  response_time?: number
  products?: Array<{
    nombre: string
    precio: number
    descripcion: string
    categoria: string
    score: number
  }>
  context_used?: boolean
  success?: boolean
  total_processing_time?: number
  cost_limits?: unknown
}

/** --- Utils --- */
export function formatE164(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '')
  return digits.startsWith('+') ? digits : `+${digits}`
}

/** --- API: Crear chat --- */
export async function createChatByPhone(phone_number_raw: string): Promise<ChatResponse> {
  const phone_number = formatE164(phone_number_raw)
  const payload: CreateChatPayload = { phone_number }
  return await http<ChatResponse>({
    path: '/chats',
    method: 'POST',
    body: payload,
  })
}

/** --- API: Enviar mensaje al agente --- */
export async function sendToAgentProcess(params: {
  chat_id: number
  message: string
  user_id?: number // si no manejas user en WhatsApp, usa 0 o deja undefined
  context?: Record<string, unknown>
}): Promise<AgentProcessBackendResponse> {
  return await http<AgentProcessBackendResponse>({
    path: '/ai-agent/process',
    method: 'POST',
    body: {
      message: params.message,
      chat_id: params.chat_id,
      user_id: params.user_id ?? 0,
      save_to_chat: true,
      context: params.context ?? {},
    },
  })
}
