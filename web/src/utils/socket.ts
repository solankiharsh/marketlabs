/**
 * Socket.IO client singleton for real-time price streaming.
 */
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let priceUpdateCallback: ((data: PriceUpdate[]) => void) | null = null

export interface PriceUpdate {
  market: string
  symbol: string
  price: number
  change: number
  changePercent: number
}

function getSocket(): Socket | null {
  if (socket?.connected) return socket

  const token = localStorage.getItem('ml_access_token')
  if (!token) return null

  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  })

  socket.on('connect', () => {
    console.log('[WS] Connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason)
  })

  socket.on('price_update', (data: PriceUpdate[]) => {
    priceUpdateCallback?.(data)
  })

  socket.on('connect_error', (err) => {
    console.warn('[WS] Connection error:', err.message)
  })

  return socket
}

export function subscribeToWatchlist(symbols: { market: string; symbol: string }[]) {
  const s = getSocket()
  if (!s) return
  s.emit('subscribe_prices', symbols)
}

export function onPriceUpdate(callback: (data: PriceUpdate[]) => void) {
  priceUpdateCallback = callback
}

export function unsubscribePrices() {
  socket?.emit('unsubscribe_prices')
}

export function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  priceUpdateCallback = null
}
