// card.jsx
// Versión final — lista para copiar y pegar

import React from "react";

// ======== UTILIDADES ========
const VARIANTS = {
  activo: { 
    bg: "#103014ff", 
    border: "#1e90ff", 
    text: "#e6f0ff", 
    icon: "🟢" 
  },
  convenio: { 
    bg: "#102b23", 
    border: "#4da3ff", 
    text: "rgba(233, 247, 239, 1)", 
    icon: "🔵" 
  },
 
  archivo: { 
    bg: "#3b2a08", 
    border: "#ffd166", 
    text: "#fff7e6", 
    icon: "🟡" 
  },
  no_conciliacion: { 
    bg: "#351017", 
    border: "#ff6b6b", 
    text: "#ffecec", 
    icon: "🔴" 
  },
};


const formatNumber = (n) =>
  typeof n === "number" ? Intl.NumberFormat("es-MX").format(n) : "0";

// ======== CARD INDIVIDUAL ========
function CardResumen({ title, value, hint, variant, onClick }) {
  const v = VARIANTS[variant] ?? VARIANTS.convenio;
  return (
    <button
      type="button"
      className="oa-card"
      onClick={onClick}
      aria-label={`${title}: ${value}`}
      style={{
        background: `linear-gradient(180deg, ${v.bg}, #0c0c10)`,
        borderColor: v.border,
        color: v.text,
      }}
    >
      <div className="oa-card-header">
        <span className="oa-card-icon">{v.icon}</span>
        <span className="oa-card-title">{title}</span>
      </div>

      <div className="oa-card-value">{formatNumber(value)}</div>
      <div className="oa-card-hint">{hint}</div>
    </button>
  );
}

// ======== COMPONENTE PRINCIPAL ========
function card({
  counts = { activo: 0, convenio: 0,  archivo: 0, noConciliacion: 0 },
    onActivo = () => {},
  onConvenio = () => {},

  onArchivo = () => {},
  onNoConciliacion = () => {},
}) {
  const TARJETAS = [
     {
    key: "activo",
    title: "Activos",
    value: counts.activo,
    hint: "Casos en trámite o con audiencia próxima",
    variant: "activo",
    action: onActivo,
  },
    {
      key: "convenio",
      title: "Convenio",
      value: counts.convenio,
      hint: "Casos con convenio activo",
      variant: "convenio",
      action: onConvenio,
    },
    
    {
      key: "archivo",
      title: "Archivo por incomparecencia",
      value: counts.archivo,
      hint: "Casos cerrados por falta de asistencia",
      variant: "archivo",
      action: onArchivo,
    },
    {
      key: "no_conciliacion",
      title: "No conciliación",
      value: counts.noConciliacion,
      hint: "Casos listos para Tribunal",
      variant: "no_conciliacion",
      action: onNoConciliacion,
    },
  ];

  return (
    <>
      <div className="oa-grid">
        {TARJETAS.map((t) => (
          <CardResumen
            key={t.key}
            title={t.title}
            value={t.value}
            hint={t.hint}
            variant={t.variant}
            onClick={t.action}
          />
        ))}
      </div>

      <style>{`
        .oa-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          width: 100%;
          margin-top: 25px;
        }

        .oa-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          border: 1px solid;
          border-radius: 10px;
          padding: 16px;
          text-align: left;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease;
          outline: none;
        }

        .oa-card:hover,
        .oa-card:focus-visible {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(0,0,0,.35);
        }

        .oa-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          opacity: .9;
        }

        .oa-card-icon { font-size: 18px; }
        .oa-card-title { font-weight: 600; }

        .oa-card-value {
          font-size: 36px;
          font-weight: 700;
          line-height: 1.1;
        }

        .oa-card-hint {
          font-size: 13px;
          opacity: .85;
        }

        @media (prefers-reduced-motion: reduce) {
          .oa-card { transition: none; }
        }
      `}</style>
    </>
  );
}

export default card;
