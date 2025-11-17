import Logger from '../utils/logger'

const logger = new Logger('RoomStore')

/**
 * Centralized store for managing all game rooms
 */
export class RoomStore {
  private rooms: Map<string, Room>

  constructor() {
    this.rooms = new Map()
    logger.info('RoomStore initialized')
  }

  /**
   * Generate a unique 4-character room ID
   */
  generateRoomId(): string {
    let roomId: string
    let attempts = 0
    const maxAttempts = 10

    do {
      roomId = Math.random().toString(36).substring(2, 6).toUpperCase()
      attempts++
    } while (this.rooms.has(roomId) && attempts < maxAttempts)

    if (this.rooms.has(roomId)) {
      logger.error('Failed to generate unique room ID after max attempts', { attempts: maxAttempts })
      throw new Error('Could not generate unique room ID')
    }

    logger.debug('Generated room ID', { roomId, attempts })
    return roomId
  }

  /**
   * Create a new room
   */
  createRoom(roomId: string, hostId: string): Room {
    if (this.rooms.has(roomId)) {
      logger.warn('Attempted to create room with existing ID', { roomId })
      throw new Error('Room already exists')
    }

    const room: Room = {
      id: roomId,
      players: new Map(),
      hostId,
    }

    this.rooms.set(roomId, room)
    logger.info('Room created', { roomId, hostId })
    return room
  }

  /**
   * Get a room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  /**
   * Check if a room exists
   */
  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId)
  }

  /**
   * Delete a room
   */
  deleteRoom(roomId: string): boolean {
    const deleted = this.rooms.delete(roomId)
    if (deleted) {
      logger.info('Room deleted', { roomId })
    }
    return deleted
  }

  /**
   * Get all rooms (for debugging/monitoring)
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  /**
   * Get room count
   */
  getRoomCount(): number {
    return this.rooms.size
  }

  /**
   * Find room containing a specific player
   */
  findRoomByPlayerId(playerId: string): { roomId: string; room: Room } | undefined {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.has(playerId)) {
        return { roomId, room }
      }
    }
    return undefined
  }

  /**
   * Get all rooms for a specific player
   */
  findAllRoomsByPlayerId(playerId: string): Array<{ roomId: string; room: Room }> {
    const result: Array<{ roomId: string; room: Room }> = []
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.has(playerId)) {
        result.push({ roomId, room })
      }
    }
    return result
  }

  /**
   * Find room where player is host and there are no other players
   * (used for cleanup when host leaves)
   */
  findRoomByHostIdWithNoPlayers(hostId: string): { roomId: string; room: Room } | undefined {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.hostId === hostId && room.players.size === 0) {
        return { roomId, room }
      }
    }
    return undefined
  }
}
