import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  apiPaquetesInstance,
  authHeaderPaquetes,
} from "../../redux/actions/paquetes/paquetes";

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
  Switch,
} from "antd";
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import "./EventosPage.css";
import "./PaquetesPage.css";

const { Title, Text } = Typography;

export default function CrearPaquetePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const paqueteEditar = location.state?.paquete ?? null;
  const isEditing = !!paqueteEditar;

  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [contenidos, setContenidos] = useState([{ key: Date.now(), value: "" }]);
  const [originalIds, setOriginalIds] = useState([]);

  useEffect(() => {
    if (paqueteEditar) {
      form.setFieldsValue({
        nombre: paqueteEditar.nombre,
        is_paquete_sonido: paqueteEditar.is_paquete_sonido ? "sonido" : "fotografia",
        active: Boolean(paqueteEditar.active),
      });
      if (paqueteEditar.contenidos && paqueteEditar.contenidos.length > 0) {
        const items = paqueteEditar.contenidos.map((c) => ({
          key: c.id_paquete_contenido,
          value: c.descripcion,
        }));
        setContenidos(items);
        setOriginalIds(paqueteEditar.contenidos.map((c) => c.id_paquete_contenido));
      }
    }
  }, [paqueteEditar, form]);

  const addContenido = () => {
    setContenidos((prev) => [...prev, { key: Date.now(), value: "" }]);
  };

  const removeContenido = (index) => {
    setContenidos((prev) => prev.filter((_, i) => i !== index));
  };

  const updateContenido = (index, value) => {
    setContenidos((prev) =>
      prev.map((c, i) => (i === index ? { ...c, value } : c))
    );
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const isSonido = values.is_paquete_sonido === "sonido";
    const payload = {
      nombre: values.nombre?.trim(),
      is_paquete_sonido: isSonido,
    };

    setSaving(true);
    try {
      let idPaquete;

      if (isEditing) {
        const isSonidoOrig = Boolean(paqueteEditar.is_paquete_sonido);
        const tipoChanged = isSonido !== isSonidoOrig;

        for (const id of originalIds) {
          await apiPaquetesInstance.delete(`/paquetes/contenidos/${id}`, {
            headers: authHeaderPaquetes(),
          });
        }

        if (tipoChanged) {
          await apiPaquetesInstance.delete(
            `/paquetes/${paqueteEditar.id_paquete}?is_sonido=${isSonidoOrig}`,
            { headers: authHeaderPaquetes() }
          );
          const res = await apiPaquetesInstance.post(
            "/paquetes",
            { nombre: payload.nombre, is_paquete_sonido: isSonido },
            { headers: authHeaderPaquetes() }
          );
          idPaquete = res.data.id_paquete;
        } else {
          await apiPaquetesInstance.patch(
            `/paquetes/${paqueteEditar.id_paquete}?is_sonido=${isSonidoOrig}`,
            { nombre: payload.nombre, active: values.active },
            { headers: authHeaderPaquetes() }
          );
          idPaquete = paqueteEditar.id_paquete;
        }

        const validContenidos = contenidos.filter((c) => c.value.trim());
        for (const c of validContenidos) {
          await apiPaquetesInstance.post(
            `/paquetes/${idPaquete}/contenidos?is_sonido=${isSonido}`,
            { descripcion: c.value.trim() },
            { headers: authHeaderPaquetes() }
          );
        }
      } else {
        const res = await apiPaquetesInstance.post("/paquetes", payload, {
          headers: authHeaderPaquetes(),
        });
        idPaquete = res.data.id_paquete;

        const validContenidos = contenidos.filter((c) => c.value.trim());
        for (const c of validContenidos) {
          await apiPaquetesInstance.post(
            `/paquetes/${idPaquete}/contenidos?is_sonido=${isSonido}`,
            { descripcion: c.value.trim() },
            { headers: authHeaderPaquetes() }
          );
        }
      }

      notification.success({
        message: isEditing ? "Paquete actualizado correctamente" : "Paquete creado exitosamente",
      });
      navigate("/paquetes");
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
    <main className="paq-main">
      <div className="paq-content">

        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/paquetes")}
          className="cc-back-btn"
        >
          Volver a Paquetes
        </Button>

        <section className="cc-page-header-card">
          <Space direction="vertical" size={2}>
            <Title level={2} className="eventos-title" style={{ marginBottom: 0 }}>
              {isEditing ? `Editando: ${paqueteEditar.nombre}` : "Nuevo paquete"}
            </Title>
            <Text className="eventos-subtitle">
              {isEditing
                ? "Modifica los datos del paquete y guarda los cambios."
                : "Completa los datos del paquete para registrarlo en el sistema."}
            </Text>
          </Space>

          <Space>
            <Button
              className="eventos-btn-clean"
              onClick={() => navigate("/paquetes")}
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
              {isEditing ? "Guardar cambios" : "Crear paquete"}
            </Button>
          </Space>
        </section>

        <Form form={form} layout="vertical">
          <div className="cc-body-grid cc-body-grid-paq">

            <div className="cc-left-col">
              <div className="cc-section-card paq-section-stretch">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><AppstoreOutlined /></span>
                  Datos del paquete
                </div>
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      name="nombre"
                      label={<span className="paq-field-label">Nombre del paquete</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                    >
                      <Input placeholder="Ej. Paquete Premium Fotografía" autoComplete="off" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={isEditing ? 12 : 24}>
                    <Form.Item
                      name="is_paquete_sonido"
                      label={<span className="paq-field-label">Tipo de paquete</span>}
                      rules={[{ required: true, message: "Requerido" }]}
                      initialValue="fotografia"
                    >
                      <Select
                        placeholder="Selecciona el tipo"
                        options={[
                          { label: "Fotografía", value: "fotografia" },
                          { label: "Sonido", value: "sonido" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  {isEditing && (
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="active"
                        label={<span className="paq-field-label">Estado del paquete</span>}
                        valuePropName="checked"
                        initialValue={true}
                      >
                        <Switch checkedChildren="Vigente" unCheckedChildren="Descontinuado" />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
              </div>
            </div>

            <div className="cc-right-col">
              <div className="cc-section-card paq-section-stretch">
                <div className="cc-section-header">
                  <span className="cc-section-icon"><UnorderedListOutlined /></span>
                  Contenido del paquete
                </div>
                <Text style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 14 }}>
                  Lista de elementos o servicios que incluye este paquete
                </Text>

                {contenidos.map((c, index) => (
                  <div key={c.key} className="paq-contenido-row">
                    <Input
                      value={c.value}
                      onChange={(e) => updateContenido(index, e.target.value)}
                      placeholder={`Elemento ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="paq-contenido-delete-btn"
                      onClick={() => removeContenido(index)}
                      title="Eliminar"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                ))}

                <Button
                  icon={<PlusOutlined />}
                  onClick={addContenido}
                  style={{ width: "100%", marginTop: 4 }}
                >
                  Agregar elemento
                </Button>
              </div>
            </div>

          </div>
        </Form>

      </div>
    </main>
  );
}
