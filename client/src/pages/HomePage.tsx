import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSocket } from '@/context/SocketContext'
import { Button } from '@/components/ui/button'
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { toast } from 'sonner'

const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export default function HomePage() {
  const socket = useSocket()
  const navigate = useNavigate()
  const [roomId, setRoomId] = useState('')

  useEffect(() => {
    if (!socket) return

    socket.on('room:created', ({ roomId }) => {
      navigate(`/${roomId}`)
    })

    return () => {
      socket.off('room:created')
    }
  }, [socket, navigate])

  const createRoom = () => {
    socket.emit('room:create')
  }

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    fetch(`${URL}/api/rooms/${roomId}`)
      .then((res) => {
        if (res.ok) {
          navigate(`/${roomId}`)
        } else {
          toast.error(`Room "${roomId}" does not exist`)
        }
      })
      .catch((err) => {
        toast.error('An unexpected error occurred, please try again later')
        console.error('Error checking room existence', err)
      })
  }

  return (
    <main className="flex flex-col gap-4 p-8 max-w-2xs mx-auto">
      <form className="flex w-full items-center gap-2" onSubmit={joinRoom}>
        <InputOTP minLength={4} maxLength={4} required value={roomId} onChange={(e) => setRoomId(e)} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
        <Button type="submit" className="w-full" variant="outline">
          Join
        </Button>
      </form>
      <Button onClick={createRoom}>New room</Button>
    </main>
  )
}
