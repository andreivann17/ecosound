import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiUsuariosInstance,
  authHeaderUsuarios,
} from "../../redux/actions/usuarios/usuarios";
import { usePermisos } from "../../context/PermisosContext";

import {
  Button,
  Modal,
  Switch,
  Input,
  Dropdown,
  Spin,
} from "antd";
import Toast from "../../components/toasts/toast";
import SuccessOverlay from "../../components/feedback/SuccessOverlay";
import {
  EditOutlined,
  EllipsisOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  SafetyOutlined,
  DollarOutlined,
  BellOutlined,
  SaveOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  SettingOutlined,
  GiftOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  CloseOutlined,
} from "@ant-design/icons";

import "./EventoDetallePage.css";

dayjs.locale("es");

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

const MODULES = [
  { key: "eventos",        label: "Eventos",        icon: <CalendarOutlined /> },
  { key: "gastos",          label: "Gastos",           icon: <DollarOutlined /> },
  { key: "notificaciones", label: "Notificaciones",  icon: <BellOutlined /> },
  { key: "usuarios",       label: "Usuarios",        icon: <UserOutlined /> },
  { key: "agenda",         label: "Agenda",          icon: <ScheduleOutlined /> },
  { key: "estadisticas",   label: "Estadísticas",    icon: <BarChartOutlined /> },
  { key: "configuracion",  label: "Configuración",   icon: <SettingOutlined /> },
  { key: "paquetes",       label: "Paquetes",        icon: <GiftOutlined /> },
];

const ACTIONS = [
  { key: "modulo",    label: "Módulo"    },
  { key: "consultar", label: "Consultar" },
  { key: "insertar",  label: "Insertar"  },
  { key: "editar",    label: "Editar"    },
  { key: "eliminar",  label: "Eliminar"  },
];

const DEFAULT_PERMISOS = Object.fromEntries(
  MODULES.map((m) => [m.key, Object.fromEntries(ACTIONS.map((a) => [a.key, false]))])
);

