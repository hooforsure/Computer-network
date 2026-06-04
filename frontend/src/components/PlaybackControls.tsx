import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'

interface PlaybackControlsProps {
  current: number
  total: number
  playing: boolean
  speed?: number
  playDisabled?: boolean
  nextDisabled?: boolean
  onPlayToggle: () => void
  onNext: () => void
  onPrev: () => void
  onReset: () => void
  onSpeedChange?: (speed: number) => void
}

export function PlaybackControls({
  current,
  total,
  playing,
  playDisabled = false,
  nextDisabled = false,
  onPlayToggle,
  onNext,
  onPrev,
  onReset,
}: PlaybackControlsProps) {
  return (
    <div className="glass-panel flex w-fit items-center gap-2 rounded-2xl p-2.5">
      <button
        type="button"
        onClick={onPrev}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-950/50 text-slate-100 transition hover:border-cyan-300/60"
        aria-label="上一步"
      >
        <SkipBack className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onPlayToggle}
        disabled={playDisabled}
        className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {playing ? '暂停' : '播放'}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-950/50 text-slate-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="下一步"
      >
        <SkipForward className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-950/50 text-slate-100 transition hover:border-rose-300/60"
        aria-label="重置"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <span className="font-mono-data ml-2 rounded-xl border border-slate-700/45 bg-slate-950/45 px-3 py-2 text-xs text-slate-300">
        {String(current + 1).padStart(2, '0')} / {String(Math.max(total, 1)).padStart(2, '0')}
      </span>
    </div>
  )
}
