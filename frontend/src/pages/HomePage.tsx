import { ArrowRight, Atom, BookOpen, Music, Network, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { GatewayScene } from '../components/GatewayScene'
import { cn } from '../lib/classNames'

gsap.registerPlugin(ScrollTrigger)

const entries = [
  {
    title: 'Protocol Lab',
    path: '/protocol-lab',
    icon: Atom,
    accent: 'cyan',
    eyebrow: 'DNS + TCP',
    description: 'Input a domain or TCP sequence numbers, then step through packet movement, cache updates, and state transitions.',
  },
  {
    title: 'Network Scenario',
    path: '/scenario',
    icon: Network,
    accent: 'amber',
    eyebrow: 'H1 -> www.abc.com',
    description: 'Watch ARP, DNS, TCP, HTTP preparation, switch learning, and routing decisions unfold in one continuous scene.',
  },
  {
    title: 'Knowledge Atlas',
    path: '/knowledge',
    icon: BookOpen,
    accent: 'emerald',
    eyebrow: 'TCP/IP five layers',
    description: 'Explore a graph of layers, protocols, devices, and data units with database-backed knowledge management.',
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [focus, setFocus] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [transitionBoost, setTransitionBoost] = useState(0)
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'blocked' | 'muted'>('idle')

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(
        '.hero-copy',
        { y: 36, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out' },
      )

      entries.forEach((_, index) => {
        ScrollTrigger.create({
          trigger: `.entry-${index}`,
          start: 'top 72%',
          end: 'bottom 36%',
          onEnter: () => setFocus(index),
          onEnterBack: () => setFocus(index),
        })
      })

      ScrollTrigger.create({
        trigger: rootRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.75,
        onUpdate: (self) => setScrollProgress(self.progress),
      })

      gsap.to('.aurora-layer', {
        backgroundPosition: '120% 80%, -20% 20%, 50% 120%',
        ease: 'none',
        scrollTrigger: {
          trigger: rootRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      })

      gsap.fromTo(
        '.entry-card',
        { y: 34, opacity: 0.2 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: '#entries',
            start: 'top 62%',
            end: 'top 18%',
            scrub: 0.65,
          },
        },
      )
    }, rootRef)

    return () => context.revert()
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.34
    audio.loop = true
    audio
      .play()
      .then(() => setAudioState('playing'))
      .catch(() => setAudioState('blocked'))
  }, [])

  function enterModule(path: string, index: number) {
    setFocus(index)
    setTransitioning(true)
    setTransitionBoost(1)
    if (audioRef.current && audioState !== 'playing') {
      void audioRef.current.play().then(() => setAudioState('playing')).catch(() => setAudioState('blocked'))
    }
    gsap.to('.gateway-transition', {
      opacity: 1,
      scale: 1,
      duration: 0.9,
      ease: 'power3.inOut',
      onComplete: () => navigate(path),
    })
  }

  function activateAudio() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = false
    void audio.play().then(() => setAudioState('playing')).catch(() => setAudioState('blocked'))
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setAudioState(audio.muted ? 'muted' : 'playing')
  }

  return (
    <main ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#05070d] text-slate-50">
      <audio ref={audioRef} src="/audio/worry.mp3" preload="auto" />
      <div className="fixed inset-0 z-0">
        <GatewayScene focus={focus} scrollProgress={scrollProgress} transitionBoost={transitionBoost} />
      </div>
      <div className="aurora-layer pointer-events-none fixed inset-0 z-[1] opacity-80" />
      <div className="warp-grid pointer-events-none fixed inset-0 z-[2] opacity-45" />
      <div className="cinematic-rings pointer-events-none fixed inset-0 z-[3]" />
      <div className="comet-lanes pointer-events-none fixed inset-0 z-[4]" />
      <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent,rgba(5,7,13,0.42)_62%,#05070d_100%)]" />
      <div
        className="pointer-events-none fixed left-0 top-0 z-40 h-1 bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.8)]"
        style={{ width: `${Math.max(scrollProgress * 100, 7)}%` }}
      />
      <div className="gateway-transition pointer-events-none fixed inset-0 z-50 scale-75 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.95),rgba(5,7,13,0.95)_42%,#05070d_72%)] opacity-0" />
      <AudioControl state={audioState} onActivate={activateAudio} onToggleMute={toggleMute} />

      <section className="relative z-20 flex min-h-screen items-center px-5 py-24 sm:px-8">
        <div className="hero-copy max-w-4xl">
          <div className="font-mono-data mb-5 text-xs uppercase tracking-[0.45em] text-cyan-200">
            NetVerse Protocol Lab
          </div>
          <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-tight text-white sm:text-7xl">
            From domain to packet, watch the network become visible.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            A cinematic network-practice system where DNS, TCP, integrated web access, and the TCP/IP knowledge atlas become interactive 3D experiments.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => enterModule('/protocol-lab', 0)}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
            >
              <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/60 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
              <span className="relative">Start the lab</span>
              <ArrowRight className="relative h-4 w-4" />
            </button>
            <a
              href="#entries"
              className="inline-flex items-center rounded-full border border-slate-600/60 bg-slate-950/30 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400"
            >
              Explore entries
            </a>
          </div>
        </div>
      </section>

      <section id="entries" className="relative z-20 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-5 py-24 sm:px-8">
        <div className="mb-8">
          <div className="font-mono-data mb-3 text-xs uppercase tracking-[0.4em] text-slate-400">Entry points</div>
          <h2 className="font-display text-3xl font-bold text-white sm:text-5xl">Choose a protocol chamber.</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {entries.map((entry, index) => (
            <EntryCard
              key={entry.title}
              entry={entry}
              index={index}
              active={focus === index}
              disabled={transitioning}
              onFocus={() => setFocus(index)}
              onEnter={() => enterModule(entry.path, index)}
            />
          ))}
        </div>
      </section>

      <section className="relative z-20 mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="font-mono-data mb-3 text-xs uppercase tracking-[0.35em] text-cyan-200">Build rule</div>
          <p className="text-xl leading-9 text-slate-100">
            The backend writes the protocol script. The frontend plays it like a controlled film: every camera move, glow, packet, and state change must map to a real step in the network process.
          </p>
        </div>
      </section>
    </main>
  )
}

