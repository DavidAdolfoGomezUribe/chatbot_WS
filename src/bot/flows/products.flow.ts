// src/bot/flows/products.flow.ts
import { addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import type { MetaProvider as Provider } from '@builderbot/provider-meta'
import { getProductsByCategory } from '../handlers/products.handler'
import  {detailedProduct}  from "./detailedProduct.flow"

// pequeño helper para partir en secciones de 10 filas (límite de WhatsApp)
const chunk = <T,>(arr: T[], size = 10): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export const producsFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAction(async (ctx, { provider }) => {
    // Categoría elegida en la lista anterior
    const category = ctx.title_list_reply
    
    const products = await getProductsByCategory(category)

    // Construir filas (id, title, description)
    const rows = products.map((p: any) => ({
      id: `prod:${p.id ?? p.name}`,
      title: p.name,
      description: `US$ ${Number(p.price).toFixed(2)} • Stock: ${p.stock}`,
    }))

   
    // WhatsApp List: máx 10 rows por sección → partimos en bloques de 10
    const sections = chunk(rows, 10).map((block, i) => ({
      title: `Productos ${i + 1}`,
      rows: block,
    }))

    const listPayload = {
      header: { type: 'text', text: `🛍️ ${category}` },
      body:   { text: `Elige un producto de la categoría “${category}”` },
      footer: { text: 'Apple Store • Productos' },
      action: {
        button: 'Ver productos',
        sections,
      },
    }

    await provider.sendList(ctx.from, listPayload)
  })

  // (Opcional) Capturar la selección del producto y solo mostrar un OK en consola
.addAction({ capture: true }, async (ctx, { gotoFlow }) => {
  // aquí ya llegó la respuesta de la lista (interactive reply)
  
  return gotoFlow(detailedProduct)
})