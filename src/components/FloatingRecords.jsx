/**
 * One fixed-position disc per record. While a record is in your hand or gliding between
 * sleeve and platter it lives here, above everything; the engine positions it each frame.
 */
export default function FloatingRecords({ deck, records, snap }) {
  return records.map((rec, i) => (
    <img
      key={rec.id}
      ref={deck.ref('float', i)}
      src={snap.art[i].img || undefined}
      alt=""
      hidden
      draggable="false"
      className="float"
    />
  ))
}
