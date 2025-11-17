import { Server } from 'socket.io'
import Logger from '../utils/logger'

const logger = new Logger('GameManager')

/**
 * Manages game logic and track handling
 */
export class GameManager {
  private io: Server

  constructor(io: Server) {
    this.io = io
  }

  /**
   * Start a game round with a new track
   */
  startGame(room: Room, track: string): void {
    room.currentTrack = track

    logger.info('Game started', {
      roomId: room.id,
      track,
      playerCount: room.players.size,
    })

    this.io.to(room.id).emit('game:track', {
      track,
      timestamp: Date.now(),
    })
  }

  /**
   * Process a player's guess
   */
  processGuess(
    room: Room,
    playerId: string,
    guess: { correct: boolean; answer?: string }
  ): { player: Player; scoreChange: number } | undefined {
    const player = room.players.get(playerId)
    if (!player) {
      logger.warn('Guess from non-existent player', {
        roomId: room.id,
        playerId,
      })
      return undefined
    }

    // Calculate score change
    const scoreChange = guess.correct ? 10 : 0
    player.score += scoreChange

    room.players.set(playerId, player)

    logger.info('Guess processed', {
      roomId: room.id,
      playerId,
      playerName: player.name,
      correct: guess.correct,
      answer: guess.answer,
      scoreChange,
      newScore: player.score,
    })

    return { player, scoreChange }
  }

  /**
   * End the current game round
   */
  endRound(room: Room): void {
    logger.info('Game round ended', {
      roomId: room.id,
      track: room.currentTrack,
    })

    delete room.currentTrack

    this.io.to(room.id).emit('game:round_ended', {
      timestamp: Date.now(),
    })
  }

  /**
   * Reset all player scores in a room
   */
  resetScores(room: Room): void {
    for (const player of room.players.values()) {
      player.score = 0
      room.players.set(player.id, player)
    }

    logger.info('All scores reset', {
      roomId: room.id,
      playerCount: room.players.size,
    })
  }

  /**
   * Get current game state
   */
  getGameState(room: Room): {
    isPlaying: boolean
    currentTrack?: string
    players: Player[]
  } {
    const state: {
      isPlaying: boolean
      currentTrack?: string
      players: Player[]
    } = {
      isPlaying: !!room.currentTrack,
      players: Array.from(room.players.values()),
    }

    if (room.currentTrack) {
      state.currentTrack = room.currentTrack
    }

    return state
  }
}
