// src/bot/flows/welcome.flow.ts
import { addKeyword } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import type { MetaProvider as Provider } from '@builderbot/provider-meta'
import { logInbound, logOutbound } from '../../services/conversation.service'
import { categoryFlow } from './category.flow'
import { createChatByPhone } from '~/api/agent.api'
import { log } from 'console'


const WELCOME_MSG =
  '🍏 Bienvenido(a) a Apple Store.\n' +
  'Nos alegra atenderte. Elige una opción para continuar:\n' +
  '• 🛍️ Ver productos\n' +
  '• 🏠 Página principal: https://google.com'

export const welcomeFlow = addKeyword<Provider, Database>(['hi', 'hello', 'hola'])
  .addAction(async (ctx) => {
    await logInbound(ctx, { flowTag: 'welcomeFlow', meta: { stage: 'trigger' } })

    // Crear chat en el primer mensaje
    const rawFrom = String(ctx.from)
    const chat = await createChatByPhone(rawFrom)
    log(chat)

    await logOutbound(ctx.from, WELCOME_MSG, null, { flowTag: 'welcomeFlow' })
  })
  .addAnswer(
    WELCOME_MSG,
    {
      capture: true,
      buttons: [
        { body: '🛍️ Ver productos' },
        { body: '🏠 Página principal' },
      ],
    },
    async (ctx, { gotoFlow }) => {
      await logInbound(ctx, {
        flowTag: 'welcomeFlow',
        meta: { stage: 'captured', selection: ctx.body },
      })
      const t = (ctx.body || '').toLowerCase().trim()
      if (t.includes('producto') || t === '🛍️ ver productos' || t === 'products' || t === 'producs') {
        return gotoFlow(categoryFlow)
      }
      return 'Puedes escribir *productos* para ver el catálogo o toca el botón.'
    }
  )
