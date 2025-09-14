// src/bot/flows/products.flow.ts
import { addKeyword } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import type { MetaProvider as Provider } from '@builderbot/provider-meta'
import { getCategories, getProductsByCategory } from '../handlers/products.handler'
import { logInbound, logOutbound } from '../../services/conversation.service'

// Config
const CATEGORIES_PER_PAGE = 3
const PRODUCTS_PER_CATEGORY = 5

// Helpers para paginar categorías en botones
function slicePage<T>(arr: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage
  return arr.slice(start, start + perPage)
}

export const productsFlow = addKeyword<Provider, Database>([
  'productos',
  'ver productos',
  '🛍️ Ver productos', // el texto del botón desde welcome
])
  .addAction(async (ctx, { state, flowDynamic }) => {
    await logInbound(ctx, { flowTag: 'productsFlow', meta: { stage: 'enter' } })
    // Reset de paginación al entrar
    await state.update({ page: 1, pickedCategory: null })
    await flowDynamic('🔎 Cargando categorías...')
  })
  .addAction(async (ctx, { state, flowDynamic }) => {
    const all = await getCategories()
    const page = (await state.get('page')) ?? 1
    const current = slicePage(all, page, CATEGORIES_PER_PAGE)

    if (!all.length) {
      await flowDynamic('Por ahora no hay categorías disponibles.')
      return
    }

    // Construye botones dinámicos (máx. 3 por pantalla)
    const buttons = current.map(name => ({ body: `📦 ${name}` }))

    // Si hay más páginas, añade botón “Más categorías”
    if (all.length > page * CATEGORIES_PER_PAGE) {
      buttons.push({ body: '➡️ Más categorías' })
    }

    await flowDynamic('🛍️ Elige una categoría:')
    // addAnswer-like con botones: usamos flowDynamic con payload de botones
    return await flowDynamic(
      {
        body: 'Categorías disponibles',
        buttons,
      } as any // según versión de builderbot, flowDynamic admite objetos con buttons
    )
  })
  .addAction({ capture: true }, async (ctx, { state, gotoFlow, flowDynamic }) => {
    const input = (ctx.body || '').trim()

    // Paginación
    if (/más categorías/i.test(input)) {
      const current = (await state.get('page')) ?? 1
      await state.update({ page: current + 1 })
      return gotoFlow(productsFlow) // recargar vista de categorías
    }

    // Detección de categoría
    const catMatch = input.match(/^📦\s+(.+)/i)
    if (catMatch) {
      const category = catMatch[1]
      await state.update({ pickedCategory: category })

      const items = await getProductsByCategory(category, PRODUCTS_PER_CATEGORY)
      if (!items.length) {
        return await flowDynamic(`No encontré productos en “${category}”.`)
      }

      const lines = items.map(p => `• ${p.name} — $${p.price}`)
      await flowDynamic([`📂 Categoría: ${category}`, 'Aquí tienes algunos productos:', ...lines])

      // Botones para volver a categorías o ver más (si quieres implementar “más productos”)
      return await flowDynamic(
        {
          body: '¿Qué deseas hacer?',
          buttons: [
            { body: '🔙 Volver a categorías' },
            // { body: '➕ Ver más de esta categoría' }, // opcional
          ],
        } as any
      )
    }

    // Volver
    if (/volver a categorías/i.test(input)) {
      await state.update({ pickedCategory: null, page: 1 })
      return gotoFlow(productsFlow)
    }

    // Cualquier otra cosa: instrucción
    return await flowDynamic('Escribe “📦 <Categoría>” tocando alguno de los botones o “➡️ Más categorías”.')
  })
