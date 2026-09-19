export const STATUS = {
  matched: { label: 'Matched', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
  partial: { label: 'Partial', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
  missing: { label: 'Missing', dot: 'bg-red-500', chip: 'bg-red-50 text-red-600' },
}

export const CATEGORIES = [
  { key: 'technical', label: 'Technical Skills' },
  { key: 'tools', label: 'Tools & Technologies' },
  { key: 'soft', label: 'Soft Skills' },
]

export const pct = (n) => `${n * 10}%`

export function insights(skills) {
  const strongest = [...skills].filter((s) => s.current > 0).sort((a, b) => b.current - a.current)[0]
  const gaps = [...skills]
    .filter((s) => s.required > s.current)
    .sort((a, b) => b.required - b.current - (a.required - a.current))
    .slice(0, 2)
  return { strongest, gaps }
}