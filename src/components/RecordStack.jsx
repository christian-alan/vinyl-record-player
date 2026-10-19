import { fmt } from '../lib/geometry'

/**
 * The pile of sleeves under the deck. Each record pokes out of its sleeve; drag it out
 * onto the platter, or tap the sleeve to have it placed for you.
 * The engine toggles the `out` / `instant` classes on each slot directly, so the hand-off
 * between the disc in the sleeve and the floating disc happens in the same frame.
 */
export default function RecordStack({ deck, records, snap }) {
  return (
    <section aria-label="Record stack" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[.08em] text-muted uppercase">Your records</span>
        <span className="font-mono text-xs text-muted">Drag one onto the platter</span>
      </div>

      <div className="flex items-end justify-center pt-1.5 [--s:clamp(96px,21vw,184px)] max-sm:[--s:25vw]">
        {records.map((rec, i) => {
          const art = snap.art[i]
          const onPlatter = snap.current === i
          return (
            <div
              key={rec.id}
              ref={deck.ref('slot', i)}
              style={{ '--r': ['-2deg', '1.2deg', '-1deg', '2.2deg'][i] }}
              className="group relative w-(--s) flex-none touch-none pt-[calc(var(--s)*0.34)] select-none rotate-(--r) transition-[translate] duration-250 not-first:ml-[calc(var(--s)*-0.1)] hover:z-10 hover:-translate-y-1 focus-within:z-10"
              onPointerDown={(e) => deck.onSleeveDown(i, e)}
              onPointerMove={(e) => deck.onSleeveMove(i, e)}
              onPointerUp={(e) => deck.onSleeveUp(i, e)}
              onPointerCancel={(e) => deck.onSleeveUp(i, e)}
            >
              <div className="absolute top-0 left-[4%] z-0 aspect-square w-[92%] rounded-full drop-shadow-[0_4px_6px_rgba(0,0,0,.25)] transition-[translate,opacity] duration-350 ease-[cubic-bezier(.3,.7,.3,1)] group-hover:-translate-y-[10%] group-[.instant]:transition-none group-[.out]:translate-y-[24%] group-[.out]:opacity-0">
                {art.img && <img src={art.img} alt="" draggable="false" className="block size-full rounded-full" />}
              </div>

              <button
                type="button"
                aria-label={`${rec.title} by ${rec.artist}. ${onPlatter ? 'Press to put it back in its sleeve.' : 'Press to put it on the turntable, or drag it onto the platter.'}`}
                onKeyDown={(e) => deck.onSleeveKey(i, e)}
                className="relative z-[1] block aspect-square w-full cursor-grab overflow-hidden rounded-[3px] bg-panel shadow-[0_1px_0_var(--sleeve-edge),0_10px_22px_-10px_var(--shadow)] group-[.out]:cursor-pointer after:absolute after:inset-x-0 after:top-0 after:h-[8%] after:bg-linear-to-b after:from-black/30 after:to-transparent after:content-[''] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-accent-ink"
              >
                {art.cover && <img src={art.cover} alt="" draggable="false" className="block size-full" />}
              </button>

              <div className="flex min-w-0 flex-col gap-0.5 px-0.5 pt-2">
                <b className="truncate text-[15px] font-medium max-sm:text-[13px]">{rec.title}</b>
                <span className={`truncate font-mono text-[11px] ${onPlatter ? 'text-accent-ink' : 'text-muted'}`}>
                  {onPlatter ? 'On the platter' : `${rec.artist} · ${fmt(rec.len)}`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
