// src/api/products.api.ts
import { http } from './http'

export interface Product {
  id: number
  name: string
  category: string
  description: string
  price: number
  stock: number
  image_primary_url?: string | null
  image_secondary_url?: string | null
  image_tertiary_url?: string | null
  release_date?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface ProductsResponse {
  products: Product[]
  total: number
}

export async function fetchProducts(): Promise<ProductsResponse> {
  // Tu backend debe responder { products: [...], total }
  // Usamos /products/ (con slash final) para mayor compatibilidad.
  return http<ProductsResponse>({ path: '/products/' })
}
