import React from "react";

// Íconos estilo Tabler (outlined) consistentes con el formulario "Nuevo evento".
const _SVG_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const SERVICE_ICONS = {
  1: (
    <svg {..._SVG_PROPS}>
      <path d="M18 8a3 3 0 0 1 0 6" />
      <path d="M10 8v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5" />
      <path d="M12 8h0l4.524-3.77a.9.9 0 0 1 1.476.692v10.156a.9.9 0 0 1-1.476.692L12 12H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    </svg>
  ),
  2: (
    <svg {..._SVG_PROPS}>
      <path d="M5 7h2a2 2 0 0 0 2-2 1 1 0 0 1 1-1h4a1 1 0 0 1 1 1 2 2 0 0 0 2 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  3: (
    <svg {..._SVG_PROPS}>
      <path d="M4 3v6a3 3 0 0 0 3 3v9" />
      <path d="M7 3v9" />
      <path d="M17 3v8c0 1.5-1 3-3 3v6" />
      <path d="M14 11h6" />
    </svg>
  ),
  4: (
    <svg {..._SVG_PROPS}>
      <path d="M8 21h8" />
      <path d="M12 15v6" />
      <path d="M17 3l1 5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4l1-5z" />
      <path d="M7 8h10" />
    </svg>
  ),
};
