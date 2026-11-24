// Display-only details (authors and spine colours). The backend owns the
// book list and read status; this just decorates it.
// Spine colours are tones of the WebVeda indigo / navy palette.
export const BOOK_META = {
  'the-hobbit': { author: 'J. R. R. Tolkien', spine: '#4353cf' },
  matilda: { author: 'Roald Dahl', spine: '#7d88e0' },
  'the-secret-garden': { author: 'Frances Hodgson Burnett', spine: '#232c6e' },
  'the-story-of-my-life': { author: 'Helen Keller', spine: '#08258c' },
  'a-brief-history-of-time': { author: 'Stephen Hawking', spine: '#4353cf' },
  'the-diary-of-a-young-girl': { author: 'Anne Frank', spine: '#9ea1b8' },
};

export const LIST_STYLES = {
  fiction: {
    tagline: 'Stories and adventures',
    icon: 'sparkle',
    iconTile: 'bg-brand-soft text-brand',
    bar: 'bg-brand',
    chip: 'bg-brand-soft text-brand',
    check: 'bg-brand border-brand',
    ring: 'peer-focus-visible:ring-brand/50',
    readRow: 'border-brand-tint bg-brand-soft/70',
  },
  nonfiction: {
    tagline: 'True stories and big ideas',
    icon: 'globe',
    iconTile: 'bg-navy/10 text-navy',
    bar: 'bg-navy',
    chip: 'bg-navy/10 text-navy',
    check: 'bg-navy border-navy',
    ring: 'peer-focus-visible:ring-navy/40',
    readRow: 'border-navy/20 bg-navy/5',
  },
};
