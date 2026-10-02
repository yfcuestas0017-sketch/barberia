// Set de iconos SVG livianos (sin dependencias) usados en los paneles.
// Todos heredan color con currentColor y aceptan className/size.

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ size = 20, className, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      {...base}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconMenu = (p) => (
  <Svg {...p}>
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="17" x2="14" y2="17" />
  </Svg>
);

export const IconChevronsLeft = (p) => (
  <Svg {...p}>
    <polyline points="11 17 6 12 11 7" />
    <polyline points="17 17 12 12 17 7" />
  </Svg>
);

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.2" y2="16.2" />
  </Svg>
);

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5Z" />
    <path d="M10.3 19a1.8 1.8 0 0 0 3.4 0" />
  </Svg>
);

export const IconHelp = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.3 9.3a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.2 1-1.2 2" />
    <circle cx="12" cy="16.7" r="0.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconLogout = (p) => (
  <Svg {...p}>
    <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
    <line x1="9" y1="12" x2="21" y2="12" />
    <polyline points="17 8 21 12 17 16" />
  </Svg>
);

export const IconDashboard = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="7.5" height="8.5" rx="2" />
    <rect x="13" y="3.5" width="7.5" height="5" rx="2" />
    <rect x="13" y="11" width="7.5" height="9.5" rx="2" />
    <rect x="3.5" y="14.5" width="7.5" height="6" rx="2" />
  </Svg>
);

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19c.6-3 2.7-4.7 5.5-4.7s4.9 1.7 5.5 4.7" />
    <circle cx="17" cy="8" r="2.3" />
    <path d="M15.5 14.5c2.3.3 3.7 1.8 4.2 4.5" />
  </Svg>
);

export const IconScissors = (p) => (
  <Svg {...p}>
    <circle cx="6" cy="6" r="2.4" />
    <circle cx="6" cy="18" r="2.4" />
    <line x1="8" y1="7.5" x2="20" y2="17" />
    <line x1="8" y1="16.5" x2="20" y2="7" />
  </Svg>
);

export const IconTag = (p) => (
  <Svg {...p}>
    <path d="M12.5 3.5H6a2.5 2.5 0 0 0-2.5 2.5v6.5L14 23l7-7Z" />
    <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <line x1="3.5" y1="10" x2="20.5" y2="10" />
    <line x1="8" y1="3" x2="8" y2="6.7" />
    <line x1="16" y1="3" x2="16" y2="6.7" />
  </Svg>
);

export const IconWallet = (p) => (
  <Svg {...p}>
    <rect x="3" y="6.5" width="18" height="12.5" rx="2.5" />
    <path d="M3 10h18" />
    <circle cx="16.3" cy="14" r="1.2" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconStar = (p) => (
  <Svg {...p}>
    <path d="M12 3.5l2.6 5.5 5.9.7-4.4 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.4-4.1 5.9-.7Z" />
  </Svg>
);

export const IconChart = (p) => (
  <Svg {...p}>
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="6" y="12" width="3" height="8" rx="1" />
    <rect x="10.5" y="7" width="3" height="13" rx="1" />
    <rect x="15" y="15" width="3" height="5" rx="1" />
  </Svg>
);

export const IconTools = (p) => (
  <Svg {...p}>
    <path d="M14.5 6.5a3.5 3.5 0 0 1-4.6 4.6L4.5 16.5a1.7 1.7 0 0 0 2.4 2.4l5.4-5.4a3.5 3.5 0 0 1 4.6-4.6l-2.4 2.4-1.7-1.7Z" />
  </Svg>
);

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15.5 14" />
  </Svg>
);

export const IconRefresh = (p) => (
  <Svg {...p}>
    <path d="M4 12a8 8 0 0 1 14-5.2M20 12a8 8 0 0 1-14 5.2" />
    <polyline points="17.5 3.5 18 7 14.5 6.7" />
    <polyline points="6.5 20.5 6 17 9.5 17.3" />
  </Svg>
);

export const IconUserCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.3 18.2c1.1-2.3 3-3.5 5.7-3.5s4.6 1.2 5.7 3.5" />
  </Svg>
);

export const IconTrendUp = (p) => (
  <Svg {...p}>
    <polyline points="4 16 10 10 14 14 20 6" />
    <polyline points="14 6 20 6 20 12" />
  </Svg>
);

export const IconTrendDown = (p) => (
  <Svg {...p}>
    <polyline points="4 8 10 14 14 10 20 18" />
    <polyline points="20 12 20 18 14 18" />
  </Svg>
);

export const IconCheck = (p) => (
  <Svg {...p}>
    <polyline points="4 12.5 9.5 18 20 6" />
  </Svg>
);

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 21.5 20h-19Z" />
    <line x1="12" y1="9.5" x2="12" y2="14" />
    <circle cx="12" cy="17" r="0.3" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconXCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <line x1="9" y1="9" x2="15" y2="15" />
    <line x1="15" y1="9" x2="9" y2="15" />
  </Svg>
);
