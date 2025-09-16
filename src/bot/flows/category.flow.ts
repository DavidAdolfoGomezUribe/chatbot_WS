// src/bot/flows/categories.flow.ts
import { addKeyword } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import type { MetaProvider as Provider } from '@builderbot/provider-meta'
import { getCategories } from '../handlers/products.handler'
import { producsFlow } from './products.flow'
import { log } from 'console'

export const categoryFlow = addKeyword<Provider, Database>([
  'categorias',
  'ver categorias',
  'productos',
  'ver productos',
  '🛍️ Ver productos',
])

// Paso 1: enviar la lista (NO captura aquí)
.addAction(async (ctx, { provider }) => {
  const categories = await getCategories()

  const rows = categories.map((cat: string) => ({
    id: `cat:${cat}`,
    title: cat,
    description: `Ver productos de ${cat}`,
  }))
  // log(ctx)
  await provider.sendList(ctx.from, {
    header: { type: 'text', text: '🛍️ Catálogo Apple' },
    body:   { text: 'Selecciona una categoría para ver productos' },
    footer: { text: 'Apple Store • Categorías' },
    action: {
      button: 'Ver categorías',
      sections: [{ title: 'Categorías', rows }],
    },
  })

  
})


// Paso 2: ahora SÍ esperamos la próxima interacción y saltamos
.addAction({ capture: true }, async (ctx, { gotoFlow }) => {
  // aquí ya llegó la respuesta de la lista (interactive reply)
  
  return gotoFlow(producsFlow)
})
