import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  apiTrabajadoresInstance,
  authHeaderTrabajadores,
  actionPuestosGet,
} from "../../redux/actions/trabajadores/trabajadores";

import {
  Form,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  notification,
  Typography,
  Space,
  Input,
} from "antd";
import {
  ArrowLeftOutlined,
  TeamOutlined,
  CameraOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import "./TrabajadoresPage.css";
import dayjs from "dayjs";
import { PATH as API_BASE } from "../../redux/utils";

const { Title, Text } = Typography;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function CrearTrabajadorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { puestos = [] } = useSelector((state) => state.trabajadores);

  const trabajadorEditar = location.state?.trabajador ?? null;
  const isEditing = !!trabajadorEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fotoInputRef = useRef(null);

  useEffect(() => {
    dispatch(actionPuestosGet());
  }, [dispatch]);

  useEffect(() => {
    if (trabajadorEditar) {
      form.setFieldsValue({
        nombre: trabajadorEditar.nombre,
        apellido: trabajadorEditar.apellido,
        id_puesto: trabajadorEditar.id_puesto ?? undefined,
        fecha_nacimiento: trabajadorEditar.fecha_nacimiento
          ? dayjs(trabajadorEditar.fecha_nacimiento)
          : undefined,
      });
      if (trabajadorEditar.path) {
        setFotoPreview(`${API_BASE}/${trabajadorEditar.path}`);
      }
    }
  }, [trabajadorEditar, form]);

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
      apellido: values.apellido?.trim(),
      id_puesto: values.id_puesto ?? null,
      fecha_nacimiento: values.fecha_nacimiento
        ? dayjs(values.fecha_nacimiento).format("YYYY-MM-DD")
        : null,
    };

    setSaving(true);
    try {
      let idTrabajador;

      if (isEditing) {
        await apiTrabajadoresInstance.patch(
          `/trabajadores/${trabajadorEditar.id_trabajador}`,
          payload,
          { headers: authHeaderTrabajadores() }
        );
        idTrabajador = trabajadorEditar.id_trabajador;
      } else {
        const res = await apiTrabajadoresInstance.post("/trabajadores", payload, {
          headers: authHeaderTrabajadores(),
        });
        idTrabajador = res.data.id_trabajador;
      }

      if (fotoFile && idTrabajador) {
        const fd = new FormData();
        fd.append("file", fotoFile);
        await apiTrabajadoresInstance.post(
          `/trabajadores/${idTrabajador}/imagen`,
          fd,
          { headers: { ...authHeaderTrabajadores(), "Content-Type": "multipart/form-data" } }
        );
      }

      notification.success({
        message: isEditing ? "Trabajador actualizado correctamente" : "Trabajador creado exitosamente",
      });
      navigate("/app/trabajadores");
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
    <main className="trab-main">
      <div className="trab-content">

        <section className="trab-header-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <Space direction="vertical" size={2}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/app/trabajadores")}
                style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
              >
                Volver a Trabajadores
              </Button>
              <Title level={2} className="trab-title" style={{ marginBottom: 0 }}>
                {isEditing
                  ? `Editando: ${trabajadorEditar.nombre} ${trabajadorEditar.apellido}`
                  : "Nuevo trabajador"}
              </Title>
              <Text className="trab-subtitle">
                {isEditing
                  ? "Modifica los datos del trabajador y guarda los cambios."
                  : "Completa los datos del trabajador para registrarlo."}
              </Text>
            </Space>

            <Space style={{ marginTop: 4 }}>
              <Button
                className="trab-btn-clean"
                onClick={() => navigate("/app/trabajadores")}
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
                {isEditing ? "Guardar cambios" : "Crear trabajador"}
              </Button>
            </Space>
          </div>
        </section>

        <Form form={form} layout="vertical">
          <div className="tc-body-grid">

            <div className="tc-left-col">

              {/* Datos */}
              <div className="tc-section-card">
                <div className="tc-section-header">
                  <span className="tc-section-icon"><TeamOutlined /></span>
                  Datos del trabajador
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="nombre"
                      label={<span className="trab-field-label">Nombre</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Nombre(s)" autoComplete="off" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="apellido"
                      label={<span className="trab-field-label">Apellido</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Apellido(s)" autoComplete="off" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="id_puesto"
                      label={<span className="trab-field-label">Puesto</span>}
                    >
                      <Select
                        placeholder="Selecciona un puesto"
                        allowClear
                        options={puestos.map((p) => ({
                          label: p.nombre,
                          value: p.id_puesto,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="fecha_nacimiento"
                      label={<span className="trab-field-label">Fecha de nacimiento</span>}
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                        placeholder="Selecciona fecha"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>

            <div className="tc-right-col">

              {/* Foto */}
              <div className="tc-section-card">
                <div className="tc-section-header">
                  <span className="tc-section-icon"><CameraOutlined /></span>
                  Foto del trabajador
                </div>

                <div
                  className={`trab-dragger${dragging ? " trab-dragger-over" : ""}${fotoPreview ? " trab-dragger-filled" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => !fotoPreview && fotoInputRef.current?.click()}
                >
                  {fotoPreview ? (
                    <div className="trab-dragger-preview">
                      <img src={fotoPreview} alt="preview" className="trab-dragger-img" />
                      <button
                        type="button"
                        className="trab-dragger-remove"
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
                    <div className="trab-dragger-placeholder">
                      <CameraOutlined className="trab-dragger-icon" />
                      <div className="trab-dragger-text">Arrastra una imagen aquí</div>
                      <div className="trab-dragger-hint">o haz clic para seleccionar · JPG, PNG, WEBP</div>
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
