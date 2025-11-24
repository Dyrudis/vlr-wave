class Queue {
  private tracks: track[]
  private currentIndex: number

  constructor(playlist: Playlist, totalTracks?: number) {
    if (totalTracks === undefined || totalTracks <= 0 || totalTracks > playlist.tracks.length) {
      totalTracks = playlist.tracks.length
    }

    const shuffledTracks = playlist.tracks
      .map((track) => ({ track, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ track }) => track)
    this.tracks = totalTracks ? shuffledTracks.slice(0, totalTracks) : shuffledTracks

    this.tracks.forEach((track) => (track.file = `${playlist.root}${track.file}`))

    this.currentIndex = -1
  }

  nextTrack(): track | null {
    this.currentIndex++
    if (this.currentIndex < this.tracks.length) {
      return this.tracks[this.currentIndex]!
    }
    return null
  }

  hasNext(): boolean {
    return this.currentIndex + 1 < this.tracks.length
  }

  reset(): void {
    this.currentIndex = -1
  }

  getTracks(): track[] {
    return this.tracks
  }

  getCurrentTrack(): track | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.tracks.length) {
      return this.tracks[this.currentIndex]!
    }
    return null
  }
}

export default Queue