function AudioControl({
  state,
  onActivate,
  onToggleMute,
}: {
  state: 'idle' | 'playing' | 'blocked' | 'muted'
  onActivate: () => void
  onToggleMute: () => void
}) {
  const active = state === 'playing'
  const blocked = state === 'blocked' || state === 'idle'

  return (
    <div className="fixed right-5 top-5 z-40 flex items-center gap-2">
      {blocked && (
        <button
          type="button"
          onClick={onActivate}
          className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/60"
        >
          <Music className="h-4 w-4" />
          Activate soundtrack
        </button>
      )}
      {(active || state === 'muted') && (
        <button
          type="button"
          onClick={onToggleMute}
          className="glass-panel inline-flex h-10 w-10 items-center justify-center rounded-full text-cyan-100 transition hover:border-cyan-300/60"
          aria-label={state === 'muted' ? 'Unmute soundtrack' : 'Mute soundtrack'}
        >
          {state === 'muted' ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  )
}

function EntryCard({
  entry,
  index,
  active,
  disabled,
  onFocus,
  onEnter,
}: {
  entry: (typeof entries)[number]
  index: number
  active: boolean
  disabled: boolean
  onFocus: () => void
  onEnter: () => void
}) {
  const Icon = entry.icon
  const accentClasses = useMemo(() => {
    if (entry.accent === 'amber') return 'text-amber-200 border-amber-300/60 bg-amber-300/10'
    if (entry.accent === 'emerald') return 'text-emerald-200 border-emerald-300/60 bg-emerald-300/10'
    return 'text-cyan-200 border-cyan-300/60 bg-cyan-300/10'
  }, [entry.accent])

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={onEnter}
      className={cn(
        `entry-${index} entry-card glass-panel group min-h-80 rounded-3xl p-6 text-left transition duration-300`,
        active ? 'translate-y-[-6px] border-cyan-300/50 shadow-[0_0_60px_rgba(34,211,238,0.12)]' : 'hover:translate-y-[-4px]',
      )}
    >
      <div className={cn('mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl border', accentClasses)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-mono-data mb-3 text-xs uppercase tracking-[0.32em] text-slate-500">{entry.eyebrow}</div>
      <h3 className="font-display text-2xl font-bold text-white">{entry.title}</h3>
      <p className="mt-4 text-sm leading-7 text-slate-300">{entry.description}</p>
      <div className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-cyan-100">
        Enter chamber
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </button>
  )
}
