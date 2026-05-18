import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiInventarioInstance,
  authHeaderInventario,
} from "../../redux/actions/inventario/inventario";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  notification,
  Spin,
  Empty,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from "@ant-design/icons";

import "./EventoDetallePage.css";
import "./EstadisticasPage.css";

dayjs.locale("es");
ChartJS.register(ArcElement, Tooltip, Legend);

const { RangePicker } = DatePicker;

const ESTADO_MAP = {
  activo: { label: "Activo", cls: "cd-status-active" },
  dado_de_baja: { label: "Dado de baja", cls: "cd-status-inactive" },
  en_reparacion: { label: "En reparación", cls: "" },
};

const TIPO_MOV_MAP = { entrada: "Entrada", baja: "Baja" };
const MOTIVO_MAP = { compra: "Compra", perdida: "Pérdida", rotura: "Rotura", otro: "Otro" };

const PERIODO_OPTIONS = [
  { value: "semana",   label: "Esta semana" },
  { value: "quincena", label: "Esta quincena" },
  { value: "mes",      label: "Este mes" },
  { value: "custom",   label: "Personalizado" },
];

const DONUT_COLORS = [
  "#6366f1", "#10b981", "#f97316", "#f59e0b",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
];

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

const fmtFechaCorta = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY") : "—";
};

const fmtDatetime = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("DD/MM/YYYY, HH:mm") : "—";
};

function getDateRange(periodo, customRange) {
  const today = dayjs();
  if (periodo === "semana") {
    return [today.startOf("week").format("YYYY-MM-DD"), today.endOf("week").format("YYYY-MM-DD")];
  }
  if (periodo === "quincena") {
    const day = today.date();
    if (day <= 15) {
      return [today.startOf("month").format("YYYY-MM-DD"), today.date(15).format("YYYY-MM-DD")];
    }
    return [today.date(16).format("YYYY-MM-DD"), today.endOf("month").format("YYYY-MM-DD")];
  }
  if (periodo === "mes") {
    return [today.startOf("month").format("YYYY-MM-DD"), today.endOf("month").format("YYYY-MM-DD")];
  }
  if (periodo === "custom" && customRange) {
    return [customRange[0].format("YYYY-MM-DD"), customRange[1].format("YYYY-MM-DD")];
  }
  return [today.startOf("month").format("YYYY-MM-DD"), today.endOf("month").format("YYYY-MM-DD")];
}

