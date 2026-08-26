import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Typography,
} from "antd";
import { MailOutlined, LockOutlined, WarningOutlined } from "@ant-design/icons";
import axios from "axios";
import { PATH } from "../../redux/utils";
import { sessionManager } from "../../redux/sessionManager";
import { performLogout } from "../../utils/logout";
import Toast from "../toasts/toast";

const { Title, Text } = Typography;

export default function ModalReautenticar({ open, onClose }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ email: localStorage.getItem("email") || "" });
    }
  }, [open, form]);

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${PATH}/auth/login`,
        { email: values.email, password: values.password },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = data?.access_token;
      if (!token) throw new Error("Respuesta inválida del servidor");

      localStorage.setItem("token", token);
      // Reautenticación normal, no es sesión de panel admin: no pisar/crear tokenadmin.
      localStorage.removeItem("tokenadmin");
      localStorage.setItem("email", values.email);
      localStorage.setItem("usuario_cliente", data?.usuario_cliente === 1 ? "1" : "0");
      if (data?.role) {
        localStorage.setItem("role", data.role);
        localStorage.setItem("activeButtonAdmin", data.role === "admin" ? "1" : "0");
        localStorage.setItem("activeButtonUser", data.role === "admin" ? "0" : "1");
      }

      sessionManager.onAuthSuccess(token);
      window.dispatchEvent(new Event("permisos-refresh"));
      form.resetFields();
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Correo o contraseña incorrectos";
      toast(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionManager.onAuthFailure();
    ["token", "tokenadmin", "email", "role", "activeButtonAdmin", "activeButtonUser"].forEach(
      (k) => localStorage.removeItem(k)
    );
    // Cierre completo: backend + reset Redux + replace history → sin "atrás".
    performLogout({ admin: false });
  };

  return (
    <Modal
      open={open}
      centered
      closable={false}
      maskClosable={false}
      keyboard={false}
      width={460}
      footer={null}
      styles={{
        content: {
          padding: 0,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,.22)",
        },
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 22px",
          background:
            "linear-gradient(135deg, rgba(220,38,38,.10) 0%, rgba(239,68,68,.06) 55%, rgba(255,255,255,0) 100%)",
          borderBottom: "1px solid rgba(0,0,0,.06)",
        }}
      >
        <Space size={12} align="center">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, rgba(220,38,38,.16) 0%, rgba(239,68,68,.12) 100%)",
              border: "1px solid rgba(0,0,0,.06)",
            }}
          >
            <WarningOutlined style={{ fontSize: 20, color: "#dc2626" }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>
              Sesión expirada
            </Title>
            <Text type="secondary">
              Vuelve a iniciar sesión para continuar donde te quedaste.
            </Text>
          </div>
        </Space>
      </div>

      {/* Body */}
      <div style={{ padding: "18px 22px 22px" }}>
        <Form form={form} layout="vertical" requiredMark="optional" onFinish={handleSubmit}>
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
              disabled={loading}
              style={{
                borderRadius: 12,
                background: "rgba(220,38,38,.03)",
                border: "1px solid rgba(0,0,0,.10)",
              }}
            />
          </Form.Item>

          <Form.Item
            label="Contraseña"
            name="password"
            rules={[{ required: true, message: "La contraseña es obligatoria." }]}
            style={{ marginBottom: 20 }}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Tu contraseña"
              disabled={loading}
              autoFocus
              style={{
                borderRadius: 12,
                background: "rgba(220,38,38,.03)",
                border: "1px solid rgba(0,0,0,.10)",
              }}
            />
          </Form.Item>

          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <Button
              danger
              onClick={handleLogout}
              disabled={loading}
              style={{ borderRadius: 12 }}
            >
              Cerrar sesión
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                borderRadius: 12,
                border: "none",
                background:
                  "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(30,58,138,1) 100%)",
                boxShadow: "0 10px 24px rgba(30,58,138,.28)",
              }}
            >
              Iniciar sesión
            </Button>
          </Space>
        </Form>
      </div>

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
    </Modal>
  );
}
