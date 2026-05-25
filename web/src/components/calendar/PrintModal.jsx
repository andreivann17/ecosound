// src/components/calendar/PrintModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Select, Checkbox } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

// ─── helpers ────────────────────────────────────────────────────────────────

function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith("#")) return `rgba(22,119,255,${alpha})`;
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function eventColor(ev) {
  return ev?.color_hex || "#1677ff";
}

function startOfWeekES(date) {
  const d = dayjs(date);
  const dow = d.day();
  const diff = dow === 0 ? -6 : 1 - dow;
  return d.add(diff, "day").startOf("day");
}

// ─── HTML generators ────────────────────────────────────────────────────────

const BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    padding: 16px 20px;
    margin: 0;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h2 { font-size: 18px; font-weight: 800; margin: 0 0 12px; color: #1677ff; text-transform: capitalize; }
  @media print { @page { margin: 10mm; } }
`;

function generateMonthHtml(cursorDate, events) {
  const anchor = dayjs(cursorDate);
  const gridStart = startOfWeekES(anchor.startOf("month"));

  const rows = [];
  let cur = gridStart;
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let i = 0; i < 7; i++) { row.push(cur); cur = cur.add(1, "day"); }
    rows.push(row);
  }

  const byDay = {};
  events.forEach((ev) => {
    const key = dayjs(ev.start).format("YYYY-MM-DD");
    (byDay[key] = byDay[key] || []).push(ev);
  });

  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const colW = "14.285%";
  const headerRow = days.map((d) =>
    `<th style="background:#f0f4ff;padding:6px 4px;font-size:11px;border:1px solid #cfd6e1;width:${colW};text-align:left;">${d}</th>`
  ).join("");

  const bodyRows = rows.map((row) => {
    const cells = row.map((day) => {
      const key = day.format("YYYY-MM-DD");
      const inMonth = day.month() === anchor.month();
      const dayEvs = (byDay[key] || []).slice(0, 7);
      const evHtml = dayEvs.map((ev) => {
        const col = eventColor(ev);
        return `<div style="font-size:8.5px;padding:1px 4px;border-radius:3px;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:${hexToRgba(col, 0.15)};border-left:2px solid ${col};max-width:100%;">${dayjs(ev.start).format("HH:mm")} ${toTitleCase(ev.title || "")}</div>`;
      }).join("");
      return `<td style="border:1px solid #cfd6e1;padding:5px 5px 3px;vertical-align:top;width:${colW};max-width:0;${!inMonth ? "background:#f9fafb;color:#9ca3af;" : ""}"><div style="font-weight:800;font-size:12px;margin-bottom:3px;">${day.date()}</div>${evHtml}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Agenda - ${anchor.format("MMMM YYYY")}</title><style>${BASE_CSS}table{width:100%;border-collapse:collapse;table-layout:fixed;}@media print{@page{size:landscape;margin:8mm;}}</style></head>
<body><h2>📅 ${anchor.format("MMMM YYYY")}</h2>
<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
}

function generateWeekHtml(cursorDate, events, printView, startH, endH) {
  const anchor = dayjs(cursorDate);
  const weekStart = startOfWeekES(anchor);
  const count = printView === "week_work" ? 5 : 7;
  const days = Array.from({ length: count }, (_, i) => weekStart.add(i, "day"));

  const byDay = {};
  events.forEach((ev) => {
    const key = dayjs(ev.start).format("YYYY-MM-DD");
    (byDay[key] = byDay[key] || []).push(ev);
  });

  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);

  const timeColW = "46px";
  const dayColW = `${Math.floor((100 - 4) / days.length)}%`;

  const headerCells = days.map((d) =>
    `<th style="background:#f0f4ff;padding:6px;font-size:11px;border:1px solid #cfd6e1;text-transform:capitalize;width:${dayColW};text-align:left;">${d.format("ddd D MMM")}</th>`
  ).join("");

  const timeRows = hours.map((h) => {
    const cells = days.map((d) => {
      const key = d.format("YYYY-MM-DD");
      const hourEvs = (byDay[key] || []).filter((ev) => dayjs(ev.start).hour() === h);
      const evHtml = hourEvs.map((ev) => {
        const col = eventColor(ev);
        return `<div style="font-size:8.5px;padding:1px 4px;border-radius:3px;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;background:${hexToRgba(col, 0.15)};border-left:2px solid ${col};max-width:100%;">${dayjs(ev.start).format("HH:mm")} ${toTitleCase(ev.title || "")}</div>`;
      }).join("");
      return `<td style="border:1px solid #eef0f2;padding:2px 4px;vertical-align:top;height:26px;max-width:0;overflow:hidden;">${evHtml}</td>`;
    }).join("");
    return `<tr><td style="border:1px solid #eef0f2;padding:4px;text-align:right;font-size:10px;color:#6b7280;width:${timeColW};white-space:nowrap;">${String(h).padStart(2, "0")}:00</td>${cells}</tr>`;
  }).join("");

  const label = `${days[0].format("D [de] MMMM")} – ${days[days.length - 1].format("D [de] MMMM YYYY")}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Agenda Semanal</title><style>${BASE_CSS}table{width:100%;border-collapse:collapse;table-layout:fixed;}@media print{@page{size:landscape;margin:8mm;}}</style></head>
<body><h2>📅 ${label}</h2>
<table><thead><tr><th style="background:#f0f4ff;padding:6px;font-size:11px;border:1px solid #cfd6e1;width:${timeColW};"></th>${headerCells}</tr></thead><tbody>${timeRows}</tbody></table></body></html>`;
}

