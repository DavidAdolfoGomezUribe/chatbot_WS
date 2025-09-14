// src/bot/handlers/products.handler.ts
import { fetchProducts, Product } from '../../api/products.api'

// Devuelve lista única de categorías, ordenada alfabéticamente
export async function getCategories(): Promise<string[]> {
  const { products } = await fetchProducts()
  const set = new Set(products.map(p => p.category).filter(Boolean))
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

// Devuelve hasta N productos por categoría
export async function getProductsByCategory(category: string, limit = 5): Promise<Product[]> {
  const { products } = await fetchProducts()
  return products.filter(p => p.category?.toLowerCase() === category.toLowerCase()).slice(0, limit)
}