export default function EquipoDetallePage() {
  const { idEquipo } = useParams();
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = perm("inventario", "editar");
  const canEliminar = perm("inventario", "eliminar");

  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [movModalOpen, setMovModalOpen] = useState(false);
  const [savingMov, setSavingMov] = useState(false);
  const [movForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("datos");

  // Análisis tab state
  const [analisisPeriodo, setAnalisisPeriodo] = useState("mes");
  const [analisisCustomRange, setAnalisisCustomRange] = useState(null);
  const [analisisData, setAnalisisData] = useState(null);
  const [analisisLoading, setAnalisisLoading] = useState(false);

  // Movimientos tab period filter state
  const [movPeriodo, setMovPeriodo] = useState("mes");
  const [movCustomRange, setMovCustomRange] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiInventarioInstance
      .get(`/inventario/equipo/${idEquipo}`, { headers: authHeaderInventario() })
      .then(({ data }) => { if (mounted) setEquipo(data); })
      .catch(() => notification.error({ message: "No se pudo cargar el equipo" }))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [idEquipo]);

  const fetchMovimientos = useCallback(async () => {
    try {
      const { data } = await apiInventarioInstance.get(
        `/inventario/equipo/${idEquipo}/movimientos`,
        { headers: authHeaderInventario() }
      );
      setMovimientos(Array.isArray(data) ? data : []);
    } catch {
      setMovimientos([]);
    }
  }, [idEquipo]);

  useEffect(() => { fetchMovimientos(); }, [fetchMovimientos]);

  const fetchAnalisis = useCallback(async (periodo, customRange) => {
    if (periodo === "custom" && !customRange) return;
    const [dateFrom, dateTo] = getDateRange(periodo, customRange);
    setAnalisisLoading(true);
    try {
      const { data } = await apiInventarioInstance.get(
        `/inventario/equipo/${idEquipo}/analisis`,
        {
          headers: authHeaderInventario(),
          params: { date_from: dateFrom, date_to: dateTo },
        }
      );
      setAnalisisData(data);
    } catch {
      setAnalisisData(null);
    } finally {
      setAnalisisLoading(false);
    }
  }, [idEquipo]);

  useEffect(() => {
    if (activeTab === "analisis") {
      fetchAnalisis(analisisPeriodo, analisisCustomRange);
    }
  }, [activeTab, analisisPeriodo, analisisCustomRange, fetchAnalisis]);

  const handleAnalisisPeriodo = (val) => {
    setAnalisisPeriodo(val);
    if (val !== "custom") setAnalisisCustomRange(null);
  };

  const handleAnalisisRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) setAnalisisCustomRange(dates);
  };

  const handleMovPeriodo = (val) => {
    setMovPeriodo(val);
    if (val !== "custom") setMovCustomRange(null);
  };

  const handleMovRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) setMovCustomRange(dates);
  };

  const filteredMovimientos = useMemo(() => {
    const [from, to] = getDateRange(movPeriodo, movCustomRange);
    return movimientos.filter((m) => {
      if (!m.fecha_movimiento) return false;
      const d = dayjs(m.fecha_movimiento);
      return d.isValid() && !d.isBefore(from, "day") && !d.isAfter(to, "day");
    });
  }, [movimientos, movPeriodo, movCustomRange]);

  const handleToggleActive = () => {
    if (!equipo) return;
    const nuevoEstado = !equipo.active;
    Modal.confirm({
      title: nuevoEstado ? "Reactivar equipo" : "Descontinuar equipo",
      content: nuevoEstado
        ? "El equipo volverá a estar vigente y disponible."
        : "El equipo se marcará como descontinuado. Seguirá visible pero no estará disponible.",
      okText: nuevoEstado ? "Reactivar" : "Descontinuar",
      okType: nuevoEstado ? "primary" : "default",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        setToggling(true);
        try {
          await apiInventarioInstance.patch(
            `/inventario/equipo/${idEquipo}`,
            { active: nuevoEstado ? 1 : 0 },
            { headers: authHeaderInventario() }
          );
          notification.success({
            message: nuevoEstado ? "Equipo reactivado" : "Equipo descontinuado",
          });
          reloadEquipo();
        } catch (err) {
          notification.error({
            message: "Error al actualizar",
            description: err?.response?.data?.detail || err.message,
          });
        } finally {
          setToggling(false);
        }
      },
    });
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Eliminar equipo",
      content: "El equipo se eliminará del sistema permanentemente (borrado lógico).",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          setDeleting(true);
          await apiInventarioInstance.delete(`/inventario/equipo/${idEquipo}`, {
            headers: authHeaderInventario(),
          });
          notification.success({ message: "Equipo eliminado" });
          navigate("/inventario");
        } catch (err) {
          notification.error({
            message: "Error al eliminar",
            description: err?.response?.data?.detail || err.message,
          });
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const handleDeleteMovimiento = (mov) => {
    Modal.confirm({
      title: "Eliminar movimiento",
      content: "¿Eliminar este movimiento? Esta acción es irreversible.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          await apiInventarioInstance.delete(
            `/inventario/equipo/${idEquipo}/movimientos/${mov.id_equipo_movimiento}`,
            { headers: authHeaderInventario() }
          );
          notification.success({ message: "Movimiento eliminado" });
          fetchMovimientos();
          reloadEquipo();
        } catch (err) {
          notification.error({
            message: "Error al eliminar",
            description: err?.response?.data?.detail || err.message,
          });
        }
      },
    });
  };

  const reloadEquipo = async () => {
    try {
      const { data } = await apiInventarioInstance.get(
        `/inventario/equipo/${idEquipo}`,
        { headers: authHeaderInventario() }
      );
      setEquipo(data);
    } catch { /* noop */ }
  };

  const handleAddMovimiento = async () => {
    let values;
    try { values = await movForm.validateFields(); } catch { return; }
    setSavingMov(true);
    try {
      await apiInventarioInstance.post(
        `/inventario/equipo/${idEquipo}/movimientos`,
        {
          tipo: values.tipo,
          cantidad: parseInt(values.cantidad, 10),
          motivo: values.motivo,
          fecha_movimiento: values.fecha_movimiento
            ? dayjs(values.fecha_movimiento).format("YYYY-MM-DDTHH:mm:ss")
            : undefined,
          descripcion: values.descripcion?.trim() || null,
        },
        { headers: authHeaderInventario() }
      );
      notification.success({ message: "Movimiento registrado" });
      movForm.resetFields();
      setMovModalOpen(false);
      fetchMovimientos();
      reloadEquipo();
    } catch (err) {
      notification.error({
        message: "Error al guardar movimiento",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSavingMov(false);
    }
  };

  if (loading) {
    return (
      <div className="cd-main">
        <div className="cd-content">
          <div className="cd-loading-wrap"><Spin size="large" /></div>
        </div>
      </div>
    );
  }

  if (!equipo) return null;

  const estadoInfo = ESTADO_MAP[equipo.estado] || { label: equipo.estado, cls: "" };
  const vigente = Boolean(equipo.active);
  const cantidad = parseInt(equipo.cantidad_disponible ?? 0, 10);

  const totalEntradas = movimientos
    .filter((m) => m.tipo === "entrada")
    .reduce((a, m) => a + (parseInt(m.cantidad, 10) || 0), 0);

  const totalBajas = movimientos
    .filter((m) => m.tipo === "baja")
    .reduce((a, m) => a + (parseInt(m.cantidad, 10) || 0), 0);

  // Análisis chart data
  const comparacion = analisisData?.comparacion_categoria || [];
  const donutData = comparacion.length > 0 ? {
    labels: comparacion.map((c) => c.nombre),
    datasets: [{
      data: comparacion.map((c) => c.eventos_count || 0),
      backgroundColor: DONUT_COLORS.slice(0, comparacion.length),
      borderWidth: 0,
    }],
  } : null;

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 12 }, padding: 12, usePointStyle: true } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} eventos` } },
    },
  };

  const stats = analisisData?.stats || {};
  const eventos = analisisData?.eventos || [];
  const totalHorasEvt = eventos.reduce((s, e) => s + (parseFloat(e.duracion_horas) || 0), 0);

  return (
    <div className="cd-main">
      <div className="cd-content">

        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          className="cd-back-btn"
          onClick={() => navigate("/inventario")}
        >
          Volver a Inventario
        </Button>

        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <h1 className="cd-client-name">{(equipo.nombre || "—").toUpperCase()}</h1>
                <span className={`cd-status-badge ${vigente ? "cd-status-active" : "cd-status-inactive"}`}>
                  <span className={`cd-status-dot ${vigente ? "cd-dot-active" : "cd-dot-inactive"}`} />
                  {vigente ? "Vigente" : "Descontinuado"}
                </span>
              </div>
              <div className="cd-header-meta">
                {equipo.nombre_categoria && (
                  <span className="cd-meta-item">
                    <AppstoreOutlined />
                    {equipo.nombre_categoria}
                  </span>
                )}
                {equipo.created_by_nombre && (
                  <span className="cd-meta-item">
                    <ToolOutlined />
                    {equipo.created_by_nombre}
                  </span>
                )}
                {equipo.datetime && (
                  <span className="cd-meta-item">
                    <CalendarOutlined />
                    Registrado: {fmtFechaCorta(equipo.datetime)}
                  </span>
                )}
              </div>
            </div>

            <div className="cd-header-actions">
              {canEditar && (
                <Button
                  icon={vigente ? <StopOutlined /> : <CheckCircleOutlined />}
                  className="cd-btn-edit"
                  loading={toggling}
                  onClick={handleToggleActive}
                  style={vigente
                    ? { borderColor: "#f59e0b", color: "#b45309" }
                    : { borderColor: "#16a34a", color: "#16a34a" }
                  }
                >
                  {vigente ? "Descontinuar" : "Reactivar"}
                </Button>
              )}
              {canEditar && (
                <Button
                  icon={<EditOutlined />}
                  className="cd-btn-edit"
                  onClick={() =>
                    navigate(`/inventario/equipo/${equipo.id_equipo}/editar`, {
                      state: { equipo },
                    })
                  }
                >
                  Editar
                </Button>
              )}
              {canEliminar && (
                <Button
                  icon={<DeleteOutlined />}
                  className="cd-btn-delete"
                  loading={deleting}
                  onClick={handleDelete}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          <div className="cd-header-tabs">
            <button
              className={`cd-tab-btn ${activeTab === "datos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              <FileTextOutlined />
              Datos del equipo
            </button>
              <button
              className={`cd-tab-btn ${activeTab === "analisis" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("analisis")}
            >
              <BarChartOutlined />
              Análisis
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "movimientos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("movimientos")}
            >
              <HistoryOutlined />
              Movimientos
            </button>
          
          </div>
        </div>

        {activeTab === "datos" && (
          <div className="cd-bento-grid">
            <div className="cd-card cd-card-client">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><ToolOutlined /></div>
                <h2 className="cd-card-title">Información del equipo</h2>
              </div>
              <div className="cd-client-fields">
                <div>
                  <span className="cd-field-label">Nombre</span>
                  <span className="cd-field-value" style={{ textTransform: "capitalize" }}>{equipo.nombre || "—"}</span>
                </div>
                <div>
                  <span className="cd-field-label">Categoría</span>
                  <span className="cd-field-value" style={{ textTransform: "capitalize" }}>{equipo.nombre_categoria || "—"}</span>
                </div>
                <div>
                  <span className="cd-field-label">Estado</span>
                  <span className="cd-field-value" style={{ textTransform: "capitalize" }}>{estadoInfo.label}</span>
                </div>
                <div>
                  <span className="cd-field-label">Disponibilidad</span>
                  <span
                    className="cd-field-value"
                    style={{ color: vigente ? "#15803d" : "#b45309", fontWeight: 600 }}
                  >
                    {vigente ? "Vigente" : "Descontinuado"}
                  </span>
                </div>
                <div>
                  <span className="cd-field-label">Descripción</span>
                  <span className="cd-field-value cd-field-value-muted" style={{ textTransform: "capitalize" }}>{equipo.descripcion || "—"}</span>
                </div>
              </div>
            </div>

            <div className="cd-card cd-card-event">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><AppstoreOutlined /></div>
                <h2 className="cd-card-title">Resumen de stock</h2>
              </div>
              <div className="cd-financial-grid">
                <div className="cd-financial-item">
                  <span className="cd-field-label">Disponible</span>
                  <p className={`cd-financial-value ${cantidad > 0 ? "cd-financial-ok" : "cd-financial-error"}`}>
                    {cantidad}
                  </p>
                  <span className="cd-financial-note">Calculado desde movimientos</span>
                </div>
                <div className="cd-financial-item cd-financial-bordered">
                  <span className="cd-field-label">Total entradas</span>
                  <p className="cd-financial-value" style={{ color: "#15803d" }}>{totalEntradas}</p>
                  <span className="cd-financial-note">Unidades ingresadas</span>
                </div>
                <div className="cd-financial-item">
                  <span className="cd-field-label">Total bajas</span>
                  <p className="cd-financial-value" style={{ color: "#b91c1c" }}>{totalBajas}</p>
                  <span className="cd-financial-note">Unidades dadas de baja</span>
                </div>
              </div>
            </div>

            <div className="cd-card cd-card-financial">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><CalendarOutlined /></div>
                <h2 className="cd-card-title">Registro</h2>
              </div>
              <div className="cd-client-fields">
                <div>
                  <span className="cd-field-label">Fecha de registro</span>
                  <span className="cd-field-value">{fmtFecha(equipo.datetime)}</span>
                </div>
                {equipo.created_by_nombre && (
                  <div>
                    <span className="cd-field-label">Registrado por</span>
                    <span className="cd-field-value">{equipo.created_by_nombre}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "movimientos" && (
          <div className="cd-card">
            <div className="cd-pagos-header">
              <div className="cd-pagos-header-left">
                <div className="cd-card-icon-wrap"><HistoryOutlined /></div>
                <h2 className="cd-card-title">Movimientos de inventario</h2>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="cd-btn-add-pago"
                onClick={() => setMovModalOpen(true)}
              >
                Registrar movimiento
              </Button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0", justifyContent: "flex-end" }}>
              <Select
                value={movPeriodo}
                onChange={handleMovPeriodo}
                options={PERIODO_OPTIONS}
                style={{ width: 160 }}
                size="middle"
                className="est-select"
              />
              {movPeriodo === "custom" && (
                <RangePicker
                  onChange={handleMovRangeChange}
                  format="DD/MM/YYYY"
                  placeholder={["Desde", "Hasta"]}
                />
              )}
            </div>

            <div className="cd-pagos-summary">
              <div className="cd-pagos-summary-item">
                <span className="cd-field-label">Disponible</span>
                <span className={`cd-pagos-summary-val ${cantidad > 0 ? "cd-financial-ok" : "cd-financial-error"}`}>
                  {cantidad} uds.
                </span>
              </div>
              <div className="cd-pagos-summary-item">
                <span className="cd-field-label">Total entradas</span>
                <span className="cd-pagos-summary-val">{totalEntradas}</span>
              </div>
              <div className="cd-pagos-summary-item">
                <span className="cd-field-label">Total bajas</span>
                <span className="cd-pagos-summary-val">{totalBajas}</span>
              </div>
              <div className="cd-pagos-summary-item">
                <span className="cd-field-label">Mostrando</span>
                <span className="cd-pagos-summary-val">{filteredMovimientos.length} de {movimientos.length}</span>
              </div>
            </div>

            <Divider style={{ margin: "4px 0 16px" }} />

            <div className="cd-pagos-list">
              <div className="cd-pagos-list-header" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 36px" }}>
                <span>Tipo</span>
                <span>Cantidad</span>
                <span>Motivo</span>
                <span>Fecha</span>
                <span>Descripción</span>
                <span />
              </div>

              {filteredMovimientos.map((m) => (
                <div
                  key={m.id_equipo_movimiento}
                  className="cd-pagos-row"
                  style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr 36px" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {m.tipo === "entrada"
                      ? <ArrowUpOutlined style={{ color: "#15803d" }} />
                      : <ArrowDownOutlined style={{ color: "#b91c1c" }} />}
                    <span style={{ fontWeight: 700, color: m.tipo === "entrada" ? "#15803d" : "#b91c1c" }}>
                      {TIPO_MOV_MAP[m.tipo] || m.tipo}
                    </span>
                  </span>
                  <span className="cd-pagos-monto">{m.cantidad}</span>
                  <span>{MOTIVO_MAP[m.motivo] || m.motivo}</span>
                  <span>{fmtFechaCorta(m.fecha_movimiento)}</span>
                  <span style={{ color: "#595c5e", fontSize: 12 }}>{m.descripcion || "—"}</span>
                  <button
                    className="cd-doc-delete-btn"
                    onClick={() => handleDeleteMovimiento(m)}
                    title="Eliminar movimiento"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              ))}

              {filteredMovimientos.length === 0 && (
                <Empty description="Sin movimientos en este período" style={{ margin: "32px 0" }} />
              )}
            </div>
          </div>
        )}

        {activeTab === "analisis" && (
          <div>
            {/* Period selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, justifyContent: "flex-end" }}>
              <Select
                value={analisisPeriodo}
                onChange={handleAnalisisPeriodo}
                options={PERIODO_OPTIONS}
                style={{ width: 160 }}
                size="middle"
                className="est-select"
              />
              {analisisPeriodo === "custom" && (
                <RangePicker
                  onChange={handleAnalisisRangeChange}
                  format="DD/MM/YYYY"
                  placeholder={["Desde", "Hasta"]}
                />
              )}
            </div>

            {analisisLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
                <Spin size="large" />
              </div>
            ) : (
              <>
                {/* KPI stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                  <div className="cd-card" style={{ padding: "20px 24px" }}>
                    <span className="cd-field-label">Horas en eventos</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: "#05060a" }}>
                      {stats.total_horas ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 4 }}>hrs</span>
                    </p>
                    <span className="cd-financial-note">Realizadas o programadas en el período</span>
                  </div>

                  <div className="cd-card" style={{ padding: "20px 24px" }}>
                    <span className="cd-field-label">Eventos donde fue asignado</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: "#05060a" }}>
                      {stats.eventos_count ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 4 }}>
                        de {stats.total_eventos_negocio ?? 0}
                      </span>
                    </p>
                    <span className="cd-financial-note">Del total de eventos del negocio en el período</span>
                  </div>

                  <div className="cd-card" style={{ padding: "20px 24px" }}>
                    <span className="cd-field-label">Tasa de uso</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: (stats.tasa_uso_pct ?? 0) >= 50 ? "#15803d" : "#05060a" }}>
                      {stats.tasa_uso_pct ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 2 }}>%</span>
                    </p>
                    <span className="cd-financial-note">
                      Este equipo está en el {stats.tasa_uso_pct ?? 0}% de los eventos del período
                    </span>
                  </div>
                </div>

                {/* Two-column: events table + category pie chart */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Events table */}
                  <div className="cd-card">
                    <div className="cd-card-header">
                      <div className="cd-card-icon-wrap"><CalendarOutlined /></div>
                      <h2 className="cd-card-title">Eventos en el período</h2>
                    </div>
                    {eventos.length === 0 ? (
                      <Empty description="Sin eventos en este período" style={{ margin: "32px 0" }} />
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#64748b" }}>Fecha</th>
                              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#64748b" }}>Cliente</th>
                              <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "#64748b" }}>Hrs estimadas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventos.map((e) => (
                              <tr key={e.id_contrato} style={{ borderBottom: "1px solid #f8fafc" }}>
                                <td style={{ padding: "7px 8px" }}>{fmtFechaCorta(e.fecha_evento)}</td>
                                <td style={{ padding: "7px 8px", color: "#374151" }}>{e.cliente_nombre || "—"}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 600 }}>
                                  {parseFloat(e.duracion_horas || 0).toFixed(1)} hrs
                                </td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                              <td style={{ padding: "8px", fontWeight: 700 }} colSpan={2}>
                                Total — {eventos.length} eventos
                              </td>
                              <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>
                                {totalHorasEvt.toFixed(1)} hrs
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Category comparison pie chart */}
                  <div className="cd-card">
                    <div className="cd-card-header">
                      <div className="cd-card-icon-wrap"><AppstoreOutlined /></div>
                      <h2 className="cd-card-title">Comparación en categoría</h2>
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                      {equipo.nombre_categoria ? `Categoría: ${equipo.nombre_categoria}` : "Todos los equipos"}
                      {" — "}por número de eventos usados en el período
                    </p>
                    {!donutData || comparacion.every((c) => c.eventos_count === 0) ? (
                      <Empty description="Sin datos de comparación" style={{ margin: "32px 0" }} />
                    ) : (
                      <div style={{ height: 260, display: "flex", justifyContent: "center" }}>
                        <Doughnut data={donutData} options={donutOptions} />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      <Modal
        open={movModalOpen}
        onCancel={() => { setMovModalOpen(false); movForm.resetFields(); }}
        onOk={handleAddMovimiento}
        okText="Guardar movimiento"
        cancelText="Cancelar"
        title="Registrar movimiento"
        confirmLoading={savingMov}
        centered
        okButtonProps={{ style: { background: "#05060a", borderColor: "#05060a" } }}
      >
        <Form form={movForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="tipo"
            label="Tipo de movimiento"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Select
              placeholder="Entrada o baja"
              options={[
                { label: "Entrada (suma al stock)", value: "entrada" },
                { label: "Baja (resta del stock)", value: "baja" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="cantidad"
            label="Cantidad"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Input type="number" min={1} placeholder="1" />
          </Form.Item>
          <Form.Item
            name="motivo"
            label="Motivo"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Select
              placeholder="Motivo del movimiento"
              options={[
                { label: "Compra", value: "compra" },
                { label: "Pérdida", value: "perdida" },
                { label: "Rotura", value: "rotura" },
                { label: "Otro", value: "otro" },
              ]}
            />
          </Form.Item>
          <Form.Item name="fecha_movimiento" label="Fecha del movimiento">
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción (opcional)">
            <Input placeholder="Ej: Compra de 5 unidades nuevas" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
