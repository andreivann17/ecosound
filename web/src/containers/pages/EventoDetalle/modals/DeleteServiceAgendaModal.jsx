import React from "react";
import { Modal, Button } from "antd";
import { SERVICIO_LABEL } from "../constants";

export default function DeleteServiceAgendaModal({
  agendaServiceModal,
  setAgendaServiceModal,
  deletingService,
  onDeleteService,
}) {
  return (
    <Modal
      open={!!agendaServiceModal}
      onCancel={() => setAgendaServiceModal(null)}
      centered
      title="¿Eliminar también de la agenda?"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => setAgendaServiceModal(null)}>Cancelar</Button>
          <Button loading={deletingService} onClick={() => onDeleteService(false)}>
            No eliminar
          </Button>
          <Button type="primary" danger loading={deletingService} onClick={() => onDeleteService(true)}>
            Aceptar
          </Button>
        </div>
      }
      destroyOnClose
    >
      <p style={{ margin: "12px 0" }}>
        El servicio{" "}
        <strong>{SERVICIO_LABEL[agendaServiceModal?.id_servicio] || "seleccionado"}</strong>{" "}
        también tiene una entrada en la agenda/calendario. ¿Deseas eliminarla también?
      </p>
      <p style={{ margin: "12px 0", color: "#64748b", fontSize: 13 }}>
        Si eliges "No eliminar", el servicio se quitará del evento pero su entrada en la
        agenda permanecerá visible.
      </p>
    </Modal>
  );
}
