import React from "react";

export default function AccionesPrestacionesSection({
  form,
  errors,
  setField,
  setPrestacion,
}) {
  return (
    <section className="oa-card">
      <div className="oa-card-head">
        <h2 className="oa-card-title">
          <span className="material-symbols-outlined oa-ico oa-ico-primary">gavel</span>
          ACCIONES Y PRESTACIONES RECLAMADAS
        </h2>
      </div>

      <div className="oa-card-body">
        <div className="oa-grid-3 oa-mb-8">
          <div className="oa-field">
            <label className="oa-label">
              <span className="oa-req">*</span> Acción Intentada
            </label>
            <select
              className={`oa-input ${errors.accion_intentada ? "oa-input-error" : ""}`}
              value={form.accion_intentada}
              onChange={(e) => setField("accion_intentada", e.target.value)}
            >
              <option value="">Seleccionar acción</option>
              <option value="DESPIDO">DESPIDO</option>
              <option value="RESCISION LABORAL TRABAJADOR">RESCISION LABORAL TRABAJADOR</option>
              <option value="REINSTALACION">REINSTALACION</option>
              <option value="PAGO DE PRESTACIONES">PAGO DE PRESTACIONES</option>
              <option value="DERECHO DE PREFERENCIA Y/O ASCENSO">DERECHO DE PREFERENCIA Y/O ASCENSO</option>
            </select>

            {errors.accion_intentada ? <div className="oa-error">{errors.accion_intentada}</div> : null}
          </div>
        </div>

        <div className="oa-sep-top">
          <h3 className="oa-subtitle-row">
            <span className="material-symbols-outlined oa-sub-ico">payments</span>
            Prestaciones Reclamadas por el Actor
          </h3>

          <div className="oa-checkgrid">
            {[
              ["prima_antiguedad", "Prima de Antigüedad"],
              ["salarios_caidos", "Salarios Caídos"],
              ["vacaciones", "Vacaciones"],
              ["prima_vacacional", "Prima Vacacional"],
              ["aguinaldo", "Aguinaldo"],
              ["reparto_utilidades", "Reparto de Utilidades"],
              ["horas_extras", "Horas Extras"],
              ["dias_90_salario", "Indemnización Const. (90 DÍAS DE SALARIO)"],
              ["dias_20_salario", "Indemnización Const. (20 DÍAS DE SALARIO)"],
              ["reinstalacion", "Reinstalacion"],
              ["comisiones", "Comisiones"],
              ["incripcion_retroactiva_imss", "Incripcion Retroactiva al IMSS"],
            ].map(([key, label]) => (
              <label className="oa-check" key={key}>
                <input
                  type="checkbox"
                  checked={!!form.prestaciones[key]}
                  onChange={(e) => setPrestacion(key, e.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {errors.prestaciones ? <div className="oa-error">{errors.prestaciones}</div> : null}

          <div className="oa-field oa-mt-4">
            <label className="oa-label">Otras Prestaciones y Detalles</label>
            <textarea
              className={`oa-input`}
              value={form.otras_prestaciones}
              onChange={(e) => setField("otras_prestaciones", e.target.value)}
            />
          
          </div>
        </div>
      </div>
    </section>
  );
}