function generateDayHtml(cursorDate, events, startH, endH) {
  const anchor = dayjs(cursorDate);
  const key = anchor.format("YYYY-MM-DD");
  const dayEvs = events.filter((ev) => dayjs(ev.start).format("YYYY-MM-DD") === key);
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);

  const rows = hours.map((h) => {
    const hourEvs = dayEvs.filter((ev) => dayjs(ev.start).hour() === h);
    const evHtml = hourEvs.map((ev) => {
      const col = eventColor(ev);
      return `<div style="font-size:10px;padding:3px 8px;border-radius:4px;margin-bottom:3px;background:${hexToRgba(col, 0.15)};border-left:3px solid ${col};">${dayjs(ev.start).format("HH:mm")} ${toTitleCase(ev.title || "")}</div>`;
    }).join("");
    return `<tr><td style="border-bottom:1px solid #eef0f2;padding:6px;text-align:right;font-size:11px;color:#6b7280;width:60px;white-space:nowrap;">${String(h).padStart(2, "0")}:00</td><td style="border-bottom:1px solid #eef0f2;padding:4px;">${evHtml || ""}</td></tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Agenda - ${anchor.format("dddd D MMMM YYYY")}</title><style>${BASE_CSS}table{width:100%;border-collapse:collapse;}@media print{@page{size:portrait;margin:10mm;}}</style></head>
<body><h2>📅 ${anchor.format("dddd, D [de] MMMM YYYY")}</h2>
<table><tbody>${rows}</tbody></table></body></html>`;
}

// ─── PrintPreview ────────────────────────────────────────────────────────────

function PrintPreview({ html }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <div style={{
      border: "1px solid #dfe3ea",
      borderRadius: 10,
      overflow: "hidden",
      background: "#fff",
      height: 480,
      display: "flex",
      flexDirection: "column",
    }}>
      <div style={{
        background: "#f0f4ff",
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 600,
        color: "#1677ff",
        borderBottom: "1px solid #dfe3ea",
      }}>
        Vista previa
      </div>
      <iframe
        ref={iframeRef}
        title="print-preview"
        style={{ flex: 1, border: "none", width: "100%" }}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

// ─── PrintModal ──────────────────────────────────────────────────────────────

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, "0")}:00`,
}));

const VIEW_OPTIONS = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "week_work", label: "Semana laboral" },
  { value: "day", label: "Día" },
];

export default function PrintModal({ open, onClose, view, cursorDate, events = [] }) {
  const [printView, setPrintView] = useState(view || "month");
  const [startH, setStartH] = useState(8);
  const [endH, setEndH] = useState(18);

  useEffect(() => {
    if (view) setPrintView(view);
  }, [view]);

  const previewHtml = React.useMemo(() => {
    if (!open) return "";
    try {
      if (printView === "month") return generateMonthHtml(cursorDate, events);
      if (printView === "day") return generateDayHtml(cursorDate, events, startH, endH);
      return generateWeekHtml(cursorDate, events, printView, startH, endH);
    } catch {
      return "<html><body><p>Error generando la vista previa.</p></body></html>";
    }
  }, [open, printView, cursorDate, events, startH, endH]);

  const handlePrint = () => {
    try {
      const win = window.open("", "_blank", "width=1000,height=750");
      if (!win) { alert("Permite ventanas emergentes para imprimir."); return; }
      win.document.write(previewHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 600);
    } catch (e) {
      console.error("Print error", e);
    }
  };

  const showTimeRange = printView !== "month";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<span style={{ fontWeight: 800, fontSize: 17 }}>Imprimir</span>}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="print" type="primary" onClick={handlePrint}
          style={{ background: "#1677ff", borderColor: "#1677ff", fontWeight: 700 }}>
          <i className="fa-solid fa-print" style={{ marginRight: 6 }} />
          Imprimir
        </Button>,
      ]}
      destroyOnClose
    >
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20, minHeight: 500 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={labelStyle}>Calendario</div>
            <Select
              value="Calendario"
              options={[{ value: "Calendario", label: "Calendario" }]}
              style={{ width: "100%" }}
              disabled
            />
          </div>

          <div>
            <div style={labelStyle}>Ver</div>
            <Select
              value={printView}
              onChange={setPrintView}
              style={{ width: "100%" }}
              options={VIEW_OPTIONS}
            />
          </div>

          {showTimeRange && (
            <div>
              <div style={labelStyle}>Intervalo de tiempo</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Select
                  value={startH}
                  onChange={setStartH}
                  style={{ flex: 1 }}
                  options={TIME_OPTIONS.filter((o) => o.value < endH)}
                />
                <span style={{ color: "#6b7280", fontSize: 13 }}>a</span>
                <Select
                  value={endH}
                  onChange={setEndH}
                  style={{ flex: 1 }}
                  options={TIME_OPTIONS.filter((o) => o.value > startH)}
                />
              </div>
            </div>
          )}
        </div>

        <PrintPreview html={previewHtml} />
      </div>
    </Modal>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(0,0,0,0.65)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 5,
};
