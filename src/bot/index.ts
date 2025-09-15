// src/bot/index.ts
import { createBot, createProvider, createFlow,addKeyword } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import { logInbound } from '~/services/conversation.service'
import { log } from 'console'

import { welcomeFlow } from './flows/welcome.flow'
import { categoryFlow } from './flows/category.flow'
import {producsFlow}from "./flows/products.flow"
import  {detailedProduct}  from "./flows/detailedProduct.flow"


const loggerFlow = addKeyword<Provider, Database>([''])
  .addAction(async (ctx) => {
    // Guarda mensaje ENTRANTE
    await logInbound(ctx, { flowTag: 'loggerFlow' })
    log('📩 IN:', ctx.from, '->', ctx.body)
  })



export async function startBot() {
    const adapterFlow = createFlow([welcomeFlow, categoryFlow,producsFlow,detailedProduct,loggerFlow])
    const adapterProvider = createProvider(Provider, {
        jwtToken: process.env.jwtToken,
        numberId: process.env.numberId,
        verifyToken: process.env.verifyToken,
        version: 'v22.0'
    })
    const adapterDB = new Database()
    

    const { httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    // Levanta el servidor en el puerto
    httpServer(Number(process.env.PORT ?? 3008))

    // Devuelvo provider por si quieres enviar mensajes fuera de los flows
    return { provider: adapterProvider }
}
