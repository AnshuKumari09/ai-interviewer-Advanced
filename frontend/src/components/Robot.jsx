export default function Robot({ className = '' }) {
  return (
    <svg viewBox="0 0 240 280" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* shadow */}
      <ellipse cx="120" cy="266" rx="52" ry="8" fill="#6366f1" opacity="0.2" />
      {/* antenna */}
      <line x1="120" y1="22" x2="120" y2="46" stroke="#a5b4fc" strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="16" r="7" fill="#6366f1" />
      {/* ears */}
      <circle cx="52" cy="92" r="13" fill="#6366f1" />
      <circle cx="188" cy="92" r="13" fill="#6366f1" />
      {/* head */}
      <rect x="60" y="46" width="120" height="94" rx="38" fill="#fff" stroke="#c7d2fe" strokeWidth="3" />
      <rect x="76" y="62" width="88" height="62" rx="26" fill="#111827" />
      <ellipse cx="103" cy="90" rx="8" ry="10" fill="#22d3ee" />
      <ellipse cx="137" cy="90" rx="8" ry="10" fill="#22d3ee" />
      <path d="M108 108 Q120 117 132 108" stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round" />
      {/* neck */}
      <rect x="105" y="140" width="30" height="12" rx="4" fill="#a5b4fc" />
      {/* body */}
      <rect x="70" y="150" width="100" height="98" rx="34" fill="#fff" stroke="#c7d2fe" strokeWidth="3" />
      <circle cx="120" cy="196" r="16" fill="#4f46e5" />
      <circle cx="120" cy="196" r="7" fill="#fff" opacity="0.9" />
      {/* left arm */}
      <rect x="40" y="166" width="26" height="62" rx="13" fill="#e0e7ff" stroke="#c7d2fe" strokeWidth="2" />
      {/* right arm (waving) */}
      <g transform="rotate(-35 186 172)">
        <rect x="174" y="160" width="26" height="62" rx="13" fill="#e0e7ff" stroke="#c7d2fe" strokeWidth="2" />
      </g>
    </svg>
  )
}