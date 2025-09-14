// src/app.ts
import * as dotenv from 'dotenv'
dotenv.config()

// Importamos la función que inicializa el bot
import { startBot } from './bot/index.js'

const PORT = process.env.PORT ?? 3008

// Mantengo los comentarios de referencia
// async function getdata() {
//   // const data = (await fetch("http://localhost:8000/products/")).json()
//   // log(await data)
//   return ((await fetch("http://localhost:8000/products/")).json())
// }

async function main() {
  // Inicializa el bot con los flows registrados
  const { provider } = await startBot()

  // Si quieres enviar mensajes manualmente fuera de los flows:
  // await provider.sendMessage('573001234567', 'Hola desde backend 👋')

  console.log(`🤖 Bot corriendo en el puerto ${PORT}`)
}

main()
