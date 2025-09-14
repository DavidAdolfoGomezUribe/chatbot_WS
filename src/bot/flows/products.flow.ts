// src/bot/flows/products.flow.ts
import { addKeyword } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import type { MetaProvider as Provider } from '@builderbot/provider-meta'
import { logInbound } from '../../services/conversation.service'
import { getCategories, getProductsByCategory } from '../handlers/products.handler'
import { log } from 'console'

export const productsFlow = addKeyword<Provider, Database>([
  'productos',
  'ver productos',
  'ver producto',
  '🛍️ Ver productos',
  '🛍️ Ver producto',
  'products',
  'producs',
])

// Paso 1: mostrar lista de categorías (interactuable)
.addAction(async (ctx, { flowDynamic, provider, state }) => {
  await logInbound(ctx, { flowTag: 'productsFlow', meta: { trigger: ctx.body } })

  try {
    const categories = await getCategories()

    if (!categories.length) {
      await flowDynamic('⚠️ La API no devolvió categorías.')
      return
    }

    await state.update({ categories, awaitingProduct: false })

    const listPayload = {
      header: { type: 'text', text: '🛍️ Catálogo Apple' },
      body: { text: 'Selecciona una categoría para ver productos' },
      footer: { text: 'Apple Store • Categorías' },
      action: {
        button: 'Ver categorías',
        sections: [
          {
            title: 'Categorías',
            rows: categories.map((cat) => ({
              id: `cat:${cat}`,
              title: cat,
              description: `Ver productos de ${cat}`,
            })),
          },
        ],
      },
    }

    await provider.sendList(ctx.from, listPayload)
  } catch (err) {
    log('Error al llamar getCategories:', err)
    await flowDynamic('❌ Error al obtener categorías desde la API.')
  }
})

// Paso 2: capturar categoría -> listar productos; próxima entrada = selección de producto
.addAction({ capture: true }, async (ctx, { flowDynamic, state, provider }) => {
  const input = (ctx.body || '').trim()

  // Si ya estamos esperando un producto, NO proceses aquí (deja que lo haga el Paso 3)
  const awaitingProduct = await state.get('awaitingProduct')
  if (awaitingProduct) {
    return
  }

  const categories: string[] = (await state.get('categories')) ?? []
  if (!categories.length) {
    await flowDynamic('Escribe *productos* para volver a cargar categorías.')
    return
  }

  // Resolver categoría desde selección (title o id cat:Name)
  let category = input.startsWith('cat:') ? input.slice(4) : input
  const match = categories.find((c) => c.toLowerCase() === category.toLowerCase())
  if (!match) {
    await flowDynamic('❕ Selecciona una categoría válida desde la lista.')
    return
  }
  category = match

  const products = await getProductsByCategory(category, 50)
  if (!products.length) {
    await flowDynamic(`No encontré productos en “${category}”.`)
    return
  }

  await state.update({ lastProducts: products, pickedCategory: category })

  // WhatsApp limita ~10 rows por sección. Mostramos 10 en esta primera versión.
  const rows = products.slice(0, 10).map((p) => ({
    id: `prod:${p.id}`,
    title: p.name,
    description: `USD ${p.price ?? 0}`,
  }))

  const listPayload = {
    header: { type: 'text', text: `📂 ${category}` },
    body: { text: 'Toca un producto para ver su información' },
    footer: { text: 'Apple Store • Productos' },
    action: {
      button: 'Ver productos',
      sections: [
        {
          title: 'Productos',
          rows,
        },
      ],
    },
  }

  await provider.sendList(ctx.from, listPayload)

  // La próxima entrada será la selección del PRODUCTO
  await state.update({ awaitingProduct: true })
  return
})

// Paso 3: capturar producto seleccionado y mostrar tarjeta/ficha detallada
.addAction({ capture: true }, async (ctx, { flowDynamic, state }) => {
  const awaitingProduct = await state.get('awaitingProduct')
  if (!awaitingProduct) {
    // Si por alguna razón caemos aquí sin estar esperando producto, salir suave
    return
  }

  // Limpiamos el flag para próximos ciclos
  await state.update({ awaitingProduct: false })

  const raw = (ctx.body || '').trim()
  const firstLine = raw.split('\n')[0].trim()

  const products = (await state.get('lastProducts')) as Array<{
    id: number
    name: string
    category: string
    description?: string
    price?: number
    stock?: number
    image_primary_url?: string | null
    image_secondary_url?: string | null
    image_tertiary_url?: string | null
    release_date?: string
    is_active?: boolean
  }> | null

  if (!products?.length) {
    await flowDynamic('Escribe *productos* para volver a explorar.')
    return
  }

  // 1) Matcheo por id "prod:<id>"
  let picked = null as (typeof products)[number] | null
  const idMatch = raw.match(/prod:(\d+)/i)
  if (idMatch) {
    const id = Number(idMatch[1])
    picked = products.find((p) => p.id === id) || null
  }

  // 2) Por título exacto (primera línea del eco textual)
  if (!picked && firstLine) {
    picked = products.find((p) => p.name.toLowerCase() === firstLine.toLowerCase()) || null
  }

  // 3) Inclusión por nombre (por si el cliente añade líneas extra)
  if (!picked) {
    const low = raw.toLowerCase()
    picked = products.find((p) => low.includes(p.name.toLowerCase())) || null
  }

  if (!picked) {
    await flowDynamic('❕ Selecciona un producto válido desde la lista.')
    return
  }

  // Tarjeta/ficha del producto
  const fmt = (n?: number) => (typeof n === 'number' ? n.toFixed(2) : '0.00')

  const lines: string[] = []
  lines.push(`📦 *${picked.name}*`)
  lines.push(`🗂️ Categoría: ${picked.category ?? '—'}`)
  if (picked.description) lines.push(`💬 Descripción: ${picked.description}`)
  lines.push(`💵 Precio: USD ${fmt(picked.price)}`)
  lines.push(`📦 Stock: ${picked.stock ?? 0}`)
  if (picked.image_primary_url)   lines.push(`🖼️ Imagen: ${picked.image_primary_url}`)
  if (picked.image_secondary_url) lines.push(`🖼️ Imagen 2: ${picked.image_secondary_url}`)
  if (picked.image_tertiary_url)  lines.push(`🖼️ Imagen 3: ${picked.image_tertiary_url}`)
  if (picked.release_date)        lines.push(`📅 Lanzamiento: ${picked.release_date}`)
  lines.push(`🔗 Más info: https://google.com`) // placeholder

  await flowDynamic(lines.join('\n'))
  await flowDynamic('Escribe *productos* para volver a ver categorías.')
})
