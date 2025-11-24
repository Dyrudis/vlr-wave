import { Server, Socket } from 'socket.io'
import { RoomStore } from './RoomStore'
import { PlayerManager } from './PlayerManager'
import { HostManager } from './HostManager'
import { GameManager } from './GameManager'
import Logger from '../utils/logger'

const logger = new Logger('RoomEventHandler')

/**
 * Handles all socket events related to rooms and game flow
 */
export class RoomEventHandler {
  private io: Server
  private socket: Socket
  private roomStore: RoomStore
  private playerManager: PlayerManager
  private hostManager: HostManager
  private gameManager: GameManager

  constructor(
    io: Server,
    socket: Socket,
    roomStore: RoomStore,
    playerManager: PlayerManager,
    hostManager: HostManager,
    gameManager: GameManager
  ) {
    this.io = io
    this.socket = socket
    this.roomStore = roomStore
    this.playerManager = playerManager
    this.hostManager = hostManager
    this.gameManager = gameManager
  }

  /**
   * Register all event handlers for this socket
   */
  registerHandlers(): void {
    this.socket.on('room:create', this.handleRoomCreate.bind(this))
    this.socket.on('room:exists', this.handleRoomExists.bind(this))
    this.socket.on('room:join', this.handleRoomJoin.bind(this))
    this.socket.on('room:leave', this.handleRoomLeave.bind(this))
    this.socket.on('game:start', this.handleGameStart.bind(this))
    this.socket.on('game:guess', this.handleGameGuess.bind(this))
    this.socket.on('disconnect', this.handleDisconnect.bind(this))

    logger.debug('Event handlers registered', { socketId: this.socket.id })
  }

