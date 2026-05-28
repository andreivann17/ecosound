import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  apiGastosInstance,
  authHeaderGastos,
} from "../../redux/actions/gastos/gastos";

import {
  Form,
  Input,
  InputNumber,
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
  DollarOutlined,
} from "@ant-design/icons";

import "./GastosPage.css";

const { Title, Text } = Typography;

export default function CrearGastoPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const gastoEditar = location.state?.gasto ?? null;
  const isEditing   = !!gastoEditar;

  const [form]        = Form.useForm();
  const [saving, setSaving]         = useState(false);
  const [tiposGasto, setTiposGasto] = useState([]);

  useEffect(() => {
    apiGastosInstance
      .get("/gastos/config/tipos", { headers: authHeaderGastos() })
      .then((res) => setTiposGasto(res.data || []))
      .catch(() => setTiposGasto([]));
  }, []);

  useEffect(() => {
    if (gastoEditar) {
      form.setFieldsValue({
        descripcion:   gastoEditar.descripcion,
        monto:         parseFloat(gastoEditar.monto),
        id_tipo_gasto: gastoEditar.id_tipo_gasto ?? null,
        fecha:         gastoEditar.fecha?.slice(0, 10) ?? "",
      });
    }
  }, [gastoEditar, form]);

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload = {
      descripcion:   values.descripcion?.trim(),
      monto:         values.monto,
      id_tipo_gasto: values.id_tipo_gasto,
      fecha:         values.fecha,
    };

    setSaving(true);
    try {
      if (isEditing) {
        await apiGastosInstance.patch(
          `/gastos/${gastoEditar.id_gasto}`,
          payload,
          { headers: authHeaderGastos() }
        );
      } else {
        await apiGastosInstance.post("/gastos", payload, {
          headers: authHeaderGastos(),
        });
      }

      notification.success({
        message: isEditing ? "Gasto actualizado" : "Gasto registrado",
        description: isEditing
          ? "Los cambios se guardaron correctamente."
          : "El gasto fue registrado en el sistema.",
      });
      navigate("/app/gastos");
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
    <main className="gas-main">
      <div className="gas-content">

        <section className="gas-header-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
            <Space direction="vertical" size={2}>
              <Button
                type="link"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/app/gastos")}
                style={{ padding: 0, height: "auto", fontSize: 12, color: "#05060a" }}
              >
                Volver a Gastos
              </Button>
              <Title level={2} className="gas-title" style={{ marginBottom: 0 }}>
                {isEditing ? `Editando: ${gastoEditar.descripcion}` : "Nuevo gasto"}
              </Title>
              <Text className="gas-subtitle">
                {isEditing
                  ? "Modifica los datos del gasto y guarda los cambios."
                  : "Completa los datos del gasto para registrarlo en el sistema."}
              </Text>
            </Space>

            <Space style={{ marginTop: 4 }}>
              <Button
                className="gas-btn-clean"
                onClick={() => navigate("/app/gastos")}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                loading={saving}
                onClick={handleSave}
                style={{ backgroundColor: "#01369e", borderColor: "#01369e" }}
              >
                {isEditing ? "Guardar cambios" : "Registrar gasto"}
              </Button>
            </Space>
          </div>
        </section>

        <Form form={form} layout="vertical">
          <div className="gas-section-card">
            <div className="gas-section-header">
              <span className="gas-section-icon"><DollarOutlined /></span>
              Datos del gasto
            </div>

            <Form.Item
              name="descripcion"
              label={<span className="gas-field-label">Descripción</span>}
              rules={[{ required: true, message: "La descripción es requerida" }]}
            >
              <Input placeholder="Ej. Compra de trípode profesional" autoComplete="off" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="monto"
                  label={<span className="gas-field-label">Monto ($)</span>}
                  rules={[
                    { required: true, message: "El monto es requerido" },
                    { type: "number", min: 0.01, message: "Debe ser mayor a 0" },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0.01}
                    precision={2}
                    placeholder="0.00"
                    prefix="$"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="fecha"
                  label={<span className="gas-field-label">Fecha del gasto</span>}
                  rules={[{ required: true, message: "La fecha es requerida" }]}
                >
                  <Input type="date" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="id_tipo_gasto"
              label={<span className="gas-field-label">Tipo de gasto</span>}
              rules={[{ required: true, message: "Selecciona un tipo de gasto" }]}
            >
              <Select
                placeholder="Selecciona el tipo de gasto"
                options={tiposGasto.map((t) => ({
                  label: t.nombre,
                  value: t.id_tipo_gasto,
                }))}
              />
            </Form.Item>
          </div>
        </Form>

      </div>
    </main>
  );
}
