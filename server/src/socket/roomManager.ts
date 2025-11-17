import { Server, Socket } from 'socket.io'
import { RoomStore } from './RoomStore'
import { PlayerManager } from './PlayerManager'
import { HostManager } from './HostManager'
import { GameManager } from './GameManager'
import { RoomEventHandler } from './RoomEventHandler'
import Logger from '../utils/logger'

const logger = new Logger('RoomManager')

// Singleton instances
export const roomStore = new RoomStore()

/**
 * Main entry point for handling room-related socket events
 * This function initializes all managers and event handlers for each socket connection
 */
export function handleRoomEvents(io: Server, socket: Socket): void {
  logger.info('New socket connection', { socketId: socket.id })

  // Initialize managers
  const playerManager = new PlayerManager(io)
  const hostManager = new HostManager()
  const gameManager = new GameManager(io)

  // Create event handler and register all events
  const eventHandler = new RoomEventHandler(
    io,
    socket,
    roomStore,
    playerManager,
    hostManager,
    gameManager
  )

  eventHandler.registerHandlers()
}

/**
 * Export room store for monitoring/debugging purposes
 */
export function getRoomStore(): RoomStore {
  return roomStore
}
