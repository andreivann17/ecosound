import React from "react";
import { Modal, Button, DatePicker } from "antd";
import { apiEventosInstance, authHeaderEventos } from "../../../../redux/actions/eventos/eventos";

export default function EditHoraModal({
  idEvento,
  editHoraModal,
  setEditHoraModal,
  editHoraInicio,
  setEditHoraInicio,
  editHoraFin,
  setEditHoraFin,
  savingEditHora,
  setSavingEditHora,
  fetchTrabajadoresEvento,
  toast,
}) {
  return (
    <Modal
      open={!!editHoraModal}
      onCancel={() => setEditHoraModal(null)}
      title={
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          Editar horario — {editHoraModal?.nombre_trabajador} {editHoraModal?.apellido_trabajador}
        </div>
      }
      centered
      width={420}
      destroyOnClose
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => setEditHoraModal(null)}>Cancelar</Button>
          <Button
            type="primary"
            loading={savingEditHora}
            style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}
            onClick={async () => {
              setSavingEditHora(true);
              try {
                await apiEventosInstance.patch(
                  `/eventos/${idEvento}/trabajadores/${editHoraModal.id_contrato_trabajador}`,
                  {
                    fecha_inicio: editHoraInicio ? editHoraInicio.format("YYYY-MM-DD HH:mm:ss") : null,
                    fecha_final: editHoraFin ? editHoraFin.format("YYYY-MM-DD HH:mm:ss") : null,
                  },
                  { headers: authHeaderEventos() }
                );
                toast("Horario actualizado");
                fetchTrabajadoresEvento();
                setEditHoraModal(null);
              } catch (err) {
                toast(err?.response?.data?.detail || err.message || "Error al actualizar");
              } finally {
                setSavingEditHora(false);
              }
            }}
          >
            Guardar horario
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "16px 0" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b", marginBottom: 8 }}>
            Fecha y hora inicio
          </div>
          <DatePicker
            value={editHoraInicio}
            onChange={(v) => setEditHoraInicio(v)}
            showTime={{ format: "HH:mm", minuteStep: 15 }} needConfirm={false}
            format="DD/MM/YYYY HH:mm"
            placeholder="Fecha y hora"
            style={{ width: "100%" }}
          />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b", marginBottom: 8 }}>
            Fecha y hora fin
          </div>
          <DatePicker
            value={editHoraFin}
            onChange={(v) => setEditHoraFin(v)}
            showTime={{ format: "HH:mm", minuteStep: 15 }} needConfirm={false}
            format="DD/MM/YYYY HH:mm"
            placeholder="Fecha y hora"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </Modal>
  );
}
