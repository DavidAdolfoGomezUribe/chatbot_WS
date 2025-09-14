// src/app.ts
import { log } from 'console'
import * as dotenv from 'dotenv'
dotenv.config()

// Importamos la función que inicializa el bot
import { startBot } from './bot/index.js'

const PORT = process.env.PORT ?? 3008


 async function getdata() {
    const data = (await fetch("http://localhost:8000/products/")).json()
    log(await data)
  return ((await fetch("http://localhost:8000/products/")).json())
 }

async function main() {
  // Inicializa el bot con los flows registrados
  const { provider } = await startBot()
  // await startBot()
  // Si quieres enviar mensajes manualmente fuera de los flows:
  // await provider.sendMessage('+573124637589', 'Hola desde backend 👋')
  
  // log( await getdata())
}

main()
