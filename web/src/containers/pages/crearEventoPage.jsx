import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  apiEventosInstance,
  authHeaderEventos,
} from "../../redux/actions/eventos/eventos";

import {
  Form,
  Input,
  DatePicker,
  TimePicker,
  Select,
  Button,
  Row,
  Col,
  notification,
  Typography,
  Space,
  Upload,
  List,
  Spin,
  Tooltip,
} from "antd";
import {
  ArrowLeftOutlined,
  FilePdfOutlined,
  InboxOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  AlignLeftOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

import "./EventosPage.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const CIUDADES = [
  { label: "San Luis Rio Colorado", value: 1 },
  { label: "Mexicali", value: 2 },
  { label: "Puerto Peñasco", value: 3 },
         { value: 4, label: "Valle de San Luis" },
        { value: 5, label: "Valle de Mexicali" },
];

const TIPOS_EVENTO = [
  { label: "Bodas", value: 1 },
  { label: "XV", value: 2 },
  { label: "Graduación", value: 3 },
  { label: "Corporativo", value: 4 },
  { label: "Cumpleaños", value: 5 },
  { label: "Otro", value: 6 },
];

function toDecimal(val) {
  const n = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? "" : n.toFixed(2);
}

export default function CrearEventoPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const eventoEditar = location.state?.evento ?? null;
  const isEditing = !!eventoEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [horaInicio, setHoraInicio] = useState(null);
  const [horaFinal, setHoraFinal] = useState(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (eventoEditar) {
      const hi = eventoEditar.hora_inicio ? dayjs(eventoEditar.hora_inicio) : null;
      const hf = eventoEditar.hora_final  ? dayjs(eventoEditar.hora_final)  : null;
      const mh = eventoEditar.hora_misa   ? dayjs(eventoEditar.hora_misa, "HH:mm") : null;

      form.setFieldsValue({
        cliente_nombre:   eventoEditar.cliente_nombre,
        domicilio:        eventoEditar.domicilio,
        celular:          eventoEditar.celular,
        id_tipo_evento:   eventoEditar.id_tipo_evento,
        id_ciudad:        eventoEditar.id_ciudad ?? null,
        lugar_evento:     eventoEditar.lugar_evento,
        fecha_evento:     eventoEditar.fecha_evento     ? dayjs(eventoEditar.fecha_evento)     : null,
        hora_inicio:      hi,
        hora_final:       hf,
        importe:          eventoEditar.importe          ? toDecimal(eventoEditar.importe)          : "",
        fecha_anticipo:   eventoEditar.fecha_anticipo   ? dayjs(eventoEditar.fecha_anticipo)   : null,
        importe_anticipo: eventoEditar.importe_anticipo ? toDecimal(eventoEditar.importe_anticipo) : "",
        direccion_misa:   eventoEditar.direccion_misa   ?? "",
        hora_misa:        mh,
        comentarios:      eventoEditar.comentarios      ?? "",
      });

      setHoraInicio(hi);
      setHoraFinal(hf);
      fetchDocumentos(eventoEditar.id_evento);
    }
  }, [eventoEditar, form]);

  const fetchDocumentos = async (id) => {
    setLoadingDocs(true);
    try {
      const res = await apiEventosInstance.get(
        `/eventos/${id}/documentos`,
        { headers: authHeaderEventos() }
      );
      setDocumentos(res.data || []);
    } catch {
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    try {
      await apiEventosInstance.delete(
        `/eventos/${eventoEditar.id_evento}/documentos/${id}`,
        { headers: authHeaderEventos() }
      );
      notification.success({ message: "Documento eliminado" });
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      notification.error({
        message: "Error al eliminar",
        description: err?.response?.data?.detail || err.message,
      });
    }
  };

  const handleBeforeUpload = (file) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      notification.error({ message: "Solo se permiten archivos PDF" });
      return Upload.LIST_IGNORE;
    }
    setPendingFile(file);
    return false;
  };

  const handleMoneyBlur = (fieldName) => {
    const formatted = toDecimal(form.getFieldValue(fieldName));
    if (formatted) form.setFieldValue(fieldName, formatted);
  };

  const uploadDocumento = async (id_evento, file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    const baseURL = apiEventosInstance.defaults.baseURL;
    const token   = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
    const res = await fetch(`${baseURL}/eventos/${id_evento}/documentos`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw { response: { data: err } };
    }
    return res.json();
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = {
      cliente_nombre:   values.cliente_nombre?.trim(),
      domicilio:        values.domicilio?.trim() || null,
      celular:          values.celular?.trim(),
      id_tipo_evento:   values.id_tipo_evento,
      id_ciudad:        values.id_ciudad ?? null,
      lugar_evento:     values.lugar_evento?.trim(),
      fecha_evento:     values.fecha_evento
        ? dayjs(values.fecha_evento).format("YYYY-MM-DDTHH:mm:ss") : undefined,
      hora_inicio:      values.hora_inicio
        ? dayjs(values.hora_inicio).format("HH:mm") : undefined,
      hora_final:       values.hora_final
        ? dayjs(values.hora_final).format("HH:mm") : undefined,
      importe:          values.importe          ? String(values.importe)          : undefined,
      fecha_anticipo:   values.fecha_anticipo
        ? dayjs(values.fecha_anticipo).format("YYYY-MM-DDTHH:mm:ss") : undefined,
      importe_anticipo: values.importe_anticipo ? String(values.importe_anticipo) : undefined,
      direccion_misa:   values.direccion_misa?.trim() || null,
      hora_misa:        values.hora_misa ? dayjs(values.hora_misa).format("HH:mm") : null,
      comentarios:      values.comentarios?.trim() || null,
    };

    setSaving(true);
    try {
      let id_evento = eventoEditar?.id_evento;

      if (isEditing) {
        await apiEventosInstance.patch(
          `/eventos/${id_evento}`,
          payload,
          { headers: authHeaderEventos() }
        );
      } else {
        const res = await apiEventosInstance.post("/eventos", payload, {
          headers: authHeaderEventos(),
        });
        id_evento = res.data?.id ?? res.data?.id_evento;
      }

      if (pendingFile && id_evento) {
        try {
          await uploadDocumento(id_evento, pendingFile);
        } catch (err) {
          notification.warning({
            message: "Evento guardado, pero falló la subida del documento",
            description: err?.response?.data?.detail || err.message,
          });
        }
      }

      notification.success({
        message: isEditing ? "Evento actualizado correctamente" : "Evento creado exitosamente",
      });
      navigate("/eventos");
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
    <main className="eventos-main">
      <div className="eventos-content">

        <section className="eventos-header-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <Space direction="vertical" size={2}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/eventos")}
                style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
              >
                Volver a Eventos
              </Button>
              <Title level={2} className="eventos-title" style={{ marginBottom: 0 }}>
                {isEditing
                  ? `Editando evento de ${eventoEditar.cliente_nombre}`
                  : "Nuevo evento"}
              </Title>
              <Text className="eventos-subtitle">
                {isEditing
                  ? "Modifica los datos del evento y guarda los cambios."
                  : "Completa los datos del cliente y del evento para registrarlo."}
              </Text>
            </Space>

            <Space style={{ marginTop: 4 }}>
              <Button
                className="eventos-btn-clean"
                onClick={() => navigate("/eventos")}
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
                {isEditing ? "Guardar cambios" : "Crear evento"}
              </Button>
            </Space>
          </div>
        </section>

        <Form form={form} layout="vertical">
          <div className="cc-body-grid">

            <div className="cc-left-col">

              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><UserOutlined /></span>
                  Datos del cliente
                </div>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name="cliente_nombre"
                      label={<span className="eventos-field-label">Nombre del cliente</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Ej. Juan Pérez" autoComplete="off" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="domicilio"
                      label={<span className="eventos-field-label">Dirección</span>}
                    >
                      <Input placeholder="Calle, número, colonia" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="celular"
                      label={<span className="eventos-field-label">Teléfono celular</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="55 0000 0000" maxLength={15} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><CalendarOutlined /></span>
                  Datos del evento
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="id_tipo_evento"
                      label={<span className="eventos-field-label">Tipo de evento</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Select placeholder="Selecciona el tipo" options={TIPOS_EVENTO} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="fecha_evento"
                      label={<span className="eventos-field-label">Fecha del evento</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="id_ciudad"
                      label={<span className="eventos-field-label">Ciudad</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Select placeholder="Selecciona la ciudad" options={CIUDADES} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name="lugar_evento"
                      label={<span className="eventos-field-label">Lugar</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Nombre del salón o jardín" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="hora_inicio"
                      label={<span className="eventos-field-label">Hora inicio</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <TimePicker
                        style={{ width: "100%" }}
                        format="HH:mm"
                        placeholder="--:-- --"
                        minuteStep={15}
                        onChange={(v) => setHoraInicio(v)}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="hora_final"
                      label={<span className="eventos-field-label">Hora fin</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <TimePicker
                        style={{ width: "100%" }}
                        format="HH:mm"
                        placeholder="--:-- --"
                        minuteStep={15}
                        onChange={(v) => setHoraFinal(v)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {(() => {
                  const fechaEvento = form.getFieldValue("fecha_evento");
                  if (!horaInicio || !horaFinal || !fechaEvento) return null;
                  const base   = dayjs(fechaEvento);
                  const inicio = base.hour(horaInicio.hour()).minute(horaInicio.minute()).second(0);
                  let   fin    = base.hour(horaFinal.hour()).minute(horaFinal.minute()).second(0);
                  const nextDay = fin.isBefore(inicio) || fin.isSame(inicio);
                  if (nextDay) fin = fin.add(1, "day");
                  const label = nextDay
                    ? `Termina el ${fin.format("dddd D [de] MMMM")} a las ${fin.format("HH:mm")} hrs (día siguiente)`
                    : `Termina el ${fin.format("dddd D [de] MMMM")} a las ${fin.format("HH:mm")} hrs`;
                  return (
                    <div style={{ marginTop: -8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: nextDay ? "#b91c1c" : "#6b7280", fontWeight: 500 }}>
                        {label}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><EnvironmentOutlined /></span>
                  Información de Misa
                  <span className="cc-optional-badge">Opcional</span>
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={16}>
                    <Form.Item
                      name="direccion_misa"
                      label={<span className="eventos-field-label">Dirección de la misa</span>}
                    >
                      <Input placeholder="Iglesia, parroquia, dirección..." />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="hora_misa"
                      label={<span className="eventos-field-label">Hora de la misa</span>}
                    >
                      <TimePicker
                        style={{ width: "100%" }}
                        format="HH:mm"
                        placeholder="--:-- --"
                        minuteStep={15}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><AlignLeftOutlined /></span>
                  Comentarios adicionales
                </div>
                <Form.Item name="comentarios">
                  <Input.TextArea
                    placeholder="Detalles específicos del servicio, requerimientos especiales..."
                    rows={4}
                    maxLength={1000}
                    showCount
                  />
                </Form.Item>
              </div>

            </div>

            <div className="cc-right-col">

              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><DollarOutlined /></span>
                  Importes
                </div>
                <Form.Item
                  name="importe"
                  label={<span className="eventos-field-label">Importe total</span>}
                  rules={[{ required: true, message: "Requerido" }]}
                >
                  <Input
                    prefix="$"
                    suffix="MXN"
                    placeholder="0.00"
                    onBlur={() => handleMoneyBlur("importe")}
                  />
                </Form.Item>
                <Form.Item
                  name="fecha_anticipo"
                  label={<span className="eventos-field-label">Fecha primer pago</span>}
                >
                  <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="mm/dd/yyyy" />
                </Form.Item>
                <Form.Item
                  name="importe_anticipo"
                  label={<span className="eventos-field-label">Monto primer pago</span>}
                >
                  <Input
                    prefix="$"
                    suffix="MXN"
                    placeholder="0.00"
                    onBlur={() => handleMoneyBlur("importe_anticipo")}
                  />
                </Form.Item>
              </div>

              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><FilePdfOutlined /></span>
                  Evento
                </div>

                {isEditing && loadingDocs && (
                  <div style={{ padding: "8px 0" }}><Spin size="small" /></div>
                )}

                {isEditing && !loadingDocs && documentos.length > 0 && (
                  <List
                    size="small"
                    dataSource={documentos}
                    renderItem={(doc) => (
                      <List.Item
                        style={{
                          padding: "8px 12px",
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          marginBottom: 6,
                          background: "#fafafa",
                        }}
                        actions={[
                          <Tooltip title="Eliminar documento">
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteDoc(doc.id)}
                            />
                          </Tooltip>,
                        ]}
                      >
                        <Space>
                          <FilePdfOutlined style={{ color: "#ef4444" }} />
                          <Text style={{ fontSize: 12 }}>{doc.filename}</Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                )}

                {pendingFile && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    marginBottom: 12,
                  }}>
                    <Space>
                      <FilePdfOutlined style={{ color: "#ef4444", fontSize: 18 }} />
                      <div>
                        <Text style={{ fontSize: 13, display: "block" }}>{pendingFile.name}</Text>
                        <Text style={{ fontSize: 11, color: "#9ca3af" }}>Se enviará al guardar</Text>
                      </div>
                    </Space>
                    <Tooltip title="Quitar">
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => setPendingFile(null)}
                      />
                    </Tooltip>
                  </div>
                )}

                {!pendingFile && (!isEditing || (!loadingDocs && documentos.length === 0)) && (
                  <Dragger
                    accept=".pdf"
                    multiple={false}
                    showUploadList={false}
                    beforeUpload={handleBeforeUpload}
                    style={{ borderRadius: 8 }}
                  >
                    <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                      <InboxOutlined style={{ fontSize: 32, color: "#9ca3af" }} />
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "#374151", fontWeight: 500 }}>
                      Subir archivo del evento
                    </p>
                    <p style={{ margin: "4px 0 8px", fontSize: 11, color: "#9ca3af" }}>
                      PDF, DOCX o JPG hasta 10MB
                    </p>
                    <Button size="small" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>
                      SELECCIONAR ARCHIVO
                    </Button>
                  </Dragger>
                )}
              </div>

            </div>
          </div>
        </Form>

      </div>
    </main>
  );
}
