import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiPaquetesInstance,
  authHeaderPaquetes,
} from "../../redux/actions/paquetes/paquetes";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import {
  Button,
  Modal,
  Form,
  Input,
  notification,
  Select,
  DatePicker,
  Spin,
  Empty,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  CameraOutlined,
  SoundOutlined,
  CheckCircleOutlined,
  StopOutlined,
  BarChartOutlined,
  CalendarOutlined,
  HistoryOutlined,
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

const DATE_FIELD_OPTIONS = [
  { value: "fecha_evento",             label: "Fecha del evento" },
  { value: "fecha_creacion_contrato",  label: "Fecha de contratación" },
];

const DONUT_COLORS = [
  "#6366f1", "#10b981", "#f97316", "#f59e0b",
  "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6",
];

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

export default function PaqueteDetallePage() {
  const { idPaquete } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = perm("paquetes", "editar");
  const canEliminar = perm("paquetes", "eliminar");

  const isSonidoParam = searchParams.get("is_sonido");
  const isSonido = isSonidoParam === "1" || isSonidoParam === "true";

  const [paquete, setPaquete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [activeTab, setActiveTab] = useState("datos");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [savingContenido, setSavingContenido] = useState(false);
  const [contenidoForm] = Form.useForm();

  // Análisis state
  const [analisisPeriodo, setAnalisisPeriodo] = useState("mes");
  const [analisisCustomRange, setAnalisisCustomRange] = useState(null);
  const [analisisDateField, setAnalisisDateField] = useState("fecha_evento");
  const [analisisData, setAnalisisData] = useState(null);

  // Actividad state
  const [actividad, setActividad] = useState([]);
  const [loadingActividad, setLoadingActividad] = useState(false);
  const [analisisLoading, setAnalisisLoading] = useState(false);

  const isSonidoRef = useRef(isSonido);
  isSonidoRef.current = isSonido;

  const fetchPaquete = useCallback(async () => {
    try {
      const { data } = await apiPaquetesInstance.get(
        `/paquetes/${idPaquete}?is_sonido=${isSonidoRef.current}`,
        { headers: authHeaderPaquetes() }
      );
      setPaquete(data);
    } catch {
      notification.error({ message: "No se pudo cargar el paquete" });
    }
  }, [idPaquete]);

  useEffect(() => {
    if (isSonidoParam === null) return;
    let mounted = true;
    setLoading(true);
    apiPaquetesInstance
      .get(`/paquetes/${idPaquete}?is_sonido=${isSonido}`, { headers: authHeaderPaquetes() })
      .then(({ data }) => { if (mounted) setPaquete(data); })
      .catch(() => notification.error({ message: "No se pudo cargar el paquete" }))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [idPaquete, isSonidoParam]);

  const fetchAnalisis = useCallback(async (periodo, customRange, dateField) => {
    if (periodo === "custom" && !customRange) return;
    const [dateFrom, dateTo] = getDateRange(periodo, customRange);
    setAnalisisLoading(true);
    try {
      const { data } = await apiPaquetesInstance.get(
        `/paquetes/${idPaquete}/analisis`,
        {
          headers: authHeaderPaquetes(),
          params: {
            is_sonido: isSonidoRef.current,
            date_from: dateFrom,
            date_to: dateTo,
            date_field: dateField || "fecha_evento",
          },
        }
      );
      setAnalisisData(data);
    } catch {
      setAnalisisData(null);
    } finally {
      setAnalisisLoading(false);
    }
  }, [idPaquete]);

  useEffect(() => {
    if (activeTab === "analisis") {
      fetchAnalisis(analisisPeriodo, analisisCustomRange, analisisDateField);
    }
  }, [activeTab, analisisPeriodo, analisisCustomRange, analisisDateField, fetchAnalisis]);

  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const { data } = await apiPaquetesInstance.get(
        `/paquetes/${idPaquete}/actividad`,
        { headers: authHeaderPaquetes(), params: { is_sonido: isSonido } }
      );
      setActividad(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setActividad([]);
    } finally {
      setLoadingActividad(false);
    }
  }, [idPaquete, isSonido]);

  useEffect(() => {
    if (activeTab === "actividad") fetchActividad();
  }, [activeTab, fetchActividad]);

  const handleAnalisisPeriodo = (val) => {
    setAnalisisPeriodo(val);
    if (val !== "custom") setAnalisisCustomRange(null);
  };

  const handleAnalisisRangeChange = (dates) => {
    if (dates && dates[0] && dates[1]) setAnalisisCustomRange(dates);
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "Eliminar paquete",
      content: "El paquete se eliminará del sistema permanentemente (borrado lógico).",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        setDeleting(true);
        try {
          await apiPaquetesInstance.delete(
            `/paquetes/${idPaquete}?is_sonido=${isSonido}`,
            { headers: authHeaderPaquetes() }
          );
          notification.success({ message: "Paquete eliminado" });
          navigate("/app/paquetes");
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

  const handleToggleActive = async () => {
    if (!paquete) return;
    const nuevoEstado = !paquete.active;
    const accion = nuevoEstado ? "reactivar" : "descontinuar";
    Modal.confirm({
      title: nuevoEstado ? "Reactivar paquete" : "Descontinuar paquete",
      content: nuevoEstado
        ? "El paquete volverá a estar vigente y disponible para asignar."
        : "El paquete se marcará como descontinuado. Seguirá visible pero no estará disponible.",
      okText: nuevoEstado ? "Reactivar" : "Descontinuar",
      okType: nuevoEstado ? "primary" : "default",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        setToggling(true);
        try {
          await apiPaquetesInstance.patch(
            `/paquetes/${idPaquete}?is_sonido=${isSonido}`,
            { active: nuevoEstado },
            { headers: authHeaderPaquetes() }
          );
          notification.success({
            message: nuevoEstado ? "Paquete reactivado" : "Paquete descontinuado",
          });
          fetchPaquete();
        } catch (err) {
          notification.error({
            message: `Error al ${accion}`,
            description: err?.response?.data?.detail || err.message,
          });
        } finally {
          setToggling(false);
        }
      },
    });
  };

  const handleDeleteContenido = (contenido) => {
    Modal.confirm({
      title: "Eliminar elemento",
      content: `¿Eliminar "${contenido.descripcion}"? Esta acción es irreversible.`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          await apiPaquetesInstance.delete(
            `/paquetes/contenidos/${contenido.id_paquete_contenido}`,
            { headers: authHeaderPaquetes() }
          );
          notification.success({ message: "Elemento eliminado" });
          fetchPaquete();
        } catch (err) {
          notification.error({
            message: "Error al eliminar",
            description: err?.response?.data?.detail || err.message,
          });
        }
      },
    });
  };

  const handleAddContenido = async () => {
    let values;
    try { values = await contenidoForm.validateFields(); } catch { return; }
    setSavingContenido(true);
    try {
      await apiPaquetesInstance.post(
        `/paquetes/${idPaquete}/contenidos?is_sonido=${isSonido}`,
        { descripcion: values.descripcion.trim() },
        { headers: authHeaderPaquetes() }
      );
      notification.success({ message: "Elemento agregado" });
      contenidoForm.resetFields();
      setAddModalOpen(false);
      fetchPaquete();
    } catch (err) {
      notification.error({
        message: "Error al agregar",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSavingContenido(false);
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

  if (!paquete) return null;

  const contenidos = paquete.contenidos || [];
  const tipoLabel = isSonido ? "Sonido" : "Fotografía";
  const TipoIcon = isSonido ? SoundOutlined : CameraOutlined;
  const vigente = Boolean(paquete.active);

  // Análisis derived data
  const stats = analisisData?.stats || {};
  const eventos = analisisData?.eventos || [];
  const comparacion = analisisData?.comparacion_tipo || [];
  const totalHorasEvt = eventos.reduce((s, e) => s + (parseFloat(e.duracion_horas) || 0), 0);

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

  return (
    <div className="cd-main">
      <div className="cd-content">

        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          className="cd-back-btn"
          onClick={() => navigate("/app/paquetes")}
        >
          Volver a Paquetes
        </Button>

        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <h1 className="cd-client-name">{(paquete.nombre || "—").toUpperCase()}</h1>
                <span className={`cd-status-badge ${vigente ? "cd-status-active" : "cd-status-inactive"}`}>
                  <span className={`cd-status-dot ${vigente ? "cd-dot-active" : "cd-dot-inactive"}`} />
                  {vigente ? "Vigente" : "Descontinuado"}
                </span>
              </div>
              <div className="cd-header-meta">
                <span className="cd-meta-item">
                  <TipoIcon />
                  {tipoLabel}
                </span>
                <span className="cd-meta-item">
                  <UnorderedListOutlined />
                  {contenidos.length} {contenidos.length === 1 ? "elemento" : "elementos"}
                </span>
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
                    navigate(`/paquetes/${paquete.id_paquete}/editar?is_sonido=${isSonidoParam}`, {
                      state: { paquete },
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
              Información
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "contenidos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("contenidos")}
            >
              <UnorderedListOutlined />
              Contenido ({contenidos.length})
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "analisis" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("analisis")}
            >
              <BarChartOutlined />
              Análisis
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "actividad" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("actividad")}
            >
              <HistoryOutlined />
              Actividad
              {actividad.length > 0 && (
                <span className="cd-actividad-count">{actividad.length}</span>
              )}
            </button>
          </div>
        </div>

        {activeTab === "datos" && (
          <div className="cd-bento-grid">
            <div className="cd-card cd-card-client">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><AppstoreOutlined /></div>
                <h2 className="cd-card-title">Información del paquete</h2>
              </div>
              <div className="cd-client-fields">
                <div>
                  <span className="cd-field-label">Nombre</span>
                  <span className="cd-field-value" style={{ textTransform: "capitalize" }}>
                    {paquete.nombre || "—"}
                  </span>
                </div>
                <div>
                  <span className="cd-field-label">Tipo</span>
                  <span className="cd-field-value">{tipoLabel}</span>
                </div>
                <div>
                  <span className="cd-field-label">Estado</span>
                  <span
                    className="cd-field-value"
                    style={{ color: vigente ? "#15803d" : "#b45309", fontWeight: 600 }}
                  >
                    {vigente ? "Vigente" : "Descontinuado"}
                  </span>
                </div>
              </div>
            </div>

            <div className="cd-card cd-card-event">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><UnorderedListOutlined /></div>
                <h2 className="cd-card-title">Resumen de contenido</h2>
              </div>
              <div className="cd-financial-grid">
                <div className="cd-financial-item">
                  <span className="cd-field-label">Total elementos</span>
                  <p className="cd-financial-value" style={{ color: "#1d4ed8" }}>
                    {contenidos.length}
                  </p>
                  <span className="cd-financial-note">Servicios o ítems incluidos</span>
                </div>
                <div className="cd-financial-item cd-financial-bordered">
                  <span className="cd-field-label">Disponibilidad</span>
                  <p
                    className="cd-financial-value"
                    style={{ color: vigente ? "#15803d" : "#b45309", fontSize: 18 }}
                  >
                    {vigente
                      ? <><CheckCircleOutlined style={{ marginRight: 6 }} />Vigente</>
                      : <><StopOutlined style={{ marginRight: 6 }} />Descontinuado</>}
                  </p>
                  <span className="cd-financial-note">
                    {vigente ? "Disponible para asignar" : "No disponible"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "contenidos" && (
          <div className="cd-card">
            <div className="cd-pagos-header">
              <div className="cd-pagos-header-left">
                <div className="cd-card-icon-wrap"><UnorderedListOutlined /></div>
                <h2 className="cd-card-title">Contenido del paquete</h2>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="cd-btn-add-pago"
                onClick={() => setAddModalOpen(true)}
              >
                Agregar elemento
              </Button>
            </div>

            <Divider style={{ margin: "4px 0 16px" }} />

            {contenidos.length === 0 ? (
              <Empty description="Sin elementos registrados" style={{ margin: "32px 0" }} />
            ) : (
              <div className="cd-pagos-list">
                <div className="cd-pagos-list-header" style={{ gridTemplateColumns: "1fr 36px" }}>
                  <span>Descripción</span>
                  <span />
                </div>
                {contenidos.map((c) => (
                  <div
                    key={c.id_paquete_contenido}
                    className="cd-pagos-row"
                    style={{ gridTemplateColumns: "1fr 36px" }}
                  >
                    <span style={{ fontWeight: 500, color: "#1b1b1d" }}>{c.descripcion}</span>
                    <button
                      className="cd-doc-delete-btn"
                      onClick={() => handleDeleteContenido(c)}
                      title="Eliminar elemento"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "analisis" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, justifyContent: "flex-end" }}>
              <Select
                value={analisisDateField}
                onChange={setAnalisisDateField}
                options={DATE_FIELD_OPTIONS}
                style={{ width: 200 }}
                size="middle"
                className="est-select"
              />
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
                    <span className="cd-field-label">Horas en eventos</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: "#05060a" }}>
                      {stats.total_horas ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 4 }}>hrs</span>
                    </p>
                    <span className="cd-financial-note">Realizadas o programadas en el período</span>
                  </div>

                  <div className="cd-card" style={{ padding: "20px 24px" }}>
                    <span className="cd-field-label">Eventos contratados</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: "#05060a" }}>
                      {stats.eventos_count ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 4 }}>
                        de {stats.total_eventos_negocio ?? 0}
                      </span>
                    </p>
                    <span className="cd-financial-note">
                      {analisisDateField === "fecha_creacion_contrato"
                        ? "Del total de contratos celebrados en el período"
                        : "Del total de eventos del negocio en el período"}
                    </span>
                  </div>

                  <div className="cd-card" style={{ padding: "20px 24px" }}>
                    <span className="cd-field-label">Tasa de uso</span>
                    <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: (stats.tasa_pct ?? 0) >= 50 ? "#15803d" : "#05060a" }}>
                      {stats.tasa_pct ?? 0}
                      <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b", marginLeft: 2 }}>%</span>
                    </p>
                    <span className="cd-financial-note">
                      Este paquete está en el {stats.tasa_pct ?? 0}% de los eventos del período
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
                              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#64748b" }}>
                                {analisisDateField === "fecha_creacion_contrato" ? "Contratado" : "Fecha evento"}
                              </th>
                              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, color: "#64748b" }}>Cliente</th>
                              <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600, color: "#64748b" }}>Hrs estimadas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventos.map((e) => (
                              <tr key={e.id_contrato} style={{ borderBottom: "1px solid #f8fafc" }}>
                                <td style={{ padding: "7px 8px" }}>
                                  {analisisDateField === "fecha_creacion_contrato"
                                    ? fmtFechaCorta(e.fecha_creacion_contrato)
                                    : fmtFechaCorta(e.fecha_evento)}
                                </td>
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

                  <div className="cd-card">
                    <div className="cd-card-header">
                      <div className="cd-card-icon-wrap"><AppstoreOutlined /></div>
                      <h2 className="cd-card-title">Comparación por tipo</h2>
                    </div>
                    <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                      Paquetes de {tipoLabel} — por número de eventos en el período
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

        {activeTab === "actividad" && (
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><HistoryOutlined /></div>
              <h2 className="cd-card-title">
                Actividad del paquete
                {actividad.length > 0 && (
                  <span className="cd-actividad-count">{actividad.length}</span>
                )}
              </h2>
            </div>

            {loadingActividad ? (
              <div className="cd-loading-wrap"><Spin size="large" /></div>
            ) : actividad.length === 0 ? (
              <Empty description="Sin actividad registrada aún" style={{ margin: "40px 0" }} />
            ) : (
              <div className="cd-actividad-list">
                {actividad.map((item, idx) => {
                  const ACTION_CONFIG = {
                    CREATE: { label: "Creación",      color: "#15803d", bg: "#dcfce7" },
                    UPDATE: { label: "Actualización", color: "#1d4ed8", bg: "#dbeafe" },
                    DELETE: { label: "Eliminación",   color: "#b91c1c", bg: "#fee2e2" },
                  };
                  const cfg = ACTION_CONFIG[item.action] || { label: item.action, color: "#595c5e", bg: "#f1f5f9" };
                  const fmtDatetime = (v) => {
                    if (!v) return "—";
                    const d = dayjs(v);
                    return d.isValid() ? d.format("DD/MM/YYYY, HH:mm") : "—";
                  };
                  return (
                    <div key={item.id_audit_log || idx} className="cd-actividad-item">
                      <div className="cd-actividad-dot-col">
                        <div className="cd-actividad-dot" style={{ background: cfg.color }} />
                        {idx < actividad.length - 1 && <div className="cd-actividad-line" />}
                      </div>
                      <div className="cd-actividad-body">
                        <div className="cd-actividad-top-row">
                          <span className="cd-actividad-badge" style={{ color: cfg.color, background: cfg.bg }}>
                            {cfg.label}
                          </span>
                          <span className="cd-actividad-message">{item.message}</span>
                        </div>
                        <div className="cd-actividad-bottom-row">
                          <span className="cd-actividad-time">{fmtDatetime(item.datetime)}</span>
                          {item.user_name && (
                            <div className="cd-actividad-user">
                              <span>{item.user_name}</span>
                              {item.user_email && (
                                <span className="cd-actividad-email">{item.user_email}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      <Modal
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); contenidoForm.resetFields(); }}
        onOk={handleAddContenido}
        okText="Agregar"
        cancelText="Cancelar"
        title="Agregar elemento al paquete"
        confirmLoading={savingContenido}
        centered
        okButtonProps={{ style: { background: "#05060a", borderColor: "#05060a" } }}
      >
        <Form form={contenidoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="descripcion"
            label="Descripción del elemento"
            rules={[{ required: true, message: "Requerido" }]}
          >
            <Input placeholder="Ej. 2 horas de cobertura fotográfica" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
