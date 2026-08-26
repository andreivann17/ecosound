import React, { useEffect, useState, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiClientesEventsInstance,
  authHeaderClientesEvents,
} from "../../../../redux/actions/clientes_events/clientes_events";
import {
  Button, Modal, Spin, Empty,
  Form, Input, DatePicker, Switch, Select, Space, Alert, ColorPicker, Upload,
} from "antd";
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined,
  UserOutlined, CalendarOutlined, DollarOutlined, HistoryOutlined,
  PlusOutlined, MailOutlined, PhoneOutlined, SettingOutlined,
  WarningFilled, LockOutlined, ExclamationCircleFilled, AppstoreOutlined,
  BgColorsOutlined, PictureOutlined, UploadOutlined, InboxOutlined,
  SafetyOutlined, CloseOutlined,
} from "@ant-design/icons";
import Toast from "../../../../components/toasts/toast";
import { PATH } from "../../../../redux/utils";
import "../../EventoDetallePage.css";
import "./events-detail.css";

const { RangePicker } = DatePicker;

dayjs.locale("es");
const BLUE = "#01369e";

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
const getInitials = (n, a) => ((n || " ")[0] + (a || " ")[0]).toUpperCase();

const APP_COLORS = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#fce7f3", color: "#9d174d" },
  { bg: "#d1fae5", color: "#065f46" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#ede9fe", color: "#5b21b6" },
];
const appColor = (idx) => APP_COLORS[idx % APP_COLORS.length];

const PAGO_FILTER_OPTIONS = [
  { value: "todos",    label: "Todos los pagos" },
  { value: "semana",   label: "Últimos 7 días" },
  { value: "quincena", label: "Últimos 15 días" },
  { value: "mes",      label: "Último mes" },
  { value: "anio",     label: "Este año" },
  { value: "custom",   label: "Rango personalizado" },
];

const COLOR_FIELDS = [
  { key: "primary_color",                label: "Color primario",         desc: "Color base usado en toda la app" },
  { key: "navbar_color",                 label: "Color de navbar",        desc: "Fondo de la barra de navegación" },
  { key: "header_color",                 label: "Color de header",        desc: "Fondo del encabezado" },
  { key: "primary_button_color",         label: "Botón primario",         desc: "Color de los botones principales" },
  { key: "text_color_navbar",            label: "Texto del navbar",       desc: "Color del texto/íconos normales del navbar (no el activo)" },
  { key: "color_primary_active_nabvar",  label: "Texto activo navbar",    desc: "Color del texto/ícono activo en el navbar" },
];

const IMAGE_FIELDS = [
  {
    key: "logo_path", formField: "logo", label: "Logo principal", hint: "PNG · JPG · WEBP",
    desc: "Aparece en la barra superior (header) de la app del cliente.",
    previewBgKey: "header_color",
  },
  {
    key: "background_image", formField: "background", label: "Imagen de fondo (login)", hint: "PNG · JPG · WEBP",
    desc: "Fondo de pantalla completa detrás del formulario de inicio de sesión.",
  },
  {
    key: "logo_login", formField: "logo_login", label: "Logo de inicio de sesión", hint: "PNG · JPG · WEBP",
    desc: "Se muestra junto al formulario en la pantalla de inicio de sesión.",
  },
  {
    key: "logo_container", formField: "logo_container", label: "Logo del menú lateral", hint: "PNG · JPG · WEBP",
    desc: "Aparece en el menú lateral (sidebar) de la app, arriba de las opciones.",
    previewBgKey: "navbar_color",
  },
];

const DEFAULT_TEMA = {
  plan_deluxe: 0,
  dark_design: 1,
  nombre_app: "",
  primary_color: "#05060a",
  navbar_color: "#05060a",
  header_color: "#05060a",
  primary_button_color: "#05060a",
  text_color_navbar: "#ffffff",
  color_primary_active_nabvar: "#ffffff",
};

const RESEND_COOLDOWN_SECS = 30;

function imgSrc(path) {
  return path ? `${PATH}/${String(path).replace(/^\/+/, "")}` : null;
}

function buildTemaFromCliente(cliente) {
  return {
    plan_deluxe: cliente.plan_deluxe ?? DEFAULT_TEMA.plan_deluxe,
    dark_design: cliente.dark_design ?? DEFAULT_TEMA.dark_design,
    nombre_app: cliente.nombre_app || DEFAULT_TEMA.nombre_app,
    primary_color: cliente.primary_color || DEFAULT_TEMA.primary_color,
    navbar_color: cliente.navbar_color || DEFAULT_TEMA.navbar_color,
    header_color: cliente.header_color || DEFAULT_TEMA.header_color,
    primary_button_color: cliente.primary_button_color || DEFAULT_TEMA.primary_button_color,
    text_color_navbar: cliente.text_color_navbar || DEFAULT_TEMA.text_color_navbar,
    color_primary_active_nabvar: cliente.color_primary_active_nabvar || DEFAULT_TEMA.color_primary_active_nabvar,
  };
}

