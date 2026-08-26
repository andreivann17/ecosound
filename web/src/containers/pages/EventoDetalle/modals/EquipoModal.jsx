import React from "react";
import { Modal, Input, Spin, Empty, Button } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { apiEventosInstance, authHeaderEventos } from "../../../../redux/actions/eventos/eventos";
import { PATH as API_BASE } from "../../../../redux/utils";

export default function EquipoModal({
  idEvento,
  equipoModalOpen,
  setEquipoModalOpen,
  equipoSearch,
  setEquipoSearch,
  loadingCatalogo,
  catalogoEquipo,
  equipoCantidades,
  setEquipoCantidades,
  savingEquipoId,
  setSavingEquipoId,
  fetchEquipoEvento,
  fetchCatalogo,
  toast,
}) {
  return (
    <Modal
      open={equipoModalOpen}
      onCancel={() => setEquipoModalOpen(false)}
      footer={null}
      title={
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          Agregar equipo al evento
        </div>
      }
      centered
      width={700}
      destroyOnClose
      styles={{ body: { padding: "20px 24px 24px" } }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <Input
          placeholder="Buscar por nombre o categoría..."
          value={equipoSearch}
          onChange={(e) => setEquipoSearch(e.target.value)}
          allowClear
          style={{ borderRadius: 10, height: 40 }}
        />

        {loadingCatalogo ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : (() => {
          const busqueda = equipoSearch.trim().toLowerCase();
          const filtrado = catalogoEquipo.filter((eq) =>
            !busqueda ||
            eq.nombre.toLowerCase().includes(busqueda) ||
            (eq.nombre_categoria || "").toLowerCase().includes(busqueda)
          );

          const grupos = {};
          for (const eq of filtrado) {
            const cat = eq.nombre_categoria || "Sin categoría";
            if (!grupos[cat]) grupos[cat] = [];
            grupos[cat].push(eq);
          }

          if (filtrado.length === 0) {
            return <Empty description="Sin resultados" style={{ margin: "32px 0" }} />;
          }

          return (
            <div style={{
              maxHeight: 460,
              overflowY: "auto",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              background: "#fafbfc",
            }}>
              {Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
                <div key={cat}>
                  {/* Category header */}
                  <div style={{
                    position: "sticky", top: 0, zIndex: 1,
                    fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                    letterSpacing: "0.09em", color: "#94a3b8",
                    padding: "10px 16px 8px",
                    background: "#f1f5f9",
                    borderBottom: "1px solid #e2e8f0",
                  }}>
                    {cat}
                  </div>

                  {items.map((eq, idx) => {
                    const disponible = eq.cantidad_disponible ?? 0;
                    const cantVal = equipoCantidades[eq.id_equipo] ?? 1;
                    const sinStock = disponible <= 0;
                    const excede = cantVal > disponible;

                    return (
                      <div
                        key={eq.id_equipo}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto auto",
                          alignItems: "center",
                          gap: 14,
                          padding: "12px 16px",
                          borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none",
                          opacity: sinStock ? 0.5 : 1,
                          background: "transparent",
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{
                          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                          overflow: "hidden", background: "#e2e8f0",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {eq.path ? (
                            <img
                              src={`${API_BASE}/${eq.path}`}
                              alt={eq.nombre}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <AppstoreOutlined style={{ fontSize: 18, color: "#94a3b8" }} />
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", textTransform: "capitalize" }}>
                            {eq.nombre}
                          </div>
                          <div style={{ marginTop: 3 }}>
                            {sinStock ? (
                              <span style={{
                                display: "inline-block", fontSize: 11, fontWeight: 700,
                                color: "#b91c1c", background: "#fee2e2",
                                borderRadius: 6, padding: "1px 8px",
                              }}>
                                Sin stock
                              </span>
                            ) : (
                              <span style={{
                                display: "inline-block", fontSize: 11, fontWeight: 700,
                                color: "#15803d", background: "#dcfce7",
                                borderRadius: 6, padding: "1px 8px",
                              }}>
                                {disponible} disponible{disponible !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity input */}
                        <Input
                          type="number"
                          min={1}
                          max={disponible}
                          value={cantVal}
                          disabled={sinStock}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setEquipoCantidades((prev) => ({
                              ...prev,
                              [eq.id_equipo]: isNaN(v) ? 1 : Math.max(1, v),
                            }));
                          }}
                          style={{
                            width: 72, textAlign: "center",
                            borderRadius: 8, height: 36,
                          }}
                        />

                        {/* Add button */}
                        <Button
                          type="primary"
                          disabled={sinStock || excede}
                          loading={savingEquipoId === eq.id_equipo}
                          style={
                            sinStock || excede
                              ? { borderRadius: 8, height: 36, minWidth: 80 }
                              : { background: "#05060a", borderColor: "#05060a", borderRadius: 8, height: 36, minWidth: 80, fontWeight: 700 }
                          }
                          onClick={async () => {
                            setSavingEquipoId(eq.id_equipo);
                            try {
                              await apiEventosInstance.post(
                                `/eventos/${idEvento}/equipo`,
                                { id_equipo: eq.id_equipo, cantidad: cantVal },
                                { headers: authHeaderEventos() }
                              );
                              toast(`${eq.nombre} agregado al evento`);
                              fetchEquipoEvento();
                              fetchCatalogo();
                            } catch (err) {
                              toast(err?.response?.data?.detail || err.message || "No se pudo agregar");
                            } finally {
                              setSavingEquipoId(null);
                            }
                          }}
                        >
                          Agregar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </Modal>
  );
}
