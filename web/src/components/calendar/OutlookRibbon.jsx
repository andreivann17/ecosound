import React, { useMemo, useState, useEffect } from "react";
import { Button, Dropdown, Space, Segmented, Checkbox, Menu, notification } from "antd";
import { FilterOutlined } from "@ant-design/icons";

export default function OutlookRibbon({ view, setView, filters, setFilters, onCreateEvent }) {
  const [filterOpen, setFilterOpen] = useState(false);

  const ciudades = useMemo(
    () => [
      { id: 1, label: "San Luis Río Colorado" },
      { id: 2, label: "Mexicali" },
      { id: 3, label: "Puerto Peñasco" },
    ],
    []
  );

  const tiposContrato = useMemo(
    () => [
      { id: 1, label: "Bodas", hex: "#be123c" },
      { id: 2, label: "XV", hex: "#7c3aed" },
      { id: 3, label: "Graduación", hex: "#1d4ed8" },
      { id: 4, label: "Corporativo", hex: "#0f766e" },
      { id: 5, label: "Cumpleaños", hex: "#ea580c" },
      { id: 6, label: "Otro", hex: "#6b7280" },
    ],
    []
  );

  // ====== DEFAULT: TODO SELECCIONADO ======
  useEffect(() => {
    const hasTipos = Array.isArray(filters?.tipoContratoIds);
    const hasCities = Array.isArray(filters?.cityIds);

    if (!hasTipos) {
      setFilters((p) => ({ ...(p || {}), tipoContratoIds: tiposContrato.map((t) => t.id) }));
    }
    if (!hasCities) {
      setFilters((p) => ({ ...(p || {}), cityIds: ciudades.map((c) => c.id) }));
    }
  }, [filters, setFilters, tiposContrato, ciudades]);

  const colorDot = (hex) => (
    <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 999, background: hex, marginRight: 10 }} />
  );

  const selectedCityIds = filters?.cityIds || [];
  const selectedTipoIds = filters?.tipoContratoIds || [];

  const toggleCity = (id) => {
    const cur = new Set(selectedCityIds);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    setFilters((p) => ({ ...(p || {}), cityIds: Array.from(cur) }));
  };

  const toggleTipo = (id) => {
    const cur = new Set(selectedTipoIds);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    setFilters((p) => ({ ...(p || {}), tipoContratoIds: Array.from(cur) }));
  };

  const filterMenuItems = useMemo(() => {
    const rowStyle = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      width: 300,
      padding: "6px 4px",
      fontSize: 14,
    };

    const mkLeaf = (key, leftNode, checked, onToggle) => ({
      key,
      label: (
        <div
          style={rowStyle}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        >
          <div style={{ display: "flex", alignItems: "center", fontWeight: 500 }}>{leftNode}</div>
          <Checkbox
            checked={checked}
            style={{ transform: "scale(1.15)" }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggle()}
          />
        </div>
      ),
    });

    return [
      {
        key: "ciudades",
        label: <span style={{ fontSize: 14, fontWeight: 600 }}>Por ciudad</span>,
        children: ciudades.map((c) =>
          mkLeaf(`city_${c.id}`, <span>{c.label}</span>, selectedCityIds.includes(c.id), () => toggleCity(c.id))
        ),
      },
      {
        key: "tipos",
        label: <span style={{ fontSize: 14, fontWeight: 600 }}>Tipo de contrato</span>,
        children: tiposContrato.map((t) =>
          mkLeaf(
            `tipo_${t.id}`,
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              {colorDot(t.hex)}{t.label}
            </span>,
            selectedTipoIds.includes(t.id),
            () => toggleTipo(t.id)
          )
        ),
      },
    ];
  }, [ciudades, tiposContrato, selectedCityIds, selectedTipoIds]);

  const whats = () => {
    const phone = "526532095876";
    if (!phone || phone.includes("#")) {
      notification.error({ message: "Configura el número de WhatsApp del licenciado" });
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
      notification.warning({
        message: "Popup bloqueado",
        description: "Tu navegador bloqueó la ventana. Permite popups o abre el link en la misma pestaña.",
      });
      return;
    }

    notification.success({ message: "WhatsApp abierto. Presiona Enviar." });
  };

  const menuNode = (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ background: "#fff", borderRadius: 14, boxShadow: "0 10px 28px rgba(0,0,0,.15)", padding: 8 }}
    >
      <Menu
        mode="vertical"
        items={filterMenuItems}
        selectable={false}
        onClick={(info) => {
          if (info?.domEvent) {
            info.domEvent.preventDefault();
            info.domEvent.stopPropagation();
          }
          setFilterOpen(true);
        }}
      />
    </div>
  );

  return (
    <div className="ol-ribbon">
      <div className="ol-ribbonLeft">
        <Space size={12} align="center">
          <Button className="ol-createBtn" onClick={onCreateEvent} style={{ background: "#05060a", borderColor: "#05060a", color: "#fff" }}>
            <i className="fa-regular fa-calendar-days" style={{ marginRight: 5 }}></i>
            Nuevo evento
          </Button>

          <Segmented
            value={view}
            onChange={setView}
            className="ol-viewTabs marginl-3"
            options={[
              { label: "Día", value: "day" },
              { label: "Semana laboral", value: "week_work" },
              { label: "Semana", value: "week" },
              { label: "Mes", value: "month" },
            ]}
          />
        </Space>

        <Space size={10} className="marginl-3">
          <Dropdown
            open={filterOpen}
            onOpenChange={(o) => setFilterOpen(o)}
            trigger={["click"]}
            placement="bottomLeft"
            dropdownRender={() => menuNode}
          >
            <Button icon={<FilterOutlined />}>
              Filtrar <i className="fa-solid fa-angle-down" style={{ marginLeft: 6 }}></i>
            </Button>
          </Dropdown>

          <Button disabled onClick={() => window.print()}>
            <i className="fa-solid fa-print" style={{ marginRight: 5 }}></i>
            Imprimir
          </Button>

         
        </Space>
      </div>
    </div>
  );
}