function ImageDropzone({ label, desc, hint, currentPath, preview, onPick, disabled, previewBg }) {
  const src = preview || imgSrc(currentPath);
  return (
    <div>
      <Upload.Dragger
        accept="image/*"
        showUploadList={false}
        disabled={disabled}
        beforeUpload={(file) => { onPick(file); return false; }}
        className={`ap-dropzone${disabled ? " ap-dropzone-disabled" : ""}`}
      >
        {src ? (
          <div
            className={`ap-dropzone-preview${previewBg ? "" : " ap-dropzone-checker"}`}
            style={previewBg ? { background: previewBg } : undefined}
          >
            <img src={src} alt={label} />
            {!disabled && (
              <div className="ap-dropzone-overlay">
                <UploadOutlined />
                <span>Cambiar {label.toLowerCase()}</span>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`ap-dropzone-empty${previewBg ? "" : " ap-dropzone-checker"}`}
            style={previewBg ? { background: previewBg } : undefined}
          >
            <InboxOutlined className="ap-dropzone-icon" />
            <span className="ap-dropzone-label">{label}</span>
            <span className="ap-dropzone-hint">{hint}</span>
          </div>
        )}
      </Upload.Dragger>
      {desc && <p className="ap-dropzone-desc">{desc}</p>}
    </div>
  );
}

/** Modal 1 — confirmar identidad con correo + contraseña (como el login). */
function ModalConfirmarLogin({ open, email, onEmailChange, password, onPasswordChange, loading, error, onCancel, onSubmit }) {
  return (
    <Modal open={open} onCancel={loading ? undefined : onCancel} footer={null} centered width={420} maskClosable={!loading}>
      <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "#eff6ff",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
        }}>
          <LockOutlined style={{ fontSize: 28, color: BLUE }} />
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>Confirma tu identidad</h2>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
          Para editar la apariencia de este cliente, primero inicia sesión de nuevo.
        </p>

        <div style={{ textAlign: "left", marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Correo electrónico
          </label>
          <Input
            size="large"
            prefix={<MailOutlined style={{ color: "#9ca3af" }} />}
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            autoComplete="email"
            style={{ borderRadius: 8 }}
            disabled={loading}
          />
        </div>

        <div style={{ textAlign: "left", marginBottom: error ? 14 : 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Contraseña
          </label>
          <Input.Password
            size="large"
            prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onPressEnter={onSubmit}
            autoComplete="current-password"
            style={{ borderRadius: 8 }}
            disabled={loading}
          />
        </div>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 20, borderRadius: 8, textAlign: "left" }} />}

        <div style={{ display: "flex", gap: 12 }}>
          <Button block size="large" onClick={onCancel} disabled={loading} style={{ borderRadius: 8 }}>Cancelar</Button>
          <Button block size="large" type="primary" loading={loading} onClick={onSubmit}
            style={{ borderRadius: 8, background: BLUE, borderColor: BLUE }}>
            Continuar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Modal 2 — código de 6 dígitos enviado por correo. */
function ModalConfirmarCodigo({ open, email, code, onCodeChange, loading, error, sending, cooldown, onResend, onCancel, onSubmit }) {
  return (
    <Modal open={open} onCancel={loading ? undefined : onCancel} footer={null} centered width={440} maskClosable={!loading}>
      <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "#eff6ff",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
        }}>
          <SafetyOutlined style={{ fontSize: 28, color: BLUE }} />
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>Verificación por correo</h2>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 4 }}>
          Enviamos un código de 6 dígitos a
        </p>
        <p style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 22 }}>{email}</p>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: error ? 12 : 20 }}>
          <Input.OTP length={6} value={code} onChange={onCodeChange} disabled={loading} size="large" />
        </div>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16, borderRadius: 8, textAlign: "left" }} />}

        <div style={{ marginBottom: 22 }}>
          <Button type="link" size="small" onClick={onResend} disabled={sending || cooldown > 0 || loading} style={{ padding: 0 }}>
            {cooldown > 0 ? `Reenviar código (${cooldown}s)` : sending ? "Enviando..." : "¿No te llegó? Reenviar código"}
          </Button>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Button block size="large" onClick={onCancel} disabled={loading} style={{ borderRadius: 8 }}>Cancelar</Button>
          <Button block size="large" type="primary" loading={loading} onClick={onSubmit} disabled={code.length < 6}
            style={{ borderRadius: 8, background: BLUE, borderColor: BLUE }}>
            Validar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Modal 3 — confirmar contraseña una última vez, justo antes de guardar. */
