import React from "react";
import { Modal, Button } from "antd";
import { SERVICIO_LABEL } from "../constants";

export default function DeleteServiceModal({
  deleteServiceModal,
  setDeleteServiceModal,
  deletingService,
  handleDeleteService,
}) {
  return (
    <Modal
      open={!!deleteServiceModal}
      onCancel={() => setDeleteServiceModal(null)}
      centered
      title="Eliminar servicio"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => setDeleteServiceModal(null)}>Cancelar</Button>
          <Button danger loading={deletingService} onClick={handleDeleteService}>
            Sí, eliminar
          </Button>
        </div>
      }
      destroyOnClose
    >
      <p style={{ margin: "12px 0" }}>
        ¿Estás seguro de que deseas eliminar el servicio{" "}
        <strong>{SERVICIO_LABEL[deleteServiceModal?.id_servicio] || "seleccionado"}</strong>?
        Esta acción no se puede deshacer.
      </p>
    </Modal>
  );
}
