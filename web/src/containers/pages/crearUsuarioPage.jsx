// src/containers/pages/crearUsuarioPage.jsx
import React, { useState, useEffect, useRef } from "react";
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
import "./UsuariosPage.css";

const { Title, Text } = Typography;

const API_BASE = `http://${window.location.hostname}:8000`;

export default function CrearUsuarioPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const usuarioEditar = location.state?.usuario ?? null;
  const isEditing = !!usuarioEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // foto state
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(
    isEditing && usuarioEditar?.path ? `${API_BASE}/${usuarioEditar.path}` : null
  );
  const [dragging, setDragging] = useState(false);
  const fotoInputRef = useRef(null);

  useEffect(() => {
    if (usuarioEditar) {
      form.setFieldsValue({
        name: usuarioEditar.name,
        email: usuarioEditar.email,
      });
    }
  }, [usuarioEditar, form]);

  const handleFotoSelect = (file) => {
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFotoSelect(file);
  };

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
      let savedCode;

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
        savedCode = usuarioEditar.code;
        notification.success({ message: "Usuario actualizado correctamente" });
      } else {
        const payload = {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          password: values.password,
        };
        const res = await apiUsuariosInstance.post("/users", payload, {
          headers: authHeaderUsuarios(),
        });
        savedCode = res.data?.code;
        notification.success({ message: "Usuario creado exitosamente" });
      }

      if (fotoFile && savedCode) {
        const fd = new FormData();
        fd.append("file", fotoFile);
        await apiUsuariosInstance.post(`/users/${savedCode}/imagen`, fd, {
          headers: {
            ...authHeaderUsuarios(),
            "Content-Type": "multipart/form-data",
          },
        });
      }

      navigate(`/usuarios/${savedCode}`);
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, marginTop: 0 }}>

          {/* COLUMNA IZQUIERDA – datos */}
          <div className="contratos-filters-panel">
            <Form form={form} layout="vertical">

              <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>
                Datos del usuario
              </Title>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="name"
                    label={<span className="contratos-field-label">Nombre completo</span>}
                    rules={[{ required: true, message: "Requerido" }]}
                  >
                    <Input placeholder="Nombre del usuario" autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
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
                <Col xs={24} md={12}>
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
                <Col xs={24} md={12}>
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

          {/* COLUMNA DERECHA – foto */}
          <div className="contratos-filters-panel" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Title level={5} style={{ marginBottom: 4, color: "#374151" }}>
              Foto de perfil <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 12 }}>(opcional)</span>
            </Title>

            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFotoSelect(e.target.files?.[0])}
            />

            <div
              className={`usr-dragger${dragging ? " usr-dragger-over" : ""}${fotoPreview ? " usr-dragger-filled" : ""}`}
              onClick={() => !fotoPreview && fotoInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {fotoPreview ? (
                <div className="usr-dragger-preview">
                  <img src={fotoPreview} alt="preview" className="usr-dragger-img" />
                  <button
                    className="usr-dragger-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFotoFile(null);
                      setFotoPreview(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="usr-dragger-placeholder">
                  <span className="usr-dragger-placeholder-icon">📷</span>
                  <span className="usr-dragger-placeholder-text">
                    Arrastra una imagen aquí<br />o haz clic para seleccionar
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
