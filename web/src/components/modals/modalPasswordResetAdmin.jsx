import React, { useRef, useState } from "react";
import {
  Modal,
  Button,
  Form,
  Input,
  Typography,
  Space,
  notification,
} from "antd";
import {
  MailOutlined,
  LockOutlined,
  KeyOutlined,
  SafetyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { actionCorreoAdmin, actionCodigoAdmin, actionNewPasswordAdmin } from "../../redux/actions/login/login";
import Toast from "../toasts/toast";

const { Title, Text } = Typography;

const HEADER_STYLE = {
  padding: "18px 22px",
  background: "linear-gradient(135deg, rgba(30,58,138,.10) 0%, rgba(59,130,246,.06) 55%, rgba(255,255,255,0) 100%)",
  borderBottom: "1px solid rgba(0,0,0,.06)",
};
const ICON_BOX = {
  width: 40, height: 40, borderRadius: 12,
  display: "grid", placeItems: "center",
  background: "linear-gradient(135deg, rgba(30,58,138,.16) 0%, rgba(59,130,246,.12) 100%)",
  border: "1px solid rgba(0,0,0,.06)",
};
const BTN_PRIMARY = {
  borderRadius: 12, border: "none",
  background: "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(30,58,138,1) 100%)",
  boxShadow: "0 10px 24px rgba(30,58,138,.28)",
};
const BTN_CANCEL = { borderRadius: 12, border: "1px solid rgba(0,0,0,.14)" };
const INPUT_STYLE = { borderRadius: 12, background: "rgba(30,58,138,.04)", border: "1px solid rgba(0,0,0,.10)" };

function ModalPasswordResetAdmin({ show, setShow }) {
  const dispatch = useDispatch();

  const [step, setStep]       = useState("email"); // "email" | "code" | "password"
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [formEmail]    = Form.useForm();
  const [formCode]     = Form.useForm();
  const [formPassword] = Form.useForm();

  const inputCodeRef  = useRef(null);
  const inputPass2Ref = useRef(null);

  const resetAll = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setLoading(false);
    formEmail.resetFields();
    formCode.resetFields();
    formPassword.resetFields();
  };

  const handleClose = () => {
    if (loading) return;
    resetAll();
    setShow(false);
  };

  // ── PASO 1: enviar correo ────────────────────────────────────────────────
  const submitEmail = async () => {
    try {
      const { email: val } = await formEmail.validateFields();
      setLoading(true);
      dispatch(
        actionCorreoAdmin(
          { email: val },
          (res) => {
            setLoading(false);
            if (!res?.status) {
              notification.error({
                message: "No se pudo continuar",
                description: "El correo no existe en el sistema.",
                placement: "top",
              });
              return;
            }
            setEmail(val);
            setStep("code");
          },
          () => {
            setLoading(false);
            notification.error({
              message: "Error",
              description: "No se pudo enviar el código.",
              placement: "top",
            });
          }
        )
      );
    } catch { /* validación */ }
  };

  // ── PASO 2: validar código ───────────────────────────────────────────────
  const submitCode = async () => {
    try {
      const values = await formCode.validateFields();
      const codeVal = (values.code || "").trim();
      setLoading(true);
      dispatch(
        actionCodigoAdmin(
          { email, code: codeVal },
          (res) => {
            setLoading(false);
            if (!res?.status) {
              notification.error({
                message: "Código inválido",
                description: "Verifica el código e inténtalo de nuevo.",
                placement: "top",
              });
              return;
            }
            setCode(codeVal);
            setStep("password");
          },
          () => {
            setLoading(false);
            notification.error({
              message: "Error",
              description: "No se pudo validar el código.",
              placement: "top",
            });
          }
        )
      );
    } catch { /* validación */ }
  };

  // ── PASO 3: nueva contraseña ─────────────────────────────────────────────
  const submitPassword = async () => {
    try {
      const { newPassword, confirmPassword } = await formPassword.validateFields();
      if (newPassword !== confirmPassword) {
        notification.error({
          message: "Las contraseñas no coinciden",
          description: "Verifica que ambas contraseñas sean iguales.",
          placement: "top",
        });
        return;
      }
      setLoading(true);
      dispatch(
        actionNewPasswordAdmin(
          { email, code, password: newPassword },
          () => {
            setLoading(false);
            resetAll();
            setShow(false);
            setShowToast(true);
          },
          (err) => {
            setLoading(false);
            notification.error({
              message: "No se pudo actualizar",
              description: typeof err === "string" ? err : "Error al actualizar la contraseña.",
              placement: "top",
            });
          }
        )
      );
    } catch { /* validación */ }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  const titles = {
    email:    "Recuperación de contraseña",
    code:     "Verificación de seguridad",
    password: "Crear nueva contraseña",
  };
  const subtitles = {
    email:    "Ingresa el correo de tu cuenta admin para continuar.",
    code:     `Ingresa el código enviado a ${email || "tu correo"}.`,
    password: `Define una nueva contraseña para ${email || "tu cuenta"}.`,
  };

  return (
    <>
      <Toast show={showToast} msg="Tu contraseña fue actualizada correctamente." setShow={setShowToast} />

      <Modal
        open={show}
        centered
        closable={!loading}
        maskClosable={!loading}
        onCancel={handleClose}
        width={520}
        footer={null}
        styles={{
          content: {
            padding: 0, borderRadius: 16, overflow: "hidden",
            background: "linear-gradient(180deg, rgba(250,250,252,1) 0%, rgba(255,255,255,1) 60%)",
            boxShadow: "0 24px 80px rgba(0,0,0,.18)",
          },
        }}
      >
        {/* Header */}
        <div style={HEADER_STYLE}>
          <Space size={12} align="center">
            <div style={ICON_BOX}>
              {step === "email"    && <LockOutlined style={{ fontSize: 18 }} />}
              {step === "code"     && <SafetyOutlined style={{ fontSize: 18 }} />}
              {step === "password" && <SafetyOutlined style={{ fontSize: 18 }} />}
            </div>
            <div>
              <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>{titles[step]}</Title>
              <Text type="secondary">{subtitles[step]}</Text>
            </div>
          </Space>
        </div>

        <div style={{ padding: "18px 22px 22px" }}>

          {/* PASO 1 */}
          {step === "email" && (
            <Form form={formEmail} layout="vertical" requiredMark="optional">
              <Form.Item
                label="Correo electrónico"
                name="email"
                rules={[
                  { required: true, message: "El correo es obligatorio." },
                  { type: "email", message: "Escribe un correo válido." },
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  size="large"
                  prefix={<MailOutlined />}
                  placeholder="tu_correo@dominio.com"
                  maxLength={100}
                  autoFocus
                  disabled={loading}
                  onPressEnter={submitEmail}
                  style={INPUT_STYLE}
                />
              </Form.Item>
              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <Button onClick={handleClose} disabled={loading} style={BTN_CANCEL}>Cancelar</Button>
                <Button type="primary" loading={loading} onClick={submitEmail} style={BTN_PRIMARY}>Enviar</Button>
              </Space>
            </Form>
          )}

          {/* PASO 2 */}
          {step === "code" && (
            <Form form={formCode} layout="vertical" requiredMark={false}>
              <Form.Item
                label="Código"
                name="code"
                rules={[
                  { required: true, message: "El código es obligatorio." },
                  { max: 10, message: "Máximo 10 caracteres." },
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input
                  ref={inputCodeRef}
                  size="large"
                  prefix={<KeyOutlined />}
                  placeholder="Ej. a1b2c3d4e5"
                  maxLength={10}
                  autoFocus
                  disabled={loading}
                  onPressEnter={submitCode}
                  style={{ ...INPUT_STYLE, letterSpacing: 1 }}
                />
              </Form.Item>
              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <Button onClick={handleClose} disabled={loading} style={BTN_CANCEL}>Cancelar</Button>
                <Button type="primary" loading={loading} onClick={submitCode} style={BTN_PRIMARY}>Validar</Button>
              </Space>
            </Form>
          )}

          {/* PASO 3 */}
          {step === "password" && (
            <Form form={formPassword} layout="vertical" requiredMark={false}>
              <Form.Item
                label="Nueva contraseña"
                name="newPassword"
                rules={[
                  { required: true, message: "La contraseña es obligatoria." },
                  { min: 6, message: "Usa al menos 6 caracteres." },
                  { max: 15, message: "Máximo 15 caracteres." },
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input.Password
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="Nueva contraseña"
                  maxLength={15}
                  autoFocus
                  disabled={loading}
                  onPressEnter={() => inputPass2Ref.current?.focus()}
                  iconRender={(v) => v ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  style={INPUT_STYLE}
                />
              </Form.Item>
              <Form.Item
                label="Confirmar contraseña"
                name="confirmPassword"
                rules={[
                  { required: true, message: "Confirma la contraseña." },
                  { min: 6, message: "Usa al menos 6 caracteres." },
                  { max: 15, message: "Máximo 15 caracteres." },
                ]}
                style={{ marginBottom: 14 }}
              >
                <Input.Password
                  ref={inputPass2Ref}
                  size="large"
                  prefix={<LockOutlined />}
                  placeholder="Repite la contraseña"
                  maxLength={15}
                  disabled={loading}
                  onPressEnter={submitPassword}
                  iconRender={(v) => v ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  style={INPUT_STYLE}
                />
              </Form.Item>
              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <Button onClick={handleClose} disabled={loading} style={BTN_CANCEL}>Cancelar</Button>
                <Button type="primary" loading={loading} onClick={submitPassword} style={BTN_PRIMARY}>Guardar</Button>
              </Space>
            </Form>
          )}

        </div>
      </Modal>
    </>
  );
}

export default ModalPasswordResetAdmin;
