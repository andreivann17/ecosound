import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiTrabajadoresInstance,
  authHeaderTrabajadores,
} from "../../redux/actions/trabajadores/trabajadores";
import { PATH as API_BASE } from "../../redux/utils";
import { previewTrabajadorPdf, printTrabajadorPdf } from "../../components/utils/printTrabajadorPdf";

import {
  Button,
  Modal,
  Select,
  DatePicker,
  Spin,
  Empty,
  Dropdown,
  Input,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  EllipsisOutlined,
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CameraOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

import "./EventoDetallePage.css";
import "./EstadisticasPage.css";
import "./TrabajadoresPage.css";
import Toast from "../../components/toasts/toast";
import SuccessOverlay from "../../components/feedback/SuccessOverlay";

dayjs.locale("es");

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

const fmtDiaChip = (v) => {
  const d = dayjs(v);
  if (!d.isValid()) return null;
  return {
    dow: d.format("ddd").toUpperCase(),
    dia: d.format("D"),
    mes: d.format("MMM").toUpperCase(),
  };
};

const fmtHorarioEvento = (e) => {
  const inicio = e.fecha_inicio || e.hora_inicio;
  const final = e.fecha_final || e.hora_final;
  if (!inicio && !final) return null;
  const startLabel = e.fecha_inicio ? dayjs(e.fecha_inicio).format("HH:mm") : (e.hora_inicio || "—");
  const endLabel = e.fecha_final ? dayjs(e.fecha_final).format("HH:mm") : (e.hora_final || "—");
  return `${startLabel} – ${endLabel}`;
};

export default function TrabajadorDetallePage() {
  const { idTrabajador } = useParams();
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = perm("trabajadores", "editar");
  const canEliminar = perm("trabajadores", "eliminar");

  const [trabajador, setTrabajador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [success, setSuccess] = useState({ show: false, title: "", subtitle: "" });
  const [activeTab, setActiveTab] = useState("datos");
  const [deletingModal, setDeletingModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportHtml, setReportHtml] = useState("");

  // Edición inline "Información personal"
  const [puestosOptions, setPuestosOptions] = useState([]);
  const [editingInfoCard, setEditingInfoCard] = useState(false);
  const [editingInfoForm, setEditingInfoForm] = useState({});
  const [savingInfoCard, setSavingInfoCard] = useState(false);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const fotoInputRef = useRef(null);

  // Próximos eventos
  const [proximosEventos, setProximosEventos] = useState([]);
  const [loadingProximos, setLoadingProximos] = useState(true);

  // Actividad state
  const [actividad, setActividad] = useState([]);
  const [loadingActividad, setLoadingActividad] = useState(false);

  const fetchTrabajador = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiTrabajadoresInstance.get(
        `/trabajadores/${idTrabajador}`,
        { headers: authHeaderTrabajadores() }
      );
      setTrabajador(res.data);
    } catch {
      toast("Error al cargar trabajador");
    } finally {
      setLoading(false);
    }
  }, [idTrabajador]);

  useEffect(() => { fetchTrabajador(); }, [fetchTrabajador]);

  const fetchProximosEventos = useCallback(async () => {
    setLoadingProximos(true);
    try {
      const { data } = await apiTrabajadoresInstance.get(
        `/trabajadores/${idTrabajador}/proximos-eventos`,
        { headers: authHeaderTrabajadores() }
      );
      setProximosEventos(Array.isArray(data) ? data : []);
    } catch {
      setProximosEventos([]);
    } finally {
      setLoadingProximos(false);
    }
  }, [idTrabajador]);

  useEffect(() => { fetchProximosEventos(); }, [fetchProximosEventos]);

  useEffect(() => {
    apiTrabajadoresInstance
      .get("/trabajadores/puestos", { headers: authHeaderTrabajadores() })
      .then(({ data }) => setPuestosOptions(data || []))
      .catch(() => setPuestosOptions([]));
  }, []);

  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const { data } = await apiTrabajadoresInstance.get(
        `/trabajadores/${idTrabajador}/actividad`,
        { headers: authHeaderTrabajadores() }
      );
      setActividad(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setActividad([]);
    } finally {
      setLoadingActividad(false);
    }
  }, [idTrabajador]);

  useEffect(() => {
    if (activeTab === "actividad") fetchActividad();
  }, [activeTab, fetchActividad]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiTrabajadoresInstance.delete(
        `/trabajadores/${idTrabajador}`,
        { headers: authHeaderTrabajadores() }
      );
      setDeletingModal(false);
      setSuccess({
        show: true,
        title: "¡Trabajador eliminado!",
        subtitle: `"${trabajador?.nombre || ""} ${trabajador?.apellido || ""}" se eliminó correctamente.`,
      });
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al eliminar");
      setDeletingModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleFotoSelect = (file) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast("Solo se permiten imágenes (JPG, PNG, WEBP)");
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleSaveInfoCard = async () => {
    setSavingInfoCard(true);
    try {
      await apiTrabajadoresInstance.patch(
        `/trabajadores/${idTrabajador}`,
        {
          nombre: editingInfoForm.nombre,
          apellido: editingInfoForm.apellido,
          id_puesto: editingInfoForm.id_puesto,
          fecha_nacimiento: editingInfoForm.fecha_nacimiento
            ? editingInfoForm.fecha_nacimiento.format("YYYY-MM-DD")
            : null,
        },
        { headers: authHeaderTrabajadores() }
      );
      if (fotoFile) {
        const fd = new FormData();
        fd.append("file", fotoFile);
        await apiTrabajadoresInstance.post(
          `/trabajadores/${idTrabajador}/imagen`,
          fd,
          { headers: { ...authHeaderTrabajadores(), "Content-Type": "multipart/form-data" } }
        );
      }
      await fetchTrabajador();
      setEditingInfoCard(false);
      setFotoFile(null);
      setFotoPreview(null);
      toast("Datos del trabajador actualizados");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingInfoCard(false);
    }
  };

  const getInitials = (nombre, apellido) => {
    const a = (nombre || " ")[0] || "";
    const b = (apellido || " ")[0] || "";
    return (a + b).toUpperCase();
  };

  const buildReportData = () => ({
    idTrabajador: trabajador?.id_trabajador,
    nombre: trabajador?.nombre,
    apellido: trabajador?.apellido,
    nombrePuesto: trabajador?.nombre_puesto,
    fechaNacimiento: trabajador?.fecha_nacimiento,
    fechaRegistro: trabajador?.datetime,
    fotoUrl: trabajador?.path ? `${API_BASE}/${trabajador.path}` : null,
    proximosEventos,
  });

  const handleOpenReport = async () => {
    const html = await previewTrabajadorPdf(buildReportData());
    setReportHtml(html);
    setReportOpen(true);
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

  return (
    <div className="cd-main">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <div className="cd-content">

        <Modal
          open={reportOpen}
          onCancel={() => setReportOpen(false)}
          title="Ficha del trabajador"
          width={900}
          centered
          destroyOnClose
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button onClick={() => setReportOpen(false)}>Cerrar</Button>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}
                onClick={() => printTrabajadorPdf(buildReportData())}
              >
                Descargar PDF
              </Button>
            </div>
          }
        >
          <div style={{ height: "72vh", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <iframe
              title="preview-trabajador"
              style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
              srcDoc={reportHtml}
            />
          </div>
        </Modal>

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
              <Button
                icon={<ExportOutlined />}
                className="cd-btn-export"
                onClick={handleOpenReport}
              >
                Exportar
              </Button>
              {canEliminar && (
                <Button
                  icon={<DeleteOutlined />}
                  className="cd-btn-delete"
                  loading={deleting}
                  disabled={success.show}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="td-datos-grid">
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><UserOutlined /></div>
                <h2 className="cd-card-title">Información personal</h2>
                {canEditar && !editingInfoCard && (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "editar", icon: <EditOutlined />, label: "Editar",
                          onClick: () => {
                            setEditingInfoForm({
                              nombre: trabajador.nombre || "",
                              apellido: trabajador.apellido || "",
                              id_puesto: trabajador.id_puesto || null,
                              fecha_nacimiento: trabajador.fecha_nacimiento ? dayjs(trabajador.fecha_nacimiento) : null,
                            });
                            setFotoFile(null);
                            setFotoPreview(trabajador.path ? `${API_BASE}/${trabajador.path}` : null);
                            setEditingInfoCard(true);
                          },
                        },
                      ],
                    }}
                  >
                    <Button type="text" icon={<EllipsisOutlined />} size="small" style={{ marginLeft: "auto" }} />
                  </Dropdown>
                )}
              </div>
              <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                <div
                  onClick={() => editingInfoCard && fotoInputRef.current?.click()}
                  className="td-foto-frame"
                  style={{
                    width: 200, height: 220, minWidth: 160, borderRadius: 10, overflow: "hidden",
                    flexShrink: 0, position: "relative",
                    cursor: editingInfoCard ? "pointer" : "default",
                  }}
                >
                  {(editingInfoCard ? fotoPreview : trabajador.path ? `${API_BASE}/${trabajador.path}` : null) ? (
                    <img
                      src={editingInfoCard ? fotoPreview : `${API_BASE}/${trabajador.path}`}
                      alt={`${trabajador.nombre} ${trabajador.apellido}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      width: "100%", height: "100%",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6
                    }}>
                      <span style={{ fontSize: 22, opacity: 0.4 }}>📷</span>
                      <span className="td-foto-sin-imagen">Sin imagen</span>
                    </div>
                  )}
                  {editingInfoCard && (
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                      background: "rgba(15, 23, 42, 0.45)", color: "#fff", opacity: 0, transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
                    >
                      <CameraOutlined style={{ fontSize: 22 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Cambiar foto</span>
                    </div>
                  )}
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFotoSelect(e.target.files[0])}
                  />
                </div>
                {editingInfoCard ? (
                  <div className="cd-edit-form" style={{ flex: 1, minWidth: 220 }}>
                    <div className="cd-edit-field">
                      <span className="cd-field-label">Nombre</span>
                      <Input value={editingInfoForm.nombre}
                        onChange={(e) => setEditingInfoForm((f) => ({ ...f, nombre: e.target.value }))} />
                    </div>
                    <div className="cd-edit-field">
                      <span className="cd-field-label">Apellido</span>
                      <Input value={editingInfoForm.apellido}
                        onChange={(e) => setEditingInfoForm((f) => ({ ...f, apellido: e.target.value }))} />
                    </div>
                    <div className="cd-edit-field">
                      <span className="cd-field-label">Puesto</span>
                      <Select
                        value={editingInfoForm.id_puesto}
                        onChange={(v) => setEditingInfoForm((f) => ({ ...f, id_puesto: v }))}
                        options={puestosOptions.map((p) => ({ label: p.nombre, value: p.id_puesto }))}
                        allowClear
                        placeholder="Selecciona un puesto"
                      />
                    </div>
                    <div className="cd-edit-field">
                      <span className="cd-field-label">Fecha de nacimiento</span>
                      <DatePicker
                        value={editingInfoForm.fecha_nacimiento}
                        onChange={(v) => setEditingInfoForm((f) => ({ ...f, fecha_nacimiento: v }))}
                        format="DD/MM/YYYY"
                        style={{ width: "100%" }}
                      />
                    </div>
                    <div className="cd-edit-form-actions">
                      <Button onClick={() => {
                        setEditingInfoCard(false);
                        setFotoFile(null);
                        setFotoPreview(null);
                      }}>Cancelar</Button>
                      <Button type="primary" loading={savingInfoCard} onClick={handleSaveInfoCard} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="cd-client-fields" style={{ flex: 1, minWidth: 180 }}>
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
                )}
              </div>
            </div>

            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><CalendarOutlined /></div>
                <h2 className="cd-card-title">Próximos Eventos</h2>
              </div>
              {loadingProximos ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 30 }}>
                  <Spin />
                </div>
              ) : proximosEventos.length === 0 ? (
                <Empty description="Sin eventos próximos" style={{ margin: "28px 0" }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {proximosEventos.map((e) => {
                    const chip = fmtDiaChip(e.fecha_evento);
                    const horario = fmtHorarioEvento(e);
                    return (
                      <div key={e.id_contrato} className="td-proximo-row">
                        <div style={{
                          width: 52, textAlign: "center", flexShrink: 0,
                          background: "linear-gradient(160deg, var(--eh-primary-btn) 0%, #0450d6 100%)",
                          borderRadius: 10, padding: "6px 0", color: "#fff",
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", opacity: 0.85 }}>{chip?.dow || "—"}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{chip?.dia ?? "—"}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", opacity: 0.85 }}>{chip?.mes || ""}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="td-proximo-nombre" style={{
                            fontWeight: 700, fontSize: 14, textTransform: "capitalize",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {e.cliente_nombre || "Cliente sin nombre"}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                            {e.nombre_puesto_evento && (
                              <span className="trab-puesto-badge">{e.nombre_puesto_evento}</span>
                            )}
                            {horario && (
                              <span className="td-proximo-horario">
                                <ClockCircleOutlined style={{ fontSize: 11 }} />
                                {horario}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "actividad" && (
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><HistoryOutlined /></div>
              <h2 className="cd-card-title">
                Actividad del trabajador
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
                    CREATE: { label: "Creación",     color: "#15803d", bg: "#dcfce7" },
                    UPDATE: { label: "Actualización", color: "#1d4ed8", bg: "#dbeafe" },
                    DELETE: { label: "Eliminación",  color: "#b91c1c", bg: "#fee2e2" },
                  };
                  const cfg = ACTION_CONFIG[item.action] || { label: item.action, color: "#595c5e", bg: "#f1f5f9" };
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
                          <span className="cd-actividad-time">
                            {item.datetime ? dayjs(item.datetime).format("DD/MM/YYYY, HH:mm") : "—"}
                          </span>
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

      <SuccessOverlay
        show={success.show}
        title={success.title}
        subtitle={success.subtitle}
        onDone={() => navigate("/app/trabajadores")}
      />
    </div>
  );
}
