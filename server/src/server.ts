import express from 'express'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import { registerSocketEvents } from './socket'
import { loadEnv } from './config/env'

loadEnv()

const app = express()
app.use(cors())
app.use(express.json())

// Optional REST
app.use('/api', require('./http/api'))

const server = http.createServer(app)

const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
})

// Register socket event handlers
registerSocketEvents(io)

const PORT = process.env.PORT || 4000
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`)
})
