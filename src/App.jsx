import { useEffect, useState, useSyncExternalStore } from 'react'
import Turntable from './components/Turntable'
import RecordStack from './components/RecordStack'
import FloatingRecords from './components/FloatingRecords'
import { Deck } from './lib/deck'
import { RECORDS } from './lib/records'

function PressingStatus({ snap }) {
  const total = RECORDS.length
  const done = snap.pressed === total
  const text = done
    ? `${total} records ready`
    : snap.waiting
      ? `Pressing ${RECORDS[snap.current].title}…`
      : `Pressing records ${snap.pressed}/${total}`
  return (
    <div className="inline-flex items-center gap-2 font-mono text-xs text-muted" aria-live="polite">
      <i className={`inline-block size-[7px] rounded-full ${done ? 'bg-accent' : 'animate-pulse bg-muted'}`} />
      <span>{text}</span>
    </div>
  )
}

export default function App() {
  const [deck] = useState(() => new Deck(RECORDS))
  const snap = useSyncExternalStore(deck.subscribe, deck.getSnapshot)

  useEffect(() => {
    deck.start()
    return () => deck.stop()
  }, [deck])

  return (
    <main className="min-h-full overflow-x-hidden bg-ground font-display text-ink antialiased">
      <div className="mx-auto flex max-w-[900px] flex-col gap-[18px] pt-6 pr-[max(16px,env(safe-area-inset-right))] pb-14 pl-[max(16px,env(safe-area-inset-left))]">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-[-.01em]">
            Spindle
            <small className="ml-2.5 font-mono text-xs font-normal tracking-[.04em] text-muted">TT‑1 · quartz direct drive</small>
          </h1>
          <PressingStatus snap={snap} />
        </header>

        <Turntable deck={deck} />
        <RecordStack deck={deck} records={RECORDS} snap={snap} />
      </div>

      <FloatingRecords deck={deck} records={RECORDS} snap={snap} />
    </main>
  )
}
