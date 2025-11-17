import Logger from '../utils/logger'

const logger = new Logger('HostManager')

/**
 * Manages host operations and host transfer logic
 */
export class HostManager {
  /**
   * Transfer host role to another player
   */
  transferHost(room: Room, newHostId: string): boolean {
    const oldHostId = room.hostId
    const oldHost = room.players.get(oldHostId)
    const newHost = room.players.get(newHostId)

    if (!newHost) {
      logger.warn('Attempted to transfer host to non-existent player', {
        roomId: room.id,
        newHostId,
      })
      return false
    }

    // Update old host if still in room
    if (oldHost) {
      oldHost.isHost = false
      room.players.set(oldHostId, oldHost)
    }

    // Update new host
    newHost.isHost = true
    room.players.set(newHostId, newHost)
    room.hostId = newHostId

    logger.info('Host transferred', {
      roomId: room.id,
      oldHostId,
      oldHostName: oldHost?.name,
      newHostId,
      newHostName: newHost.name,
    })

    return true
  }

  /**
   * Find and assign a new host from connected players
   */
  assignNewHost(room: Room): Player | undefined {
    const connectedPlayers = Array.from(room.players.values()).filter((p) => p.isConnected)

    if (connectedPlayers.length === 0) {
      logger.info('No connected players available for host assignment', { roomId: room.id })
      return undefined
    }

    // Select first connected player as new host
    const newHost = connectedPlayers[0]
    if (newHost) {
      this.transferHost(room, newHost.id)
    }

    return newHost
  }

  /**
   * Handle host leaving/disconnecting
   */
  handleHostLeaving(room: Room, leavingHostId: string): 'room_deleted' | 'host_transferred' | 'no_action' {
    if (room.hostId !== leavingHostId) {
      logger.debug('Leaving player is not host', {
        roomId: room.id,
        playerId: leavingHostId,
        currentHostId: room.hostId,
      })
      return 'no_action'
    }

    logger.info('Host is leaving room', {
      roomId: room.id,
      hostId: leavingHostId,
    })

    const newHost = this.assignNewHost(room)

    if (!newHost) {
      logger.info('No remaining players, room should be deleted', { roomId: room.id })
      return 'room_deleted'
    }

    return 'host_transferred'
  }

  /**
   * Check if a player is the host
   */
  isHost(room: Room, playerId: string): boolean {
    return room.hostId === playerId
  }

  /**
   * Get the current host player
   */
  getHost(room: Room): Player | undefined {
    return room.players.get(room.hostId)
  }
}
