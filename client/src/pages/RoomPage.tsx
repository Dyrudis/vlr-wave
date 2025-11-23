import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSocket } from '@/context/SocketContext'
import type { Player } from '@/types/player'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UnplugIcon, UserIcon, UserStarIcon } from 'lucide-react'
import { toast } from 'sonner'

const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export default function RoomPage() {
  const socket = useSocket()
  const params = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState(() => localStorage.getItem('name') || '')

  const roomId = params.roomId as string

  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    fetch(`${URL}/api/rooms/${roomId}`)
      .then((res) => {
        if (!res.ok) {
          toast.error(`Room "${roomId}" does not exist`)
          console.error(`Room "${roomId}" does not exist`)
          navigate('/')
        }
      })
      .catch((err) => {
        toast.error('An unexpected error occurred, please try again later')
        console.error('Error checking room existence', err)
        navigate('/')
      })

    if (!socket) return

    socket.on('room:update', (data) => {
      console.log('Room update received', data)
      setPlayers(data.players)
    })

    socket.on('room:error', ({ message }) => {
      toast.error(message)
      console.error(message)
      navigate('/')
    })

    return () => {
      socket.off('room:update')
      socket.off('room:error')
    }
  }, [socket, roomId, name, navigate])

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Joining room', roomId, 'as', name)
    socket.emit('room:join', { roomId, playerName: name })
  }

  const leaveRoom = () => {
    console.log('Leaving room', roomId)
    socket.emit('room:leave')
    navigate('/')
  }

  const isConnected = players.find((p) => p.name === name)?.isConnected

  return (
    <main className="flex flex-col gap-4 p-8 max-w-2xs mx-auto">
      <h1 className="text-2xl font-bold">Room: {roomId}</h1>
      {isConnected ? (
        <>
          <h2 className="text-md">Players list</h2>
          <ul className="flex flex-col gap-2">
            {players.map((p) => (
              <li key={p.id} className="border p-2 rounded flex justify-between items-center">
                <p>
                  {p.isConnected ? '' : <UnplugIcon className="inline mr-2 text-destructive" size={24} />}
                  {p.isHost ? (
                    <UserStarIcon className="inline mr-2" size={24} />
                  ) : (
                    <UserIcon className="inline mr-2" size={24} />
                  )}
                  {p.name}
                </p>
                <p>{p.score} pts</p>
              </li>
            ))}
          </ul>
          <Button onClick={leaveRoom} variant={'destructive'}>
            Leave room
          </Button>
        </>
      ) : (
        <>
          <h2 className="text-md">Enter your name to join</h2>
          <form className="flex w-full items-center gap-2" onSubmit={joinRoom}>
            <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Button type="submit" variant={'outline'}>
              Enter
            </Button>
          </form>
          <Button onClick={leaveRoom} variant={'destructive'}>
            Back
          </Button>
        </>
      )}
    </main>
  )
}
