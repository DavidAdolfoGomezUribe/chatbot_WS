// src/bot/index.ts
import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import { logInbound } from '~/services/conversation.service'
import { log } from 'console'

import { welcomeFlow } from './flows/welcome.flow'
import { categoryFlow } from './flows/category.flow'
import { producsFlow } from './flows/products.flow'
import { detailedProduct } from './flows/detailedProduct.flow'

import { createChatByPhone, sendToAgentProcess } from '~/api/agent.api'

/**
 * Fallback global (catch-all):
 * - Crea el chat para el número (simple y directo).
 * - Llama al agente con el texto del usuario.
 * - Responde SOLO con `response` del backend.
 * Se ejecuta para cualquier mensaje que no haya sido atrapado por otros flows.
 */
const loggerFlow = addKeyword<Provider, Database>([''])
  .addAction(async (ctx, { provider }) => {
    // 1) Crear chat (simple)
    const phone = String(ctx.from)
    const chat = await createChatByPhone(phone)
    log('🧾 Chat creado/resuelto:', chat)

    // 2) Log de entrada (con chat_id para trazabilidad)
    await logInbound(ctx, { flowTag: 'loggerFlow', meta: { chat_id: chat.id } })
    log('📩 IN:', ctx.from, '->', ctx.body)

    // 3) Llamar al agente con el texto del usuario
    const text = String(ctx.body ?? '').trim()
    if (text) {
      const agentRes = await sendToAgentProcess({
        chat_id: chat.id,
        message: text,
        user_id: 0, // si no manejas user en WhatsApp
        context: { from: phone },
      })

      const answer = (agentRes?.response ?? '').trim() || 'No tengo respuesta en este momento.'
      await provider.sendText(ctx.from, answer)
    }
  })

export async function startBot() {
  const adapterFlow = createFlow([
    // Tus flows por keyword primero
    welcomeFlow,
    categoryFlow,
    producsFlow,
    detailedProduct,
    // Y al final, el catch-all que siempre responde con el agente
    loggerFlow,
  ])

  const adapterProvider = createProvider(Provider, {
    jwtToken: process.env.jwtToken,
    numberId: process.env.numberId,
    verifyToken: process.env.verifyToken,
    version: 'v22.0',
  })
  const adapterDB = new Database()

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  httpServer(Number(process.env.PORT ?? 3008))
  return { provider: adapterProvider }
}
