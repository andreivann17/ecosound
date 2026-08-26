import React, { useEffect, useRef, useState } from "react";
import { Modal, Typography, AutoComplete, Input } from "antd";
import {
  SearchOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  HomeOutlined,
  BarChartOutlined,
  DollarOutlined,
  UserOutlined,
  SettingOutlined,
  TagOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { PATH } from "../../redux/utils";
import logoPng from "../../assets/img/logo_hersoft_event.webp";

const { Title, Text } = Typography;

const api = axios.create({ baseURL: PATH, headers: { "Content-Type": "application/json" } });
const authHeader = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("tokenadmin");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TIPO_EVENTO_MAP = {
  1: "Bodas", 2: "XV", 3: "Graduación", 4: "Corporativo", 5: "Cumpleaños", 6: "Otro",
};

const STATIC_COMMANDS = [
  { key: "inicio",        type: "route", label: "Inicio",         description: "Panel de inicio",         route: "/app/home",          icon: <HomeOutlined />,       keywords: ["inicio", "home", "panel"] },
  { key: "eventos",       type: "route", label: "Eventos",        description: "Gestión de eventos",       route: "/app/eventos",       icon: <CalendarOutlined />,   keywords: ["eventos", "evento", "boda", "xv", "graduacion", "cumple"] },
  { key: "paquetes",      type: "route", label: "Paquetes",       description: "Catálogo de paquetes",     route: "/app/paquetes",      icon: <AppstoreOutlined />,   keywords: ["paquetes", "paquete", "sonido", "foto", "equipo"] },
  { key: "cotizaciones",  type: "route", label: "Cotizaciones",   description: "Módulo de cotizaciones",   route: "/app/cotizaciones",  icon: <FileTextOutlined />,   keywords: ["cotizaciones", "cotizacion", "cotización", "presupuesto"] },
  { key: "agenda",        type: "route", label: "Agenda",         description: "Calendario de eventos",    route: "/app/agenda",        icon: <CalendarOutlined />,   keywords: ["agenda", "calendario", "calendar"] },
  { key: "gastos",        type: "route", label: "Gastos",         description: "Registro de gastos",       route: "/app/gastos",        icon: <DollarOutlined />,     keywords: ["gastos", "gasto", "egresos"] },
  { key: "estadisticas",  type: "route", label: "Estadísticas",   description: "Reportes y estadísticas",  route: "/app/estadisticas",  icon: <BarChartOutlined />,   keywords: ["estadisticas", "estadísticas", "reportes"] },
  { key: "usuarios",      type: "route", label: "Usuarios",       description: "Gestión de usuarios",      route: "/app/usuarios",      icon: <UserOutlined />,       keywords: ["usuarios", "usuario", "user"] },
  { key: "configuracion", type: "route", label: "Configuración",  description: "Ajustes del sistema",      route: "/app/configuracion", icon: <SettingOutlined />,    keywords: ["configuracion", "configuración", "settings", "ajustes"] },
];

function buildStaticOptions(query) {
  const q = (query || "").toLowerCase().trim();
  const list = !q
    ? STATIC_COMMANDS
    : STATIC_COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(q) ||
        (c.keywords || []).some((k) => k.toLowerCase().includes(q))
      );

  return list.map((cmd) => ({
    value: cmd.key,
    label: (
      <div>
        <div>{cmd.label}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{cmd.description}</div>
      </div>
    ),
    type: "route",
    route: cmd.route,
  }));
}

