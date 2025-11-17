type Room = {
  id: string
  players: Map<string, Player>
  hostId: string
  currentTrack?: string
}
