import React from "react";
import dayjs from "dayjs";
import { Button, Dropdown, Input, DatePicker, TimePicker, Select } from "antd";
import {
  UserOutlined,
  EditOutlined,
  EllipsisOutlined,
  DollarOutlined,
  PhoneOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { CIUDAD_MAP, SERVICIO_LABEL } from "../constants";
import { SERVICE_ICONS } from "../serviceIcons";
import { fmtMoney, fmtFechaCorta, fmtHora, parseNum, resolveServicios } from "../helpers";

// Misma paleta de colores distintos usada en el chip de "tipo de evento" (EventosPage.jsx),
// aquí aplicada al pill de "Paquete" para que cada paquete se distinga de reojo por su tono.
const CHIP_PALETTE = [
  { bg: "#d8e2ff", text: "#0b3f9e", darkBg: "rgba(59, 130, 246, 0.22)",  darkText: "#93c5fd" }, // azul
  { bg: "#ffdad6", text: "#93000a", darkBg: "rgba(239, 68, 68, 0.22)",   darkText: "#fca5a5" }, // rojo
  { bg: "#c8f5c8", text: "#004d00", darkBg: "rgba(34, 197, 94, 0.22)",   darkText: "#86efac" }, // verde
  { bg: "#ffddb5", text: "#5c3600", darkBg: "rgba(245, 158, 11, 0.22)",  darkText: "#fbbf24" }, // ámbar
  { bg: "#ede9fe", text: "#5b21b6", darkBg: "rgba(139, 92, 246, 0.22)",  darkText: "#c4b5fd" }, // morado
  { bg: "#93f2f2", text: "#003030", darkBg: "rgba(20, 184, 166, 0.22)",  darkText: "#5eead4" }, // teal
  { bg: "#ffd6e8", text: "#9d174d", darkBg: "rgba(236, 72, 153, 0.22)",  darkText: "#f9a8d4" }, // rosa
  { bg: "#ffe4c7", text: "#7c2d12", darkBg: "rgba(249, 115, 22, 0.22)",  darkText: "#fdba74" }, // naranja
  { bg: "#e8eaed", text: "#44474e", darkBg: "rgba(148, 163, 184, 0.18)", darkText: "#cbd5e1" }, // gris
  { bg: "#e0e7ff", text: "#3730a3", darkBg: "rgba(99, 102, 241, 0.22)",  darkText: "#a5b4fc" }, // índigo
];

const hashKey = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const getChipColors = (key) => {
  const n = CHIP_PALETTE.length;
  const h = hashKey(String(key));
  const idx = h % n;
  const cycle = Math.floor(h / n) % 5;
  const base = CHIP_PALETTE[idx];
  if (cycle <= 0) return base;
  const hueShift = (cycle * 37) % 360;
  const satAdj = cycle % 2 === 0 ? 1.15 : 0.85;
  return { ...base, filter: `hue-rotate(${hueShift}deg) saturate(${satAdj})` };
};

export default function DatosTab({
  evento,
  paquetesSonido,
  paquetesFoto,
  paquetesDecoracion,
  paquetesBarra,
  eventoPdfs,
  ciudadesOptions,
  resta,
  editingClientCard,
  setEditingClientCard,
  editingClientForm,
  setEditingClientForm,
  savingClientCard,
  handleSaveClientCard,
  editingFinancialCard,
  setEditingFinancialCard,
  editingFinancialForm,
  setEditingFinancialForm,
  savingFinancialCard,
  handleSaveFinancialCard,
  editingMisaCard,
  setEditingMisaCard,
  editingMisaForm,
  setEditingMisaForm,
  savingMisaCard,
  handleSaveMisaCard,
  editingServiceKey,
  setEditingServiceKey,
  editingServiceForm,
  setEditingServiceForm,
  savingService,
  startEditService,
  handleSaveService,
  setDeleteServiceModal,
  onOpenAddServicio,
  navigate,
  canConsultarPaquetes,
}) {
  const serviciosShown = resolveServicios(evento);

  // Tipo numérico que usa el módulo de Paquetes (0=Fotografía,1=Sonido,2=Decoraciones,3=Barra),
  // distinto al id_servicio (1=Sonido,2=Fotografía,3=Banquete,4=Barra) de eventos_servicios.
  const SERVICIO_TO_PAQUETE_TIPO = { 1: 1, 2: 0, 3: 2, 4: 3 };

  const paqueteName = (sv) => {
    if (!sv.id_paquete) return null;
    // Cada servicio resuelve su nombre de paquete contra su catálogo:
    // 1=Sonido, 2=Fotografía, 3=Banquete, 4=Barra
    if (sv.id_servicio === 1) {
      return paquetesSonido.find((p) => p.id_paquete_sonido === sv.id_paquete)?.nombre
        || `Paquete #${sv.id_paquete}`;
    }
    if (sv.id_servicio === 2) {
      return paquetesFoto.find((p) => p.id_paquete_fotografia === sv.id_paquete)?.nombre
        || `Paquete #${sv.id_paquete}`;
    }
    if (sv.id_servicio === 3) {
      return paquetesDecoracion.find((p) => p.id_paquete_decoracion === sv.id_paquete)?.nombre
        || `Paquete #${sv.id_paquete}`;
    }
    if (sv.id_servicio === 4) {
      return paquetesBarra.find((p) => p.id_paquete_barra === sv.id_paquete)?.nombre
        || `Paquete #${sv.id_paquete}`;
    }
    return `Paquete #${sv.id_paquete}`;
  };

  const firstPdf = (eventoPdfs && eventoPdfs[0]) || null;

  return (
  <div className="cd-bento-grid">
    <div className="cd-card cd-card-client">
      <div className="cd-card-header">
        <div className="cd-card-icon-wrap"><UserOutlined /></div>
        <h2 className="cd-card-title">Datos del cliente</h2>
        {!editingClientCard && (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "editar", icon: <EditOutlined />, label: "Editar",
                  onClick: () => {
                    setEditingClientForm({
                      cliente_nombre: evento.cliente_nombre || "",
                      celular: evento.celular || "",
                      domicilio: evento.domicilio || "",
                      comentarios: evento.comentarios || "",
                    });
                    setEditingClientCard(true);
                  },
                },
              ],
            }}
          >
            <Button type="text" icon={<EllipsisOutlined />} size="small" style={{ marginLeft: "auto" }} />
          </Dropdown>
        )}
      </div>
      {editingClientCard ? (
        <div className="cd-edit-form">
          <div className="cd-edit-field">
            <span className="cd-field-label">Nombre Completo</span>
            <Input value={editingClientForm.cliente_nombre}
              onChange={(e) => setEditingClientForm((f) => ({ ...f, cliente_nombre: e.target.value }))} />
          </div>
          <div className="cd-edit-field">
            <span className="cd-field-label">Teléfono Móvil</span>
            <Input value={editingClientForm.celular}
              onChange={(e) => setEditingClientForm((f) => ({ ...f, celular: e.target.value }))} />
          </div>
          <div className="cd-edit-field">
            <span className="cd-field-label">Domicilio</span>
            <Input value={editingClientForm.domicilio}
              onChange={(e) => setEditingClientForm((f) => ({ ...f, domicilio: e.target.value }))} />
          </div>
          <div className="cd-edit-field">
            <span className="cd-field-label">Comentarios</span>
            <Input.TextArea rows={2} value={editingClientForm.comentarios}
              onChange={(e) => setEditingClientForm((f) => ({ ...f, comentarios: e.target.value }))} />
          </div>
          <div className="cd-edit-form-actions">
            <Button onClick={() => setEditingClientCard(false)}>Cancelar</Button>
            <Button type="primary" loading={savingClientCard} onClick={handleSaveClientCard} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
          </div>
        </div>
      ) : (
        <div className="cd-client-fields">
          <div>
            <span className="cd-field-label">Nombre Completo</span>
            <span className="cd-field-value">{evento.cliente_nombre || "—"}</span>
          </div>
          {evento.celular && (
            <div>
              <span className="cd-field-label">Teléfono Móvil</span>
              <div className="cd-field-phone">
                <PhoneOutlined className="cd-phone-icon" />
                <span className="cd-field-value cd-field-value-primary">{evento.celular}</span>
              </div>
            </div>
          )}
          <div>
            <span className="cd-field-label">Domicilio</span>
            <span className="cd-field-value cd-field-value-muted">{evento.domicilio || "—"}</span>
          </div>
          <div>
            <span className="cd-field-label">Comentarios</span>
            <span className="cd-field-value cd-field-value-muted">{evento.comentarios || "—"}</span>
          </div>
        </div>
      )}
    </div>

    <div className="cd-card cd-card-financial">
      <div className="cd-card-header">
        <div className="cd-card-icon-wrap"><DollarOutlined /></div>
        <h2 className="cd-card-title">Resumen de Importes</h2>
        {!editingFinancialCard && (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                {
                  key: "editar", icon: <EditOutlined />, label: "Editar",
                  onClick: () => {
                    setEditingFinancialForm({
                      importe: evento.importe || "",
                      importe_anticipo: evento.importe_anticipo || "",
                      fecha_anticipo: evento.fecha_anticipo ? dayjs(evento.fecha_anticipo) : null,
                    });
                    setEditingFinancialCard(true);
                  },
                },
              ],
            }}
          >
            <Button type="text" icon={<EllipsisOutlined />} size="small" style={{ marginLeft: "auto" }} />
          </Dropdown>
        )}
      </div>
      {editingFinancialCard ? (
        <div className="cd-edit-form">
          <div className="cd-edit-field">
            <span className="cd-field-label">Importe Total</span>
            <Input value={editingFinancialForm.importe} placeholder="0"
              onChange={(e) => setEditingFinancialForm((f) => ({ ...f, importe: e.target.value }))} />
          </div>
          <div className="cd-edit-field">
            <span className="cd-field-label">Anticipo</span>
            <Input value={editingFinancialForm.importe_anticipo} placeholder="0"
              onChange={(e) => setEditingFinancialForm((f) => ({ ...f, importe_anticipo: e.target.value }))} />
          </div>
          <div className="cd-edit-field">
            <span className="cd-field-label">Fecha de anticipo</span>
            <DatePicker value={editingFinancialForm.fecha_anticipo}
              onChange={(v) => setEditingFinancialForm((f) => ({ ...f, fecha_anticipo: v }))}
              format="DD/MM/YYYY" />
          </div>
          <div className="cd-edit-form-actions">
            <Button onClick={() => setEditingFinancialCard(false)}>Cancelar</Button>
            <Button type="primary" loading={savingFinancialCard} onClick={handleSaveFinancialCard} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
          </div>
        </div>
      ) : (
        <div className="cd-financial-stack">
          <div className="cd-fin-main">
            <span className="cd-field-label cd-fin-main-label">Importe Total</span>
            <p className="cd-fin-main-value">{fmtMoney(evento.importe)}</p>
            <span className="cd-financial-note">Incluye todos los servicios</span>
          </div>
          <div className="cd-fin-sub-row">
            <div className="cd-fin-sub">
              <span className="cd-field-label">Anticipo Recibido</span>
              <p className="cd-fin-sub-value">
                {parseNum(evento.importe_anticipo) > 0 ? fmtMoney(evento.importe_anticipo) : "—"}
              </p>
              {evento.fecha_anticipo && (
                <span className="cd-financial-note">{fmtFechaCorta(evento.fecha_anticipo)}</span>
              )}
            </div>
            <div
              className={`cd-fin-sub ${
                resta === null ? "" : resta > 0 ? "cd-fin-sub-pending" : "cd-fin-sub-paid"
              }`}
            >
              <span className={`cd-field-label ${
                resta === null ? "" : resta > 0 ? "cd-financial-error" : "cd-financial-ok"
              }`}>
                Saldo Pendiente
              </span>
              <p className={`cd-fin-sub-value ${resta === null ? "" : resta > 0 ? "cd-financial-error" : "cd-financial-ok"}`}>
                {resta !== null ? fmtMoney(String(resta)) : "—"}
              </p>
              {resta !== null && resta > 0 && evento.fecha_evento && (
                <div className="cd-financial-alert"><ExclamationCircleOutlined />{fmtFechaCorta(evento.fecha_evento)}</div>
              )}
              {resta !== null && resta <= 0 && (
                <div className="cd-financial-paid"><CheckCircleOutlined />Liquidado</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Encabezado que introduce los servicios contratados */}
    <div className="cd-servicios-banner">
      <div className="cd-servicios-banner-icon"><AppstoreOutlined /></div>
      <div className="cd-servicios-banner-text">
        <h3 className="cd-servicios-banner-title">Servicios del evento</h3>
        <p className="cd-servicios-banner-sub">
          Equipos y paquetes contratados para este evento.
        </p>
      </div>
      {serviciosShown.length > 0 && (
        <span className="cd-servicios-banner-count">
          {serviciosShown.length} {serviciosShown.length === 1 ? "servicio" : "servicios"}
        </span>
      )}
      <Button
        icon={<PlusOutlined />}
        onClick={onOpenAddServicio}
        className="cd-btn-add-servicio"
      >
        Agregar servicio
      </Button>
    </div>

    {/* Servicios contratados — un card por servicio, grid 2 columnas */}
    {serviciosShown.length > 0 && (
      <div className="cd-servicios-row">
        {serviciosShown.map((sv, idx) => {
          const horaIni = sv.hora_inicio || null;
          const horaFin = sv.hora_final  || null;
          const horasLabel = horaIni && horaFin
            ? `${horaIni} — ${horaFin}`
            : (horaIni || horaFin || "—");
          const pname = paqueteName(sv);
          const isEditing = editingServiceKey === idx;

          const paqueteOptions = (() => {
            if (sv.id_servicio === 1) return paquetesSonido.map(p => ({ value: p.id_paquete_sonido, label: p.nombre }));
            if (sv.id_servicio === 2) return paquetesFoto.map(p => ({ value: p.id_paquete_fotografia, label: p.nombre }));
            if (sv.id_servicio === 3) return paquetesDecoracion.map(p => ({ value: p.id_paquete_decoracion, label: p.nombre }));
            if (sv.id_servicio === 4) return paquetesBarra.map(p => ({ value: p.id_paquete_barra, label: p.nombre }));
            return [];
          })();

          return (
            <div key={`${sv.id_servicio}-${sv.id_evento_servicio || ""}`} className="cd-card cd-card-servicio">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap cd-icon-tabler">
                  {SERVICE_ICONS[sv.id_servicio]}
                </div>
                <h2 className="cd-card-title">{SERVICIO_LABEL[sv.id_servicio] || "Servicio"}</h2>
                <span className="cd-servicio-order-badge" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "2px 8px", letterSpacing: 0.5 }}>#{idx + 1}</span>
                {!isEditing && (
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: [
                        { key: "editar", icon: <EditOutlined />, label: "Editar", onClick: () => startEditService(sv, idx) },
                        { type: "divider" },
                        { key: "eliminar", icon: <DeleteOutlined />, label: "Eliminar", danger: true, onClick: () => setDeleteServiceModal(sv) },
                      ],
                    }}
                  >
                    <Button type="text" icon={<EllipsisOutlined />} size="small" style={{ marginLeft: 4 }} onClick={(e) => e.stopPropagation()} />
                  </Dropdown>
                )}
              </div>

              {isEditing ? (
                <div className="cd-edit-form">
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Fecha</span>
                    <DatePicker
                      value={editingServiceForm.fecha}
                      onChange={(v) => setEditingServiceForm((f) => ({ ...f, fecha: v }))}
                      format="DD/MM/YYYY"
                    />
                  </div>
                  <div className="cd-edit-form-row">
                    <div className="cd-edit-field">
                      <span className="cd-field-label">Hora inicio</span>
                      <Input
                        value={editingServiceForm.hora_inicio}
                        onChange={(e) => setEditingServiceForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                        placeholder="HH:mm"
                      />
                    </div>
                    <div className="cd-edit-field">
                      <span className="cd-field-label">Hora final</span>
                      <Input
                        value={editingServiceForm.hora_final}
                        onChange={(e) => setEditingServiceForm((f) => ({ ...f, hora_final: e.target.value }))}
                        placeholder="HH:mm"
                      />
                    </div>
                  </div>
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Ciudad</span>
                    <Select
                      value={editingServiceForm.id_ciudad}
                      onChange={(v) => setEditingServiceForm((f) => ({ ...f, id_ciudad: v }))}
                      options={ciudadesOptions.length > 0 ? ciudadesOptions : [
                        { value: 1, label: "San Luis Rio Colorado" },
                        { value: 2, label: "Mexicali" },
                        { value: 3, label: "Puerto Peñasco" },
                      ]}
                      allowClear
                      placeholder="Seleccionar ciudad"
                    />
                  </div>
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Lugar</span>
                    <Input
                      value={editingServiceForm.lugar}
                      onChange={(e) => setEditingServiceForm((f) => ({ ...f, lugar: e.target.value }))}
                      placeholder="Lugar del servicio"
                    />
                  </div>
                  {paqueteOptions.length > 0 && (
                    <div className="cd-edit-field">
                      <span className="cd-field-label">Paquete</span>
                      <Select
                        value={editingServiceForm.id_paquete}
                        onChange={(v) => setEditingServiceForm((f) => ({ ...f, id_paquete: v }))}
                        options={paqueteOptions}
                        allowClear
                        placeholder="Sin paquete"
                      />
                    </div>
                  )}
                  <div className="cd-edit-field">
                    <span className="cd-field-label">Comentarios</span>
                    <Input.TextArea
                      rows={2}
                      value={editingServiceForm.comentarios}
                      onChange={(e) => setEditingServiceForm((f) => ({ ...f, comentarios: e.target.value }))}
                      placeholder="Comentarios..."
                    />
                  </div>
                  <div className="cd-edit-form-actions">
                    <Button onClick={() => setEditingServiceKey(null)}>Cancelar</Button>
                    <Button type="primary" loading={savingService} onClick={() => handleSaveService(sv)} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="cd-servicio-grid">
                    <div>
                      <span className="cd-field-label">Fecha</span>
                      <div className="cd-field-icon-row">
                        <CalendarOutlined className="cd-field-row-icon" />
                        <span className="cd-field-value">{fmtFechaCorta(sv.fecha)}</span>
                      </div>
                    </div>
                    <div>
                      <span className="cd-field-label">Ciudad</span>
                      <div className="cd-field-icon-row">
                        <EnvironmentOutlined className="cd-field-row-icon" />
                        <span className="cd-field-value">{CIUDAD_MAP[sv.id_ciudad] || "—"}</span>
                      </div>
                    </div>
                    <div>
                      <span className="cd-field-label">Horario</span>
                      <div className="cd-field-icon-row">
                        <ClockCircleOutlined className="cd-field-row-icon" />
                        <span className="cd-field-value">{horasLabel}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="cd-field-label">Lugar</span>
                    <span className="cd-field-value">{sv.lugar || "—"}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span className="cd-field-label">Paquete</span>
                    <div style={{ marginTop: 4 }}>
                      {pname
                        ? (() => {
                            const pillColor = getChipColors(`${sv.id_servicio}-${sv.id_paquete}`);
                            const tipoPaquete = SERVICIO_TO_PAQUETE_TIPO[sv.id_servicio];
                            const clickable = Boolean(navigate && canConsultarPaquetes && tipoPaquete !== undefined);
                            return (
                              <span
                                className={`cd-pill${clickable ? " cd-pill-link" : ""}`}
                                style={{
                                  "--chip-bg": pillColor.bg,
                                  "--chip-text": pillColor.text,
                                  "--chip-bg-dark": pillColor.darkBg,
                                  "--chip-text-dark": pillColor.darkText,
                                  filter: pillColor.filter,
                                }}
                                onClick={clickable
                                  ? () => navigate(`/app/paquetes/${sv.id_paquete}?tipo=${tipoPaquete}`)
                                  : undefined}
                              >
                                {pname}
                              </span>
                            );
                          })()
                        : <span className="cd-field-value cd-field-value-muted">Sin paquete</span>}
                    </div>
                  </div>
                  {sv.comentarios && (
                    <div style={{ marginTop: 12 }}>
                      <span className="cd-field-label">Comentarios</span>
                      <p className="cd-servicio-comentarios">{sv.comentarios}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    )}

    {(evento.direccion_misa || evento.fecha_misa) && (
      <div className="cd-card cd-card-misa">
        <div className="cd-card-header">
          <div className="cd-card-icon-wrap"><EnvironmentOutlined /></div>
          <h2 className="cd-card-title">Información de Misa</h2>
          {!editingMisaCard && (
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  {
                    key: "editar", icon: <EditOutlined />, label: "Editar",
                    onClick: () => {
                      setEditingMisaForm({
                        direccion_misa: evento.direccion_misa || "",
                        fecha_misa: evento.fecha_misa ? dayjs(evento.fecha_misa) : null,
                        hora_misa: evento.fecha_misa ? dayjs(evento.fecha_misa) : null,
                      });
                      setEditingMisaCard(true);
                    },
                  },
                ],
              }}
            >
              <Button type="text" icon={<EllipsisOutlined />} size="small" style={{ marginLeft: "auto" }} />
            </Dropdown>
          )}
        </div>
        {editingMisaCard ? (
          <div className="cd-edit-form">
            <div className="cd-edit-field">
              <span className="cd-field-label">Dirección de la Misa</span>
              <Input value={editingMisaForm.direccion_misa}
                onChange={(e) => setEditingMisaForm((f) => ({ ...f, direccion_misa: e.target.value }))} />
            </div>
            <div className="cd-edit-form-row">
              <div className="cd-edit-field">
                <span className="cd-field-label">Fecha de la Misa</span>
                <DatePicker value={editingMisaForm.fecha_misa}
                  onChange={(v) => setEditingMisaForm((f) => ({ ...f, fecha_misa: v }))}
                  format="DD/MM/YYYY" />
              </div>
              <div className="cd-edit-field">
                <span className="cd-field-label">Hora de la Misa</span>
                <TimePicker value={editingMisaForm.hora_misa}
                  onChange={(v) => setEditingMisaForm((f) => ({ ...f, hora_misa: v }))}
                  format="HH:mm" />
              </div>
            </div>
            <div className="cd-edit-form-actions">
              <Button onClick={() => setEditingMisaCard(false)}>Cancelar</Button>
              <Button type="primary" loading={savingMisaCard} onClick={handleSaveMisaCard} style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}>Guardar</Button>
            </div>
          </div>
        ) : (
          <div className="cd-misa-fields">
            {evento.direccion_misa && (
              <div>
                <span className="cd-field-label">Dirección de la Misa</span>
                <span className="cd-field-value">{evento.direccion_misa}</span>
              </div>
            )}
            {evento.fecha_misa && (
              <div>
                <span className="cd-field-label">Fecha de la Misa</span>
                <div className="cd-field-icon-row">
                  <CalendarOutlined className="cd-field-row-icon" />
                  <span className="cd-field-value">{fmtFechaCorta(evento.fecha_misa)}</span>
                </div>
              </div>
            )}
            {evento.fecha_misa && (
              <div>
                <span className="cd-field-label">Hora de la Misa</span>
                <div className="cd-field-icon-row">
                  <ClockCircleOutlined className="cd-field-row-icon" />
                  <span className="cd-field-value">{fmtHora(evento.fecha_misa)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}
  </div>
  );
}
