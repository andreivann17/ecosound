// src/components/tribunal/FormTribunal/sections/DatosGeneralesSection.jsx
import React from "react";
import { AutoComplete, Button, Divider, Input, Select } from "antd";

export default function DatosGeneralesSection({
  form,
  errors,

  expedienteSearchValue,
  expedienteOptions,
  expedienteSearching,
  handleExpedienteFocus,
  handleExpedienteSearch,
  handleExpedienteSelect,
  handleExpedienteChange,

  selectedEstadoId,
  selectedCiudadId,
  selectedAutoridadId,
  estadosOptionsFinal,
  ciudadesOptionsFinal,
  autoridadOptions,
  handleChangeEstado,
  handleChangeCiudad,
  handleChangeAutoridad,

  empresaNombreOptions,
  razonSocialOptions,
  handleChangeEmpresaNombre,
  handleChangeRazonSocial,
  newEmpresaNombre,
  setNewEmpresaNombre,
  createEmpresaLikeConciliacion,
  newRazonSocialNombre,
  setNewRazonSocialNombre,
  createRazonSocialLikeConciliacion,

  setField,
}) 


{
  return (
    <section className="oa-card">
      <div className="oa-card-head">
        <h2 className="oa-card-title">
          <span className="material-symbols-outlined oa-ico oa-ico-primary">folder_shared</span>
          DATOS GENERALES DEL EXPEDIENTE
        </h2>
      </div>

      <div className="oa-card-body oa-grid-3">
        

        <div className="oa-field">
          <label className="oa-label">
            <span className="oa-req">*</span> Número de Expediente
          </label>
          <input
            className={`oa-input ${errors.numero_expediente ? "oa-input-error" : ""}`}
            type="text"
            placeholder="Número de expediente"
            value={form.numero_expediente}
            onChange={(e) => setField("numero_expediente", e.target.value)}
          />
          {errors.numero_expediente ? <div className="oa-error">{errors.numero_expediente}</div> : null}
        </div>

        <div className="oa-field">
          <label className="oa-label">
            <span className="oa-req">*</span> Nombre de la Parte Actora
          </label>
          <input
            className={`oa-input ${errors.nombre_parte_actora ? "oa-input-error" : ""}`}
            type="text"
            placeholder="Nombre de la parte actora"
            value={form.nombre_parte_actora}
            onChange={(e) => setField("nombre_parte_actora", e.target.value)}
          />
          {errors.nombre_parte_actora ? <div className="oa-error">{errors.nombre_parte_actora}</div> : null}
        </div>
        <div className="oa-field">
          <label className="oa-label">
            <span className="oa-req">*</span> Empresa
          </label>

          <div className={errors.empresa_nombre ? "oa-ant-error" : ""}>
            <Select
              value={form.empresa_nombre || undefined}
              placeholder="Seleccionar empresa"
              onChange={handleChangeEmpresaNombre}
              options={empresaNombreOptions}
              style={{ width: "100%" }}
              showSearch
              optionFilterProp="label"
              dropdownRender={(menu) => (
                <div>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ display: "flex", gap: 8, padding: 8 }}>
                    <Input
                      value={newEmpresaNombre}
                      onChange={(e) => setNewEmpresaNombre(e.target.value)}
                      placeholder="Nueva empresa"
                    />
                    <Button type="primary" onClick={createEmpresaLikeConciliacion}>
                      Agregar
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>

          {errors.empresa_nombre ? <div className="oa-error">{errors.empresa_nombre}</div> : null}
        </div>

        <div className="oa-field">
          <label className="oa-label">
            <span className="oa-req">*</span> Razón social
          </label>

          <div className={errors.empresa_razon_social_ids ? "oa-ant-error" : ""}>
            <Select
              mode="multiple"
              value={form.empresa_razon_social_ids || []}
              placeholder="Seleccionar razón(es) social(es)"
              onChange={handleChangeRazonSocial}
              disabled={!String(form.empresa_nombre || "").trim()}
              style={{ width: "100%" }}
              options={(razonSocialOptions || []).map((o) => ({
                label: o.label,
                value: String(o.value == null ? o.label : o.value),
              }))}
              dropdownRender={(menu) => (
                <div>
                  {menu}
                  <Divider style={{ margin: "8px 0" }} />
                  <div style={{ display: "flex", gap: 8, padding: 8 }}>
                    <Input
                      value={newRazonSocialNombre}
                      onChange={(e) => setNewRazonSocialNombre(e.target.value)}
                      placeholder="Nueva razón social"
                      disabled={!String(form.empresa_nombre || "").trim()}
                    />
                    <Button
                      type="primary"
                      onClick={createRazonSocialLikeConciliacion}
                      disabled={!String(form.empresa_nombre || "").trim()}
                    >
                      Agregar
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>

          {errors.empresa_razon_social_ids ? <div className="oa-error">{errors.empresa_razon_social_ids}</div> : null}
        </div>
     <div className="oa-field">
          <label className="oa-label">
            <span className="oa-req">*</span> Autoridad
          </label>
          <select
            className={`oa-input ${errors.autoridad ? "oa-input-error" : ""}`}
            value={selectedAutoridadId ?? ""}
            onChange={(e) => handleChangeAutoridad(e.target.value)}
            disabled={!selectedCiudadId}
          >
            <option value="">Seleccionar autoridad</option>
            {autoridadOptions.map((o) => (
              <option key={String(o.value)} value={String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.autoridad ? <div className="oa-error">{errors.autoridad}</div> : null}
        </div>
             <div className="oa-field">
          <label className="oa-label">
            <span className="oa-req">*</span> Ciudad
          </label>
          <select
            className={`oa-input ${errors.ciudad ? "oa-input-error" : ""}`}
            value={selectedCiudadId ?? ""}
            onChange={(e) => handleChangeCiudad(e.target.value ? Number(e.target.value) : null)}
            disabled={!selectedEstadoId}
          >
            <option value="">Seleccionar ciudad</option>
            {ciudadesOptionsFinal.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.ciudad ? <div className="oa-error">{errors.ciudad}</div> : null}
        </div>

        <div className="oa-field">
          <label className="oa-label">
            <span className="oa-req">*</span> Estado
          </label>
          <select
            className={`oa-input ${errors.estado ? "oa-input-error" : ""}`}
            value={selectedEstadoId ?? ""}
            onChange={(e) => handleChangeEstado(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Seleccionar estado</option>
            {estadosOptionsFinal.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.estado ? <div className="oa-error">{errors.estado}</div> : null}
        </div>
<div className="oa-field">
  <label className="oa-label">
    Abogado parte actora
  </label>
  <input
    className={`oa-input`}
    type="text"
    placeholder="Nombre del abogado parte actora"
    value={form.abogado_contrario || ""}
    onChange={(e) => setField("abogado_contrario", e.target.value)}
  />
 
</div>
   

        

        

        <div className="oa-field">
          <label className="oa-label">Corresponsal (nombre)</label>
          <input
            className="oa-input"
            type="text"
            placeholder="Nombre del corresponsal empresa"
            value={form.corresponsal_nombre || ""}
            onChange={(e) => setField("corresponsal_nombre", e.target.value)}
            disabled={Number(form.cliente_directo || 1) === 1}
          />
          {errors.corresponsal_nombre ? <div className="oa-error">{errors.corresponsal_nombre}</div> : null}
        </div>
           <div className="oa-field">
          <label className="oa-label">
           Núm. Único de Identificación
          </label>

          <AutoComplete
            value={expedienteSearchValue || form.num_unico}
            options={expedienteOptions}
            onFocus={handleExpedienteFocus}
            onSearch={handleExpedienteSearch}
            onSelect={handleExpedienteSelect}
            onChange={handleExpedienteChange}
            filterOption={false}
            notFoundContent={expedienteSearching ? "Buscando..." : "Sin resultados"}
          >
            <input
              className={`oa-input`}
              type="text"
              placeholder="Ej. SLRC/001/2024"
              value={expedienteSearchValue || form.num_unico}
              onChange={(e) => handleExpedienteChange(e.target.value)}
            />
          </AutoComplete>

        </div>
      </div>
    </section>
  );
}