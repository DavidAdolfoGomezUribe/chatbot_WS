// src/bot/handlers/products.handler.ts
import { fetchProducts, Product } from '../../api/products.api'

// Devuelve lista única de categorías, ordenada alfabéticamente
export async function getCategories(): Promise<string[]> {
  try {
    const { products } = await fetchProducts()
    const set = new Set(products.map(p => p.category).filter(Boolean))
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b))
    return arr
  } catch (e) {
    // Fallback seguro en error
    return []
  }
}

// Devuelve hasta N productos por categoría
export async function getProductsByCategory(category: string, limit = 10): Promise<Product[]> {
  try {
    const { products } = await fetchProducts()
    return products
      .filter(p => p.category?.toLowerCase() === category.toLowerCase())
      .slice(0, limit)
  } catch (e) {
    return []
  }
}