export default function UsuarioDetallePage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = perm("usuarios", "editar");
  const canEliminar = perm("usuarios", "eliminar");

  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("datos");
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edición inline "Información del usuario"
  const [editingInfoCard, setEditingInfoCard] = useState(false);
  const [editingInfoForm, setEditingInfoForm] = useState({});
  const [savingInfoCard, setSavingInfoCard] = useState(false);

  // Permisos state
  const [permisos, setPermisos] = useState(DEFAULT_PERMISOS);
  const [permisosOriginal, setPermisosOriginal] = useState(DEFAULT_PERMISOS);
  const [permisosLoading, setPermisosLoading] = useState(false);
  const [savingPermisos, setSavingPermisos] = useState(false);
  const [editingPermisos, setEditingPermisos] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = useCallback((msg) => { setToastMsg(msg); setShowToast(true); }, []);
  const [success, setSuccess] = useState({ show: false, title: "", subtitle: "" });

  const fetchUsuario = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiUsuariosInstance.get(`/users/${code}`, {
        headers: authHeaderUsuarios(),
      });
      setUsuario(res.data);
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al cargar usuario");
    } finally {
      setLoading(false);
    }
  }, [code, toast]);

  useEffect(() => { fetchUsuario(); }, [fetchUsuario]);

  const fetchPermisos = useCallback(async () => {
    setPermisosLoading(true);
    try {
      const { data } = await apiUsuariosInstance.get(`/users/${code}/permisos`, {
        headers: authHeaderUsuarios(),
      });
      setPermisos(data);
      setPermisosOriginal(data);
    } catch {
      setPermisos(DEFAULT_PERMISOS);
      setPermisosOriginal(DEFAULT_PERMISOS);
    } finally {
      setPermisosLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (activeTab === "permisos") {
      setEditingPermisos(false);
      fetchPermisos();
    }
  }, [activeTab, fetchPermisos]);

  const handleSavePermisos = async () => {
    setSavingPermisos(true);
    try {
      await apiUsuariosInstance.put(
        `/users/${code}/permisos`,
        { permisos },
        { headers: authHeaderUsuarios() }
      );
      setPermisosOriginal(permisos);
      setEditingPermisos(false);
      window.dispatchEvent(new Event("permisos-refresh"));
      toast("Permisos guardados correctamente");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar permisos");
    } finally {
      setSavingPermisos(false);
    }
  };

  const handleCancelEdit = () => {
    setPermisos(permisosOriginal);
    setEditingPermisos(false);
  };

  const togglePermiso = (module, action, value) => {
    setPermisos((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: value },
    }));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiUsuariosInstance.patch(
        `/users/${code}`,
        { active: 0 },
        { headers: authHeaderUsuarios() }
      );
      setDeleteModal(false);
      setSuccess({
        show: true,
        title: "¡Usuario eliminado!",
        subtitle: `"${usuario?.name || ""}" se eliminó correctamente del sistema.`,
      });
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al eliminar");
      setDeleteModal(false);
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  const handleSaveInfoCard = async () => {
    setSavingInfoCard(true);
    try {
      await apiUsuariosInstance.patch(
        `/users/${code}`,
        {
          name: editingInfoForm.name,
          email: editingInfoForm.email,
        },
        { headers: authHeaderUsuarios() }
      );
      await fetchUsuario();
      setEditingInfoCard(false);
      toast("Usuario actualizado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingInfoCard(false);
    }
  };

  const getInitials = (name) =>
    (name || " ").split(" ").slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();

  if (loading) {
    return (
      <div className="cd-main">
        <div className="cd-content">
          <div className="cd-loading-wrap"><Spin size="large" /></div>
        </div>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <div className="cd-main">
      <div className="cd-content">



        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="trab-avatar" style={{ width: 48, height: 48, fontSize: 18, minWidth: 48 }}>
                    {getInitials(usuario.name)}
                  </div>
                  <div>
                    <h1 className="cd-client-name" style={{ textTransform: "capitalize", fontSize: 22 }}>
                      {usuario.name || "—"}
                    </h1>
                    <span style={{ fontSize: 13, color: "#64748b" }}>{usuario.email || ""}</span>
                  </div>
                </div>
              </div>
              <div className="cd-header-meta">
                <span className="cd-meta-item">
                  <MailOutlined />
                  {usuario.email || "—"}
                </span>
                {usuario.datetime && (
                  <span className="cd-meta-item">
                    <CalendarOutlined />
                    Registrado: {fmtFechaCorta(usuario.datetime)}
                  </span>
                )}
              </div>
            </div>

            <div className="cd-header-actions">
              {canEliminar && (
                <Button
                  icon={<DeleteOutlined />}
                  className="cd-btn-delete"
                  loading={deleting}
                  disabled={success.show}
                  onClick={() => setDeleteModal(true)}
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
              Datos del usuario
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "permisos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("permisos")}
            >
              <SafetyOutlined />
              Permisos
            </button>
          </div>
        </div>

        {activeTab === "datos" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="td-datos-grid">
            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><UserOutlined /></div>
                <h2 className="cd-card-title">Información del usuario</h2>
                {canEditar && !editingInfoCard && (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        {
                          key: "editar", icon: <EditOutlined />, label: "Editar",
                          onClick: () => {
                            setEditingInfoForm({
                              name: usuario.name || "",
                              email: usuario.email || "",
                            });
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
                    <span className="cd-field-label">Nombre completo</span>
                    <Input value={editingInfoForm.name}
                      onChange={(e) => setEditingInfoForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Correo electrónico</span>
                    <Input value={editingInfoForm.email}
                      onChange={(e) => setEditingInfoForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="cd-edit-form-actions">
                    <Button onClick={() => setEditingInfoCard(false)}>Cancelar</Button>
                    <Button type="primary" loading={savingInfoCard} onClick={handleSaveInfoCard} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
                  </div>
                </div>
              ) : (
                <div className="cd-client-fields">
                  <div>
                    <span className="cd-field-label">Nombre completo</span>
                    <span className="cd-field-value" style={{ textTransform: "capitalize" }}>{usuario.name || "—"}</span>
                  </div>
                  <div>
                    <span className="cd-field-label">Correo electrónico</span>
                    <span className="cd-field-value">{usuario.email || "—"}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="cd-card">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><CalendarOutlined /></div>
                <h2 className="cd-card-title">Registro</h2>
              </div>
              <div className="cd-client-fields">
                <div>
                  <span className="cd-field-label">Fecha de registro</span>
                  <span className="cd-field-value">{fmtFecha(usuario.datetime)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "permisos" && (
          <div className="cd-card">
            <div className="cd-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="cd-card-icon-wrap"><SafetyOutlined /></div>
                <h2 className="cd-card-title">Permisos del usuario</h2>
              </div>
              {!editingPermisos && !permisosLoading && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setEditingPermisos(true)}
                  style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)", color: "#fff", fontWeight: 600 }}
                >
                  Editar permisos
                </Button>
              )}
            </div>

            <p className="usr-perm-subtitle">
              {editingPermisos
                ? "Activa o desactiva los permisos y guarda los cambios."
                : "Define qué acciones puede realizar este usuario en cada módulo del sistema."}
            </p>

            {permisosLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table className="usr-perm-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr className="usr-perm-thead-row">
                        <th className="usr-perm-th" style={{ textAlign: "left", width: "30%" }}>
                          Módulo
                        </th>
                        {ACTIONS.map((a) => (
                          <th key={a.key} className="usr-perm-th" style={{ textAlign: "center" }}>
                            {a.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((m, idx) => (
                        <tr
                          key={m.key}
                          className={`usr-perm-row ${idx % 2 === 0 ? "usr-perm-row-even" : "usr-perm-row-odd"}`}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div className="usr-perm-module-cell">
                              <span className="usr-perm-module-icon">{m.icon}</span>
                              {m.label}
                            </div>
                          </td>
                          {ACTIONS.map((a) => (
                            <td key={a.key} style={{ textAlign: "center", padding: "14px 16px" }}>
                              {editingPermisos ? (
                                <Switch
                                  checked={permisos[m.key]?.[a.key] ?? false}
                                  onChange={(val) => togglePermiso(m.key, a.key, val)}
                                  size="small"
                                  style={permisos[m.key]?.[a.key] ? { backgroundColor: "#05060a" } : {}}
                                />
                              ) : (
                                permisos[m.key]?.[a.key]
                                  ? <CheckCircleFilled style={{ color: "#22c55e", fontSize: 18 }} />
                                  : <CloseCircleFilled style={{ color: "#ef4444", fontSize: 18 }} />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {editingPermisos && (
                  <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <Button
                      icon={<CloseOutlined />}
                      onClick={handleCancelEdit}
                      disabled={savingPermisos}
                    >
                      Cancelar
                    </Button>
                    <Button
                      icon={<SaveOutlined />}
                      loading={savingPermisos}
                      onClick={handleSavePermisos}
                      style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)", color: "#fff", fontWeight: 600 }}
                    >
                      Guardar permisos
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      <Modal
        title="Eliminar usuario"
        open={deleteModal}
        onCancel={() => setDeleteModal(false)}
        onOk={handleDelete}
        confirmLoading={deleting}
        okText="Eliminar"
        okButtonProps={{ danger: true }}
        cancelText="Cancelar"
      >
        <p>
          ¿Estás seguro de que deseas eliminar al usuario{" "}
          <strong>{usuario.name}</strong>? Esta acción lo desactivará del sistema.
        </p>
      </Modal>

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <SuccessOverlay
        show={success.show}
        title={success.title}
        subtitle={success.subtitle}
        onDone={() => navigate("/app/usuarios")}
      />
    </div>
  );
}
