/**
 * Hand-drawn flat-style illustrations — no external image fetch, so these
 * render identically everywhere (unlike a hotlinked stock photo). Keeps the
 * mint/pink/ink palette consistent with the rest of the UI.
 */

export function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 460" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="460" rx="32" fill="#EAFBF3" />
      <circle cx="320" cy="80" r="46" fill="#FADCEB" />
      <circle cx="60" cy="380" r="60" fill="#D6F6E7" />

      {/* desk */}
      <rect x="60" y="300" width="280" height="18" rx="6" fill="#13151A" />
      <rect x="80" y="318" width="14" height="70" fill="#3C414B" />
      <rect x="306" y="318" width="14" height="70" fill="#3C414B" />

      {/* laptop */}
      <rect x="150" y="230" width="100" height="70" rx="6" fill="#13151A" />
      <rect x="158" y="238" width="84" height="54" rx="3" fill="#FFFFFF" />
      <rect x="166" y="250" width="40" height="5" rx="2.5" fill="#1FB579" />
      <rect x="166" y="261" width="60" height="5" rx="2.5" fill="#E4E7EC" />
      <rect x="166" y="272" width="50" height="5" rx="2.5" fill="#E4E7EC" />

      {/* person */}
      <circle cx="200" cy="175" r="26" fill="#F2A8CE" />
      <path d="M150 300c0-38 22-66 50-66s50 28 50 66" fill="#13151A" />

      {/* growth chart */}
      <g>
        <rect x="150" y="140" width="16" height="30" rx="3" fill="#1FB579" opacity="0.4" />
        <rect x="172" y="120" width="16" height="50" rx="3" fill="#1FB579" opacity="0.6" />
        <rect x="194" y="95" width="16" height="75" rx="3" fill="#1FB579" />
      </g>

      {/* floating dots */}
      <circle cx="340" cy="200" r="6" fill="#1FB579" />
      <circle cx="40" cy="120" r="5" fill="#F2A8CE" />
      <circle cx="70" cy="60" r="4" fill="#1FB579" />
    </svg>
  );
}

export function TeamIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" rx="28" fill="#FDF1F7" />
      {/* clipboard */}
      <rect x="160" y="70" width="110" height="150" rx="10" fill="#FFFFFF" stroke="#E4E7EC" strokeWidth="2" />
      <rect x="185" y="62" width="60" height="16" rx="6" fill="#13151A" />
      <rect x="178" y="100" width="76" height="8" rx="4" fill="#1FB579" />
      <rect x="178" y="118" width="60" height="8" rx="4" fill="#E4E7EC" />
      <rect x="178" y="136" width="66" height="8" rx="4" fill="#E4E7EC" />
      <rect x="178" y="154" width="50" height="8" rx="4" fill="#E4E7EC" />
      <circle cx="186" cy="100" r="3" fill="#15965F" />

      {/* two people */}
      <circle cx="95" cy="140" r="24" fill="#D6F6E7" />
      <path d="M55 230c0-33 18-58 40-58s40 25 40 58" fill="#13151A" />

      <circle cx="320" cy="150" r="22" fill="#FADCEB" />
      <path d="M284 230c0-30 16-52 36-52s36 22 36 52" fill="#3C414B" />
    </svg>
  );
}

export function ReceptionIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" rx="28" fill="#EAFBF3" />
      {/* desk counter */}
      <rect x="60" y="180" width="280" height="60" rx="10" fill="#13151A" />
      <rect x="60" y="170" width="280" height="14" rx="7" fill="#1FB579" />

      {/* monitor */}
      <rect x="150" y="100" width="100" height="70" rx="8" fill="#FFFFFF" stroke="#E4E7EC" strokeWidth="2" />
      <rect x="165" y="118" width="70" height="8" rx="4" fill="#1FB579" />
      <rect x="165" y="134" width="50" height="8" rx="4" fill="#E4E7EC" />
      <rect x="165" y="150" width="60" height="8" rx="4" fill="#E4E7EC" />
      <rect x="190" y="170" width="20" height="14" fill="#9199A6" />

      {/* phone / bell */}
      <circle cx="310" cy="140" r="20" fill="#F2A8CE" />
      <path d="M302 144a8 8 0 1016 0 8 8 0 00-16 0z" fill="#13151A" />

      {/* plant */}
      <rect x="80" y="140" width="14" height="40" rx="3" fill="#A8794E" />
      <circle cx="87" cy="130" r="18" fill="#1FB579" opacity="0.7" />
    </svg>
  );
}

export function LoginIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 500" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="500" fill="#D6F6E7" />
      <circle cx="320" cy="90" r="80" fill="#FADCEB" opacity="0.6" />
      <circle cx="50" cy="260" r="90" fill="#1FB579" opacity="0.15" />

      {/* person waving, kept in the upper half so it clears the stat card below */}
      <circle cx="200" cy="150" r="44" fill="#F2A8CE" />
      <path d="M124 290c0-62 34-108 76-108s76 46 76 108" fill="#13151A" />
      <path d="M268 200c18-5 32 4 36 20" stroke="#13151A" strokeWidth="9" strokeLinecap="round" />
      <circle cx="308" cy="213" r="9" fill="#13151A" />

      {/* small floating accents */}
      <circle cx="90" cy="110" r="8" fill="#1FB579" />
      <circle cx="330" cy="240" r="6" fill="#13151A" opacity="0.15" />
    </svg>
  );
}

const AVATAR_COLORS = ["#D6F6E7", "#FADCEB", "#FDE9C8"] as const;
const AVATAR_FACE = ["#15965F", "#C2578E", "#B07A1E"] as const;

export function Avatar({ seed, className = "" }: { seed: number; className?: string }) {
  const bg = AVATAR_COLORS[seed % AVATAR_COLORS.length];
  const face = AVATAR_FACE[seed % AVATAR_FACE.length];
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill={bg} />
      <circle cx="32" cy="26" r="12" fill={face} />
      <path d="M12 58c0-15 9-26 20-26s20 11 20 26" fill={face} />
    </svg>
  );
}
