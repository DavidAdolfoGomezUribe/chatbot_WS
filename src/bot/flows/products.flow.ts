// src/bot/flows/products.flow.ts
import { addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import type { MetaProvider as Provider } from '@builderbot/provider-meta'
import { getProductsByCategory } from '../handlers/products.handler'
import { detailedProduct } from './detailedProduct.flow'
import { log } from 'console'

// helper: partir en secciones de 10 filas
const chunk = <T,>(arr: T[], size = 10): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// helper: truncar respetando límites WABA
const truncate = (s: any, max: number) => {
  const str = String(s ?? '')
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

// helper: leer categoría desde distintos campos del evento
const extractCategory = (ctx: any): string | undefined => {
  const title = ctx?.title_list_reply ?? ctx?.listResponse?.title
  if (title) return String(title)
  const body = String(ctx?.body ?? '')
  return body.startsWith('cat:') ? body.slice(4) : undefined
}

export const producsFlow = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAction(async (ctx, { provider }) => {
    // Categoría elegida en la lista anterior
    const category = extractCategory(ctx)
    if (!category) {
      log('productsFlow: no category in event -> skip', { body: ctx?.body })
      return
    }
    log('productsFlow category =', category)

    const products = await getProductsByCategory(category)
    log('productsFlow count =', products.length)

    if (!products.length) {
      await provider.sendText(ctx.from, `No hay productos en “${category}”.`)
      return
    }

    // Construir filas cumpliendo límites
    const rows = products.map((p: any) => ({
      id: `prod:${p.id}`, // importante para el siguiente paso
      title: truncate(p.name, 24),
      description: truncate(`US$ ${Number(p.price).toFixed(2)} • Stock: ${p.stock}`, 72),
    }))

    // Secciones (máx 10 filas por sección, título ≤ 24)
    const sections = chunk(rows, 10).map((block, i) => ({
      title: truncate(`Productos ${i + 1}`, 24),
      rows: block,
    }))

    const listPayload = {
      header: { type: 'text', text: truncate(`🛍️ ${category}`, 60) }, // header ≤ aprox 60
      body:   { text: truncate(`Elige un producto de la categoría “${category}”`, 1024) },
      footer: { text: truncate('Apple Store • Productos', 60) },
      action: {
        button: truncate('Ver productos', 20),
        sections,
      },
    }

    try {
      await provider.sendList(ctx.from, listPayload)
    } catch (e: any) {
      // Fallback de depuración útil si WABA rechaza el payload
      log('sendList error:', e?.response?.data || e?.message || e)
      const fallback = rows.slice(0, 5).map(r => `• ${r.title} (${r.id})`).join('\n')
      await provider.sendText(
        ctx.from,
        `⚠️ No pude mostrar la lista interactiva.\nEstos son algunos productos:\n${fallback}\n\nResponde con el *ID* (ej: prod:23).`
      )
    }
  })

  // Espera la siguiente selección (producto) y luego salta
  .addAction({ capture: true }, async (_ctx, { gotoFlow }) => {
    return gotoFlow(detailedProduct)
  })
