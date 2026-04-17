// src/containers/pages/UsuarioDetallePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  apiUsuariosInstance,
  authHeaderUsuarios,
} from "../../redux/actions/usuarios/usuarios";

import {
  Button,
  Modal,
  Tag,
  notification,
  Spin,
  Typography,
  Space,
  Divider,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";

import "./ContratosPage.css";

const { Title, Text } = Typography;

export default function UsuarioDetallePage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);

  useEffect(() => {
    fetchUsuario();
  }, [code]);

  const fetchUsuario = async () => {
    setLoading(true);
    try {
      const res = await apiUsuariosInstance.get(`/users/${code}`, {
        headers: authHeaderUsuarios(),
      });
      setUsuario(res.data);
    } catch (err) {
      notification.error({
        message: "Error al cargar usuario",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiUsuariosInstance.patch(
        `/users/${code}`,
        { active: 0 },
        { headers: authHeaderUsuarios() }
      );
      notification.success({ message: "Usuario eliminado correctamente" });
      navigate("/usuarios");
    } catch (err) {
      notification.error({
        message: "Error al eliminar",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <main className="contratos-main">
        <div className="contratos-content" style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
          <Spin size="large" />
        </div>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="contratos-main">
        <div className="contratos-content">
          <Text type="danger">No se encontró el usuario.</Text>
        </div>
      </main>
    );
  }

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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Title level={2} className="contratos-title" style={{ marginBottom: 0 }}>
                  {usuario.name || "—"}
                </Title>
                <Tag color={usuario.active ? "blue" : "default"}>
                  {usuario.active ? "Activo" : "Inactivo"}
                </Tag>
              </div>
            </Space>

            <Space style={{ marginTop: 4 }}>
              <Button
                icon={<EditOutlined />}
                onClick={() =>
                  navigate(`/usuarios/${code}/editar`, { state: { usuario } })
                }
                style={{ borderColor: "#111", color: "#111" }}
              >
                Editar
              </Button>
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={() => setDeleteModal(true)}
              >
                Eliminar
              </Button>
            </Space>
          </div>
        </section>

        {/* DETALLE */}
        <div className="contratos-filters-panel" style={{ marginTop: 0 }}>

          <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>
            Información del usuario
          </Title>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px 32px",
            }}
          >
            <div>
              <div className="contratos-field-label" style={{ marginBottom: 4 }}>
                <UserOutlined style={{ marginRight: 4 }} />
                NOMBRE COMPLETO
              </div>
              <Text style={{ fontSize: 15, fontWeight: 500 }}>
                {usuario.name || "—"}
              </Text>
            </div>

            <div>
              <div className="contratos-field-label" style={{ marginBottom: 4 }}>
                <MailOutlined style={{ marginRight: 4 }} />
                CORREO ELECTRÓNICO
              </div>
              <Text style={{ fontSize: 15, fontWeight: 500 }}>
                {usuario.email || "—"}
              </Text>
            </div>

            <div>
              <div className="contratos-field-label" style={{ marginBottom: 4 }}>
                CÓDIGO
              </div>
              <Text style={{ fontSize: 15, fontWeight: 500, fontFamily: "monospace" }}>
                {usuario.code || "—"}
              </Text>
            </div>

            <div>
              <div className="contratos-field-label" style={{ marginBottom: 4 }}>
                ESTADO
              </div>
              <Tag color={usuario.active ? "blue" : "default"} style={{ fontSize: 13 }}>
                {usuario.active ? "Activo" : "Inactivo"}
              </Tag>
            </div>

            {usuario.date && (
              <div>
                <div className="contratos-field-label" style={{ marginBottom: 4 }}>
                  <CalendarOutlined style={{ marginRight: 4 }} />
                  FECHA DE CREACIÓN
                </div>
                <Text style={{ fontSize: 15, fontWeight: 500 }}>
                  {usuario.date}
                </Text>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MODAL ELIMINAR */}
      <Modal
        open={deleteModal}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: "#ef4444" }} />
            Eliminar usuario
          </Space>
        }
        onCancel={() => setDeleteModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setDeleteModal(false)}>
            Cancelar
          </Button>,
          <Button
            key="delete"
            danger
            loading={deleting}
            onClick={handleDelete}
          >
            Eliminar
          </Button>,
        ]}
      >
        <p>
          ¿Estás seguro de que deseas eliminar al usuario{" "}
          <strong>{usuario.name}</strong>? Esta acción lo desactivará del sistema.
        </p>
      </Modal>
    </main>
  );
}
