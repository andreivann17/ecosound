import React, { useEffect, useRef, useState } from "react";
import { Button, Dropdown, Space, Segmented, Input, DatePicker } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { apiInformesInstance, authHeaderInformes } from "../../redux/actions/informes/informes";
import Toast from "../toasts/toast";

const { RangePicker } = DatePicker;

// ── Multiselect con búsqueda (mismo patrón que InformesPage) ──────────────────
function FilterMultiselect({ label, options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = (options || []).filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const toggle = (val) =>
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val]);
  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.includes(o));
  const toggleAll = () => {
    if (allFilteredSelected) onChange(selected.filter((v) => !filtered.includes(v)));
    else onChange([...new Set([...selected, ...filtered])]);
  };

  const hasActive = selected.length > 0;
  const btnLabel = !hasActive
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} seleccionados`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--eh-ink-muted, #6b7280)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          width: "100%", padding: "6px 10px", borderRadius: 8, cursor: "pointer", boxSizing: "border-box",
          border: `1px solid ${hasActive ? "var(--eh-primary-btn)" : "var(--eh-surface-border, #e5e7eb)"}`,
          background: hasActive ? "var(--eh-accent-soft, #eef2ff)" : "var(--eh-surface-2, #fff)",
        }}
      >
        <span style={{
          fontSize: 13, fontWeight: hasActive ? 600 : 400, color: hasActive ? "var(--eh-accent-text, var(--eh-primary-btn))" : "var(--eh-ink-2, #374151)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {btnLabel}
        </span>
        <span style={{
          fontSize: 12, marginLeft: 6, flexShrink: 0, color: hasActive ? "var(--eh-accent-text, var(--eh-primary-btn))" : "var(--eh-ink-faint, #9ca3af)",
          transform: open ? "rotate(180deg)" : "none", transition: "transform .15s",
        }}>
          ▾
        </span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
          background: "var(--eh-surface, #fff)", border: "1px solid var(--eh-surface-border, #e5e7eb)", borderRadius: 8,
          boxShadow: "0 8px 20px rgba(0,0,0,.12)",
        }}>
          <input
            autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..."
            style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "none", borderBottom: "1px solid var(--eh-surface-border, #f3f4f6)", fontSize: 12, outline: "none", background: "transparent", color: "var(--eh-ink, inherit)" }}
          />
          <div
            onClick={toggleAll}
            style={{ padding: "6px 10px", fontSize: 11, fontWeight: 700, color: "var(--eh-accent-text, var(--eh-primary-btn))", cursor: "pointer", borderBottom: "1px solid var(--eh-surface-border, #f3f4f6)", userSelect: "none" }}
          >
            {allFilteredSelected ? "Limpiar selección" : "Seleccionar todo"}
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {filtered.map((opt) => (
              <label key={opt} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer",
                fontSize: 13, color: "var(--eh-ink, inherit)",
                background: selected.includes(opt) ? "var(--eh-accent-soft, #eef2ff)" : "transparent",
              }}>
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
                {opt}
              </label>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 10, fontSize: 12, color: "var(--eh-ink-faint, #9ca3af)", textAlign: "center" }}>Sin resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OutlookRibbon({ view, setView, filters, setFilters, onCreateEvent, onOpenPrint, onOpenSearch }) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [catalogos, setCatalogos] = useState({ ciudades: [], tipos_evento: [], usuarios: [] });

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  // Catálogos reales (mismo endpoint que usa Informes): ciudades, tipos de
  // evento y usuarios, tal cual existen en la base de datos.
  useEffect(() => {
    let alive = true;
    apiInformesInstance
      .get("/informes/catalogos", { headers: authHeaderInformes() })
      .then(({ data }) => {
        if (!alive) return;
        setCatalogos({
          ciudades: data?.ciudades || [],
          tipos_evento: data?.tipos_evento || [],
          usuarios: data?.usuarios || [],
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const selectedCiudades = filters?.ciudadesSel || [];
  const selectedTipos = filters?.tiposEventoSel || [];
  const usuarioQuery = filters?.usuarioQuery || "";
  const fechaRango =
    filters?.fechaDesde && filters?.fechaHasta
      ? [dayjs(filters.fechaDesde), dayjs(filters.fechaHasta)]
      : null;

  const activeCount =
    selectedCiudades.length +
    selectedTipos.length +
    (usuarioQuery ? 1 : 0) +
    (filters?.fechaDesde || filters?.fechaHasta ? 1 : 0);

  const clearFilters = () => {
    setFilters((p) => ({
      ...(p || {}),
      ciudadesSel: [],
      tiposEventoSel: [],
      usuarioQuery: "",
      fechaDesde: null,
      fechaHasta: null,
    }));
  };

  const whats = () => {
    const phone = "526532095876";
    if (!phone || phone.includes("#")) {
      toast("Configura el número de WhatsApp del licenciado");
      return;
    }

    const viewLabel =
      view === "day" ? "Día" : view === "week_work" ? "Semana laboral" : view === "week" ? "Semana" : view === "month" ? "Mes" : String(view || "");

    const enabled = Object.entries(filters || {})
      .filter(([, v]) => !!v)
      .map(([k]) => k);

    const lines = [
      "Hola, este es un mensaje del Departamento de Innovación y Tecnología.",
      "Mensaje de prueba.",
      "",
      `Vista: ${viewLabel}`,
      `Filtros activos: ${enabled.length ? enabled.join(", ") : "ninguno"}`,
    ];

    const text = lines.join("\n");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      toast("Tu navegador bloqueó la ventana. Permite popups o abre el link en la misma pestaña.");
      return;
    }

    toast("WhatsApp abierto. Presiona Enviar.");
  };

  const menuNode = (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "var(--eh-surface, #fff)", border: "1px solid var(--eh-surface-border, transparent)",
        borderRadius: 14, boxShadow: "0 10px 28px rgba(0,0,0,.15)",
        padding: 16, width: 300, display: "flex", flexDirection: "column", gap: 14,
      }}
    >
      <FilterMultiselect
        label="Ciudad" placeholder="Todas"
        options={catalogos.ciudades} selected={selectedCiudades}
        onChange={(v) => setFilters((p) => ({ ...(p || {}), ciudadesSel: v }))}
      />

      <FilterMultiselect
        label="Tipo de evento" placeholder="Todos"
        options={catalogos.tipos_evento} selected={selectedTipos}
        onChange={(v) => setFilters((p) => ({ ...(p || {}), tiposEventoSel: v }))}
      />

      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--eh-ink-muted, #6b7280)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Usuario (quién lo creó)
        </label>
        <Input
          allowClear
          placeholder="Buscar usuario..."
          value={usuarioQuery}
          onChange={(e) => setFilters((p) => ({ ...(p || {}), usuarioQuery: e.target.value }))}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--eh-ink-muted, #6b7280)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Fecha agendada
        </label>
        <RangePicker
          style={{ width: "100%" }}
          value={fechaRango}
          onChange={(vals) => {
            setFilters((p) => ({
              ...(p || {}),
              fechaDesde: vals?.[0] ? vals[0].startOf("day").toISOString() : null,
              fechaHasta: vals?.[1] ? vals[1].endOf("day").toISOString() : null,
            }));
          }}
        />
      </div>

      {activeCount > 0 && (
        <Button size="small" onClick={clearFilters} style={{
          background: "var(--eh-btn-clean-bg, #fff)",
          borderColor: "var(--eh-btn-clean-border, #d9d9d9)",
          color: "var(--eh-btn-clean-text, inherit)",
        }}>Limpiar filtros</Button>
      )}
    </div>
  );

  return (
    <div className="ol-ribbon">
      <div className="ol-ribbonLeft">
        <Space size={12} align="center">
          <Button className="ol-createBtn" onClick={onCreateEvent} icon={<PlusOutlined />} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)", color: "#fff" }}>
            Nueva cita
          </Button>

          <Segmented
            value={view}
            onChange={setView}
            className="ol-viewTabs marginl-3"
            options={[
              { label: "Día", value: "day", title: "" },
              { label: "Semana laboral", value: "week_work", title: "" },
              { label: "Semana", value: "week", title: "" },
              { label: "Mes", value: "month", title: "" },
            ]}
          />
        </Space>
      </div>

      <div className="ol-ribbonRight">
        <Dropdown
          open={filterOpen}
          onOpenChange={(o) => setFilterOpen(o)}
          trigger={["click"]}
          placement="bottomRight"
          dropdownRender={() => menuNode}
        >
          <Button className="ol-filterBtn">
            Filtrar{activeCount > 0 ? ` (${activeCount})` : ""} <i className="fa-solid fa-angle-down" style={{ marginLeft: 6 }}></i>
          </Button>
        </Dropdown>
      </div>

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
    </div>
  );
}
