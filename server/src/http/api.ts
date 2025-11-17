import { Router } from 'express'
import { roomStore } from '../socket/roomManager'

const router = Router()

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

module.exports = router