function buildResultOptions(eventos, paquetes, cotizaciones) {
  const opts = [];

  eventos.forEach((ev) => {
    const tipo = TIPO_EVENTO_MAP[ev.id_tipo_evento] || "";
    opts.push({
      value: `evento-${ev.id_evento}`,
      label: (
        <div>
          <div><strong>{ev.cliente_nombre || "—"}</strong></div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Evento{tipo && ` · ${tipo}`}{ev.lugar_evento ? ` · ${ev.lugar_evento}` : ""}
          </div>
        </div>
      ),
      type: "evento",
      id: ev.id_evento,
    });
  });

  paquetes.forEach((pq) => {
    opts.push({
      value: `paquete-${pq.id_paquete}`,
      label: (
        <div>
          <div><strong>{pq.nombre_paquete || pq.nombre || "—"}</strong></div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Paquete</div>
        </div>
      ),
      type: "paquete",
      id: pq.id_paquete,
    });
  });

  cotizaciones.forEach((cot) => {
    opts.push({
      value: `cotizacion-${cot.id_cotizacion}`,
      label: (
        <div>
          <div><strong>{cot.cliente_nombre || "—"}</strong></div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            Cotización{cot.code ? ` · ${cot.code}` : ""}
          </div>
        </div>
      ),
      type: "cotizacion",
      id: cot.id_cotizacion,
    });
  });

  return opts;
}

export default function BuscarModal({ open, onClose }) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setOptions([]);
    } else {
      setOptions(buildStaticOptions(""));
    }
  }, [open]);

  const fetchResults = async (q) => {
    try {
      setLoading(true);
      const h = authHeader();
      const [evRes, pqRes, cotRes] = await Promise.allSettled([
        api.get("/eventos",      { headers: h, params: { search: q, limit: 5 } }),
        api.get("/paquetes",     { headers: h, params: { search: q, limit: 5 } }),
        api.get("/cotizaciones", { headers: h, params: { search: q, limit: 5 } }),
      ]);

      const ev  = evRes.status  === "fulfilled" ? (evRes.value.data?.items  || evRes.value.data  || []) : [];
      const pq  = pqRes.status  === "fulfilled" ? (pqRes.value.data?.items  || pqRes.value.data  || []) : [];
      const cot = cotRes.status === "fulfilled" ? (cotRes.value.data?.items || cotRes.value.data || []) : [];

      return { ev: Array.isArray(ev) ? ev : [], pq: Array.isArray(pq) ? pq : [], cot: Array.isArray(cot) ? cot : [] };
    } catch {
      return { ev: [], pq: [], cot: [] };
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    const q = (value || "").trim();
    const staticOpts = buildStaticOptions(q);

    if (!q) {
      setOptions(staticOpts);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const { ev, pq, cot } = await fetchResults(q);
      const resultOpts = buildResultOptions(ev, pq, cot);
      setOptions(resultOpts.length > 0 ? [...staticOpts, ...resultOpts] : staticOpts);
    }, 350);
  };

  const handleSelect = (_, option) => {
    if (option.type === "route") {
      navigate(option.route);
    } else if (option.type === "evento") {
      navigate(`/app/eventos/${option.id}`);
    } else if (option.type === "paquete") {
      navigate(`/app/paquetes/${option.id}`);
    } else if (option.type === "cotizacion") {
      navigate(`/app/cotizaciones/${option.id}`);
    }
    close();
  };

  const close = () => {
    setSearchValue("");
    setOptions([]);
    if (typeof onClose === "function") onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      footer={null}
      width={720}
      destroyOnClose
      closeIcon={
        <span style={{ fontSize: 20, fontWeight: 700, color: "var(--eh-ink, #111827)", lineHeight: 1 }}>
          ×
        </span>
      }
    >
      <div style={{ padding: "8px 8px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src={logoPng}
            alt="Logo"
            style={{
              width: 72,
              height: 72,
              objectFit: "contain",
              margin: "0 auto 12px",
              display: "block",
            }}
          />
          <Title level={3} style={{ marginBottom: 4, color: "var(--eh-ink, inherit)" }}>
            Buscar sección o evento
          </Title>
          <Text type="secondary" style={{ color: "var(--eh-ink-muted, inherit)" }}>
            Introduce el nombre del cliente, evento, paquete o la sección que deseas abrir.
          </Text>
        </div>

        <AutoComplete
          style={{ width: "100%" }}
          value={searchValue}
          options={options}
          onSearch={handleSearch}
          onSelect={handleSelect}
          allowClear
          notFoundContent={loading ? "Buscando..." : "No se encontraron resultados."}
          filterOption={false}
        >
          <Input
            size="large"
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            placeholder="Ejemplo: María García, bodas, paquetes, cotizaciones..."
          />
        </AutoComplete>
      </div>
    </Modal>
  );
}
