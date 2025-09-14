// src/bot/flows/welcome.flow.ts
import { addKeyword } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import type { MetaProvider as Provider } from '@builderbot/provider-meta'
import { logInbound, logOutbound } from '../../services/conversation.service'

const WELCOME_MSG =
  '🍏 Bienvenido(a) a Apple Store.\n' +
  'Nos alegra atenderte. Elige una opción para continuar:\n' +
  '• 🛍️ Ver productos (placeholder)\n' +
  '• 🏠 Página principal: https://google.com'

export const welcomeFlow = addKeyword<Provider, Database>(['hi', 'hello', 'hola'])
  .addAction(async (ctx) => {
    await logInbound(ctx, { flowTag: 'welcomeFlow', meta: { stage: 'trigger' } })
    await logOutbound(ctx.from, WELCOME_MSG, null, { flowTag: 'welcomeFlow' })
  })
  .addAnswer(
    WELCOME_MSG,
    {
      capture: true,
      // Botones de respuesta rápida (placeholders)
      buttons: [
        { body: '🛍️ Ver productos' },
        { body: '🏠 Página principal' },
      ],
    },
    async (ctx) => {
      // Solo dejamos trazabilidad por ahora (placeholders)
      await logInbound(ctx, { flowTag: 'welcomeFlow', meta: { stage: 'captured', selection: ctx.body } })
      // En este punto, cuando implementes el catálogo o la navegación,
      // podrás rutear según ctx.body (e.g., a un productsFlow o enviar URL dinámica).
    }
  )
