import { ArrowRight, Atom, BookOpen, Network } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import CurvedLoop from '../components/CurvedLoop'
import FuzzyText from '../components/FuzzyText'
import { GatewayScene } from '../components/GatewayScene'
import GlitchText from '../components/GlitchText'
import ScrollFloat from '../components/ScrollFloat'
import { CircularSignalText, ClickSpark, FadeContent, GlowBorder } from '../components/VisualEffects'
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
  const [focus, setFocus] = useState(0)
  const [transitioning, setTransitioning] = useState(false)

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

  function enterModule(path: string, index: number) {
    setFocus(index)
    setTransitioning(true)
    gsap.to('.gateway-transition', {
      opacity: 1,
      scale: 1,
      duration: 0.9,
      ease: 'power3.inOut',
      onComplete: () => navigate(path),
    })
  }

  return (
    <ClickSpark>
      <main ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#05070d] text-slate-50">
        <div className="fixed inset-0 z-0">
          <GatewayScene focus={focus} transitionBoost={transitioning ? 1 : 0} />
        </div>
        <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle_at_66%_46%,transparent,rgba(5,7,13,0.24)_68%,#05070d_100%)]" />
        <div className="gateway-transition pointer-events-none fixed inset-0 z-50 scale-75 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.95),rgba(5,7,13,0.95)_42%,#05070d_72%)] opacity-0" />

        <section className="relative z-20 flex min-h-screen items-center px-5 py-24 sm:px-8">
          <div className="hero-copy relative max-w-5xl">
            <div className="mb-7 flex items-center gap-5">
              <CircularSignalText />
              <div className="font-mono-data text-xs uppercase tracking-[0.45em] text-cyan-200">
                NetVerse Protocol Lab
              </div>
            </div>
            <FuzzyHeroTitle />
            <FuzzySubtitle />
            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => enterModule('/protocol-lab', 0)}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/70 to-transparent transition duration-700 group-hover:translate-x-[120%]" />
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
        <FadeContent>
          <div className="mb-8">
            <ScrollFloat
              containerClassName="home-scroll-float font-display text-left"
              textClassName="home-scroll-float-text"
              scrollStart="top bottom-=10%"
              scrollEnd="center center"
              animationDuration={0.85}
              stagger={0.025}
            >
              Choose a protocol chamber.
            </ScrollFloat>
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
        </FadeContent>
      </section>

      <section className="relative z-20 mx-auto max-w-5xl px-5 pb-24 sm:px-8">
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="font-mono-data mb-3 text-xs uppercase tracking-[0.35em] text-cyan-200">Build rule</div>
          <p className="text-xl leading-9 text-slate-100">
            The backend writes the protocol script. The frontend plays it like a controlled film: every camera move, glow, packet, and state change must map to a real step in the network process.
          </p>
        </div>
      </section>

      <section className="home-curved-loop relative z-20 overflow-hidden py-8">
        <CurvedLoop
          marqueeText="DNS  TCP  ARP  HTTP  CACHE  PACKET FLOW  FIVE LAYERS  KNOWLEDGE ATLAS  "
          speed={1.15}
          curveAmount={86}
          direction="left"
          interactive
          className="home-curved-loop-text"
        />
      </section>
      </main>
    </ClickSpark>
  )
}

function FuzzyHeroTitle() {
  const lines = ['From domain to', 'packet, watch', 'the network', 'become visible.']

  return (
    <h1 className="hero-signal-title fuzzy-hero-title font-display max-w-5xl text-white">
      <span className="sr-only">From domain to packet, watch the network become visible.</span>
      {lines.map((line) => (
        <span key={line} className="fuzzy-hero-line glitch-fuzzy-line" aria-hidden="true">
          <FuzzyText
            fontSize="clamp(3.8rem, 6.2vw, 7.2rem)"
            fontWeight={800}
            fontFamily='"Sora", ui-sans-serif, system-ui, sans-serif'
            color="#f8fafc"
            baseIntensity={0.14}
            hoverIntensity={0.42}
            fuzzRange={18}
            fps={42}
            direction="horizontal"
            transitionDuration={0.18}
            glitchMode
            glitchInterval={2600}
            glitchDuration={120}
            gradient={['#ffffff', '#e7fbff', '#8ff3ff', '#ffffff']}
            className="fuzzy-hero-canvas"
          >
            {line}
          </FuzzyText>
          <GlitchText speed={0.86} enableShadows enableOnHover={false} className="hero-glitch-text">
            {line}
          </GlitchText>
        </span>
      ))}
    </h1>
  )
}

function FuzzySubtitle() {
  const text =
    'A cinematic network-practice system where DNS, TCP, integrated web access, and the TCP/IP knowledge atlas become interactive 3D experiments.'

  return (
    <div className="subtitle-blur-entry mt-7 max-w-2xl">
      <span className="sr-only">{text}</span>
      <FuzzyText
        fontSize="clamp(1rem, 1.35vw, 1.18rem)"
        fontWeight={500}
        fontFamily='"Manrope", ui-sans-serif, system-ui, sans-serif'
        color="#cbd5e1"
        baseIntensity={0.055}
        hoverIntensity={0.18}
        fuzzRange={8}
        fps={30}
        direction="horizontal"
        transitionDuration={0.2}
        gradient={['#cbd5e1', '#e0fbff', '#93e8f7']}
        className="fuzzy-subtitle-canvas"
      >
        {text}
      </FuzzyText>
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
    <GlowBorder active={active} className={`entry-${index} entry-card rounded-3xl`}>
      <button
        type="button"
        disabled={disabled}
        onMouseEnter={onFocus}
        onFocus={onFocus}
        onClick={onEnter}
        className={cn(
          'glass-panel group min-h-80 w-full rounded-3xl p-6 text-left transition duration-300',
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
    </GlowBorder>
  )
}
