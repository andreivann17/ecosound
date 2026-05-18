import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  apiInventarioInstance,
  authHeaderInventario,
  actionCategoriasGet,
} from "../../redux/actions/inventario/inventario";
import { useDispatch, useSelector } from "react-redux";

import {
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  notification,
  Typography,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  ToolOutlined,
  CameraOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import "./InventarioPage.css";
import { PATH as API_BASE } from "../../redux/utils";

const { Title, Text } = Typography;

const ESTADOS = [
  { label: "Activo", value: "activo" },
  { label: "En reparación", value: "en_reparacion" },
  { label: "Dado de baja", value: "dado_de_baja" },
];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function CrearEquipoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { categorias = [] } = useSelector((state) => state.inventario);

  const equipoEditar = location.state?.equipo ?? null;
  const isEditing = !!equipoEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fotoInputRef = useRef(null);

  useEffect(() => {
    dispatch(actionCategoriasGet());
  }, [dispatch]);

  useEffect(() => {
    if (equipoEditar) {
      form.setFieldsValue({
        nombre: equipoEditar.nombre,
        id_categoria_equipo: equipoEditar.id_categoria_equipo,
        descripcion: equipoEditar.descripcion ?? "",
        estado: equipoEditar.estado ?? "activo",
      });
      if (equipoEditar.path) {
        setFotoPreview(`${API_BASE}/${equipoEditar.path}`);
      }
    }
  }, [equipoEditar, form]);

  const handleFotoSelect = (file) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      notification.error({ message: "Solo se permiten imágenes (JPG, PNG, WEBP)" });
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFotoSelect(file);
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = {
      nombre: values.nombre?.trim(),
      id_categoria_equipo: values.id_categoria_equipo,
      descripcion: values.descripcion?.trim() || null,
      estado: values.estado || "activo",
    };

    setSaving(true);
    try {
      let idEquipo;

      if (isEditing) {
        await apiInventarioInstance.patch(
          `/inventario/equipo/${equipoEditar.id_equipo}`,
          payload,
          { headers: authHeaderInventario() }
        );
        idEquipo = equipoEditar.id_equipo;
      } else {
        const res = await apiInventarioInstance.post("/inventario/equipo", payload, {
          headers: authHeaderInventario(),
        });
        idEquipo = res.data.id_equipo;
      }

      if (fotoFile && idEquipo) {
        const fd = new FormData();
        fd.append("file", fotoFile);
        await apiInventarioInstance.post(
          `/inventario/equipo/${idEquipo}/imagen`,
          fd,
          { headers: { ...authHeaderInventario(), "Content-Type": "multipart/form-data" } }
        );
      }

      notification.success({
        message: isEditing ? "Equipo actualizado correctamente" : "Equipo creado exitosamente",
      });
      navigate("/inventario");
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
    <main className="inv-main">
      <div className="inv-content">

        <section className="inv-header-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <Space direction="vertical" size={2}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/inventario")}
                style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
              >
                Volver a Inventario
              </Button>
              <Title level={2} className="inv-title" style={{ marginBottom: 0 }}>
                {isEditing ? `Editando: ${equipoEditar.nombre}` : "Nuevo equipo"}
              </Title>
              <Text className="inv-subtitle">
                {isEditing
                  ? "Modifica los datos del equipo y guarda los cambios."
                  : "Completa los datos del equipo para registrarlo en el inventario."}
              </Text>
            </Space>

            <Space style={{ marginTop: 4 }}>
              <Button
                className="inv-btn-clean"
                onClick={() => navigate("/inventario")}
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
                {isEditing ? "Guardar cambios" : "Crear equipo"}
              </Button>
            </Space>
          </div>
        </section>

        <Form form={form} layout="vertical">
          <div className="cc-body-grid">

            <div className="cc-left-col">
              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><ToolOutlined /></span>
                  Datos del equipo
                </div>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name="nombre"
                      label={<span className="inv-field-label">Nombre del equipo</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Ej. Cámara Sony A7III" autoComplete="off" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="id_categoria_equipo"
                      label={<span className="inv-field-label">Categoría</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Select
                        placeholder="Selecciona la categoría"
                        options={categorias.map((c) => ({
                          label: c.nombre,
                          value: c.id_categoria_equipo,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="estado"
                      label={<span className="inv-field-label">Estado</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                      initialValue="activo"
                    >
                      <Select placeholder="Estado del equipo" options={ESTADOS} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name="descripcion"
                      label={<span className="inv-field-label">Descripción</span>}
                    >
                      <Input.TextArea
                        placeholder="Detalles, número de serie, características..."
                        rows={4}
                        maxLength={1000}
                        showCount
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>

            <div className="cc-right-col">
              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><CameraOutlined /></span>
                  Foto del equipo
                </div>

                <div
                  className={`inv-dragger${dragging ? " inv-dragger-over" : ""}${fotoPreview ? " inv-dragger-filled" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !fotoPreview && fotoInputRef.current?.click()}
                >
                  {fotoPreview ? (
                    <div className="inv-dragger-preview">
                      <img src={fotoPreview} alt="preview" className="inv-dragger-img" />
                      <button
                        type="button"
                        className="inv-dragger-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFotoFile(null);
                          setFotoPreview(null);
                          if (fotoInputRef.current) fotoInputRef.current.value = "";
                        }}
                      >
                        <DeleteOutlined /> Quitar foto
                      </button>
                    </div>
                  ) : (
                    <div className="inv-dragger-placeholder">
                      <CameraOutlined className="inv-dragger-icon" />
                      <div className="inv-dragger-text">Arrastra una imagen aquí</div>
                      <div className="inv-dragger-hint">o haz clic para seleccionar · JPG, PNG, WEBP</div>
                    </div>
                  )}
                </div>

                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFotoSelect(e.target.files[0])}
                />

                {!fotoPreview && (
                  <Button
                    icon={<CameraOutlined />}
                    onClick={() => fotoInputRef.current?.click()}
                    style={{ marginTop: 10, width: "100%" }}
                  >
                    Seleccionar imagen
                  </Button>
                )}
              </div>
            </div>

          </div>
        </Form>

      </div>
    </main>
  );
}
