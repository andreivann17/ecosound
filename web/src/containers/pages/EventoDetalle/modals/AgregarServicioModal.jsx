import React from "react";
import { Modal, Form, Input, DatePicker, TimePicker, Select } from "antd";
import { SERVICE_ICONS } from "../serviceIcons";
import { SERVICIO_LABEL } from "../constants";

export default function AgregarServicioModal({
  servicioModalOpen,
  setServicioModalOpen,
  servicioForm,
  handleAddServicio,
  savingServicio,
  nuevoServicioTipo,
  setNuevoServicioTipo,
  ciudadesOptions,
  paquetesSonido,
  paquetesFoto,
  paquetesDecoracion,
  paquetesBarra,
}) {
  const paqueteOptions =
    nuevoServicioTipo === 1 ? paquetesSonido.map((p) => ({ value: p.id_paquete_sonido, label: p.nombre })) :
    nuevoServicioTipo === 2 ? paquetesFoto.map((p) => ({ value: p.id_paquete_fotografia, label: p.nombre })) :
    nuevoServicioTipo === 3 ? paquetesDecoracion.map((p) => ({ value: p.id_paquete_decoracion, label: p.nombre })) :
    nuevoServicioTipo === 4 ? paquetesBarra.map((p) => ({ value: p.id_paquete_barra, label: p.nombre })) :
    [];

  return (
    <Modal
      open={servicioModalOpen}
      onCancel={() => {
        setServicioModalOpen(false);
        servicioForm.resetFields();
        setNuevoServicioTipo(null);
      }}
      onOk={handleAddServicio}
      okText="Agregar servicio"
      cancelText="Cancelar"
      title={
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--eh-ink, #0f172a)" }}>
          Agregar servicio al evento
        </div>
      }
      confirmLoading={savingServicio}
      centered
      width={640}
      destroyOnClose
      okButtonProps={{ style: { background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" } }}
      styles={{ body: { padding: "20px 24px 4px" } }}
    >
      <p style={{ fontSize: 13, color: "var(--eh-ink-muted, #64748b)", marginTop: 0, marginBottom: 16 }}>
        Selecciona el tipo de servicio y completa fecha, lugar y horario.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
        {[1, 2, 3, 4].map((id) => {
          const active = nuevoServicioTipo === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setNuevoServicioTipo(id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "18px 8px",
                borderRadius: 12,
                border: active ? "1px solid var(--eh-primary-btn)" : "1px solid var(--eh-surface-border, #e2e8f0)",
                background: active ? "var(--eh-primary-btn)" : "var(--eh-surface-2, #fff)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span className="cd-servicio-tipo-icon" style={{ color: active ? "#fff" : "var(--eh-ink-muted, #64748b)" }}>
                {SERVICE_ICONS[id]}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#fff" : "var(--eh-ink-2, #374151)" }}>
                {SERVICIO_LABEL[id]}
              </span>
            </button>
          );
        })}
      </div>

      <Form form={servicioForm} layout="vertical">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: "Requerido" }]}>
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" placeholder="Selecciona fecha" />
          </Form.Item>
          <Form.Item name="id_ciudad" label="Ciudad" rules={[{ required: true, message: "Requerido" }]}>
            <Select
              placeholder="Selecciona la ciudad"
              options={ciudadesOptions.length > 0 ? ciudadesOptions : [
                { value: 1, label: "San Luis Rio Colorado" },
                { value: 2, label: "Mexicali" },
                { value: 3, label: "Puerto Peñasco" },
              ]}
              allowClear
            />
          </Form.Item>
        </div>
        <Form.Item name="lugar" label="Lugar" rules={[{ required: true, message: "Requerido" }]}>
          <Input placeholder="Nombre del salón, jardín o lugar" />
        </Form.Item>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Form.Item name="hora_inicio" label="Hora inicio" rules={[{ required: true, message: "Requerido" }]}>
            <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="--:-- --" minuteStep={15} needConfirm={false} />
          </Form.Item>
          <Form.Item name="hora_final" label="Hora fin" rules={[{ required: true, message: "Requerido" }]}>
            <TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="--:-- --" minuteStep={15} needConfirm={false} />
          </Form.Item>
        </div>
        <Form.Item name="id_paquete" label="Paquete (opcional)">
          <Select placeholder="Sin paquete" allowClear options={paqueteOptions} />
        </Form.Item>
        <Form.Item name="comentarios" label="Comentarios (opcional)">
          <Input.TextArea placeholder="Detalles específicos..." rows={2} maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
