import { Server } from 'socket.io'
import Logger from '../utils/logger'

const logger = new Logger('PlayerManager')

/**
 * Manages player operations within a room
 */
export class PlayerManager {
  private io: Server

  constructor(io: Server) {
    this.io = io
  }

  /**
   * Add a new player to a room
   */
  addPlayer(room: Room, playerId: string, playerName: string): Player {
    const player: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      isConnected: true,
      isHost: room.hostId === playerId,
    }

    room.players.set(playerId, player)
    logger.info('Player added to room', {
      roomId: room.id,
      playerId,
      playerName,
      isHost: player.isHost,
    })

    return player
  }

  /**
   * Find a player by name in a room
   */
  findPlayerByName(room: Room, playerName: string): Player | undefined {
    return Array.from(room.players.values()).find((p) => p.name === playerName)
  }

  /**
   * Reconnect an existing player
   */
  reconnectPlayer(room: Room, existingPlayer: Player, newSocketId: string): void {
    // Remove old socket reference
    room.players.delete(existingPlayer.id)

    // Update player with new socket ID
    existingPlayer.id = newSocketId
    existingPlayer.isConnected = true

    // Add back with new socket ID
    room.players.set(newSocketId, existingPlayer)

    logger.info('Player reconnected', {
      roomId: room.id,
      playerName: existingPlayer.name,
      oldSocketId: existingPlayer.id,
      newSocketId,
    })
  }

  /**
   * Disconnect a player (mark as not connected)
   */
  disconnectPlayer(room: Room, playerId: string): Player | undefined {
    const player = room.players.get(playerId)
    if (!player) {
      logger.warn('Attempted to disconnect non-existent player', { roomId: room.id, playerId })
      return undefined
    }

    player.isConnected = false
    room.players.set(playerId, player)

    logger.info('Player disconnected', {
      roomId: room.id,
      playerId,
      playerName: player.name,
    })

    return player
  }

  /**
   * Remove a player completely from a room
   */
  removePlayer(room: Room, playerId: string): boolean {
    const player = room.players.get(playerId)
    const removed = room.players.delete(playerId)

    if (removed && player) {
      logger.info('Player removed from room', {
        roomId: room.id,
        playerId,
        playerName: player.name,
      })
    }

    return removed
  }

  /**
   * Get all connected players in a room
   */
  getConnectedPlayers(room: Room): Player[] {
    return Array.from(room.players.values()).filter((p) => p.isConnected)
  }

  /**
   * Get all players in a room as array
   */
  getAllPlayers(room: Room): Player[] {
    return Array.from(room.players.values())
  }

  /**
   * Update player score
   */
  updatePlayerScore(room: Room, playerId: string, scoreChange: number): Player | undefined {
    const player = room.players.get(playerId)
    if (!player) {
      logger.warn('Attempted to update score for non-existent player', {
        roomId: room.id,
        playerId,
      })
      return undefined
    }

    player.score += scoreChange
    room.players.set(playerId, player)

    logger.debug('Player score updated', {
      roomId: room.id,
      playerId,
      playerName: player.name,
      scoreChange,
      newScore: player.score,
    })

    return player
  }

  /**
   * Broadcast room state update to all players in room
   */
  broadcastRoomUpdate(room: Room): void {
    this.io.to(room.id).emit('room:update', {
      players: this.getAllPlayers(room),
    })

    logger.debug('Room update broadcasted', {
      roomId: room.id,
      playerCount: room.players.size,
      connectedCount: this.getConnectedPlayers(room).length,
    })
  }
}