  /**
   * Handle room creation
   */
  private handleRoomCreate(): void {
    logger.info('Room creation requested', { socketId: this.socket.id })

    try {
      const roomId = this.roomStore.generateRoomId()
      const room = this.roomStore.createRoom(roomId, this.socket.id)

      this.socket.emit('room:created', { roomId })

      logger.info('Room creation successful', {
        roomId,
        hostId: this.socket.id,
        totalRooms: this.roomStore.getRoomCount(),
      })
    } catch (error) {
      logger.error('Room creation failed', {
        socketId: this.socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      this.socket.emit('room:error', { message: 'Could not create room, try again.' })
    }
  }

  /**
   * Handle room existence check
   */
  private handleRoomExists({ roomId }: { roomId: string }): void {
    {
      logger.info('Room existence check requested', { socketId: this.socket.id, roomId })
      const exists = this.roomStore.getRoom(roomId) !== undefined
      this.socket.emit('room:exists', { roomId, exists })
    }
  }

  /**
   * Handle player joining a room
   */
  private handleRoomJoin({ roomId, playerName }: { roomId: string; playerName: string }): void {
    logger.info('Room join requested', {
      socketId: this.socket.id,
      roomId,
      playerName,
    })

    // Check if room exists
    const room = this.roomStore.getRoom(roomId)
    if (!room) {
      logger.warn('Room not found', { roomId, socketId: this.socket.id })
      this.socket.emit('room:error', { message: 'Room not found' })
      return
    }

    const existingPlayer = this.playerManager.findPlayerByName(room, playerName)

    // Player already connected with same socket ID - ignore
    if (existingPlayer && existingPlayer.isConnected && existingPlayer.id === this.socket.id) {
      logger.debug('Player already connected, ignoring duplicate join', {
        roomId,
        playerName,
        socketId: this.socket.id,
      })
      return
    }

    // Reconnection: player exists but is disconnected
    if (existingPlayer && !existingPlayer.isConnected) {
      this.playerManager.reconnectPlayer(room, existingPlayer, this.socket.id)
      this.socket.join(roomId)
      this.playerManager.broadcastRoomUpdate(room)
      return
    }

    // Player name taken by connected player with different socket ID
    if (existingPlayer && existingPlayer.isConnected && existingPlayer.id !== this.socket.id) {
      logger.warn('Player name already taken', {
        roomId,
        playerName,
        existingSocketId: existingPlayer.id,
        newSocketId: this.socket.id,
      })
      this.socket.emit('room:error', { message: 'Player name already taken' })
      return
    }

    // New player joining
    this.playerManager.addPlayer(room, this.socket.id, playerName)
    this.socket.join(roomId)
    this.playerManager.broadcastRoomUpdate(room)

    logger.info('Player joined successfully', {
      roomId,
      playerName,
      socketId: this.socket.id,
      playerCount: room.players.size,
    })
  }

  /**
   * Handle player leaving a room
   */
  private handleRoomLeave(): void {
    logger.info('Room leave requested', { socketId: this.socket.id })

    const roomsWithPlayer = this.roomStore.findAllRoomsByPlayerId(this.socket.id)

    for (const { roomId, room } of roomsWithPlayer) {
      // Disconnect player
      this.playerManager.disconnectPlayer(room, this.socket.id)

      // Handle host leaving
      const result = this.hostManager.handleHostLeaving(room, this.socket.id)

      if (result === 'room_deleted') {
        this.roomStore.deleteRoom(roomId)
        continue
      }

      // Broadcast update
      this.playerManager.broadcastRoomUpdate(room)
    }

    const roomWithPlayerAsHostAndNoPlayers = this.roomStore.findRoomByHostIdWithNoPlayers(this.socket.id)
    if (roomWithPlayerAsHostAndNoPlayers) {
      this.roomStore.deleteRoom(roomWithPlayerAsHostAndNoPlayers.roomId)
    }
  }

  /**
   * Handle game start
   */
  private handleGameStart({
    roomId,
    playlist,
    numberOfTracks,
  }: {
    roomId: string
    playlist: string
    numberOfTracks: number
  }): void {
    logger.info('Game start requested', {
      socketId: this.socket.id,
      roomId,
      playlist,
      numberOfTracks,
    })

    const room = this.roomStore.getRoom(roomId)
    if (!room) {
      logger.warn('Game start failed - room not found', { roomId })
      return
    }

    // Verify the requester is the host
    if (!this.hostManager.isHost(room, this.socket.id)) {
      logger.warn('Game start denied - not host', {
        roomId,
        socketId: this.socket.id,
        hostId: room.hostId,
      })
      this.socket.emit('room:error', { message: 'Only the host can start the game' })
      return
    }

    const playlistData = this.gameManager.getPlaylistByName(playlist)
    if (!playlistData) {
      logger.warn('Game start failed - playlist not found', { roomId, playlist })
      this.socket.emit('room:error', { message: 'Playlist not found' })
      return
    }

    this.gameManager.startGame(room, playlistData, numberOfTracks)
  }

  /**
   * Handle player guess
   */
  private handleGameGuess({ roomId, guess }: { roomId: string; guess: string }): void {
    logger.debug('Guess received', {
      socketId: this.socket.id,
      roomId,
      guess,
    })

    const room = this.roomStore.getRoom(roomId)
    if (!room) {
      logger.warn('Guess failed - room not found', { roomId })
      return
    }

    const result = this.gameManager.processGuess(room, this.socket.id, guess)
    if (result) {
      this.playerManager.broadcastRoomUpdate(room)
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(): void {
    logger.info('Socket disconnected', { socketId: this.socket.id })

    const roomsWithPlayer = this.roomStore.findAllRoomsByPlayerId(this.socket.id)

    for (const { roomId, room } of roomsWithPlayer) {
      // Disconnect player
      this.playerManager.disconnectPlayer(room, this.socket.id)

      // Handle host leaving
      const result = this.hostManager.handleHostLeaving(room, this.socket.id)

      if (result === 'room_deleted') {
        this.roomStore.deleteRoom(roomId)
        logger.info('Room deleted after last player disconnect', {
          roomId,
          totalRooms: this.roomStore.getRoomCount(),
        })
        continue
      }

      // Broadcast update
      this.playerManager.broadcastRoomUpdate(room)
    }

    const roomWithPlayerAsHostAndNoPlayers = this.roomStore.findRoomByHostIdWithNoPlayers(this.socket.id)
    if (roomWithPlayerAsHostAndNoPlayers) {
      this.roomStore.deleteRoom(roomWithPlayerAsHostAndNoPlayers.roomId)
    }
  }
}
