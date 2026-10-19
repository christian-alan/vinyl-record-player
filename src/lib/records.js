// The four records in the stack. Each one is a single side with one generated track.
// `compose` in music.js is picked by index, so keep the order in sync.

export const LEAD_IN = 1.0 // seconds of silent groove before the music starts
const RUN_OUT = 2.2 // tail after the last note

export const RECORDS = [
  {
    id: 'lantern',
    title: 'Lantern',
    artist: 'Ora Field',
    bpm: 84,
    bars: 18,
    seed: 21,
    vinyl: { base: [15, 15, 16], lift: [4, 20], label: '#EE5A2B', ink: '#FFF7F2' },
    cover: { bg: '#EFE6D6', a: '#EE5A2B', b: '#25211E' },
  },
  {
    id: 'low-tide',
    title: 'Low Tide',
    artist: 'Harbour Club',
    bpm: 70,
    bars: 14,
    seed: 5,
    vinyl: { base: [30, 54, 88], lift: [6, 30], label: '#DCE7F0', ink: '#1F3A5A', clear: true },
    cover: { bg: '#1F3A5A', a: '#DCE7F0', b: '#7FA6C9' },
  },
  {
    id: 'afterglow',
    title: 'Afterglow',
    artist: 'Nightjar',
    bpm: 96,
    bars: 20,
    seed: 99,
    vinyl: { base: [15, 15, 16], lift: [4, 20], label: '#F2A7B8', ink: '#3A1626' },
    cover: { bg: '#F4C9B6', a: '#E2476A', b: '#3A1626' },
  },
  {
    id: 'night-bus',
    title: 'Night Bus',
    artist: 'Tram Four',
    bpm: 88,
    bars: 18,
    seed: 55,
    vinyl: { base: [22, 52, 42], lift: [6, 26], label: '#F2C230', ink: '#1B1B1B', marble: '#4E8F73' },
    cover: { bg: '#151618', a: '#F2C230', b: '#3B3D42' },
  },
].map((r, i) => {
  const len = (r.bars * 240) / r.bpm
  return { ...r, index: i, start: LEAD_IN, len, end: LEAD_IN + len, duration: LEAD_IN + len + RUN_OUT }
})
