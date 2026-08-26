import React from "react";
import dayjs from "dayjs";
import { Button, Spin, Modal, Tooltip } from "antd";
import { TeamOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { apiEventosInstance, authHeaderEventos } from "../../../../redux/actions/eventos/eventos";
import { PATH as API_BASE } from "../../../../redux/utils";

export default function TrabajadoresTab({
  idEvento,
  evento,
  trabajadoresEvento,
  loadingTrabajadores,
  serviceLabels,
  setTrabSearch,
  setTrabSelectedId,
  setTrabSelectedPuesto,
  setTrabHoraInicio,
  setTrabHoraFin,
  setTrabServicioData,
  setTrabActiveTab,
  fetchCatalogoTrabajadores,
  setTrabajadoresModalOpen,
  setEditHoraModal,
  setEditHoraInicio,
  setEditHoraFin,
  fetchTrabajadoresEvento,
  toast,
}) {
  const openAddModal = () => {
    setTrabSearch("");
    setTrabSelectedId(null);
    setTrabSelectedPuesto(null);
    setTrabHoraInicio(null);
    setTrabHoraFin(null);
    setTrabServicioData({});
    setTrabActiveTab(evento?.servicios?.[0]?.id_evento_servicio ?? null);
    fetchCatalogoTrabajadores();
    setTrabajadoresModalOpen(true);
  };

  return (
    <div className="cd-card">
      <div className="cd-pagos-header">
        <div className="cd-pagos-header-left">
          <div className="cd-card-icon-wrap"><TeamOutlined /></div>
          <h2 className="cd-card-title">
            Trabajadores
            {trabajadoresEvento.length > 0 && (
              <span className="cd-actividad-count">{new Set(trabajadoresEvento.map((ct) => ct.id_trabajador)).size}</span>
            )}
          </h2>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="cd-btn-add-pago"
          onClick={openAddModal}
        >
          Agregar trabajador
        </Button>
      </div>

      {loadingTrabajadores ? (
        <div className="cd-loading-wrap"><Spin size="large" /></div>
      ) : trabajadoresEvento.length === 0 ? (
        <div className="cd-trab-empty">
          <div className="cd-trab-empty-icon"><TeamOutlined /></div>
          <p className="cd-trab-empty-title">Sin personal asignado</p>
          <p className="cd-trab-empty-sub">Agrega los trabajadores que participarán en este evento y su horario.</p>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="cd-btn-add-pago"
            onClick={openAddModal}
          >
            Agregar primer trabajador
          </Button>
        </div>
      ) : (
        <div className="cd-trab-card-grid">
          {(() => {
            const AVATAR_PALETTES = [
              ["#1e3a8a", "#3b82f6"],
              ["#065f46", "#10b981"],
              ["#7c2d12", "#f97316"],
              ["#4c1d95", "#8b5cf6"],
              ["#831843", "#ec4899"],
              ["#0c4a6e", "#0ea5e9"],
              ["#1a2e05", "#65a30d"],
              ["#450a0a", "#dc2626"],
            ];
            const grouped = [];
            const seenWorkers = new Map();
            for (const ct of trabajadoresEvento) {
              if (!seenWorkers.has(ct.id_trabajador)) {
                const group = { ...ct, assignments: [ct] };
                seenWorkers.set(ct.id_trabajador, group);
                grouped.push(group);
              } else {
                seenWorkers.get(ct.id_trabajador).assignments.push(ct);
              }
            }
            return grouped.map((worker) => {
              const { assignments } = worker;
              const single = assignments.length === 1;
              const ct = assignments[0];
              const initials =
                ((worker.nombre_trabajador || " ")[0] || "").toUpperCase() +
                ((worker.apellido_trabajador || " ")[0] || "").toUpperCase();
              const paletteIdx = ((worker.nombre_trabajador || "A").charCodeAt(0)) % AVATAR_PALETTES.length;
              const [colFrom, colTo] = AVATAR_PALETTES[paletteIdx];
              return (
                <div key={worker.id_trabajador} className="cd-trab-card">
                  {/* Top: foto o iniciales */}
                  <div className="cd-trab-card-top">
                    {worker.path_trabajador ? (
                      <img
                        src={`${API_BASE}/${worker.path_trabajador}`}
                        alt={initials}
                        className="cd-trab-card-photo"
                      />
                    ) : (
                      <div
                        className="cd-trab-card-initials"
                        style={{ background: `linear-gradient(140deg, ${colFrom} 0%, ${colTo} 100%)` }}
                      >
                        {initials}
                      </div>
                    )}
                    {/* Overlay hover buttons — only for single-assignment cards */}
                    {single && (
                      <div className="cd-trab-card-overlay">
                        <Tooltip title="Editar horario">
                          <button
                            className="cd-trab-card-btn cd-trab-card-btn-edit"
                            onClick={() => {
                              setEditHoraModal(ct);
                              setEditHoraInicio(ct.fecha_inicio ? dayjs(ct.fecha_inicio) : ct.hora_inicio ? dayjs(ct.hora_inicio, "HH:mm") : null);
                              setEditHoraFin(ct.fecha_final ? dayjs(ct.fecha_final) : ct.hora_final ? dayjs(ct.hora_final, "HH:mm") : null);
                            }}
                          >
                            <EditOutlined />
                          </button>
                        </Tooltip>
                        <Tooltip title="Quitar del evento">
                          <button
                            className="cd-trab-card-btn cd-trab-card-btn-remove"
                            onClick={() => {
                              Modal.confirm({
                                title: "Quitar trabajador",
                                content: `¿Quitar a "${ct.nombre_trabajador} ${ct.apellido_trabajador}" del evento?`,
                                okText: "Quitar",
                                okType: "danger",
                                cancelText: "Cancelar",
                                centered: true,
                                onOk: async () => {
                                  try {
                                    await apiEventosInstance.delete(
                                      `/eventos/${idEvento}/trabajadores/${ct.id_contrato_trabajador}`,
                                      { headers: authHeaderEventos() }
                                    );
                                    toast("Trabajador quitado del evento");
                                    fetchTrabajadoresEvento();
                                  } catch (err) {
                                    toast(err?.response?.data?.detail || err.message || "Error al quitar trabajador");
                                  }
                                },
                              });
                            }}
                          >
                            <DeleteOutlined />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo del card */}
                  <div className="cd-trab-card-body">
                    <div className="cd-trab-card-name">
                      {worker.nombre_trabajador} {worker.apellido_trabajador}
                    </div>
                    <div className="cd-trab-card-divider" />

                    {single ? (
                      <>
                        {ct.id_evento_servicio && serviceLabels[ct.id_evento_servicio] && (
                          <div className="cd-trab-card-field">
                            <span className="cd-trab-assignment-service">{serviceLabels[ct.id_evento_servicio]}</span>
                          </div>
                        )}
                        <div className="cd-trab-card-field">
                          <span className="cd-trab-card-label">Puesto</span>
                          {ct.nombre_puesto
                            ? <span className="cd-trab-card-puesto">{ct.nombre_puesto}</span>
                            : <span className="cd-trab-card-value-muted">Sin especificar</span>
                          }
                        </div>
                        <div className="cd-trab-card-field">
                          <span className="cd-trab-card-label">Horario</span>
                          <div className={`cd-trab-card-time ${!(ct.fecha_inicio || ct.hora_inicio || ct.fecha_final || ct.hora_final) ? "cd-trab-card-time-empty" : ""}`}>
                            <ClockCircleOutlined className="cd-trab-card-time-icon" />
                            <span>
                              {(ct.fecha_inicio || ct.hora_inicio || ct.fecha_final || ct.hora_final)
                                ? (() => {
                                    const startLabel = ct.fecha_inicio ? dayjs(ct.fecha_inicio).format("D MMM, HH:mm") : (ct.hora_inicio || "—");
                                    const endLabel = ct.fecha_final
                                      ? (ct.fecha_inicio && dayjs(ct.fecha_inicio).isSame(dayjs(ct.fecha_final), "day")
                                          ? dayjs(ct.fecha_final).format("HH:mm")
                                          : dayjs(ct.fecha_final).format("D MMM, HH:mm"))
                                      : (ct.hora_final || "—");
                                    return `${startLabel} – ${endLabel}`;
                                  })()
                                : "Sin horario"}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="cd-trab-card-field">
                        <span className="cd-trab-card-label">Puestos &amp; Horarios</span>
                        <div className="cd-trab-assignments">
                          {(() => {
                            const svGroups = [];
                            const svMap = new Map();
                            for (const a of assignments) {
                              const key = a.id_evento_servicio ?? "null";
                              if (!svMap.has(key)) {
                                const g = { key, id_evento_servicio: a.id_evento_servicio, items: [] };
                                svMap.set(key, g);
                                svGroups.push(g);
                              }
                              svMap.get(key).items.push(a);
                            }
                            return svGroups.map((group) => {
                              const serviceLabel = group.id_evento_servicio
                                ? (serviceLabels[group.id_evento_servicio] || null)
                                : null;
                              return (
                                <div key={group.key}>
                                  {serviceLabel && (
                                    <span className="cd-trab-assignment-service">{serviceLabel}</span>
                                  )}
                                  {group.items.map((a) => {
                                    const hasHoraA = a.fecha_inicio || a.hora_inicio || a.fecha_final || a.hora_final;
                                    return (
                                      <div key={a.id_contrato_trabajador} className="cd-trab-assignment-row">
                                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                                          <div className="cd-trab-assignment-info">
                                            {a.nombre_puesto
                                              ? <span className="cd-trab-card-puesto">{a.nombre_puesto}</span>
                                              : <span className="cd-trab-card-value-muted">Sin puesto</span>
                                            }
                                            <span className="cd-trab-assignment-sep">·</span>
                                            <div className={`cd-trab-card-time cd-trab-card-time-inline ${!hasHoraA ? "cd-trab-card-time-empty" : ""}`}>
                                              <ClockCircleOutlined className="cd-trab-card-time-icon" />
                                              <span>
                                                {hasHoraA
                                                  ? (() => {
                                                      const startLabel = a.fecha_inicio ? dayjs(a.fecha_inicio).format("D MMM, HH:mm") : (a.hora_inicio || "—");
                                                      const endLabel = a.fecha_final
                                                        ? (a.fecha_inicio && dayjs(a.fecha_inicio).isSame(dayjs(a.fecha_final), "day")
                                                            ? dayjs(a.fecha_final).format("HH:mm")
                                                            : dayjs(a.fecha_final).format("D MMM, HH:mm"))
                                                        : (a.hora_final || "—");
                                                      return `${startLabel} – ${endLabel}`;
                                                    })()
                                                  : "Sin horario"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="cd-trab-assignment-actions">
                                          <Tooltip title="Editar horario">
                                            <button
                                              className="cd-trab-card-btn cd-trab-card-btn-edit cd-trab-assign-btn"
                                              onClick={() => {
                                                setEditHoraModal(a);
                                                setEditHoraInicio(a.hora_inicio ? dayjs(a.hora_inicio, "HH:mm") : null);
                                                setEditHoraFin(a.hora_final ? dayjs(a.hora_final, "HH:mm") : null);
                                              }}
                                            >
                                              <EditOutlined />
                                            </button>
                                          </Tooltip>
                                          <Tooltip title="Quitar asignación">
                                            <button
                                              className="cd-trab-card-btn cd-trab-card-btn-remove cd-trab-assign-btn"
                                              onClick={() => {
                                                Modal.confirm({
                                                  title: "Quitar asignación",
                                                  content: `¿Quitar a "${a.nombre_trabajador} ${a.apellido_trabajador}" como ${a.nombre_puesto || "trabajador"} de este servicio?`,
                                                  okText: "Quitar",
                                                  okType: "danger",
                                                  cancelText: "Cancelar",
                                                  centered: true,
                                                  onOk: async () => {
                                                    try {
                                                      await apiEventosInstance.delete(
                                                        `/eventos/${idEvento}/trabajadores/${a.id_contrato_trabajador}`,
                                                        { headers: authHeaderEventos() }
                                                      );
                                                      toast("Asignación quitada del evento");
                                                      fetchTrabajadoresEvento();
                                                    } catch (err) {
                                                      toast(err?.response?.data?.detail || err.message || "Error al quitar asignación");
                                                    }
                                                  },
                                                });
                                              }}
                                            >
                                              <DeleteOutlined />
                                            </button>
                                          </Tooltip>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
