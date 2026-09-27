// Çizgi film karakterleri — saf SVG, dış görsel yok. Her ajanın kendine özgü
// saç, ten, kıyafet rengi ve aksesuarı var. Animasyonlar office.css'te.

const LOOKS = {
  mudur:      { skin: 'var(--skin-2)', hair: '#3b2a20', style: 'short' },
  stratejist: { skin: 'var(--skin-1)', hair: '#7c2d12', style: 'bun' },
  yazar:      { skin: 'var(--skin-3)', hair: '#111827', style: 'curly' },
  tasarimci:  { skin: 'var(--skin-1)', hair: '#f59e0b', style: 'long' },
  yonetmen:   { skin: 'var(--skin-4)', hair: '#111827', style: 'short' },
  sosyal:     { skin: 'var(--skin-2)', hair: '#1d4ed8', style: 'spiky' },
  analist:    { skin: 'var(--skin-3)', hair: '#4b5563', style: 'bob' },
  lokal:      { skin: 'var(--skin-2)', hair: '#9a3412', style: 'long' },
};

const HAIR = {
  short: (c) => `<path d="M34 44 Q36 20 60 20 Q84 20 86 44 Q80 32 60 32 Q40 32 34 44Z" fill="${c}"/>`,
  bun: (c) => `<circle cx="60" cy="16" r="10" fill="${c}"/><path d="M33 46 Q34 20 60 21 Q86 20 87 46 Q78 30 60 31 Q42 30 33 46Z" fill="${c}"/>`,
  curly: (c) => `<g fill="${c}">${[36, 46, 56, 66, 76, 84].map((x, i) => `<circle cx="${x}" cy="${28 + (i % 2) * 3}" r="9"/>`).join('')}</g>`,
  long: (c) => `<path d="M30 70 Q28 20 60 19 Q92 20 90 70 L82 70 Q84 36 60 33 Q36 36 38 70Z" fill="${c}"/>`,
  spiky: (c) => `<path d="M34 42 L38 22 L46 32 L52 16 L60 30 L68 15 L74 31 L82 21 L86 42 Q60 30 34 42Z" fill="${c}"/>`,
  bob: (c) => `<path d="M32 58 Q30 20 60 20 Q90 20 88 58 Q84 40 76 34 Q60 38 44 34 Q36 40 32 58Z" fill="${c}"/>`,
};

const ACCESSORY = {
  tie: () => `<path d="M60 88 L55 96 L60 120 L65 96Z" fill="#b91c1c"/>`,
  glasses: () => `<g fill="none" stroke="#111" stroke-width="2.5"><circle cx="50" cy="52" r="7"/><circle cx="70" cy="52" r="7"/><path d="M57 52 H63"/></g>`,
  beret: () => `<ellipse cx="56" cy="24" rx="26" ry="9" fill="#be185d"/><circle cx="58" cy="15" r="3" fill="#be185d"/>`,
  cap: () => `<path d="M34 36 Q36 16 60 16 Q84 16 86 36Z" fill="#111827"/><rect x="60" y="32" width="36" height="6" rx="3" fill="#111827"/>`,
  compass: () => `<circle cx="92" cy="112" r="9" fill="#fef3c7" stroke="#92400e" stroke-width="2"/><path d="M92 105 L95 112 L92 119 L89 112Z" fill="#dc2626"/>`,
  phone: () => `<rect x="86" y="100" width="12" height="20" rx="2" fill="#111827"/><rect x="88" y="103" width="8" height="13" fill="#38bdf8"/>`,
  globe: () => `<g><circle cx="94" cy="110" r="11" fill="#99f6e4" stroke="#0f766e" stroke-width="2"/><path d="M83 110 H105 M94 99 Q86 110 94 121 Q102 110 94 99" stroke="#0f766e" stroke-width="1.6" fill="none"/></g>`,
  chart: () => `<g><rect x="80" y="98" width="24" height="20" rx="2" fill="#fff" stroke="#7c3aed" stroke-width="2"/><path d="M84 114 L90 108 L95 111 L100 102" stroke="#7c3aed" stroke-width="2" fill="none"/></g>`,
};

export function characterSVG(agent) {
  const look = LOOKS[agent.id] || LOOKS.mudur;
  const shirt = agent.color;
  const hairFront = look.style === 'long' ? '' : HAIR[look.style](look.hair);
  const hairBack = look.style === 'long' ? HAIR.long(look.hair) : '';
  return `
<svg viewBox="0 0 120 150" role="img" aria-label="${agent.name}, ${agent.role}" focusable="false">
  <ellipse cx="60" cy="146" rx="30" ry="4" fill="rgba(0,0,0,.15)"/>
  <g class="body-g">
    ${hairBack}
    <rect x="46" y="118" width="11" height="26" rx="4" fill="#334155"/>
    <rect x="63" y="118" width="11" height="26" rx="4" fill="#334155"/>
    <path d="M34 124 Q32 86 60 84 Q88 86 86 124Z" fill="${shirt}"/>
    <rect class="arm arm-l" x="28" y="90" width="11" height="32" rx="5.5" fill="${shirt}" style="filter:brightness(.9)"/>
    <rect class="arm arm-r" x="81" y="90" width="11" height="32" rx="5.5" fill="${shirt}" style="filter:brightness(.9)"/>
    <circle cx="33.5" cy="122" r="5" fill="${look.skin}"/><circle cx="86.5" cy="122" r="5" fill="${look.skin}"/>
    <g class="head-g">
      <rect x="54" y="74" width="12" height="12" fill="${look.skin}"/>
      <circle cx="60" cy="52" r="26" fill="${look.skin}"/>
      <circle cx="35" cy="54" r="5" fill="${look.skin}"/><circle cx="85" cy="54" r="5" fill="${look.skin}"/>
      ${hairFront}
      <ellipse class="eye" cx="50" cy="53" rx="3.2" ry="4" fill="#111"/>
      <ellipse class="eye" cx="70" cy="53" rx="3.2" ry="4" fill="#111"/>
      <circle cx="44" cy="62" r="4" fill="#f472b6" opacity=".35"/><circle cx="76" cy="62" r="4" fill="#f472b6" opacity=".35"/>
      <path class="mouth-idle" d="M52 64 Q60 70 68 64" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse class="mouth-talk" cx="60" cy="66" rx="6" ry="5" fill="#7f1d1d"/>
    </g>
    ${ACCESSORY[agent.accessory] ? ACCESSORY[agent.accessory]() : ''}
  </g>
</svg>`;
}
