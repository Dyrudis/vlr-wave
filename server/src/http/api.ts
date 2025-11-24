import { Router } from 'express'
import { roomStore } from '../socket/roomManager'
import path from 'path'
import fs from 'fs'

const router = Router()

// Map of obfuscated IDs to actual track filenames
const trackMap = new Map<string, string>()
let trackIdCounter = 1

/**
 * Get or create an obfuscated ID for a track
 */
export function getTrackId(filename: string): string {
  // Check if we already have an ID for this track
  for (const [id, name] of trackMap.entries()) {
    if (name === filename) return id
  }
  
  // Create a new obfuscated ID
  const id = Buffer.from(`track_${trackIdCounter}_${Date.now()}`).toString('base64').replace(/[+/=]/g, '')
  trackMap.set(id, filename)
  trackIdCounter++
  return id
}

// Serve audio files with obfuscated IDs
router.get('/track/:id', (req, res) => {
  const trackFilename = trackMap.get(req.params.id)
  
  if (!trackFilename) {
    return res.status(404).json({ error: 'Track not found' })
  }
  
  const audioPath = path.join(__dirname, '../../audio', trackFilename)
  
  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ error: 'Track file not found' })
  }
  
  res.sendFile(audioPath)
})

router.get('/', (req, res) => {
  res.send('API is working')
})

router.get('/rooms/:roomId', (req, res) => {
  if (roomStore.hasRoom(req.params.roomId)) {
    res.json(true)
  } else {
    res.status(404).json(false)
  }
})

export default router
