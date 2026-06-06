import { RotateCcw, SkipBack, SkipForward } from 'lucide-react'

interface PlaybackControlsProps {
  current: number
  prevDisabled?: boolean
  nextDisabled?: boolean
  resetDisabled?: boolean
  onNext: () => void
  onPrev: () => void
  onReset: () => void
}

export function PlaybackControls({
  current,
  prevDisabled = false,
  nextDisabled = false,
  resetDisabled = false,
  onNext,
  onPrev,
  onReset,
}: PlaybackControlsProps) {
  return (
    <div className="playback-console flex w-fit items-center gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={prevDisabled || current <= 0}
        className="inline-flex h-14 w-16 items-center justify-center rounded-[1.35rem] border border-slate-700/55 bg-slate-950/50 text-slate-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="上一步"
      >
        <SkipBack className="h-7 w-7" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex h-14 w-16 items-center justify-center rounded-[1.35rem] border border-slate-700/55 bg-slate-950/50 text-slate-100 transition hover:border-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="下一步"
      >
        <SkipForward className="h-7 w-7" />
      </button>
      <button
        type="button"
        onClick={onReset}
        disabled={resetDisabled}
        className="inline-flex h-14 w-16 items-center justify-center rounded-[1.35rem] border border-slate-700/55 bg-slate-950/50 text-slate-100 transition hover:border-rose-300/60 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="重置"
      >
        <RotateCcw className="h-7 w-7" />
      </button>
    </div>
  )
}
