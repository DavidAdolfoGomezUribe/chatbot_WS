// src/bot/flows/detailedProduct.flow.ts
import { addKeyword, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import type { MetaProvider as Provider } from '@builderbot/provider-meta'
import { log } from 'console'
import { fetchProductById } from '~/api/products.api'

const fmt  = (n: number) => `US$ ${Number(n ?? 0).toFixed(2)}`
const safe = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v))
const iso  = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : '—')

export const detailedProduct = addKeyword<Provider, Database>(EVENTS.ACTION)
  .addAction(async (ctx, { provider }) => {
    const raw = String(ctx.body ?? '')

    // ✅ Solo continuar si el body empieza por "prod:"
    if (!raw.startsWith('prod:')) {
      log('detailedProduct: ignorado (no es prod:*) =>', raw)
      return
    }

    // Extraer id numérico de "prod:<id>"
    const id = Number(raw.split(':')[1])
    if (!Number.isFinite(id)) {
      log('detailedProduct: id inválido en body =>', raw)
      await provider.sendText(ctx.from, '⚠️ No pude identificar el producto seleccionado.')
      return
    }

    try {
      const p = await fetchProductById(id)

      const msg =
`🍏 *${safe(p.name)}*
ID: ${safe(p.id)}   •   Categoría: ${safe(p.category)}
Estado: ${p.is_active ? '✅ Activo' : '⛔ Inactivo'}

💵 *Precio:* ${fmt(p.price)} 
📦 *Stock:* ${safe(p.stock)}
🗓️ *Lanzamiento:* ${iso(p.release_date)}

📝 *Descripción:*
${safe(p.description)}

🖼️ *Imágenes:*
• Principal: ${safe(p.image_primary_url)}
• Secundaria: ${safe(p.image_secondary_url)}
• Terciaria: ${safe(p.image_tertiary_url)}

⚙️ *Especificaciones:*
• iPhone: ${safe((p as any).iphone_spec)}
• Mac: ${safe((p as any).mac_spec)}
• iPad: ${safe((p as any).ipad_spec)}
• Watch: ${safe((p as any).apple_watch_spec)}
• Accesorio: ${safe((p as any).accessory_spec)}

🧾 *Trazabilidad:*
• Creado: ${iso(p.created_at)}
• Actualizado: ${iso(p.updated_at)}

🔗 Más detalles: https://google.com`

      await provider.sendText(ctx.from, msg)
    } catch (err: any) {
      log('detailedProduct: fetchProductById error =>', err?.message || err)
      await provider.sendText(ctx.from, '⚠️ No pude obtener el detalle del producto.')
    }
  })
