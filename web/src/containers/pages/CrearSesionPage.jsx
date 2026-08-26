import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  apiSesionesInstance,
  authHeaderSesiones,
} from "../../redux/actions/sesiones_fotos/sesiones_fotos";

import {
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Button,
  Row,
  Col,
  Typography,
  Space,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  CalendarOutlined,
  AlignLeftOutlined,
} from "@ant-design/icons";

import Toast from "../../components/toasts/toast";
import SuccessOverlay from "../../components/feedback/SuccessOverlay";
import "./EventosPage.css";

const { Title, Text } = Typography;

const CIUDADES = [
  { label: "San Luis Rio Colorado", value: 1 },
  { label: "Mexicali", value: 2 },
  { label: "Puerto Peñasco", value: 3 },
     { value: 4, label: "Valle de San Luis" },
        { value: 5, label: "Valle de Mexicali" },
];

export default function CrearSesionPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const sesionEditar = location.state?.sesion ?? null;
  const isEditing = !!sesionEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [success, setSuccess] = useState({ show: false, title: "", subtitle: "" });

  useEffect(() => {
    if (sesionEditar) {
      const d = sesionEditar.fecha_sesion ? dayjs(sesionEditar.fecha_sesion) : null;
      form.setFieldsValue({
        nombre_cliente: sesionEditar.nombre_cliente,
        id_ciudad: sesionEditar.id_ciudad ?? null,
        lugar: sesionEditar.lugar,
        fecha: d,
        hora: d,
        comentarios: sesionEditar.comentarios ?? "",
      });
    }
  }, [sesionEditar, form]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    let fecha_sesion = null;
    if (values.fecha && values.hora) {
      fecha_sesion = `${values.fecha.format("YYYY-MM-DD")}T${values.hora.format("HH:mm:ss")}`;
    } else if (values.fecha) {
      fecha_sesion = values.fecha.format("YYYY-MM-DDTHH:mm:ss");
    }

    const payload = {
      nombre_cliente: values.nombre_cliente?.trim(),
      id_ciudad: values.id_ciudad ?? null,
      lugar: values.lugar?.trim(),
      fecha_sesion,
      comentarios: values.comentarios?.trim() || null,
    };

    setSaving(true);
    try {
      let id_sesion = sesionEditar?.id_sesion;

      if (isEditing) {
        await apiSesionesInstance.patch(
          `/sesiones-fotos/${id_sesion}`,
          payload,
          { headers: authHeaderSesiones() }
        );
      } else {
        const res = await apiSesionesInstance.post("/sesiones-fotos", payload, {
          headers: authHeaderSesiones(),
        });
        id_sesion = res.data?.id ?? res.data?.id_sesion;
      }

      setSuccess({
        show: true,
        title: isEditing ? "¡Cambios guardados!" : "¡Sesión creada!",
        subtitle: isEditing
          ? "Los cambios se guardaron correctamente."
          : `La sesión de "${values.nombre_cliente?.trim() || ""}" ya está registrada.`,
        to: `/sesiones/${id_sesion}`,
      });
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="eventos-main">
      <div className="eventos-content">

        <section className="eventos-header-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <Space direction="vertical" size={2}>

              <Title level={2} className="eventos-title" style={{ marginBottom: 0 }}>
                {isEditing
                  ? `Editando sesión de ${sesionEditar.nombre_cliente}`
                  : "Nueva sesión de fotos"}
              </Title>
              <Text className="eventos-subtitle">
                {isEditing
                  ? "Modifica los datos de la sesión y guarda los cambios."
                  : "Completa los datos para registrar la sesión fotográfica."}
              </Text>
            </Space>

            <Space style={{ marginTop: 4 }}>
              <Button
                className="eventos-btn-clean"
                onClick={() => navigate("/app/sesiones")}
                disabled={saving || success.show}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                loading={saving}
                disabled={success.show}
                onClick={handleSave}
                style={{ backgroundColor: "#111", borderColor: "#111" }}
              >
                {isEditing ? "Guardar cambios" : "Crear sesión"}
              </Button>
            </Space>
          </div>
        </section>

        <Form form={form} layout="vertical">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
              <div className="cc-section-card" style={{ flex: 1 }}>
                <div className="cc-section-header">
                  <span className="cc-section-icon"><UserOutlined /></span>
                  Datos del cliente
                </div>
                <Form.Item
                  name="nombre_cliente"
                  label={<span className="eventos-field-label">Nombre del cliente</span>}
                  rules={[{ required: true, message: "Requerido" }]}
                >
                  <Input placeholder="Nombre completo del cliente" maxLength={100} autoComplete="off" />
                </Form.Item>
              </div>

              <div className="cc-section-card" style={{ flex: 1 }}>
                <div className="cc-section-header">
                  <span className="cc-section-icon"><CalendarOutlined /></span>
                  Datos de la sesión
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="id_ciudad"
                      label={<span className="eventos-field-label">Ciudad</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Select placeholder="Selecciona la ciudad" options={CIUDADES} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={16}>
                    <Form.Item
                      name="lugar"
                      label={<span className="eventos-field-label">Lugar</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Dirección o lugar de la sesión" maxLength={100} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="fecha"
                      label={<span className="eventos-field-label">Fecha</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="Selecciona fecha" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="hora"
                      label={<span className="eventos-field-label">Hora</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="--:--" minuteStep={15} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>

            <div className="cc-section-card">
              <div className="cc-section-header">
                <span className="cc-section-icon"><AlignLeftOutlined /></span>
                Comentarios adicionales
              </div>
              <Form.Item name="comentarios">
                <Input.TextArea
                  placeholder="Notas o detalles adicionales sobre la sesión..."
                  rows={4}
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </div>

          </div>
        </Form>

      </div>

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <SuccessOverlay
        show={success.show}
        title={success.title}
        subtitle={success.subtitle}
        onDone={() => navigate(success.to || "/app/sesiones")}
      />
    </main>
  );
}