function ModalConfirmarPassword({ open, password, onPasswordChange, loading, error, onCancel, onSubmit }) {
  return (
    <Modal open={open} onCancel={loading ? undefined : onCancel} footer={null} centered width={400} maskClosable={!loading}>
      <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "#eff6ff",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px",
        }}>
          <LockOutlined style={{ fontSize: 28, color: BLUE }} />
        </div>
        <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>Confirma tu contraseña</h2>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 22 }}>
          Último paso antes de guardar los cambios de apariencia.
        </p>

        <div style={{ textAlign: "left", marginBottom: error ? 14 : 24 }}>
          <Input.Password
            size="large"
            prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onPressEnter={onSubmit}
            autoComplete="current-password"
            style={{ borderRadius: 8 }}
            disabled={loading}
            autoFocus
          />
        </div>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 20, borderRadius: 8, textAlign: "left" }} />}

        <div style={{ display: "flex", gap: 12 }}>
          <Button block size="large" onClick={onCancel} disabled={loading} style={{ borderRadius: 8 }}>Cancelar</Button>
          <Button block size="large" type="primary" loading={loading} onClick={onSubmit}
            style={{ borderRadius: 8, background: BLUE, borderColor: BLUE }}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TabApariencia({ cliente, idCliente, onSaved, toast }) {
  const [editing, setEditing] = useState(false);
  const [tema, setTema] = useState(() => buildTemaFromCliente(cliente));
  const [files, setFiles] = useState({});     // { logo_path: File, background_image: File, ... }
  const [previews, setPreviews] = useState({}); // { logo_path: objectUrl, ... }
  const [saving, setSaving] = useState(false);

  // Identidad verificada durante esta sesión de edición (correo usado en los pasos 1 y 2).
  const [verifiedEmail, setVerifiedEmail] = useState("");

  // --- Paso 1: login (correo + contraseña) ---
  const [step1Open, setStep1Open] = useState(false);
  const [step1Email, setStep1Email] = useState("");
  const [step1Password, setStep1Password] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1Error, setStep1Error] = useState("");

  // --- Paso 2: código de 6 dígitos por correo ---
  const [step2Open, setStep2Open] = useState(false);
  const [code, setCode] = useState("");
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // --- Paso 3: contraseña antes de guardar ---
  const [step3Open, setStep3Open] = useState(false);
  const [step3Password, setStep3Password] = useState("");
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const setColor = (key) => (color) => {
    setTema((prev) => ({ ...prev, [key]: color.toHexString() }));
  };

  const handlePickImage = (key) => (file) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    setPreviews((prev) => ({ ...prev, [key]: URL.createObjectURL(file) }));
  };

  const resetEditState = () => {
    setEditing(false);
    setTema(buildTemaFromCliente(cliente));
    setFiles({});
    setPreviews({});
    setVerifiedEmail("");
  };

  // ── Click en "Editar" → abre paso 1 ──────────────────────────────────────
  const handleClickEditar = () => {
    setStep1Email(localStorage.getItem("email") || "");
    setStep1Password("");
    setStep1Error("");
    setStep1Open(true);
  };

  const handleEnviarCodigo = async (email) => {
    setSendingCode(true);
    try {
      await apiClientesEventsInstance.post(
        "/clientes/tema/verificacion/enviar",
        { email },
        { headers: authHeaderClientesEvents() }
      );
      setVerifiedEmail(email);
      setCode("");
      setStep2Error("");
      setStep2Open(true);
      setResendCooldown(RESEND_COOLDOWN_SECS);
    } catch (err) {
      toast(err?.response?.data?.detail || "No se pudo enviar el código. Intenta de nuevo.");
    } finally {
      setSendingCode(false);
    }
  };

  const handleStep1Submit = async () => {
    if (!step1Email.trim() || !step1Password.trim()) {
      setStep1Error("Ingresa tu correo y contraseña.");
      return;
    }
    setStep1Loading(true);
    setStep1Error("");
    try {
      await apiClientesEventsInstance.post("/auth/login-admin", {
        email: step1Email.trim(),
        password: step1Password,
      });
      setStep1Open(false);
      await handleEnviarCodigo(step1Email.trim());
    } catch (err) {
      const status = err?.response?.status;
      setStep1Error(
        status === 401 || status === 400
          ? "Correo o contraseña incorrectos. Inténtalo de nuevo."
          : (err?.response?.data?.detail || "Error al verificar credenciales.")
      );
    } finally {
      setStep1Loading(false);
    }
  };

  const handleResendCodigo = () => {
    if (sendingCode || resendCooldown > 0) return;
    handleEnviarCodigo(verifiedEmail);
  };

  const handleStep2Submit = async () => {
    if (code.length < 6) {
      setStep2Error("Ingresa el código de 6 dígitos.");
      return;
    }
    setStep2Loading(true);
    setStep2Error("");
    try {
      const { data } = await apiClientesEventsInstance.post(
        "/clientes/tema/verificacion/validar",
        { email: verifiedEmail, code },
        { headers: authHeaderClientesEvents() }
      );
      if (!data?.status) {
        setStep2Error("Código incorrecto o expirado. Verifica e intenta de nuevo.");
        return;
      }
      setStep2Open(false);
      setEditing(true);
      toast("Identidad verificada. Ya puedes editar la apariencia.");
    } catch (err) {
      setStep2Error(err?.response?.data?.detail || "Error al validar el código.");
    } finally {
      setStep2Loading(false);
    }
  };

  // ── Click en "Guardar apariencia" → abre paso 3 ──────────────────────────
  const handleClickGuardar = () => {
    setStep3Password("");
    setStep3Error("");
    setStep3Open(true);
  };

  const handleGuardarApariencia = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      form.append("plan_deluxe", tema.plan_deluxe ? "1" : "0");
      form.append("dark_design", tema.dark_design === 0 ? "0" : "1");
      form.append("nombre_app", tema.nombre_app || "");
      COLOR_FIELDS.forEach(({ key }) => form.append(key, tema[key]));
      IMAGE_FIELDS.forEach(({ key, formField }) => {
        if (files[key]) form.append(formField, files[key]);
      });

      const res = await apiClientesEventsInstance.post(
        `/clientes/${idCliente}/tema`,
        form,
        { headers: { ...authHeaderClientesEvents(), "Content-Type": "multipart/form-data" }, params: { id_app: 1 } }
      );
      onSaved(res.data.item);
      setFiles({});
      setPreviews({});
      setEditing(false);
      setVerifiedEmail("");
      toast("Apariencia guardada correctamente");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar apariencia");
    } finally {
      setSaving(false);
    }
  };

  const handleStep3Submit = async () => {
    if (!step3Password.trim()) {
      setStep3Error("Ingresa tu contraseña.");
      return;
    }
    setStep3Loading(true);
    setStep3Error("");
    try {
      await apiClientesEventsInstance.post("/auth/login-admin", {
        email: verifiedEmail || localStorage.getItem("email") || "",
        password: step3Password,
      });
      setStep3Open(false);
      await handleGuardarApariencia();
    } catch (err) {
      const status = err?.response?.status;
      setStep3Error(
        status === 401 || status === 400
          ? "Contraseña incorrecta. Inténtalo de nuevo."
          : (err?.response?.data?.detail || "Error al verificar contraseña.")
      );
    } finally {
      setStep3Loading(false);
    }
  };

  return (
    <div className="cd-card">
      <div className="cd-card-header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="cd-card-icon-wrap"><BgColorsOutlined /></div>
          <h2 className="cd-card-title">Apariencia y marca</h2>
        </div>
        {!editing ? (
          <Button icon={<EditOutlined />} onClick={handleClickEditar}>Editar</Button>
        ) : (
          <Button icon={<CloseOutlined />} onClick={resetEditState}>Cancelar</Button>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 20px" }}>
        <div>
          <span className="cd-field-label" style={{ display: "block" }}>Tema personalizado activo</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            Si está apagado, el cliente ve el tema por defecto en su sistema
          </span>
        </div>
        <Switch
          checked={!!tema.plan_deluxe}
          disabled={!editing}
          onChange={(checked) => setTema((prev) => ({ ...prev, plan_deluxe: checked ? 1 : 0 }))}
          style={tema.plan_deluxe ? { backgroundColor: BLUE } : {}}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 4px 20px" }}>
        <div>
          <span className="cd-field-label" style={{ display: "block" }}>Diseño oscuro del navbar</span>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            Actívalo si el color de navbar/header es oscuro (texto e íconos en blanco). Desactívalo si elegiste un color claro (texto e íconos en oscuro).
          </span>
        </div>
        <Switch
          checked={tema.dark_design !== 0}
          disabled={!editing}
          onChange={(checked) => setTema((prev) => ({ ...prev, dark_design: checked ? 1 : 0 }))}
          style={tema.dark_design !== 0 ? { backgroundColor: BLUE } : {}}
        />
      </div>

      <div style={{ marginBottom: 24, maxWidth: 360 }}>
        <span className="cd-field-label" style={{ display: "block", marginBottom: 6 }}>Nombre de la app</span>
        <Input
          value={tema.nombre_app}
          disabled={!editing}
          onChange={(e) => setTema((prev) => ({ ...prev, nombre_app: e.target.value }))}
          placeholder="Ej. EcoSound"
          maxLength={80}
        />
      </div>

      <span className="cd-field-label" style={{ display: "block", marginBottom: 12 }}>Colores</span>
      <div className="ap-color-grid">
        {COLOR_FIELDS.map(({ key, label, desc }) => (
          <div key={key} className="ap-color-item">
            <ColorPicker value={tema[key]} onChangeComplete={setColor(key)} format="hex" disabled={!editing} />
            <div className="ap-color-text">
              <span className="ap-color-label">{label}</span>
              <span className="ap-color-desc">{desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="cd-divider" style={{ margin: "24px 0" }} />

      <span className="cd-field-label" style={{ display: "block", marginBottom: 4 }}>Imágenes</span>
      <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>
        La vista previa se muestra sobre el color real donde aparecerá cada imagen (o un fondo a cuadros si no aplica),
        para que puedas revisar logos blancos o transparentes antes de guardar.
      </p>
      <div className="ap-images-grid">
        {IMAGE_FIELDS.map(({ key, label, desc, hint, previewBgKey }) => (
          <div key={key}>
            <ImageDropzone
              label={label}
              desc={desc}
              hint={hint}
              currentPath={cliente[key]}
              preview={previews[key]}
              onPick={handlePickImage(key)}
              disabled={!editing}
              previewBg={previewBgKey ? tema[previewBgKey] : null}
            />
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
          <Button
            type="primary"
            icon={<PictureOutlined />}
            loading={saving}
            onClick={handleClickGuardar}
            style={{ background: BLUE, borderColor: BLUE }}
          >
            Guardar apariencia
          </Button>
        </div>
      )}

      <ModalConfirmarLogin
        open={step1Open}
        email={step1Email}
        onEmailChange={setStep1Email}
        password={step1Password}
        onPasswordChange={setStep1Password}
        loading={step1Loading}
        error={step1Error}
        onCancel={() => setStep1Open(false)}
        onSubmit={handleStep1Submit}
      />

      <ModalConfirmarCodigo
        open={step2Open}
        email={verifiedEmail}
        code={code}
        onCodeChange={setCode}
        loading={step2Loading}
        error={step2Error}
        sending={sendingCode}
        cooldown={resendCooldown}
        onResend={handleResendCodigo}
        onCancel={() => setStep2Open(false)}
        onSubmit={handleStep2Submit}
      />

      <ModalConfirmarPassword
        open={step3Open}
        password={step3Password}
        onPasswordChange={setStep3Password}
        loading={step3Loading}
        error={step3Error}
        onCancel={() => setStep3Open(false)}
        onSubmit={handleStep3Submit}
      />
    </div>
  );
}

export default function ClienteEventDetallePage({ idCliente, onBack, onEdit }) {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("datos");
  const [deletingModal, setDeletingModal] = useState(false);
  const [authModal, setAuthModal]         = useState(false);
  const [authEmail, setAuthEmail]         = useState("");
  const [authPassword, setAuthPassword]   = useState("");
  const [authLoading, setAuthLoading]     = useState(false);
  const [authError, setAuthError]         = useState("");
  const [deleting, setDeleting]           = useState(false);
  const [switching, setSwitching]         = useState(false);

  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [pagoModal, setPagoModal] = useState(false);
  const [savingPago, setSavingPago] = useState(false);
  const [deletingPagoId, setDeletingPagoId] = useState(null);
  const [pagoForm] = Form.useForm();
  const [pagoFilter, setPagoFilter] = useState("todos");
  const [pagoRange, setPagoRange] = useState(null);

  const [actividad, setActividad] = useState([]);
  const [loadingActividad, setLoadingActividad] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  const fetchCliente = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClientesEventsInstance.get(
        `/clientes/${idCliente}`,
        { headers: authHeaderClientesEvents(), params: { id_app: 1 } }
      );
      setCliente(res.data);
    } catch {
      toast("Error al cargar cliente");
    } finally {
      setLoading(false);
    }
  }, [idCliente]);

  useEffect(() => { fetchCliente(); }, [fetchCliente]);

  const fetchPagos = useCallback(async () => {
    setLoadingPagos(true);
    try {
      const res = await apiClientesEventsInstance.get(
        `/clientes/${idCliente}/pagos`,
        { headers: authHeaderClientesEvents(), params: { id_app: 1 } }
      );
      setPagos(Array.isArray(res.data) ? res.data : []);
    } catch { setPagos([]); } finally { setLoadingPagos(false); }
  }, [idCliente]);

  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const res = await apiClientesEventsInstance.get(
        `/clientes/${idCliente}/actividad`,
        { headers: authHeaderClientesEvents(), params: { id_app: 1 } }
      );
      setActividad(Array.isArray(res.data) ? res.data : res.data?.items ?? []);
    } catch { setActividad([]); } finally { setLoadingActividad(false); }
  }, [idCliente]);

  useEffect(() => {
    if (activeTab === "pagos") fetchPagos();
    if (activeTab === "actividad") fetchActividad();
  }, [activeTab, fetchPagos, fetchActividad]);

  const handleToggleSistema = async (checked) => {
    setSwitching(true);
    try {
      await apiClientesEventsInstance.patch(
        `/clientes/${idCliente}`,
        { habilitar_sistema: checked },
        { headers: authHeaderClientesEvents(), params: { id_app: 1 } }
      );
      setCliente(prev => ({ ...prev, habilitar_sistema: checked ? 1 : 0 }));
      toast(checked ? "Sistema habilitado" : "Sistema deshabilitado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al actualizar");
    } finally {
      setSwitching(false);
    }
  };

  const handleOpenAuth = () => {
    setDeletingModal(false);
    setAuthEmail(localStorage.getItem("email") || "");
    setAuthPassword("");
    setAuthError("");
    setAuthModal(true);
  };

  const handleVerifyAndDelete = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Ingresa tu correo y contraseña.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      await apiClientesEventsInstance.post("/auth/login-admin", {
        email: authEmail.trim(),
        password: authPassword,
      });
      setAuthModal(false);
      setDeleting(true);
      await apiClientesEventsInstance.delete(
        `/clientes/${idCliente}`,
        { headers: authHeaderClientesEvents(), params: { id_app: 1 } }
      );
      toast("Cliente eliminado correctamente");
      onBack();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 400) {
        setAuthError("Correo o contraseña incorrectos. Inténtalo de nuevo.");
      } else if (err?.config?.url?.includes("/auth/login")) {
        setAuthError(err?.response?.data?.detail || "Error al verificar credenciales.");
      } else {
        toast(err?.response?.data?.detail || err.message || "Error al eliminar");
        setAuthModal(false);
      }
    } finally {
      setAuthLoading(false);
      setDeleting(false);
    }
  };

  const handleRegistrarPago = async () => {
    let values;
    try { values = await pagoForm.validateFields(); } catch { return; }
    setSavingPago(true);
    try {
      await apiClientesEventsInstance.post(
        `/clientes/${idCliente}/pagos`,
        {
          monto: String(values.monto),
          fecha_pago: values.fecha_pago ? dayjs(values.fecha_pago).format("YYYY-MM-DD") : undefined,
        },
        { headers: authHeaderClientesEvents(), params: { id_app: 1 } }
      );
      toast("Pago registrado");
      pagoForm.resetFields();
      setPagoModal(false);
      fetchPagos();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al registrar pago");
    } finally { setSavingPago(false); }
  };

  const handleDeletePago = async (id) => {
    setDeletingPagoId(id);
    try {
      await apiClientesEventsInstance.delete(
        `/clientes/${idCliente}/pagos/${id}`,
        { headers: authHeaderClientesEvents(), params: { id_app: 1 } }
      );
      toast("Pago eliminado");
      fetchPagos();
    } catch { toast("Error al eliminar pago"); }
    finally { setDeletingPagoId(null); }
  };

  const filteredPagos = useMemo(() => {
    if (!pagos.length) return pagos;
    const now = dayjs();
    if (pagoFilter === "semana")   return pagos.filter(p => dayjs(p.fecha_pago).isAfter(now.subtract(7, "day")));
    if (pagoFilter === "quincena") return pagos.filter(p => dayjs(p.fecha_pago).isAfter(now.subtract(15, "day")));
    if (pagoFilter === "mes")      return pagos.filter(p => dayjs(p.fecha_pago).isAfter(now.subtract(30, "day")));
    if (pagoFilter === "anio")     return pagos.filter(p => dayjs(p.fecha_pago).isAfter(now.startOf("year")));
    if (pagoFilter === "custom" && pagoRange?.[0] && pagoRange?.[1]) {
      return pagos.filter(p => {
        const d = dayjs(p.fecha_pago);
        return d.isAfter(pagoRange[0].startOf("day").subtract(1, "ms"))
            && d.isBefore(pagoRange[1].endOf("day").add(1, "ms"));
      });
    }
    return pagos;
  }, [pagos, pagoFilter, pagoRange]);

  if (loading) {
    return <div className="cd-loading-wrap" style={{ padding: 80 }}><Spin size="large" /></div>;
  }
  if (!cliente) return null;

  const totalFiltrado = filteredPagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
  const totalPagos    = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);

  const proxPago  = dayjs(cliente.fecha_proxima_pago);
  const daysUntil = proxPago.isValid() ? proxPago.startOf("day").diff(dayjs().startOf("day"), "day") : null;
  const pagoColor = daysUntil === null ? "#64748b" : daysUntil < 0 ? "#b91c1c" : daysUntil <= 7 ? "#d97706" : "#15803d";
  const pagoBg    = daysUntil === null ? "#f1f5f9" : daysUntil < 0 ? "#fee2e2" : daysUntil <= 7 ? "#fef3c7" : "#dcfce7";

  return (
    <div>


      {/* Header card */}
      <div className="cd-header-card">
        <div className="cd-header-top">
          <div style={{ flex: 1 }}>
            <div className="cd-header-name-row">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div className="trab-avatar" style={{ width: 48, height: 48, fontSize: 18, minWidth: 48, background: BLUE }}>
                  {getInitials(cliente.nombre_cliente, cliente.apellido_cliente)}
                </div>
                <div>
                  <h1 className="cd-client-name" style={{ textTransform: "capitalize", fontSize: 22, marginBottom: 6 }}>
                    {cliente.nombre_cliente} {cliente.apellido_cliente}
                  </h1>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    {/* Sistema status badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#f8fafc", borderRadius: 20, padding: "4px 12px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: cliente.habilitar_sistema ? BLUE : "#9ca3af" }}>
                        {cliente.habilitar_sistema ? "Sistema activo" : "Sistema inactivo"}
                      </span>
                    </div>
                    {/* Próximo pago badge */}
                    {cliente.fecha_proxima_pago && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: pagoBg, color: pagoColor,
                        padding: "4px 12px", borderRadius: 20,
                        fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${pagoColor}33`,
                      }}>
                        {daysUntil !== null && daysUntil < 0 ? <WarningFilled /> : <CalendarOutlined />}
                        Próximo pago: {fmtFechaCorta(cliente.fecha_proxima_pago)}
                        <span style={{ fontWeight: 400, opacity: 0.85 }}>
                          {daysUntil === null ? "" : daysUntil < 0 ? ` (${Math.abs(daysUntil)}d vencido)` : daysUntil === 0 ? " (hoy)" : ` (en ${daysUntil}d)`}
                        </span>
                      </div>
                    )}
                    {/* Apps contratadas */}
                    {(cliente.apps_contratadas || []).map((app, idx) => {
                      const c = appColor(app.id_app - 1);
                      return (
                        <div key={app.id_app} style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: c.bg, color: c.color,
                          padding: "4px 10px", borderRadius: 20,
                          fontSize: 11, fontWeight: 700,
                          border: `1.5px solid ${c.color}33`,
                        }}>
                          <AppstoreOutlined style={{ fontSize: 11 }} />
                          {app.nombre}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="cd-header-meta">
              {cliente.correo  && <span className="cd-meta-item"><MailOutlined />  {cliente.correo}</span>}
              {cliente.celular && <span className="cd-meta-item"><PhoneOutlined /> {cliente.celular}</span>}
              {cliente.datetime && (
                <span className="cd-meta-item">
                  <CalendarOutlined /> Registrado: {fmtFechaCorta(cliente.datetime)}
                </span>
              )}
            </div>
          </div>

          <div className="cd-header-actions">
            <Button icon={<EditOutlined />} className="cd-btn-edit" onClick={() => onEdit(cliente)}>
              Editar
            </Button>
            <Button icon={<DeleteOutlined />} className="cd-btn-delete" loading={deleting} onClick={() => setDeletingModal(true)}>
              Eliminar
            </Button>
          </div>
        </div>

        <div className="cd-header-tabs events-tabs-wrap">
          {[
            { key: "datos",       label: "Datos del cliente", icon: <UserOutlined /> },
            { key: "apariencia",  label: "Apariencia",        icon: <BgColorsOutlined /> },
            { key: "pagos",       label: "Pagos",             icon: <DollarOutlined />, count: pagos.length },
            { key: "actividad",   label: "Actividad",         icon: <HistoryOutlined />, count: actividad.length },
          ].map((t) => (
            <button
              key={t.key}
              className={`cd-tab-btn ${activeTab === t.key ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon} {t.label}
              {t.count > 0 && <span className="cd-actividad-count">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TAB: DATOS ===== */}
      {activeTab === "datos" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="td-datos-grid">
          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><UserOutlined /></div>
              <h2 className="cd-card-title">Información personal</h2>
            </div>
            <div className="cd-client-fields">
              {[
                { label: "Nombre",  value: cliente.nombre_cliente },
                { label: "Apellido", value: cliente.apellido_cliente },
                { label: "RFC",     value: cliente.rfc },
                { label: "Correo",  value: cliente.correo },
                { label: "Celular", value: cliente.celular },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="cd-field-label">{label}</span>
                  <span className="cd-field-value" style={{ textTransform: label !== "RFC" && label !== "Correo" ? "capitalize" : undefined }}>
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="cd-card">
            <div className="cd-card-header">
              <div className="cd-card-icon-wrap"><SettingOutlined /></div>
              <h2 className="cd-card-title">Configuración en Events</h2>
            </div>
            <div className="cd-client-fields">
              {/* Switch interactivo */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 4 }}>
                <div>
                  <span className="cd-field-label" style={{ display: "block" }}>Acceso al sistema</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    {cliente.habilitar_sistema ? "El cliente puede iniciar sesión" : "El cliente no tiene acceso"}
                  </span>
                </div>
                <Switch
                  checked={!!cliente.habilitar_sistema}
                  loading={switching}
                  onChange={handleToggleSistema}
                  style={cliente.habilitar_sistema ? { backgroundColor: BLUE } : {}}
                />
              </div>

              {/* Fecha próximo pago prominente */}
              <div>
                <span className="cd-field-label" style={{ display: "block", marginBottom: 6 }}>Fecha próximo pago</span>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: pagoBg, color: pagoColor,
                  padding: "8px 16px", borderRadius: 12,
                  fontWeight: 700, fontSize: 15,
                  border: `1.5px solid ${pagoColor}33`,
                }}>
                  {daysUntil !== null && daysUntil < 0 ? <WarningFilled /> : <CalendarOutlined />}
                  {fmtFecha(cliente.fecha_proxima_pago)}
                </div>
                {daysUntil !== null && (
                  <div style={{ marginTop: 4, fontSize: 12, color: pagoColor, fontWeight: 500 }}>
                    {daysUntil < 0
                      ? `Vencido hace ${Math.abs(daysUntil)} días`
                      : daysUntil === 0
                        ? "Vence hoy"
                        : `Faltan ${daysUntil} días`}
                  </div>
                )}
              </div>

              {/* Apps contratadas */}
              {(cliente.apps_contratadas || []).length > 0 && (
                <div>
                  <span className="cd-field-label" style={{ display: "block", marginBottom: 8 }}>Apps contratadas</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(cliente.apps_contratadas || []).map((app) => {
                      const c = appColor(app.id_app - 1);
                      return (
                        <div key={app.id_app} style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: c.bg, color: c.color,
                          padding: "6px 14px", borderRadius: 20,
                          fontSize: 13, fontWeight: 700,
                          border: `1.5px solid ${c.color}33`,
                        }}>
                          <AppstoreOutlined />
                          {app.nombre}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <span className="cd-field-label">Fecha de registro</span>
                <span className="cd-field-value">{fmtFecha(cliente.datetime)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: APARIENCIA ===== */}
      {activeTab === "apariencia" && (
        <TabApariencia
          key={cliente.id_cliente}
          cliente={cliente}
          idCliente={idCliente}
          onSaved={(item) => setCliente(item)}
          toast={toast}
        />
      )}

      {/* ===== TAB: PAGOS ===== */}
      {activeTab === "pagos" && (
        <div>
          {/* Filter + action row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
            <Space wrap>
              <Select
                value={pagoFilter}
                onChange={(v) => { setPagoFilter(v); if (v !== "custom") setPagoRange(null); }}
                options={PAGO_FILTER_OPTIONS}
                style={{ minWidth: 190 }}
              />
              {pagoFilter === "custom" && (
                <RangePicker
                  value={pagoRange}
                  onChange={setPagoRange}
                  format="DD/MM/YYYY"
                  placeholder={["Desde", "Hasta"]}
                />
              )}
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              style={{ background: BLUE, borderColor: BLUE }}
              onClick={() => { pagoForm.resetFields(); setPagoModal(true); }}
            >
              Registrar pago
            </Button>
          </div>

          {loadingPagos ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spin size="large" /></div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                <div className="cd-card" style={{ padding: "20px 24px" }}>
                  <span className="cd-field-label">Total {pagoFilter !== "todos" ? "filtrado" : "pagado"}</span>
                  <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: "#05060a" }}>
                    ${totalFiltrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </p>
                  <span className="cd-financial-note">
                    {pagoFilter !== "todos"
                      ? `${filteredPagos.length} de ${pagos.length} pago${pagos.length !== 1 ? "s" : ""}`
                      : "Suma de todos los pagos"}
                  </span>
                </div>
                <div className="cd-card" style={{ padding: "20px 24px" }}>
                  <span className="cd-field-label">Número de pagos</span>
                  <p className="cd-financial-value" style={{ fontSize: 32, margin: "8px 0 4px", color: "#05060a" }}>
                    {filteredPagos.length}
                  </p>
                  <span className="cd-financial-note">
                    {pagoFilter !== "todos" ? "En el período seleccionado" : "Pagos registrados"}
                  </span>
                </div>
                <div className="cd-card" style={{ padding: "20px 24px" }}>
                  <span className="cd-field-label">Próximo pago</span>
                  <p style={{ fontSize: 15, margin: "8px 0 4px", fontWeight: 700, color: pagoColor }}>
                    {fmtFechaCorta(cliente.fecha_proxima_pago)}
                  </p>
                  <span className="cd-financial-note" style={{ color: pagoColor }}>
                    {daysUntil === null ? "—" : daysUntil < 0 ? `Vencido hace ${Math.abs(daysUntil)}d` : daysUntil === 0 ? "Vence hoy" : `En ${daysUntil} días`}
                  </span>
                </div>
              </div>

              <div className="cd-card">
                <div className="cd-card-header">
                  <div className="cd-card-icon-wrap"><DollarOutlined /></div>
                  <h2 className="cd-card-title">Historial de pagos</h2>
                </div>
                {filteredPagos.length === 0 ? (
                  <Empty
                    description={pagoFilter !== "todos" ? "Sin pagos en el período seleccionado" : "Sin pagos registrados aún"}
                    style={{ margin: "40px 0" }}
                  />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                          {["#", "Fecha de pago", "Monto", "Registrado", "Acción"].map((h, i) => (
                            <th key={h} style={{
                              textAlign: i === 2 ? "right" : i === 4 ? "center" : "left",
                              padding: "8px 12px", fontWeight: 600, color: "#64748b",
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPagos.map((p, idx) => (
                          <tr key={p.id_cliente_pago} style={{ borderBottom: "1px solid #f8fafc" }}>
                            <td style={{ padding: "9px 12px", color: "#9ca3af" }}>{idx + 1}</td>
                            <td style={{ padding: "9px 12px" }}>{fmtFechaCorta(p.fecha_pago)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#15803d" }}>
                              ${parseFloat(p.monto || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: "9px 12px", color: "#64748b", fontSize: 12 }}>{fmtFechaCorta(p.datetime)}</td>
                            <td style={{ padding: "9px 12px", textAlign: "center" }}>
                              <Button
                                size="small" danger icon={<DeleteOutlined />}
                                loading={deletingPagoId === p.id_cliente_pago}
                                onClick={() => handleDeletePago(p.id_cliente_pago)}
                              />
                            </td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                          <td colSpan={2} style={{ padding: "10px 12px", fontWeight: 700 }}>
                            Total — {filteredPagos.length} pago{filteredPagos.length !== 1 ? "s" : ""}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#15803d", fontSize: 15 }}>
                            ${totalFiltrado.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== TAB: ACTIVIDAD ===== */}
      {activeTab === "actividad" && (
        <div className="cd-card">
          <div className="cd-card-header">
            <div className="cd-card-icon-wrap"><HistoryOutlined /></div>
            <h2 className="cd-card-title">
              Actividad del cliente
              {actividad.length > 0 && <span className="cd-actividad-count">{actividad.length}</span>}
            </h2>
          </div>
          {loadingActividad ? (
            <div className="cd-loading-wrap"><Spin size="large" /></div>
          ) : actividad.length === 0 ? (
            <Empty description="Sin actividad registrada aún" style={{ margin: "40px 0" }} />
          ) : (
            <div className="cd-actividad-list">
              {actividad.map((item, idx) => {
                const CFG = {
                  CREATE: { label: "Creación",      color: "#15803d", bg: "#dcfce7" },
                  UPDATE: { label: "Actualización", color: "#1d4ed8", bg: "#dbeafe" },
                  DELETE: { label: "Eliminación",   color: "#b91c1c", bg: "#fee2e2" },
                };
                const cfg = CFG[item.action] || { label: item.action, color: "#595c5e", bg: "#f1f5f9" };
                return (
                  <div key={item.id_audit_log || idx} className="cd-actividad-item">
                    <div className="cd-actividad-dot-col">
                      <div className="cd-actividad-dot" style={{ background: cfg.color }} />
                      {idx < actividad.length - 1 && <div className="cd-actividad-line" />}
                    </div>
                    <div className="cd-actividad-body">
                      <div className="cd-actividad-top-row">
                        <span className="cd-actividad-badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
                        <span className="cd-actividad-message">{item.message}</span>
                      </div>
                      <div className="cd-actividad-bottom-row">
                        <span className="cd-actividad-time">
                          {item.datetime ? dayjs(item.datetime).format("DD/MM/YYYY, HH:mm") : "—"}
                        </span>
                        {item.user_name && (
                          <div className="cd-actividad-user">
                            <span>{item.user_name}</span>
                            {item.user_email && <span className="cd-actividad-email">{item.user_email}</span>}
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

      {/* Modal paso 1 — Advertencia */}
      <Modal
        open={deletingModal}
        onCancel={() => setDeletingModal(false)}
        footer={null}
        centered
        width={440}
      >
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#fee2e2", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
          }}>
            <ExclamationCircleFilled style={{ fontSize: 32, color: "#b91c1c" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>
            ¿Eliminar cliente?
          </h2>
          <p style={{ color: "#475569", fontSize: 14, marginBottom: 6 }}>
            Estás a punto de eliminar permanentemente a
          </p>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 12, textTransform: "capitalize" }}>
            {cliente.nombre_cliente} {cliente.apellido_cliente}
          </p>
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "12px 16px", marginBottom: 24,
            textAlign: "left",
          }}>
            {[
              "Todos sus datos personales",
              "Historial completo de pagos",
              "Registro de actividad",
              "Acceso al sistema Events",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13, color: "#7f1d1d" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#b91c1c", flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 24 }}>
            Esta acción <strong>no se puede deshacer</strong>.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Button
              block
              size="large"
              onClick={() => setDeletingModal(false)}
              style={{ borderRadius: 8 }}
            >
              Cancelar
            </Button>
            <Button
              block
              size="large"
              danger
              type="primary"
              onClick={handleOpenAuth}
              style={{ borderRadius: 8 }}
            >
              Continuar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal paso 2 — Autenticación */}
      <Modal
        open={authModal}
        onCancel={() => { if (!authLoading) setAuthModal(false); }}
        footer={null}
        centered
        width={420}
        maskClosable={!authLoading}
      >
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#eff6ff", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
          }}>
            <LockOutlined style={{ fontSize: 28, color: BLUE }} />
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6, color: "#0f172a" }}>
            Confirma tu identidad
          </h2>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>
            Para eliminar este cliente ingresa tus credenciales de administrador.
          </p>

          <div style={{ textAlign: "left", marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Correo electrónico
            </label>
            <Input
              size="large"
              prefix={<MailOutlined style={{ color: "#9ca3af" }} />}
              placeholder="correo@ejemplo.com"
              value={authEmail}
              onChange={(e) => { setAuthEmail(e.target.value); setAuthError(""); }}
              autoComplete="email"
              style={{ borderRadius: 8 }}
              disabled={authLoading}
            />
          </div>

          <div style={{ textAlign: "left", marginBottom: authError ? 14 : 24 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Contraseña
            </label>
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
              placeholder="Tu contraseña"
              value={authPassword}
              onChange={(e) => { setAuthPassword(e.target.value); setAuthError(""); }}
              onPressEnter={handleVerifyAndDelete}
              autoComplete="current-password"
              style={{ borderRadius: 8 }}
              disabled={authLoading}
            />
          </div>

          {authError && (
            <Alert
              type="error"
              message={authError}
              showIcon
              style={{ marginBottom: 20, borderRadius: 8, textAlign: "left" }}
            />
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <Button
              block
              size="large"
              onClick={() => setAuthModal(false)}
              disabled={authLoading}
              style={{ borderRadius: 8 }}
            >
              Cancelar
            </Button>
            <Button
              block
              size="large"
              danger
              type="primary"
              loading={authLoading}
              onClick={handleVerifyAndDelete}
              style={{ borderRadius: 8 }}
            >
              Verificar y eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal registrar pago */}
      <Modal
        title="Registrar pago"
        open={pagoModal}
        onCancel={() => setPagoModal(false)}
        onOk={handleRegistrarPago}
        confirmLoading={savingPago}
        okText="Registrar"
        okButtonProps={{ style: { background: BLUE, borderColor: BLUE } }}
        cancelText="Cancelar"
      >
        <Form form={pagoForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="monto" label="Monto" rules={[{ required: true, message: "Ingresa el monto" }]}>
            <Input prefix="$" placeholder="0.00" autoComplete="off" />
          </Form.Item>
          <Form.Item name="fecha_pago" label="Fecha de pago" rules={[{ required: true, message: "Selecciona la fecha" }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Selecciona fecha" />
          </Form.Item>
        </Form>
      </Modal>

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
    </div>
  );
}
