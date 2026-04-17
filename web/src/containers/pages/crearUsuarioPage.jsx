// src/containers/pages/crearUsuarioPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  apiUsuariosInstance,
  authHeaderUsuarios,
} from "../../redux/actions/usuarios/usuarios";

import {
  Form,
  Input,
  Button,
  Row,
  Col,
  Divider,
  notification,
  Typography,
  Space,
} from "antd";
import { ArrowLeftOutlined, EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";

import "./ContratosPage.css";

const { Title, Text } = Typography;

export default function CrearUsuarioPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const usuarioEditar = location.state?.usuario ?? null;
  const isEditing = !!usuarioEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (usuarioEditar) {
      form.setFieldsValue({
        name: usuarioEditar.name,
        email: usuarioEditar.email,
      });
    }
  }, [usuarioEditar, form]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    if (!isEditing && values.password !== values.confirm_password) {
      notification.error({
        message: "Las contraseñas no coinciden",
        description: "Asegúrate de que ambas contraseñas sean iguales.",
      });
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        const payload = { name: values.name.trim(), email: values.email.trim() };
        if (values.password) {
          if (values.password !== values.confirm_password) {
            notification.error({ message: "Las contraseñas no coinciden" });
            setSaving(false);
            return;
          }
          payload.password = values.password;
        }
        await apiUsuariosInstance.patch(
          `/users/${usuarioEditar.code}`,
          payload,
          { headers: authHeaderUsuarios() }
        );
        notification.success({ message: "Usuario actualizado correctamente" });
        navigate(`/usuarios/${usuarioEditar.code}`);
      } else {
        const payload = {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
        };
        const res = await apiUsuariosInstance.post("/users", payload, {
          headers: authHeaderUsuarios(),
        });
        const code = res.data?.code;
        notification.success({ message: "Usuario creado exitosamente" });
        navigate(`/usuarios/${code}`);
      }
    } catch (err) {
      notification.error({
        message: "Error al guardar",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="contratos-main">
      <div className="contratos-content">

        {/* HEADER */}
        <section className="contratos-header-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <Space direction="vertical" size={2}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/usuarios")}
                style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
              >
                Volver a Usuarios
              </Button>
              <Title level={2} className="contratos-title" style={{ marginBottom: 0 }}>
                {isEditing ? `Editando usuario: ${usuarioEditar.name}` : "Nuevo usuario"}
              </Title>
              <Text className="contratos-subtitle">
                {isEditing
                  ? "Modifica los datos del usuario y guarda los cambios."
                  : "Completa los datos para registrar un nuevo usuario."}
              </Text>
            </Space>

            <Space style={{ marginTop: 4 }}>
              <Button
                className="contratos-btn-clean"
                onClick={() => navigate("/usuarios")}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                loading={saving}
                onClick={handleSave}
                style={{ backgroundColor: "#111", borderColor: "#111" }}
              >
                {isEditing ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </Space>
          </div>
        </section>

        {/* FORMULARIO */}
        <div className="contratos-filters-panel" style={{ marginTop: 0 }}>
          <Form form={form} layout="vertical">

            <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>
              Datos del usuario
            </Title>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="name"
                  label={<span className="contratos-field-label">Nombre completo</span>}
                  rules={[{ required: true, message: "Requerido" }]}
                >
                  <Input placeholder="Nombre del usuario" autoComplete="off" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="email"
                  label={<span className="contratos-field-label">Correo electrónico</span>}
                  rules={[
                    { required: true, message: "Requerido" },
                    { type: "email", message: "Correo inválido" },
                  ]}
                >
                  <Input placeholder="correo@ejemplo.com" autoComplete="off" />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "4px 0 20px" }} />

            <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>
              {isEditing ? "Cambiar contraseña (opcional)" : "Contraseña"}
            </Title>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="password"
                  label={<span className="contratos-field-label">Contraseña</span>}
                  rules={
                    !isEditing
                      ? [
                          { required: true, message: "Requerido" },
                          { min: 6, message: "Mínimo 6 caracteres" },
                        ]
                      : [{ min: 6, message: "Mínimo 6 caracteres" }]
                  }
                >
                  <Input.Password
                    placeholder="Contraseña"
                    autoComplete="new-password"
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="confirm_password"
                  label={<span className="contratos-field-label">Confirmar contraseña</span>}
                  rules={
                    !isEditing
                      ? [{ required: true, message: "Requerido" }]
                      : []
                  }
                  dependencies={["password"]}
                >
                  <Input.Password
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    iconRender={(visible) =>
                      visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                    }
                  />
                </Form.Item>
              </Col>
            </Row>

          </Form>
        </div>

      </div>
    </main>
  );
}
