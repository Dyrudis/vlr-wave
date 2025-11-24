import { Server } from 'socket.io'
import Logger from '../utils/logger'
import { getTrackId } from '../http/api'
import Queue from '../utils/queue'

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
  async startGame(room: Room, playlist: Playlist, numberOfTracks: number): Promise<void> {
    // Create a random queue of tracks from the playlist
    const queue = new Queue(playlist, numberOfTracks)

    while (queue.hasNext()) {
      const track = queue.nextTrack()
      if (track) {
        await this.playTrack(room, track)
      }
    }

    logger.info('No more tracks to play', { roomId: room.id })
  }

  /**
   * Play a specific track in the room
   */
  private async playTrack(room: Room, track: track): Promise<void> {
    // Generate obfuscated ID for the track
    const trackId = getTrackId(track.file)
    const trackUrl = `/api/track/${trackId}`

    room.currentTrack = track.title

    logger.info('Playing track', {
      roomId: room.id,
      playerCount: room.players.size,
      track: track.title,
    })

    this.io.to(room.id).emit('game:track', {
      trackUrl,
      timestamp: Date.now(),
    })

    // Wait 15 seconds
    await new Promise((resolve) => setTimeout(resolve, 15000))

    return
  }

  /**
   * Process a player's guess
   */
  processGuess(room: Room, playerId: string, guess: string): { player: Player; scoreChange: number } | undefined {
    const player = room.players.get(playerId)
    if (!player) {
      logger.warn('Guess from non-existent player', {
        roomId: room.id,
        playerId,
      })
      return undefined
    }

    const correctAnswer = room.currentTrack || ''
    // 80% match required
    const isCorrect = guess.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

    // Calculate score change
    const scoreChange = isCorrect ? 10 : 0
    player.score += scoreChange

    room.players.set(playerId, player)

    logger.info('Guess processed', {
      roomId: room.id,
      playerId,
      playerName: player.name,
      guess,
      correct: isCorrect,
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

  /**
   * Get playlist by name
   * @param name Playlist name
   * @returns Playlist or undefined
   */
  getPlaylistByName(name: string): Playlist | undefined {
    const playlist = require(`../../playlists/${name}`) as Playlist
    return playlist
  }
}
