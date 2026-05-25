import React, { useState, useEffect } from "react";
import {
  apiClientesEventsInstance,
  authHeaderClientesEvents,
} from "../../../../redux/actions/clientes_events/clientes_events";
import {
  Form, Input, Select, Button, Row, Col,
  notification, Typography, Space, DatePicker,
} from "antd";
import { ArrowLeftOutlined, UserOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "../../TrabajadoresPage.css";

const { Title, Text } = Typography;

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

const SUSCRIPCION_OPTIONS = [
  { value: "mensual", label: "Mensual — próximo pago en 1 mes" },
  { value: "anual",   label: "Anual — próximo pago en 1 año" },
  { value: "prueba",  label: "Prueba mensual — periodo de prueba" },
];

export default function CrearClienteEventPage({ cliente: clienteEditar, onBack }) {
  const isEditing = !!clienteEditar;
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const tipoSuscripcion = Form.useWatch("tipo_suscripcion", form);
  const fechaFinPrueba  = Form.useWatch("fecha_fin_prueba", form);

  useEffect(() => {
    if (clienteEditar) {
      form.setFieldsValue({
        nombre_cliente:   clienteEditar.nombre_cliente,
        apellido_cliente: clienteEditar.apellido_cliente,
        rfc:              clienteEditar.rfc,
        correo:           clienteEditar.correo,
        celular:          clienteEditar.celular ? String(clienteEditar.celular) : undefined,
        tipo_suscripcion: "mensual",
      });
    }
  }, [clienteEditar, form]);

  const handleSave = async () => {
    let values;
    try { values = await form.validateFields(); } catch { return; }

    const payload = {
      nombre_cliente:   values.nombre_cliente?.trim(),
      apellido_cliente: values.apellido_cliente?.trim(),
      rfc:              values.rfc?.trim() || null,
      correo:           values.correo?.trim() || null,
      celular:          values.celular?.trim() || null,
      tipo_suscripcion: values.tipo_suscripcion,
    };
    if (values.tipo_suscripcion === "prueba" && values.fecha_fin_prueba) {
      payload.fecha_fin_prueba = values.fecha_fin_prueba.format("YYYY-MM-DD");
    }

    setSaving(true);
    try {
      if (isEditing) {
        await apiClientesEventsInstance.patch(
          `/clientes/${clienteEditar.id_cliente}`,
          payload,
          { headers: authHeaderClientesEvents(), params: { id_app: 1 } }
        );
      } else {
        await apiClientesEventsInstance.post("/clientes", payload, {
          headers: authHeaderClientesEvents(),
          params: { id_app: 1 },
        });
      }
      notification.success({
        message: isEditing ? "Cliente actualizado correctamente" : "Cliente creado exitosamente",
      });
      onBack();
    } catch (err) {
      notification.error({
        message: "Error al guardar",
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const trialEndLabel = fechaFinPrueba
    ? `La prueba termina el ${fechaFinPrueba.date()} de ${MESES[fechaFinPrueba.month()]} de ${fechaFinPrueba.year()}`
    : null;

  return (
    <main className="trab-main" style={{ background: "transparent", minHeight: "unset", padding: 0 }}>
      <div className="trab-content">
        <section className="trab-header-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <Space direction="vertical" size={2}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
                style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
              >
                Volver a Clientes
              </Button>
              <Title level={2} className="trab-title" style={{ marginBottom: 0 }}>
                {isEditing
                  ? `Editando: ${clienteEditar.nombre_cliente} ${clienteEditar.apellido_cliente}`
                  : "Nuevo cliente"}
              </Title>
              <Text className="trab-subtitle">
                {isEditing
                  ? "Modifica los datos del cliente y guarda los cambios."
                  : "Completa los datos del cliente para registrarlo en Events."}
              </Text>
            </Space>
            <Space style={{ marginTop: 4 }}>
              <Button className="trab-btn-clean" onClick={onBack} disabled={saving}>Cancelar</Button>
              <Button
                type="primary"
                loading={saving}
                onClick={handleSave}
                style={{ backgroundColor: "#01369e", borderColor: "#01369e" }}
              >
                {isEditing ? "Guardar cambios" : "Crear cliente"}
              </Button>
            </Space>
          </div>
        </section>

        <Form form={form} layout="vertical" initialValues={{ tipo_suscripcion: "mensual" }}>
          <div className="tc-section-card">
            <div className="tc-section-header">
              <span className="tc-section-icon"><UserOutlined /></span>
              Datos personales
            </div>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="nombre_cliente" label={<span className="trab-field-label">Nombre</span>} rules={[{ required: true, message: "Requerido" }]}>
                  <Input placeholder="Nombre(s)" autoComplete="off" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="apellido_cliente" label={<span className="trab-field-label">Apellido</span>} rules={[{ required: true, message: "Requerido" }]}>
                  <Input placeholder="Apellido(s)" autoComplete="off" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="correo" label={<span className="trab-field-label">Correo electrónico</span>} rules={[{ required: true, message: "Requerido" }, { type: "email", message: "Correo inválido" }]}>
                  <Input placeholder="correo@ejemplo.com" autoComplete="off" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="celular" label={<span className="trab-field-label">Celular</span>}>
                  <Input placeholder="10 dígitos" autoComplete="off" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="rfc" label={<span className="trab-field-label">RFC</span>}>
                  <Input placeholder="RFC del cliente" autoComplete="off" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="tipo_suscripcion"
                  label={<span className="trab-field-label">Tipo de suscripción</span>}
                  rules={[{ required: true, message: "Requerido" }]}
                >
                  <Select
                    placeholder="Selecciona el tipo"
                    suffixIcon={<CalendarOutlined />}
                    options={SUSCRIPCION_OPTIONS}
                    onChange={() => form.setFieldValue("fecha_fin_prueba", undefined)}
                  />
                </Form.Item>
              </Col>
            </Row>
            {tipoSuscripcion === "prueba" && (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="fecha_fin_prueba"
                    label={<span className="trab-field-label">Fecha fin de prueba</span>}
                    rules={[{ required: true, message: "Requerido" }]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                      disabledDate={(d) => d && d < dayjs().startOf("day")}
                      placeholder="Selecciona la fecha límite"
                    />
                  </Form.Item>
                  {trialEndLabel && (
                    <Text type="secondary" style={{ display: "block", marginTop: -12, marginBottom: 16, fontSize: 12 }}>
                      {/* Cuándo vence la prueba — calculado desde la fecha seleccionada */}
                      {trialEndLabel}. Después de esta fecha el sistema se bloqueará automáticamente.
                    </Text>
                  )}
                </Col>
              </Row>
            )}
          </div>
        </Form>
      </div>
    </main>
  );
}
