import React from "react";
import { Modal, Form, Input, DatePicker } from "antd";

export default function PagoModal({
  pagoModalOpen,
  setPagoModalOpen,
  pagoForm,
  handleAddPago,
  savingPago,
}) {
  return (
    <Modal
      open={pagoModalOpen}
      onCancel={() => {
        setPagoModalOpen(false);
        pagoForm.resetFields();
      }}
      onOk={handleAddPago}
      okText="Guardar abono"
      cancelText="Cancelar"
      title="Registrar abono"
      confirmLoading={savingPago}
      centered
      okButtonProps={{ style: { background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" } }}
    >
      <Form form={pagoForm} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="monto"
          label="Monto del abono"
          rules={[{ required: true, message: "Requerido" }]}
        >
          <Input prefix="$" suffix="MXN" placeholder="5000" />
        </Form.Item>
        <Form.Item
          name="fecha"
          label="Fecha del pago"
          rules={[{ required: true, message: "Requerido" }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>
        <Form.Item name="descripcion" label="Descripción (opcional)">
          <Input placeholder="Ej: Abono por transferencia bancaria" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
