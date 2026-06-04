import { Music, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type AudioState = 'idle' | 'playing' | 'blocked' | 'muted'

export function GlobalAudioControl() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const previousVolumeRef = useRef(0.34)
  const [state, setState] = useState<AudioState>('idle')
  const [volume, setVolume] = useState(0.34)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.loop = true
    audio
      .play()
      .then(() => setState('playing'))
      .catch(() => setState('blocked'))
  }, [])

  function activateAudio() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = false
    audio.volume = volume
    void audio.play().then(() => setState('playing')).catch(() => setState('blocked'))
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return

    if (audio.muted || volume === 0) {
      const restored = previousVolumeRef.current || 0.34
      audio.muted = false
      audio.volume = restored
      setVolume(restored)
      setState('playing')
      void audio.play().catch(() => setState('blocked'))
      return
    }

    previousVolumeRef.current = volume
    audio.muted = true
    setState('muted')
  }

  function changeVolume(nextVolume: number) {
    const normalized = Math.min(1, Math.max(0, nextVolume))
    const audio = audioRef.current
    setVolume(normalized)

    if (!audio) return
    audio.volume = normalized
    audio.muted = normalized === 0

    if (normalized > 0) {
      previousVolumeRef.current = normalized
      void audio.play().then(() => setState('playing')).catch(() => setState('blocked'))
    } else {
      setState('muted')
    }
  }

  const blocked = state === 'blocked' || state === 'idle'
  const muted = state === 'muted' || volume === 0

  return (
    <div className="global-audio-control fixed right-5 top-5 z-[80] flex items-center gap-2">
      <audio ref={audioRef} src="/audio/worry.mp3" preload="auto" />
      {blocked ? (
        <button
          type="button"
          onClick={activateAudio}
          className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/60"
        >
          <Music className="h-4 w-4" />
          Activate soundtrack
        </button>
      ) : (
        <div className="glass-panel flex items-center gap-3 rounded-full px-3 py-2 text-cyan-100">
          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/20 bg-slate-950/40 transition hover:border-cyan-300/60"
            aria-label={muted ? 'Unmute soundtrack' : 'Mute soundtrack'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <label className="sr-only" htmlFor="global-audio-volume">
            Soundtrack volume
          </label>
          <input
            id="global-audio-volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            className="audio-volume-slider"
          />
        </div>
      )}
    </div>
  )
}
