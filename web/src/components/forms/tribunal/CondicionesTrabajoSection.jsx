import React from "react";
import { Select } from "antd";

const DIA_DESCANSO_OPTIONS = [
   { label: "Un dia a la semana", value: "Un dia a la semana" },
  { label: "Sin descanso", value: "Sin descanso" },
  { label: "Lunes", value: "Lunes" },
  { label: "Martes", value: "Martes" },
  { label: "Miércoles", value: "Miércoles" },
  { label: "Jueves", value: "Jueves" },
  { label: "Viernes", value: "Viernes" },
  { label: "Sábado", value: "Sábado" },
  { label: "Domingo", value: "Domingo" },
];

export default function CondicionesTrabajoSection({ form, errors, setField }) {
  const diasDescanso = Array.isArray(form.dia_descanso) ? form.dia_descanso : [];

  const handleDiaDescansoChange = (values) => {
    let next = Array.isArray(values) ? values : [];

    if (next.includes("Sin descanso")) {
      next = ["Sin descanso"];
    }

    setField("dia_descanso", next);
  };

  return (
    <section className="oa-card">
      <div className="oa-card-head">
        <h2 className="oa-card-title">
          <span className="material-symbols-outlined oa-ico oa-ico-primary">contract</span>
          CONDICIONES GENERALES DE TRABAJO RECLAMADOS POR LA PARTE ACTORA
        </h2>
      </div>

      <div className="oa-card-body oa-grid-3">
        <div className="oa-field">
          <label className="oa-label">Fecha de Ingreso</label>
          <input
            className={`oa-input ${errors.fecha_ingreso ? "oa-input-error" : ""}`}
            type="date"
            value={form.fecha_ingreso}
            onChange={(e) => setField("fecha_ingreso", e.target.value)}
          />
          {errors.fecha_ingreso ? <div className="oa-error">{errors.fecha_ingreso}</div> : null}
        </div>

        <div className="oa-field">
          <label className="oa-label">Último día laborado</label>
          <input
            className={`oa-input ${errors.fecha_ultimo_dia_laborado ? "oa-input-error" : ""}`}
            type="date"
            value={form.fecha_ultimo_dia_laborado}
            onChange={(e) => setField("fecha_ultimo_dia_laborado", e.target.value)}
          />
          {errors.fecha_ultimo_dia_laborado ? <div className="oa-error">{errors.fecha_ultimo_dia_laborado}</div> : null}
        </div>

        <div className="oa-field">
          <label className="oa-label">Puesto o Categoría</label>
          <input
            className={`oa-input ${errors.puesto ? "oa-input-error" : ""}`}
            type="text"
            placeholder="Ej. Operador"
            value={form.puesto}
            onChange={(e) => setField("puesto", e.target.value)}
          />
          {errors.puesto ? <div className="oa-error">{errors.puesto}</div> : null}
        </div>

        <div className="oa-field">
          <label className="oa-label">Salario Diario</label>
          <div className={`oa-money ${errors.salario_diario ? "oa-input-error" : ""}`}>
            <span className="oa-money-prefix">$</span>
            <input
              className="oa-money-input"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.salario_diario}
              onChange={(e) => setField("salario_diario", e.target.value)}
            />
          </div>
          {errors.salario_diario ? <div className="oa-error">{errors.salario_diario}</div> : null}
        </div>

        <div className="oa-field">
          <label className="oa-label">Salario Diario Integrado</label>
          <div className={`oa-money ${errors.salario_diario_integrado ? "oa-input-error" : ""}`}>
            <span className="oa-money-prefix">$</span>
            <input
              className="oa-money-input"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.salario_diario_integrado}
              onChange={(e) => setField("salario_diario_integrado", e.target.value)}
            />
          </div>
          {errors.salario_diario_integrado ? <div className="oa-error">{errors.salario_diario_integrado}</div> : null}
        </div>

        <div className="oa-field">
  <label className="oa-label">Jornada de Trabajo</label>
  <input
    className={`oa-input ${errors.jornada ? "oa-input-error" : ""}`}
    type="text"
    placeholder=""
    value={form.jornada}
    onChange={(e) => setField("jornada", e.target.value)}
  />
  {errors.jornada ? <div className="oa-error">{errors.jornada}</div> : null}
</div>


        <div className="oa-field">
          <label className="oa-label">Día(s) de Descanso</label>
          <Select
            mode="multiple"
            allowClear
            placeholder="Seleccionar día(s)"
            value={diasDescanso}
            onChange={handleDiaDescansoChange}
            options={DIA_DESCANSO_OPTIONS}
            className={errors.dia_descanso ? "oa-ant-select-error" : ""}
            style={{ width: "100%" }}
          />
          {errors.dia_descanso ? <div className="oa-error">{errors.dia_descanso}</div> : null}
        </div>

        <div className="oa-field ">
          <label className="oa-label">Lugar de Prestación del Servicio</label>
          <input
            className={`oa-input ${errors.lugar_servicio ? "oa-input-error" : ""}`}
            type="text"
            placeholder="Domicilio completo del centro de trabajo"
            value={form.lugar_servicio}
            onChange={(e) => setField("lugar_servicio", e.target.value)}
          />
          {errors.lugar_servicio ? <div className="oa-error">{errors.lugar_servicio}</div> : null}
        </div>

        <div className="oa-field ">
          <label className="oa-label">Circunstancias de Modo, Tiempo y Lugar</label>
          <textarea
            className={`oa-input ${errors.hechos ? "oa-input-error" : ""}`}
            value={form.hechos}
            onChange={(e) => setField("hechos", e.target.value)}
          />
          {errors.hechos ? <div className="oa-error">{errors.hechos}</div> : null}
        </div>
      </div>
    </section>
  );
}
