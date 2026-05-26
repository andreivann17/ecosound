
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  apiEventosInstance,
  authHeaderEventos,
} from "../../redux/actions/eventos/eventos";
import {
  apiPaquetesInstance,
  authHeaderPaquetes,
} from "../../redux/actions/paquetes/paquetes";
import { actionCiudadesGet } from "../../redux/actions/ciudades/ciudades";

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
  Switch,
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
  RobotOutlined,
  CameraOutlined,
  SoundOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import "./EventosPage.css";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const FIELD_LABELS = {
  cliente_nombre:          "Nombre del cliente",
  importe:                 "Importe total",
  fecha_evento:            "Fecha del evento",
  id_tipo_evento:          "Tipo de evento",
  id_ciudad:               "Ciudad del evento",
  lugar_evento:            "Lugar del evento",
  hora_inicio:             "Hora inicio",
  hora_final:              "Hora fin",
  id_ciudad_fotografia:    "Ciudad (fotografía)",
  lugar_fotografia:        "Lugar (fotografía)",
  fecha_fotografia:        "Fecha (fotografía)",
  fecha_creacion_contrato: "Fecha de celebración del contrato",
};


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

function parseOCRDate(str) {
  if (!str) return null;
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const parsed = dayjs(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  return parsed.isValid() ? parsed : null;
}

function parseTime12(str) {
  if (!str) return null;
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return dayjs().hour(h).minute(m).second(0);
}

function parseMoney(str) {
  if (!str) return "";
  const n = parseFloat(str.replace(/,/g, ""));
  return isNaN(n) ? "" : n.toFixed(2);
}

export default function CrearEventoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const ciudadesRaw = useSelector((s) => {
    const d = s.ciudades?.data;
    return Array.isArray(d) ? d : [];
  });
  const ciudadesOptions = ciudadesRaw.map((c) => ({
    label: c.nombre,
    value: c.id_ciudad,
  }));

  const eventoEditar = location.state?.evento ?? null;
  const isEditing = !!eventoEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(actionCiudadesGet());
    if (!isEditing) {
      form.setFieldValue("fecha_creacion_contrato", dayjs());
    }
  }, []);
  const [horaInicio, setHoraInicio] = useState(null);
  const [horaFinal, setHoraFinal] = useState(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [hayEventoSonido, setHayEventoSonido] = useState(true);
  const [hayEventoFoto, setHayEventoFoto] = useState(true);
  const [paquetesSonido, setPaquetesSonido] = useState([]);
  const [paquetesFoto, setPaquetesFoto] = useState([]);

  const aiCacheRef = useRef({});

  useEffect(() => {
    const fetchPaquetes = async () => {
      try {
        const res = await apiPaquetesInstance.get("/paquetes", {
          headers: authHeaderPaquetes(),
        });
        const todos = res.data || [];
        const toOption = (p) => ({ label: p.nombre, value: p.id_paquete });
        setPaquetesSonido(todos.filter((p) => p.is_paquete_sonido).map(toOption));
        setPaquetesFoto(todos.filter((p) => !p.is_paquete_sonido).map(toOption));
      } catch {}
    };
    fetchPaquetes();
  }, []);

  useEffect(() => {
    if (eventoEditar) {
      const hi = eventoEditar.hora_inicio ? dayjs(eventoEditar.hora_inicio) : null;
      const hf = eventoEditar.hora_final ? dayjs(eventoEditar.hora_final) : null;
      const mh = eventoEditar.hora_misa ? dayjs(eventoEditar.hora_misa, "HH:mm") : null;
      const dtFoto = eventoEditar.datetime_fotografia
        ? dayjs(eventoEditar.datetime_fotografia)
        : null;

      form.setFieldsValue({
        cliente_nombre:        eventoEditar.cliente_nombre,
        domicilio:             eventoEditar.domicilio,
        celular:               eventoEditar.celular,
        id_tipo_evento:        eventoEditar.id_tipo_evento,
        id_ciudad:             eventoEditar.id_ciudad ?? null,
        lugar_evento:          eventoEditar.lugar_evento,
        fecha_evento:          eventoEditar.fecha_evento ? dayjs(eventoEditar.fecha_evento) : null,
        hora_inicio:           hi,
        hora_final:            hf,
        importe:               eventoEditar.importe          ? toDecimal(eventoEditar.importe)          : "",
        fecha_anticipo:        eventoEditar.fecha_anticipo   ? dayjs(eventoEditar.fecha_anticipo)   : null,
        importe_anticipo:      eventoEditar.importe_anticipo ? toDecimal(eventoEditar.importe_anticipo) : "",
        fecha_creacion_contrato: eventoEditar.fecha_creacion_contrato ? dayjs(eventoEditar.fecha_creacion_contrato) : null,
        direccion_misa:        eventoEditar.direccion_misa   ?? "",
        hora_misa:             mh,
        comentarios:           eventoEditar.comentarios      ?? "",
        id_paquete_sonido:     eventoEditar.id_paquete_sonido ?? null,
        id_paquete_fotografia: eventoEditar.id_paquete_fotografia ?? null,
        id_ciudad_fotografia:  eventoEditar.id_ciudad_fotografia ?? null,
        lugar_fotografia:      eventoEditar.lugar_fotografia ?? "",
        fecha_fotografia:      dtFoto ?? null,
        hora_fotografia:       dtFoto ?? null,
        comentarios_fotografia: eventoEditar.comentarios_fotografia ?? "",
      });

      setHoraInicio(hi);
      setHoraFinal(hf);
      setHayEventoSonido(true);
      setHayEventoFoto(!!eventoEditar.datetime_fotografia);

      fetchDocumentos(eventoEditar.id_evento);
    }
  }, [eventoEditar, form]);

  const fetchDocumentos = async (id) => {
    setLoadingDocs(true);
    try {
      const res = await apiEventosInstance.get(`/eventos/${id}/documentos`, {
        headers: authHeaderEventos(),
      });
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
    const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
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

  const applyAIResult = (campos) => {
    const updates = {};
    if (campos.cliente)        updates.cliente_nombre   = campos.cliente;
    if (campos.telefono)       updates.celular           = campos.telefono;
    if (campos.lugar_evento)   updates.lugar_evento      = campos.lugar_evento;
    if (campos.importe_total)  updates.importe           = parseMoney(campos.importe_total);
    if (campos.monto_anticipo) updates.importe_anticipo  = parseMoney(campos.monto_anticipo);
    if (campos.fecha_evento) {
      const d = parseOCRDate(campos.fecha_evento);
      if (d) updates.fecha_evento = d;
    }
    if (campos.fecha_anticipo) {
      const d = parseOCRDate(campos.fecha_anticipo);
      if (d) updates.fecha_anticipo = d;
    }
    if (campos.hora_inicio) {
      const t = parseTime12(campos.hora_inicio);
      if (t) { updates.hora_inicio = t; setHoraInicio(t); }
    }
    if (campos.hora_fin) {
      const t = parseTime12(campos.hora_fin);
      if (t) { updates.hora_final = t; setHoraFinal(t); }
    }
    form.setFieldsValue(updates);
  };

  const handleAIFill = async () => {
    if (!pendingFile) return;
    const cacheKey = `${pendingFile.name}_${pendingFile.size}`;

    if (aiCacheRef.current[cacheKey]) {
      applyAIResult(aiCacheRef.current[cacheKey]);
      notification.success({
        message: "Datos cargados",
        description: "Se usó el resultado ya extraído de este documento.",
      });
      return;
    }

    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile, pendingFile.name);
      const baseURL = apiEventosInstance.defaults.baseURL;
      const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
      const res = await fetch(`${baseURL}/eventos/extraer-ai`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al procesar el archivo");
      }
      const data = await res.json();
      const campos = data.archivos?.[0]?.campos || {};

      aiCacheRef.current[cacheKey] = campos;
      applyAIResult(campos);
      notification.success({
        message: "Datos extraídos con IA",
        description: "Revisa y corrige los campos antes de guardar.",
      });
    } catch (err) {
      notification.error({ message: "Error con IA", description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hayEventoSonido && !hayEventoFoto) {
      notification.error({
        message: "Sin servicio seleccionado",
        description: "Debe haber al menos un evento de sonido o sesión de fotografía.",
      });
      return;
    }

    let values;
    try {
      values = await form.validateFields();
    } catch (errInfo) {
      const campos = (errInfo?.errorFields || [])
        .map((f) => FIELD_LABELS[f.name?.[0]] || f.name?.[0])
        .filter(Boolean);
      notification.warning({
        message: "Faltan campos por completar",
        description: campos.length > 0
          ? `Por favor llena: ${campos.join(", ")}.`
          : "Revisa los campos marcados en rojo antes de continuar.",
        duration: 6,
        placement: "topRight",
      });
      return;
    }

    // Build datetime_fotografia combining date + time
    let datetimeFoto = null;
    if (hayEventoFoto && values.fecha_fotografia) {
      const base = dayjs(values.fecha_fotografia);
      if (values.hora_fotografia) {
        const h = dayjs(values.hora_fotografia);
        datetimeFoto = base
          .hour(h.hour())
          .minute(h.minute())
          .second(0)
          .format("YYYY-MM-DDTHH:mm:ss");
      } else {
        datetimeFoto = base.format("YYYY-MM-DDT00:00:00");
      }
    }

    const payload = {
      cliente_nombre:   values.cliente_nombre?.trim(),
      domicilio:        values.domicilio?.trim() || null,
      celular:          values.celular?.trim() || null,
      importe:          values.importe          ? String(values.importe)          : undefined,
      fecha_anticipo:   values.fecha_anticipo
        ? dayjs(values.fecha_anticipo).format("YYYY-MM-DDTHH:mm:ss") : undefined,
      importe_anticipo: values.importe_anticipo ? String(values.importe_anticipo) : undefined,
      fecha_creacion_contrato: values.fecha_creacion_contrato
        ? dayjs(values.fecha_creacion_contrato).format("YYYY-MM-DDTHH:mm:ss") : null,
      direccion_misa:   values.direccion_misa?.trim() || null,
      hora_misa:        values.hora_misa ? dayjs(values.hora_misa).format("HH:mm") : null,
    };

    if (hayEventoSonido) {
      const fechaBase = values.fecha_evento;
      payload.id_tipo_evento    = values.id_tipo_evento;
      payload.id_ciudad         = values.id_ciudad ?? null;
      payload.lugar_evento      = values.lugar_evento?.trim();
      payload.fecha_evento      = fechaBase ? dayjs(fechaBase).format("YYYY-MM-DDTHH:mm:ss") : undefined;
      payload.hora_inicio       = values.hora_inicio ? dayjs(values.hora_inicio).format("HH:mm") : undefined;
      payload.hora_final        = values.hora_final  ? dayjs(values.hora_final).format("HH:mm")  : undefined;
      payload.id_paquete_sonido = values.id_paquete_sonido || null;
      payload.comentarios       = values.comentarios?.trim() || null;
    } else {
      payload.id_tipo_evento    = null;
      payload.id_ciudad         = null;
      payload.lugar_evento      = "";
      payload.fecha_evento      = null;
      payload.hora_inicio       = null;
      payload.hora_final        = null;
      payload.id_paquete_sonido = null;
      payload.comentarios       = null;
    }

    if (hayEventoFoto) {
      payload.id_ciudad_fotografia  = values.id_ciudad_fotografia ?? null;
      payload.lugar_fotografia      = values.lugar_fotografia?.trim() || null;
      payload.datetime_fotografia   = datetimeFoto;
      payload.id_paquete_fotografia = values.id_paquete_fotografia || null;
      payload.comentarios_fotografia = values.comentarios_fotografia?.trim() || null;
    } else {
      payload.id_ciudad_fotografia  = null;
      payload.lugar_fotografia      = null;
      payload.datetime_fotografia   = null;
      payload.id_paquete_fotografia = null;
      payload.comentarios_fotografia = null;
    }

    setSaving(true);
    try {
      let id_evento = eventoEditar?.id_evento;

      if (isEditing) {
        await apiEventosInstance.patch(`/eventos/${id_evento}`, payload, {
          headers: authHeaderEventos(),
        });
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
            message: "Evento guardado, pero falló la subida del contrato",
            description: err?.response?.data?.detail || err.message,
          });
        }
      }

      notification.success({
        message: isEditing ? "Evento actualizado correctamente" : "Evento creado exitosamente",
      });
      navigate("/app/eventos");
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

        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/app/eventos")}
          className="cc-back-btn"
        >
          Volver a Eventos
        </Button>

        <section className="cc-page-header-card">
          <Space direction="vertical" size={2}>
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

          <Space>
            <Button
              className="eventos-btn-clean"
              onClick={() => navigate("/app/eventos")}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="primary"
              loading={saving}
              icon={!isEditing ? <PlusOutlined /> : null}
              onClick={handleSave}
              style={{ backgroundColor: "#01369e", borderColor: "#01369e" }}
            >
              {isEditing ? "Guardar cambios" : "Crear evento"}
            </Button>
          </Space>
        </section>

        <Form form={form} layout="vertical">
          <div className="cc-body-grid">

            <div className="cc-left-col">

              {/* ── Datos del cliente ── */}
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
                      label={
                        <span className="eventos-field-label">
                          Teléfono celular&nbsp;
                          <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>(opcional)</span>
                        </span>
                      }
                    >
                      <Input placeholder="55 0000 0000" maxLength={15} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* ── Evento de Sonido ── */}
              <div className="cc-section-card">
                <div className="cc-section-header" style={{ justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="cc-section-icon"><SoundOutlined /></span>
                    Información del evento de sonido
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#01369e", fontWeight: 700 }}>
                    ¿Habrá evento de sonido?
                    <Switch
                      checked={hayEventoSonido}
                      onChange={(v) => {
                        if (!v && !hayEventoFoto) {
                          notification.warning({
                            message: "Debes tener al menos un servicio activo",
                            description: "Activa primero el evento de fotografía antes de desactivar el de sonido.",
                          });
                          return;
                        }
                        setHayEventoSonido(v);
                      }}
                      size="small"
                    />
                  </span>
                </div>

                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="id_tipo_evento"
                      label={<span className="eventos-field-label">Tipo de evento</span>}
                      rules={[{ required: hayEventoSonido, message: "Requerido" }]}
                    >
                      <Select
                        placeholder="Selecciona el tipo"
                        options={TIPOS_EVENTO}
                        disabled={!hayEventoSonido}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="fecha_evento"
                      label={<span className="eventos-field-label">Fecha del evento</span>}
                      rules={[{ required: hayEventoSonido, message: "Requerido" }]}
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        format="DD MMM YYYY"
                        disabled={!hayEventoSonido}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="id_ciudad"
                      label={<span className="eventos-field-label">Ciudad</span>}
                      rules={[{ required: hayEventoSonido, message: "Requerido" }]}
                    >
                      <Select
                        placeholder="Selecciona la ciudad"
                        options={ciudadesOptions}
                        disabled={!hayEventoSonido}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name="lugar_evento"
                      label={<span className="eventos-field-label">Lugar</span>}
                      rules={[{ required: hayEventoSonido, message: "Requerido" }]}
                    >
                      <Input
                        placeholder="Nombre del salón o jardín"
                        disabled={!hayEventoSonido}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="hora_inicio"
                      label={<span className="eventos-field-label">Hora inicio</span>}
                      rules={[{ required: hayEventoSonido, message: "Requerido" }]}
                    >
                      <TimePicker
                        style={{ width: "100%" }}
                        format="HH:mm"
                        placeholder="--:-- --"
                        minuteStep={15}
                        needConfirm={false}
                        disabled={!hayEventoSonido}
                        onChange={(v) => setHoraInicio(v)}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="hora_final"
                      label={<span className="eventos-field-label">Hora fin</span>}
                      rules={[{ required: hayEventoSonido, message: "Requerido" }]}
                    >
                      <TimePicker
                        style={{ width: "100%" }}
                        format="HH:mm"
                        placeholder="--:-- --"
                        minuteStep={15}
                        needConfirm={false}
                        disabled={!hayEventoSonido}
                        onChange={(v) => setHoraFinal(v)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {hayEventoSonido && (() => {
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

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="id_paquete_sonido"
                      label={<span className="eventos-field-label">Paquete de sonido</span>}
                    >
                      <Select
                        placeholder="Selecciona el paquete"
                        options={paquetesSonido}
                        disabled={!hayEventoSonido}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="comentarios"
                  label={<span className="eventos-field-label">Comentarios del evento</span>}
                >
                  <Input.TextArea
                    placeholder="Detalles específicos del servicio de sonido, requerimientos especiales..."
                    rows={3}
                    maxLength={1000}
                    showCount
                    disabled={!hayEventoSonido}
                  />
                </Form.Item>
              </div>

              {/* ── Fotografía / Sesión ── */}
              <div className="cc-section-card">
                <div className="cc-section-header" style={{ justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="cc-section-icon"><CameraOutlined /></span>
                    Información de fotografía / sesión
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#01369e", fontWeight: 700 }}>
                    ¿Habrá sesión de fotografía?
                    <Switch
                      checked={hayEventoFoto}
                      onChange={(v) => {
                        if (!v && !hayEventoSonido) {
                          notification.warning({
                            message: "Debes tener al menos un servicio activo",
                            description: "Activa primero el evento de sonido antes de desactivar el de fotografía.",
                          });
                          return;
                        }
                        setHayEventoFoto(v);
                      }}
                      size="small"
                    />
                  </span>
                </div>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="id_ciudad_fotografia"
                      label={<span className="eventos-field-label">Ciudad</span>}
                      rules={[{ required: hayEventoFoto, message: "Requerido" }]}
                    >
                      <Select
                        placeholder="Selecciona la ciudad"
                        options={ciudadesOptions}
                        disabled={!hayEventoFoto}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="lugar_fotografia"
                      label={<span className="eventos-field-label">Lugar</span>}
                      rules={[{ required: hayEventoFoto, message: "Requerido" }]}
                    >
                      <Input
                        placeholder="Dirección o lugar de la sesión"
                        disabled={!hayEventoFoto}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="fecha_fotografia"
                      label={<span className="eventos-field-label">Fecha</span>}
                      rules={[{ required: hayEventoFoto, message: "Requerido" }]}
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        format="DD MMM YYYY"
                        placeholder="Selecciona fecha"
                        disabled={!hayEventoFoto}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="hora_fotografia"
                      label={<span className="eventos-field-label">Hora</span>}
                    >
                      <TimePicker
                        style={{ width: "100%" }}
                        format="HH:mm"
                        placeholder="--:--"
                        minuteStep={15}
                        needConfirm={false}
                        disabled={!hayEventoFoto}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="id_paquete_fotografia"
                      label={<span className="eventos-field-label">Paquete de fotografía</span>}
                    >
                      <Select
                        placeholder="Selecciona el paquete"
                        options={paquetesFoto}
                        disabled={!hayEventoFoto}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="comentarios_fotografia"
                  label={<span className="eventos-field-label">Comentarios de fotografía</span>}
                >
                  <Input.TextArea
                    placeholder="Detalles específicos de la sesión, requerimientos especiales..."
                    rows={3}
                    maxLength={1000}
                    showCount
                    disabled={!hayEventoFoto}
                  />
                </Form.Item>
              </div>

              {/* ── Información de Misa ── */}
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
                        needConfirm={false}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

            </div>

            <div className="cc-right-col">

              {/* ── Importes ── */}
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
                    onBlur={() => {
                      handleMoneyBlur("importe");
                      form.validateFields(["importe_anticipo"]);
                    }}
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
                  rules={[
                    {
                      validator(_, value) {
                        if (!value) return Promise.resolve();
                        const total = parseFloat(String(form.getFieldValue("importe") ?? "").replace(/[^0-9.]/g, ""));
                        const anticipo = parseFloat(String(value).replace(/[^0-9.]/g, ""));
                        if (!isNaN(total) && !isNaN(anticipo) && anticipo > total) {
                          return Promise.reject("El primer pago no puede ser mayor al importe total");
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    prefix="$"
                    suffix="MXN"
                    placeholder="0.00"
                    onBlur={() => handleMoneyBlur("importe_anticipo")}
                  />
                </Form.Item>
                <Form.Item
                  name="fecha_creacion_contrato"
                  label={<span className="eventos-field-label">Fecha de celebración del contrato</span>}
                  rules={[{ required: true, message: "Requerido" }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="mm/dd/yyyy" />
                </Form.Item>
              </div>

              {/* ── Contrato ── */}
              <div className="cc-section-card">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><FilePdfOutlined /></span>
                  Contrato
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

                {pendingFile ? (
                  <>
                    {/* Archivo seleccionado */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#f9fafb",
                      marginBottom: 10,
                    }}>
                      <FilePdfOutlined style={{ color: "#ef4444", fontSize: 20, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Text style={{ fontSize: 13, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {pendingFile.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#9ca3af" }}>Se enviará al guardar</Text>
                      </div>
                    </div>
                    {/* Botones IA + Cancelar */}
                    <Space style={{ width: "100%", justifyContent: "stretch" }}>
                      <Button
                        icon={<RobotOutlined />}
                        loading={aiLoading}
                        onClick={handleAIFill}
                        style={{ flex: 1 }}
                      >
                        Rellenar con IA
                      </Button>
                      <Button
                        danger
                        onClick={() => setPendingFile(null)}
                        disabled={aiLoading}
                      >
                        Cancelar
                      </Button>
                    </Space>
                  </>
                ) : (
                  (!isEditing || (!loadingDocs && documentos.length === 0)) && (
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
                        Subir archivo de contrato
                      </p>
                      <p style={{ margin: "4px 0 8px", fontSize: 11, color: "#9ca3af" }}>
                        PDF hasta 10MB
                      </p>
                      <Button size="small" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em" }}>
                        SELECCIONAR ARCHIVO
                      </Button>
                    </Dragger>
                  )
                )}
              </div>

            </div>
          </div>
        </Form>

      </div>
    </main>
  );
}
