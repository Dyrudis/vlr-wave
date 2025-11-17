import { Server, Socket } from 'socket.io'
import { handleRoomEvents } from './roomManager'

export function registerSocketEvents(io: Server) {
  io.on('connection', (socket: Socket) => {
    handleRoomEvents(io, socket)

    socket.on('disconnect', () => {})
  })
}
