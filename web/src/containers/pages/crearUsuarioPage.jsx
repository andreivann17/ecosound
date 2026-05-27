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
  notification,
  Typography,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  CameraOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";

import "./ContratosPage.css";
import "./UsuariosPage.css";
import "./EventosPage.css";
import { PATH as API_BASE } from "../../redux/utils";

const { Title, Text } = Typography;

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

      navigate(`/app/usuarios/${savedCode}`);
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

        {/* Back button */}
        <Button
          type="link"
          className="cc-back-btn"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/app/usuarios")}
        >
          Volver a Usuarios
        </Button>

        {/* Page header card */}
        <div className="cc-page-header-card">
          <div>
            <Title level={2} className="eventos-title" style={{ marginBottom: 0 }}>
              {isEditing ? `Editando: ${usuarioEditar.name}` : "Nuevo usuario"}
            </Title>
            <Text className="eventos-subtitle">
              {isEditing
                ? "Modifica los datos del usuario y guarda los cambios."
                : "Completa los datos para registrar un nuevo usuario."}
            </Text>
          </div>
          <Space>
            <Button className="eventos-btn-clean" onClick={() => navigate("/app/usuarios")} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="primary"
              icon={isEditing ? <SaveOutlined /> : <PlusOutlined />}
              loading={saving}
              onClick={handleSave}
              style={{ backgroundColor: "#01369e", borderColor: "#01369e" }}
            >
              {isEditing ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </Space>
        </div>

        {/* Body */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "stretch" }}>

          {/* Columna izquierda */}
          <div className="cc-section-card" style={{ height: "100%" }}>

            <div className="cc-section-header">
              <span className="cc-section-icon"><UserOutlined /></span>
              Datos del usuario
            </div>

            <Form form={form} layout="vertical">
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

              <div className="cc-section-header" style={{ marginTop: 8 }}>
                <span className="cc-section-icon"><LockOutlined /></span>
                {isEditing ? "Cambiar contraseña (opcional)" : "Contraseña"}
              </div>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="password"
                    label={<span className="contratos-field-label">Contraseña</span>}
                    rules={
                      !isEditing
                        ? [{ required: true, message: "Requerido" }, { min: 6, message: "Mínimo 6 caracteres" }]
                        : [{ min: 6, message: "Mínimo 6 caracteres" }]
                    }
                  >
                    <Input.Password
                      placeholder="Contraseña"
                      autoComplete="new-password"
                      iconRender={(v) => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="confirm_password"
                    label={<span className="contratos-field-label">Confirmar contraseña</span>}
                    rules={!isEditing ? [{ required: true, message: "Requerido" }] : []}
                    dependencies={["password"]}
                  >
                    <Input.Password
                      placeholder="Repite la contraseña"
                      autoComplete="new-password"
                      iconRender={(v) => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>

          {/* Columna derecha – foto */}
          <div className="cc-section-card" style={{ height: "100%" }}>
            <div className="cc-section-header">
              <span className="cc-section-icon"><CameraOutlined /></span>
              Foto de perfil
              <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
            </div>

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
                    onClick={(e) => { e.stopPropagation(); setFotoFile(null); setFotoPreview(null); }}
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
