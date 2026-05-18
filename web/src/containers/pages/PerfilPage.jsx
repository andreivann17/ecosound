import React, { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  Button,
  Input,
  DatePicker,
  Spin,
  notification,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SaveOutlined,
  EditOutlined,
  CameraOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { PATH } from "../../redux/utils";
import "./PerfilPage.css";

dayjs.locale("es");

const api = axios.create({ baseURL: PATH });
const authHeader = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("tokenadmin");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fmtFecha = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D [de] MMMM [del] YYYY") : "—";
};

const fmtFechaHora = (v) => {
  if (!v) return "—";
  const d = dayjs(v);
  return d.isValid() ? d.format("D MMM YYYY, HH:mm") : "—";
};

export default function PerfilPage() {
  const [activeTab, setActiveTab] = useState("info");

  // ── Datos del perfil ──────────────────────────────────
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos editables
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState(null);

  // ── Foto de perfil ────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // ── Seguridad ─────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchPerfil = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/users/me/perfil", { headers: authHeader() });
      setPerfil(data);
      setNombre(data.name || "");
      setApellido(data.apellido || "");
      setTelefono(data.telefono || "");
      setFechaNacimiento(data.fecha_nacimiento ? dayjs(data.fecha_nacimiento) : null);
      const avatarUrl = data.path ? `${PATH}/${data.path}` : "";
      localStorage.setItem("userAvatar", avatarUrl);
      window.dispatchEvent(new CustomEvent("avatar-updated", { detail: avatarUrl }));
    } catch (err) {
      notification.error({
        message: "Error al cargar el perfil",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPerfil(); }, [fetchPerfil]);

  const handleSavePerfil = async () => {
    setSaving(true);
    try {
      await api.patch(
        "/users/me/perfil",
        {
          nombre: nombre || undefined,
          apellido: apellido || undefined,
          telefono: telefono || undefined,
          fecha_nacimiento: fechaNacimiento ? fechaNacimiento.format("YYYY-MM-DD") : undefined,
        },
        { headers: authHeader() }
      );
      notification.success({ message: "Perfil actualizado correctamente" });
      setEditing(false);
      fetchPerfil();
    } catch (err) {
      notification.error({
        message: "Error al guardar",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setNombre(perfil?.name || "");
    setApellido(perfil?.apellido || "");
    setTelefono(perfil?.telefono || "");
    setFechaNacimiento(perfil?.fecha_nacimiento ? dayjs(perfil.fecha_nacimiento) : null);
    setEditing(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post("/users/me/imagen", form, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
      });
      fetchPerfil();
      notification.success({ message: "Foto de perfil actualizada" });
    } catch (err) {
      notification.error({ message: "Error al subir foto", description: err?.response?.data?.detail || err.message });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      notification.warning({ message: "Completa todos los campos de contraseña" });
      return;
    }
    if (newPassword !== confirmPassword) {
      notification.warning({ message: "La nueva contraseña y la confirmación no coinciden" });
      return;
    }
    if (newPassword.length < 6) {
      notification.warning({ message: "La nueva contraseña debe tener al menos 6 caracteres" });
      return;
    }
    setSavingPassword(true);
    try {
      await api.post(
        "/users/me/change-password",
        { current_password: currentPassword, new_password: newPassword },
        { headers: authHeader() }
      );
      notification.success({ message: "Contraseña cambiada correctamente" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      notification.error({
        message: "Error al cambiar contraseña",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const getInitials = (name, apellido) => {
    const a = (name || " ")[0] || "";
    const b = (apellido || name || " ").split(" ").pop()?.[0] || "";
    return (a + b).toUpperCase();
  };

  const avatarSrc = perfil?.path ? `${PATH}/${perfil.path}` : null;

  if (loading) {
    return (
      <div className="perf-main">
        <div className="perf-content">
          <div className="perf-loading"><Spin size="large" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="perf-main">
      <div className="perf-content">

        {/* ── Header card ─────────────────────────────────── */}
        <div className="perf-header-card">
          <div className="perf-header-top">
            {/* Avatar */}
            <div className="perf-avatar-wrap">
              <div className="perf-avatar-circle">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="foto de perfil" className="perf-avatar-img" />
                ) : (
                  <span className="perf-avatar-initials">
                    {getInitials(perfil?.name, perfil?.apellido)}
                  </span>
                )}
                <button
                  className="perf-avatar-camera"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  title="Cambiar foto"
                >
                  {uploadingPhoto ? <Spin size="small" /> : <CameraOutlined />}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoChange}
              />
            </div>

            {/* Nombre + email */}
            <div className="perf-header-info">
              <h1 className="perf-header-name">
                {[perfil?.name, perfil?.apellido].filter(Boolean).join(" ") || "—"}
              </h1>
              <span className="perf-header-email">
                <MailOutlined style={{ marginRight: 6 }} />
                {perfil?.email || "—"}
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="perf-tabs">
            <button
              className={`perf-tab-btn${activeTab === "info" ? " active" : ""}`}
              onClick={() => setActiveTab("info")}
            >
              <UserOutlined /> Información
            </button>
            <button
              className={`perf-tab-btn${activeTab === "seguridad" ? " active" : ""}`}
              onClick={() => setActiveTab("seguridad")}
            >
              <SafetyCertificateOutlined /> Seguridad
            </button>
          </div>
        </div>

        {/* ── Tab: Información ─────────────────────────────── */}
        {activeTab === "info" && (
          <div className="perf-tab-body">

            {/* Card datos personales */}
            <div className="perf-card">
              <div className="perf-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="perf-card-icon"><UserOutlined /></div>
                  <h2 className="perf-card-title">Datos personales</h2>
                </div>
                {!editing && (
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => setEditing(true)}
                    className="perf-btn-edit"
                  >
                    Editar
                  </Button>
                )}
              </div>

              <div className="perf-fields-grid">
                {/* Nombre */}
                <div className="perf-field">
                  <label className="perf-label">Nombre</label>
                  {editing ? (
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                      placeholder="Nombre"
                      className="perf-input"
                    />
                  ) : (
                    <span className="perf-value">{perfil?.name || "—"}</span>
                  )}
                </div>

                {/* Apellido */}
                <div className="perf-field">
                  <label className="perf-label">Apellido</label>
                  {editing ? (
                    <Input
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                      placeholder="Apellido"
                      className="perf-input"
                    />
                  ) : (
                    <span className="perf-value">{perfil?.apellido || "—"}</span>
                  )}
                </div>

                {/* Email (solo lectura) */}
                <div className="perf-field">
                  <label className="perf-label">Correo electrónico</label>
                  <span className="perf-value perf-value-muted">
                    <MailOutlined style={{ marginRight: 6, color: "#94a3b8" }} />
                    {perfil?.email || "—"}
                    </span>
                </div>

                {/* Teléfono */}
                <div className="perf-field">
                  <label className="perf-label">Teléfono</label>
                  {editing ? (
                    <Input
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      prefix={<PhoneOutlined style={{ color: "#94a3b8" }} />}
                      placeholder="Ej. +52 55 1234 5678"
                      className="perf-input"
                    />
                  ) : (
                    <span className="perf-value">{perfil?.telefono || "—"}</span>
                  )}
                </div>

                {/* Fecha de nacimiento */}
                <div className="perf-field">
                  <label className="perf-label">Fecha de nacimiento</label>
                  {editing ? (
                    <DatePicker
                      value={fechaNacimiento}
                      onChange={(val) => setFechaNacimiento(val)}
                      format="DD/MM/YYYY"
                      placeholder="DD/MM/AAAA"
                      className="perf-input"
                      style={{ width: "100%" }}
                    />
                  ) : (
                    <span className="perf-value">
                      {perfil?.fecha_nacimiento ? fmtFecha(perfil.fecha_nacimiento) : "—"}
                    </span>
                  )}
                </div>
              </div>

              {editing && (
                <div className="perf-card-actions">
                  <Button icon={<CloseOutlined />} onClick={handleCancelEdit} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={handleSavePerfil}
                    className="perf-btn-save"
                  >
                    Guardar cambios
                  </Button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Tab: Seguridad ───────────────────────────────── */}
        {activeTab === "seguridad" && (
          <div className="perf-tab-body">

            {/* Card sesión */}
            <div className="perf-card">
              <div className="perf-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="perf-card-icon"><ClockCircleOutlined /></div>
                  <h2 className="perf-card-title">Actividad de sesión</h2>
                </div>
              </div>
              <div className="perf-fields-grid">
                <div className="perf-field">
                  <label className="perf-label">Correo electrónico</label>
                  <span className="perf-value perf-value-muted">
                    <MailOutlined style={{ marginRight: 6, color: "#94a3b8" }} />
                    {perfil?.email || "—"}
                  </span>
                </div>
                <div className="perf-field">
                  <label className="perf-label">Último inicio de sesión</label>
                  <span className="perf-value">
                    <ClockCircleOutlined style={{ marginRight: 6, color: "#94a3b8" }} />
                    {fmtFechaHora(perfil?.ultima_sesion)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card cambiar contraseña */}
            <div className="perf-card">
              <div className="perf-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="perf-card-icon"><LockOutlined /></div>
                  <h2 className="perf-card-title">Cambiar contraseña</h2>
                </div>
              </div>
              <p className="perf-card-desc">
                Ingresa tu contraseña actual y elige una nueva. La nueva contraseña debe tener al menos 6 caracteres.
              </p>

              <div className="perf-pwd-form">
                <div className="perf-field">
                  <label className="perf-label">Contraseña actual</label>
                  <Input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                    suffix={
                      <span
                        style={{ cursor: "pointer", color: "#94a3b8" }}
                        onClick={() => setShowCurrent((v) => !v)}
                      >
                        {showCurrent ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      </span>
                    }
                    placeholder="Contraseña actual"
                    className="perf-input"
                  />
                </div>

                <div className="perf-field">
                  <label className="perf-label">Nueva contraseña</label>
                  <Input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                    suffix={
                      <span
                        style={{ cursor: "pointer", color: "#94a3b8" }}
                        onClick={() => setShowNew((v) => !v)}
                      >
                        {showNew ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      </span>
                    }
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                    className="perf-input"
                  />
                </div>

                <div className="perf-field">
                  <label className="perf-label">Confirmar nueva contraseña</label>
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                    suffix={
                      <span
                        style={{ cursor: "pointer", color: "#94a3b8" }}
                        onClick={() => setShowConfirm((v) => !v)}
                      >
                        {showConfirm ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      </span>
                    }
                    placeholder="Repite la nueva contraseña"
                    className="perf-input"
                    status={confirmPassword && newPassword !== confirmPassword ? "error" : ""}
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <span className="perf-field-error">Las contraseñas no coinciden</span>
                  )}
                </div>

                <div className="perf-card-actions" style={{ marginTop: 8 }}>
                  <Button
                    icon={<LockOutlined />}
                    loading={savingPassword}
                    onClick={handleChangePassword}
                    className="perf-btn-save"
                  >
                    Cambiar contraseña
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
