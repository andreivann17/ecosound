import React from "react";
import { Button, Spin, Empty, Modal } from "antd";
import { AppstoreOutlined, PlusOutlined, MinusOutlined } from "@ant-design/icons";
import { apiEventosInstance, authHeaderEventos } from "../../../../redux/actions/eventos/eventos";
import { PATH as API_BASE } from "../../../../redux/utils";

export default function EquipoTab({
  idEvento,
  loadingEquipo,
  equipoEvento,
  setEquipoSearch,
  setEquipoCantidades,
  fetchCatalogo,
  setEquipoModalOpen,
  fetchEquipoEvento,
  toast,
}) {
  return (
    <div className="cd-card">
      <div className="cd-pagos-header">
        <div className="cd-pagos-header-left">
          <div className="cd-card-icon-wrap"><AppstoreOutlined /></div>
          <h2 className="cd-card-title">Equipo del evento</h2>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="cd-btn-add-pago"
          onClick={() => {
            setEquipoSearch("");
            setEquipoCantidades({});
            fetchCatalogo();
            setEquipoModalOpen(true);
          }}
        >
          Agregar equipo
        </Button>
      </div>

      {loadingEquipo ? (
        <div className="cd-loading-wrap"><Spin size="large" /></div>
      ) : equipoEvento.length === 0 ? (
        <Empty description="Sin equipo asignado a este evento" style={{ margin: "32px 0" }} />
      ) : (
        <div className="cd-ev-card-grid">
          {equipoEvento.map((ee) => (
            <div key={ee.id_contrato_equipo} className="cd-ev-card">
              <div className="cd-ev-card-image">
                {ee.path_equipo ? (
                  <img src={`${API_BASE}/${ee.path_equipo}`} alt={ee.nombre_equipo} className="cd-ev-card-img" />
                ) : (
                  <div className="cd-ev-card-no-img">
                    <span className="cd-ev-no-img-icon">📷</span>
                    <span className="cd-ev-no-img-text">Sin imagen</span>
                  </div>
                )}
              </div>
              <div className="cd-ev-card-body">
                <div className="cd-ev-card-name">{ee.nombre_equipo || "—"}</div>
                {ee.nombre_categoria && (
                  <span className="cd-ev-badge">{ee.nombre_categoria}</span>
                )}
                <div className="cd-ev-card-meta">
                  <span className="cd-ev-meta-label">Cantidad</span>
                  <span className="cd-ev-meta-val cd-ev-meta-qty">{ee.cantidad}</span>
                </div>
              </div>
              <button
                className="cd-ev-card-remove"
                title="Quitar del evento"
                onClick={() => {
                  Modal.confirm({
                    title: "Quitar equipo",
                    content: `¿Quitar "${ee.nombre_equipo}" del evento?`,
                    okText: "Quitar",
                    okType: "danger",
                    cancelText: "Cancelar",
                    centered: true,
                    onOk: async () => {
                      try {
                        await apiEventosInstance.delete(
                          `/eventos/${idEvento}/equipo/${ee.id_contrato_equipo}`,
                          { headers: authHeaderEventos() }
                        );
                        toast("Equipo quitado del evento");
                        fetchEquipoEvento();
                      } catch (err) {
                        toast(err?.response?.data?.detail || err.message || "Error al quitar equipo");
                      }
                    },
                  });
                }}
              >
                <MinusOutlined />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
