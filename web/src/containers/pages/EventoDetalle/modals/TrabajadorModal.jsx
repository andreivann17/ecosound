import React from "react";
import { Modal, Select, DatePicker, Button } from "antd";
import { apiEventosInstance, authHeaderEventos } from "../../../../redux/actions/eventos/eventos";
import { PATH as API_BASE } from "../../../../redux/utils";
import { SERVICIO_LABEL } from "../constants";
import { SERVICE_ICONS } from "../serviceIcons";

export default function TrabajadorModal({
  idEvento,
  evento,
  trabajadoresModalOpen,
  setTrabajadoresModalOpen,
  trabSelectedId,
  setTrabSelectedId,
  catalogoTrabajadores,
  serviceLabels,
  trabActiveTab,
  setTrabActiveTab,
  trabServicioData,
  setTrabServicioData,
  puestosEvento,
  trabSelectedPuesto,
  setTrabSelectedPuesto,
  trabHoraInicio,
  setTrabHoraInicio,
  trabHoraFin,
  setTrabHoraFin,
  savingTrab,
  setSavingTrab,
  fetchTrabajadoresEvento,
  toast,
}) {
  return (
    <Modal
      open={trabajadoresModalOpen}
      onCancel={() => setTrabajadoresModalOpen(false)}
      footer={null}
      title={
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--eh-ink, #0f172a)" }}>
          Agregar trabajador al evento
        </div>
      }
      centered
      width={920}
      style={{ top: 24 }}
      destroyOnClose
      styles={{
        body: { padding: "28px 32px 36px", minHeight: 520 },
        header: { padding: "20px 32px 16px", borderBottom: "1px solid var(--eh-surface-border, #f1f5f9)" },
      }}
      closeIcon={
        <span style={{ fontSize: 18, color: "var(--eh-ink-muted, #64748b)", lineHeight: 1, display: "flex", alignItems: "center" }}>✕</span>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Trabajador — Select con búsqueda */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--eh-ink-muted, #64748b)", marginBottom: 8 }}>
            Selecciona un trabajador
          </div>
          <Select
                showSearch
                value={trabSelectedId}
                onChange={(v) => setTrabSelectedId(v)}
                placeholder="Buscar trabajador..."
                style={{ width: "100%" }}
                size="large"
                allowClear
                filterOption={(input, opt) =>
                  (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                optionRender={(opt) => {
                  const t = catalogoTrabajadores.find((x) => x.id_trabajador === opt.value);
                  if (!t) return opt.label;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: t.path
                          ? `url(${API_BASE}/${t.path}) center/cover no-repeat`
                          : "linear-gradient(140deg,#1e293b,#475569)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 800, fontSize: 11,
                      }}>
                        {!t.path && (
                          <>{((t.nombre || " ")[0] || "").toUpperCase()}{((t.apellido || " ")[0] || "").toUpperCase()}</>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--eh-ink, #0f172a)", textTransform: "capitalize" }}>
                          {t.nombre} {t.apellido}
                        </div>
                        {t.nombre_puesto && (
                          <div style={{ fontSize: 11, color: "var(--eh-ink-faint, #94a3b8)" }}>{t.nombre_puesto}</div>
                        )}
                      </div>
                    </div>
                  );
                }}
                options={catalogoTrabajadores.map((t) => ({
                  value: t.id_trabajador,
                  label: `${t.nombre} ${t.apellido}`.replace(/\b\w/g, (c) => c.toUpperCase()),
                }))}
              />
        </div>

        {/* Servicios como tabs */}
        {Array.isArray(evento?.servicios) && evento.servicios.length > 0 ? (
          <>
            {/* Tab bar */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--eh-ink-muted, #64748b)", marginBottom: 12 }}>
                Servicios del evento
              </div>
              <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--eh-surface-border, #e2e8f0)" }}>
                {evento.servicios.map((sv) => {
                  const label = serviceLabels[sv.id_evento_servicio] || SERVICIO_LABEL[sv.id_servicio] || `Servicio`;
                  const isActive = trabActiveTab === sv.id_evento_servicio;
                  const d = trabServicioData[sv.id_evento_servicio];
                  const hasData = !!(d?.id_puesto || d?.hora_inicio || d?.hora_fin);
                  return (
                    <button
                      key={sv.id_evento_servicio}
                      onClick={() => setTrabActiveTab(sv.id_evento_servicio)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "12px 22px", border: "none", outline: "none",
                        borderBottom: isActive ? "2px solid var(--eh-primary-btn)" : "2px solid transparent",
                        marginBottom: -2,
                        background: isActive ? "var(--eh-accent-soft, #eff6ff)" : "transparent",
                        cursor: "pointer",
                        color: isActive ? "var(--eh-accent-text, var(--eh-primary-btn))" : "var(--eh-ink-muted, #64748b)",
                        fontWeight: isActive ? 700 : 500, fontSize: 14,
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ width: 17, height: 17, display: "flex", alignItems: "center", flexShrink: 0 }}>
                        {SERVICE_ICONS[sv.id_servicio]}
                      </span>
                      {label}
                      {hasData && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 17, height: 17, borderRadius: "50%",
                          background: "#15803d", color: "#fff", fontSize: 9, fontWeight: 900,
                        }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel del tab activo */}
            {trabActiveTab != null && (() => {
              const d = trabServicioData[trabActiveTab] || {};
              const updateField = (field, value) =>
                setTrabServicioData(prev => ({
                  ...prev,
                  [trabActiveTab]: { ...(prev[trabActiveTab] || {}), [field]: value },
                }));
              return (
                <div style={{
                  border: "1px solid var(--eh-surface-border, #e2e8f0)", borderRadius: 14,
                  padding: "20px 24px", background: "var(--eh-surface-2, #fafbff)",
                  display: "flex", flexDirection: "column", gap: 18,
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--eh-ink-muted, #64748b)", marginBottom: 8 }}>
                      Puesto en este servicio
                    </div>
                    <select
                      value={d.id_puesto ?? ""}
                      onChange={(e) => updateField("id_puesto", e.target.value ? Number(e.target.value) : null)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 10,
                        border: "1px solid var(--eh-surface-border, #e2e8f0)", fontSize: 14, background: "var(--eh-surface, #fff)",
                        outline: "none", color: "var(--eh-ink, #0f172a)", appearance: "auto",
                      }}
                    >
                      <option value="">Sin puesto específico</option>
                      {puestosEvento.map((p) => (
                        <option key={p.id_puesto} value={p.id_puesto}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--eh-ink-muted, #64748b)", marginBottom: 8 }}>
                      Horario de trabajo
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--eh-ink-faint, #94a3b8)", fontWeight: 600, marginBottom: 5 }}>Fecha y hora inicio</div>
                        <DatePicker
                          value={d.hora_inicio}
                          onChange={(v) => updateField("hora_inicio", v)}
                          showTime={{ format: "HH:mm", minuteStep: 15 }} needConfirm={false}
                          format="DD/MM/YYYY HH:mm"
                          placeholder="Fecha y hora"
                          style={{ width: "100%", borderRadius: 10 }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--eh-ink-faint, #94a3b8)", fontWeight: 600, marginBottom: 5 }}>Fecha y hora fin</div>
                        <DatePicker
                          value={d.hora_fin}
                          onChange={(v) => updateField("hora_fin", v)}
                          showTime={{ format: "HH:mm", minuteStep: 15 }} needConfirm={false}
                          format="DD/MM/YYYY HH:mm"
                          placeholder="Fecha y hora"
                          style={{ width: "100%", borderRadius: 10 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          /* Sin servicios — fallback original */
          <>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--eh-ink-muted, #64748b)", marginBottom: 8 }}>
                Puesto en este evento
              </div>
              <select
                value={trabSelectedPuesto ?? ""}
                onChange={(e) => setTrabSelectedPuesto(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: "1px solid var(--eh-surface-border, #e2e8f0)", fontSize: 14, background: "var(--eh-surface-2, #f8fafc)",
                  outline: "none", color: "var(--eh-ink, #0f172a)", appearance: "auto",
                }}
              >
                <option value="">Sin puesto específico</option>
                {puestosEvento.map((p) => (
                  <option key={p.id_puesto} value={p.id_puesto}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--eh-ink-muted, #64748b)", marginBottom: 8 }}>
                Horario de trabajo
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--eh-ink-faint, #94a3b8)", fontWeight: 600, marginBottom: 5 }}>Fecha y hora inicio</div>
                  <DatePicker value={trabHoraInicio} onChange={(v) => setTrabHoraInicio(v)} showTime={{ format: "HH:mm", minuteStep: 15 }} needConfirm={false} format="DD/MM/YYYY HH:mm" placeholder="Fecha y hora" style={{ width: "100%", borderRadius: 10 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--eh-ink-faint, #94a3b8)", fontWeight: 600, marginBottom: 5 }}>Fecha y hora fin</div>
                  <DatePicker value={trabHoraFin} onChange={(v) => setTrabHoraFin(v)} showTime={{ format: "HH:mm", minuteStep: 15 }} needConfirm={false} format="DD/MM/YYYY HH:mm" placeholder="Fecha y hora" style={{ width: "100%", borderRadius: 10 }} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Botón guardar */}
        <Button
          type="primary" block loading={savingTrab}
          style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)", height: 48, borderRadius: 12, fontWeight: 700, fontSize: 15, marginTop: 8 }}
          onClick={async () => {
            if (!trabSelectedId) {
              toast("Selecciona un trabajador primero");
              return;
            }
            setSavingTrab(true);
            try {
              const servicios = Array.isArray(evento?.servicios) ? evento.servicios : [];
              if (servicios.length > 0) {
                const toSave = servicios.filter(sv => {
                  const d = trabServicioData[sv.id_evento_servicio];
                  return d && (d.id_puesto || d.hora_inicio || d.hora_fin);
                });
                const entries = toSave.length > 0 ? toSave.map(sv => {
                  const d = trabServicioData[sv.id_evento_servicio];
                  return { id_evento_servicio: sv.id_evento_servicio, id_puesto: d.id_puesto || null, fecha_inicio: d.hora_inicio ? d.hora_inicio.format("YYYY-MM-DD HH:mm:ss") : null, fecha_final: d.hora_fin ? d.hora_fin.format("YYYY-MM-DD HH:mm:ss") : null };
                }) : [{ id_evento_servicio: null, id_puesto: null, fecha_inicio: null, fecha_final: null }];

                for (const entry of entries) {
                  await apiEventosInstance.post(
                    `/eventos/${idEvento}/trabajadores`,
                    { id_trabajador: trabSelectedId, ...entry },
                    { headers: authHeaderEventos() }
                  );
                }
              } else {
                await apiEventosInstance.post(
                  `/eventos/${idEvento}/trabajadores`,
                  {
                    id_trabajador: trabSelectedId,
                    id_puesto: trabSelectedPuesto,
                    fecha_inicio: trabHoraInicio ? trabHoraInicio.format("YYYY-MM-DD HH:mm:ss") : null,
                    fecha_final: trabHoraFin ? trabHoraFin.format("YYYY-MM-DD HH:mm:ss") : null,
                    id_evento_servicio: null,
                  },
                  { headers: authHeaderEventos() }
                );
              }
              const selected = catalogoTrabajadores.find((t) => t.id_trabajador === trabSelectedId);
              toast(`${selected?.nombre || "Trabajador"} agregado al evento`);
              fetchTrabajadoresEvento();
              setTrabajadoresModalOpen(false);
            } catch (err) {
              toast(err?.response?.data?.detail || err.message || "No se pudo agregar");
            } finally {
              setSavingTrab(false);
            }
          }}
        >
          Agregar al evento
        </Button>
      </div>
    </Modal>
  );
}
