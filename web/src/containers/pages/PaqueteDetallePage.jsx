import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiPaquetesInstance,
  authHeaderPaquetes,
} from "../../redux/actions/paquetes/paquetes";
import {
  Button,
  Modal,
  Form,
  Input,
  Spin,
  Empty,
  Divider,
  Dropdown,
} from "antd";
import {
  EditOutlined,
  EllipsisOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  CameraOutlined,
  SoundOutlined,
  CrownOutlined,
  CoffeeOutlined,
  CheckCircleOutlined,
  StopOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

import Toast from "../../components/toasts/toast";
import SuccessOverlay from "../../components/feedback/SuccessOverlay";
import "./EventoDetallePage.css";
import "./EstadisticasPage.css";

dayjs.locale("es");

export default function PaqueteDetallePage() {
  const { idPaquete } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = perm("paquetes", "editar");
  const canEliminar = perm("paquetes", "eliminar");

  const tipoParam = searchParams.get("tipo");
  const tipo = parseInt(tipoParam ?? "0", 10);

  const [paquete, setPaquete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [success, setSuccess] = useState({ show: false, title: "", subtitle: "" });
  const [activeTab, setActiveTab] = useState("datos");

  // Edición inline "Información del paquete"
  const [editingInfoCard, setEditingInfoCard] = useState(false);
  const [editingInfoForm, setEditingInfoForm] = useState({});
  const [savingInfoCard, setSavingInfoCard] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [savingContenido, setSavingContenido] = useState(false);
  const [contenidoForm] = Form.useForm();

  // Actividad state
  const [actividad, setActividad] = useState([]);
  const [loadingActividad, setLoadingActividad] = useState(false);

  const tipoRef = useRef(tipo);
  tipoRef.current = tipo;

  const fetchPaquete = useCallback(async () => {
    try {
      const { data } = await apiPaquetesInstance.get(
        `/paquetes/${idPaquete}?tipo=${tipoRef.current}`,
        { headers: authHeaderPaquetes() }
      );
      setPaquete(data);
    } catch {
      toast("No se pudo cargar el paquete");
    }
  }, [idPaquete]);

  useEffect(() => {
    if (tipoParam === null) return;
    let mounted = true;
    setLoading(true);
    apiPaquetesInstance
      .get(`/paquetes/${idPaquete}?tipo=${tipo}`, { headers: authHeaderPaquetes() })
      .then(({ data }) => { if (mounted) setPaquete(data); })
      .catch(() => toast("No se pudo cargar el paquete"))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [idPaquete, tipoParam]);

  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const { data } = await apiPaquetesInstance.get(
        `/paquetes/${idPaquete}/actividad`,
        { headers: authHeaderPaquetes(), params: { tipo } }
      );
      setActividad(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setActividad([]);
    } finally {
      setLoadingActividad(false);
    }
  }, [idPaquete, tipo]);

  useEffect(() => {
    if (activeTab === "actividad") fetchActividad();
  }, [activeTab, fetchActividad]);

  const handleDelete = () => {
    Modal.confirm({
      title: "Eliminar paquete",
      content: "El paquete se eliminará del sistema permanentemente.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        setDeleting(true);
        try {
          await apiPaquetesInstance.delete(
            `/paquetes/${idPaquete}?tipo=${tipo}`,
            { headers: authHeaderPaquetes() }
          );
          setSuccess({
            show: true,
            title: "¡Paquete eliminado!",
            subtitle: `"${paquete?.nombre || ""}" se eliminó correctamente del catálogo.`,
          });
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar");
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
            `/paquetes/${idPaquete}?tipo=${tipo}`,
            { active: nuevoEstado },
            { headers: authHeaderPaquetes() }
          );
          toast(nuevoEstado ? "Paquete reactivado" : "Paquete descontinuado");
          fetchPaquete();
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || `Error al ${accion}`);
        } finally {
          setToggling(false);
        }
      },
    });
  };

  const handleSaveInfoCard = async () => {
    setSavingInfoCard(true);
    try {
      await apiPaquetesInstance.patch(
        `/paquetes/${idPaquete}?tipo=${tipo}`,
        { nombre: editingInfoForm.nombre },
        { headers: authHeaderPaquetes() }
      );
      await fetchPaquete();
      setEditingInfoCard(false);
      toast("Paquete actualizado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingInfoCard(false);
    }
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
          toast("Elemento eliminado");
          fetchPaquete();
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar");
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
        `/paquetes/${idPaquete}/contenidos?tipo=${tipo}`,
        { descripcion: values.descripcion.trim() },
        { headers: authHeaderPaquetes() }
      );
      toast("Elemento agregado");
      contenidoForm.resetFields();
      setAddModalOpen(false);
      fetchPaquete();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al agregar");
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
  const _TIPO_DETAIL = {
    0: { label: "Fotografía", Icon: CameraOutlined },
    1: { label: "Sonido",     Icon: SoundOutlined },
    2: { label: "Banquete",   Icon: CrownOutlined },
    3: { label: "Barra",      Icon: CoffeeOutlined },
  };
  const tipoLabel = _TIPO_DETAIL[tipo]?.label ?? "Desconocido";
  const TipoIcon = _TIPO_DETAIL[tipo]?.Icon ?? CameraOutlined;
  const vigente = Boolean(paquete.active);

  return (
    <div className="cd-main">
      <div className="cd-content">



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
                  disabled={success.show}
                  onClick={handleToggleActive}
                  style={vigente
                    ? { borderColor: "#f59e0b", color: "#b45309" }
                    : { borderColor: "#16a34a", color: "#16a34a" }
                  }
                >
                  {vigente ? "Descontinuar" : "Reactivar"}
                </Button>
              )}
              {canEliminar && (
                <Button
                  icon={<DeleteOutlined />}
                  className="cd-btn-delete"
                  loading={deleting}
                  disabled={success.show}
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
                {canEditar && !editingInfoCard && (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "editar", icon: <EditOutlined />, label: "Editar",
                          onClick: () => {
                            setEditingInfoForm({ nombre: paquete.nombre || "" });
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
              {editingInfoCard ? (
                <div className="cd-edit-form">
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Nombre</span>
                    <Input value={editingInfoForm.nombre}
                      onChange={(e) => setEditingInfoForm((f) => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div className="cd-edit-form-actions">
                    <Button onClick={() => setEditingInfoCard(false)}>Cancelar</Button>
                    <Button type="primary" loading={savingInfoCard} onClick={handleSaveInfoCard} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            <div className="cd-card cd-card-event">
              <div className="cd-pagos-header">
                <div className="cd-pagos-header-left">
                  <div className="cd-card-icon-wrap"><UnorderedListOutlined /></div>
                  <h2 className="cd-card-title">Resumen de contenido</h2>
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
                <Empty description="Sin elementos registrados" style={{ margin: "24px 0" }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
                  {contenidos.map((c) => (
                    <div
                      key={c.id_paquete_contenido}
                      className="cd-contenido-row"
                    >
                      <CheckCircleOutlined className="cd-contenido-check" />
                      <span className="cd-contenido-text">{c.descripcion}</span>
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

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <SuccessOverlay
        show={success.show}
        title={success.title}
        subtitle={success.subtitle}
        onDone={() => navigate("/app/paquetes")}
      />
    </div>
  );
}
