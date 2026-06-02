import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'

interface PlaybackControlsProps {
  current: number
  total: number
  playing: boolean
  speed: number
  onPlayToggle: () => void
  onNext: () => void
  onPrev: () => void
  onReset: () => void
  onSpeedChange: (speed: number) => void
}

export function PlaybackControls({
  current,
  total,
  playing,
  speed,
  onPlayToggle,
  onNext,
  onPrev,
  onReset,
  onSpeedChange,
}: PlaybackControlsProps) {
  return (
    <div className="glass-panel flex flex-wrap items-center gap-2 rounded-2xl p-3">
      <button
        type="button"
        onClick={onPrev}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-950/50 text-slate-100 transition hover:border-cyan-300/60"
        aria-label="Previous step"
      >
        <SkipBack className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onPlayToggle}
        className="inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {playing ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        onClick={onNext}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-950/50 text-slate-100 transition hover:border-cyan-300/60"
        aria-label="Next step"
      >
        <SkipForward className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-950/50 text-slate-100 transition hover:border-rose-300/60"
        aria-label="Reset simulation"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <div className="ml-1 flex items-center gap-3">
        <span className="font-mono-data text-xs text-slate-400">
          {String(current + 1).padStart(2, '0')} / {String(Math.max(total, 1)).padStart(2, '0')}
        </span>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Speed
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.25"
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            className="w-24 accent-cyan-300"
          />
          <span className="font-mono-data w-8 text-cyan-100">{speed.toFixed(2)}x</span>
        </label>
      </div>
    </div>
  )
}
