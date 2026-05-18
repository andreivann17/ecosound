import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiTrabajadoresInstance,
  authHeaderTrabajadores,
} from "../../redux/actions/trabajadores/trabajadores";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import {
  Button,
  Modal,
  notification,
  Select,
  DatePicker,
  Spin,
  Empty,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  BarChartOutlined,
  TeamOutlined,
} from "@ant-design/icons";

import "./EventoDetallePage.css";
import "./EstadisticasPage.css";

dayjs.locale("es");
ChartJS.register(ArcElement, Tooltip, Legend);

const { RangePicker } = DatePicker;

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

export default function TrabajadorDetallePage() {
  const { idTrabajador } = useParams();
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = perm("trabajadores", "editar");
  const canEliminar = perm("trabajadores", "eliminar");

  const [trabajador, setTrabajador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("datos");
  const [deletingModal, setDeletingModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Análisis state
  const [analisisPeriodo, setAnalisisPeriodo] = useState("mes");
  const [analisisCustomRange, setAnalisisCustomRange] = useState(null);
  const [analisisData, setAnalisisData] = useState(null);
  const [analisisLoading, setAnalisisLoading] = useState(false);

  const fetchTrabajador = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiTrabajadoresInstance.get(
        `/trabajadores/${idTrabajador}`,
        { headers: authHeaderTrabajadores() }
      );
      setTrabajador(res.data);
    } catch {
      notification.error({ message: "Error al cargar trabajador" });
    } finally {
      setLoading(false);
    }
  }, [idTrabajador]);

  useEffect(() => { fetchTrabajador(); }, [fetchTrabajador]);

  const fetchAnalisis = useCallback(async (periodo, customRange) => {
    if (periodo === "custom" && !customRange) return;
    const [dateFrom, dateTo] = getDateRange(periodo, customRange);
    setAnalisisLoading(true);
    try {
      const { data } = await apiTrabajadoresInstance.get(
        `/trabajadores/${idTrabajador}/analisis`,
        {
          headers: authHeaderTrabajadores(),
          params: { date_from: dateFrom, date_to: dateTo },
        }
      );
      setAnalisisData(data);
    } catch {
      setAnalisisData(null);
    } finally {
      setAnalisisLoading(false);
    }
  }, [idTrabajador]);

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiTrabajadoresInstance.delete(
        `/trabajadores/${idTrabajador}`,
        { headers: authHeaderTrabajadores() }
      );
      notification.success({ message: "Trabajador eliminado" });
      navigate("/trabajadores");
    } catch (err) {
      notification.error({
        message: "Error al eliminar",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setDeleting(false);
      setDeletingModal(false);
    }
  };

  const getInitials = (nombre, apellido) => {
    const a = (nombre || " ")[0] || "";
    const b = (apellido || " ")[0] || "";
    return (a + b).toUpperCase();
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

  if (!trabajador) return null;

  // Análisis chart data
  const comparacion = analisisData?.comparacion_puesto || [];
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
          onClick={() => navigate("/trabajadores")}
        >
          Volver a Trabajadores
        </Button>

        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="trab-avatar" style={{ width: 48, height: 48, fontSize: 18, minWidth: 48 }}>
                    {getInitials(trabajador.nombre, trabajador.apellido)}
                  </div>
                  <div>
                    <h1 className="cd-client-name" style={{ textTransform: "capitalize", fontSize: 22 }}>
                      {trabajador.nombre} {trabajador.apellido}
                    </h1>
                    {trabajador.nombre_puesto && (
                      <span className="trab-puesto-badge" style={{ marginTop: 4, display: "inline-block" }}>
                        {trabajador.nombre_puesto}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="cd-header-meta">
                {trabajador.nombre_puesto && (
                  <span className="cd-meta-item">
                    <TeamOutlined />
                    {trabajador.nombre_puesto}
                  </span>
                )}
                {trabajador.datetime && (
                  <span className="cd-meta-item">
                    <CalendarOutlined />
                    Registrado: {fmtFechaCorta(trabajador.datetime)}
                  </span>
                )}
              </div>
            </div>

            <div className="cd-header-actions">
              {canEditar && (
                <Button
                  icon={<EditOutlined />}
                  className="cd-btn-edit"
                  onClick={() => navigate(`/trabajadores/${idTrabajador}/editar`, { state: { trabajador } })}
                >
                  Editar
                </Button>
              )}
              {canEliminar && (
                <Button
                  icon={<DeleteOutlined />}
                  className="cd-btn-delete"
                  loading={deleting}
                  onClick={() => setDeletingModal(true)}
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
              <UserOutlined />
              Datos del trabajador
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "analisis" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("analisis")}
            >
              <BarChartOutlined />
              Análisis
            </button>
          </div>
        </div>

        {activeTab === "datos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="td-datos-grid">
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><UserOutlined /></div>
                <h2 className="cd-card-title">Información personal</h2>
              </div>
              <div className="cd-client-fields">
                <div>
                  <span className="cd-field-label">Nombre</span>
                  <span className="cd-field-value" style={{ textTransform: "capitalize" }}>{trabajador.nombre || "—"}</span>
                </div>
                <div>
                  <span className="cd-field-label">Apellido</span>
                  <span className="cd-field-value" style={{ textTransform: "capitalize" }}>{trabajador.apellido || "—"}</span>
                </div>
                <div>
                  <span className="cd-field-label">Puesto</span>
                  <span className="cd-field-value" style={{ textTransform: "capitalize" }}>{trabajador.nombre_puesto || "—"}</span>
                </div>
                <div>
                  <span className="cd-field-label">Fecha de nacimiento</span>
                  <span className="cd-field-value">{fmtFecha(trabajador.fecha_nacimiento)}</span>
                </div>
              </div>
            </div>

            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><CalendarOutlined /></div>
                <h2 className="cd-card-title">Registro</h2>
              </div>
              <div className="cd-client-fields">
                <div>
                  <span className="cd-field-label">Fecha de registro</span>
                  <span className="cd-field-value">{fmtFecha(trabajador.datetime)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "analisis" && (
          <div>
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                  <div className="cd-card" style={{ padding: "20px 24px" }}>
                    <span className="cd-field-label">Horas trabajadas en eventos</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: "#05060a" }}>
                      {stats.total_horas ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 4 }}>hrs</span>
                    </p>
                    <span className="cd-financial-note">En el período seleccionado</span>
                  </div>

                  <div className="cd-card" style={{ padding: "20px 24px" }}>
                    <span className="cd-field-label">Eventos donde participó</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: "#05060a" }}>
                      {stats.eventos_count ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 4 }}>
                        de {stats.total_eventos_negocio ?? 0}
                      </span>
                    </p>
                    <span className="cd-financial-note">Total de eventos del negocio en el período</span>
                  </div>

                  <div className="cd-card" style={{ padding: "20px 24px" }}>
                    <span className="cd-field-label">Tasa de participación</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: (stats.tasa_pct ?? 0) >= 50 ? "#15803d" : "#05060a" }}>
                      {stats.tasa_pct ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 2 }}>%</span>
                    </p>
                    <span className="cd-financial-note">
                      {trabajador.nombre} participó en el {stats.tasa_pct ?? 0}% de los eventos
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#64748b" }}>Puesto</th>
                              <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "#64748b" }}>Duración</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventos.map((e) => (
                              <tr key={e.id_contrato} style={{ borderBottom: "1px solid #f8fafc" }}>
                                <td style={{ padding: "7px 8px" }}>{fmtFechaCorta(e.fecha_evento)}</td>
                                <td style={{ padding: "7px 8px", color: "#374151" }}>{e.cliente_nombre || "—"}</td>
                                <td style={{ padding: "7px 8px", color: "#64748b", fontSize: 12 }}>{e.nombre_puesto_evento || "—"}</td>
                                <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 600 }}>
                                  {parseFloat(e.duracion_horas || 0).toFixed(1)} hrs
                                </td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                              <td style={{ padding: "8px", fontWeight: 700 }} colSpan={3}>
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

                  <div className="cd-card">
                    <div className="cd-card-header">
                      <div className="cd-card-icon-wrap"><TeamOutlined /></div>
                      <h2 className="cd-card-title">Comparación en puesto</h2>
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                      {trabajador.nombre_puesto ? `Puesto: ${trabajador.nombre_puesto}` : "Todos los trabajadores"}
                      {" — "}por número de eventos participados en el período
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
        title="Eliminar trabajador"
        open={deletingModal}
        onCancel={() => setDeletingModal(false)}
        onOk={handleDelete}
        confirmLoading={deleting}
        okText="Eliminar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
      >
        <p>
          ¿Estás seguro que deseas eliminar a{" "}
          <strong>{trabajador.nombre} {trabajador.apellido}</strong>?
          Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
