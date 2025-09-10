
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import { log } from 'console'
import { logInbound, logOutbound } from './services/conversation.service.js'
import * as dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT ?? 3008

const loggerFlow = addKeyword<Provider, Database>([''])
    .addAction(async (ctx) => {
        // Guarda mensaje ENTRANTE
        await logInbound(ctx, { flowTag: 'loggerFlow' })
        log('📩 IN:', ctx.from, '->', ctx.body)
    })


const WELCOME_MSG = '🙌 Hola bienvenido a este chatbot'

const welcomeFlow = addKeyword<Provider, Database>(['hi', 'hello', 'hola'])
  .addAction(async (ctx) => {
    await logInbound(ctx, { flowTag: 'welcomeFlow', meta: { stage: 'trigger' } })
    // Registramos también el SALIENTE del saludo
    await logOutbound(ctx.from, WELCOME_MSG, null, { flowTag: 'welcomeFlow' })
  })
  .addAnswer(
    WELCOME_MSG,
    { capture: true },
    async (ctx) => {
      await logInbound(ctx, { flowTag: 'welcomeFlow', meta: { stage: 'captured' } })
    }
  )

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, loggerFlow])
    const adapterProvider = createProvider(Provider, {
        jwtToken: process.env.jwtToken,
        numberId: process.env.numberId,
        verifyToken: process.env.verifyToken,
        version: 'v22.0'
    })

    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })


    httpServer(+PORT)
}

main()
