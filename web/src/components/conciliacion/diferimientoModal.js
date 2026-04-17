// src/components/expedientes/modals/DiferimientoModal.jsx
import React from "react";
import { Modal, Form, DatePicker, Select, Input, Space, Button } from "antd";

const { Option } = Select;

/**
 * Solicita: fecha_audiencia_inicial, fecha_audiencia_final, modalidad, lugar_audiencia
 * Guarda con onSubmit({ fecha_audiencia_inicial, fecha_audiencia_final, modalidad, lugar_audiencia })
 */
export default function DiferimientoModal({ open, onCancel, onSubmit }) {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        fecha_audiencia_inicial: values.fecha_audiencia_inicial?.toISOString(),
        fecha_audiencia_final: values.fecha_audiencia_final?.toISOString(),
        modalidad: values.modalidad,
        lugar_audiencia: values.lugar_audiencia?.trim(),
      };
      onSubmit?.(payload);
      form.resetFields();
    } catch (_) {
      // validation errors
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel?.();
  };

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      title="Reprogramar / Diferimiento de Audiencia"
      okText="Guardar"
      onOk={handleOk}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={{ modalidad: "PRESENCIAL" }}
      >
        <Form.Item
          name="fecha_audiencia_inicial"
          label="Fecha y hora inicial de la audiencia"
          rules={[{ required: true, message: "Requerido" }]}
        >
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>

     

        <Space.Compact block style={{ marginBottom: 16 }}>
          <Form.Item
            name="modalidad"
            label="Modalidad"
            style={{ width: "40%", marginRight: 8 }}
            rules={[{ required: true, message: "Selecciona la modalidad" }]}
          >
            <Select>
              <Option value="PRESENCIAL">Presencial</Option>
              <Option value="VIRTUAL">Virtual</Option>
              <Option value="MIXTA">Mixta</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="lugar_audiencia"
            label="Lugar de audiencia"
            style={{ width: "60%" }}
            rules={[{ required: true, message: "Indica el lugar" }]}
          >
            <Input placeholder="Ej. Conciliadora Estatal, Sala 2" />
          </Form.Item>
        </Space.Compact>

        <Space style={{ display: "none" }}>
          {/* Footer custom si lo quisieras dentro del form */}
          <Button type="primary" onClick={handleOk}>
            Guardar
          </Button>
          <Button onClick={handleCancel}>Cancelar</Button>
        </Space>
      </Form>
    </Modal>
  );
}
