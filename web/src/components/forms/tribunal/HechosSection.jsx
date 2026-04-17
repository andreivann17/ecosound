import React from "react";

export default function HechosSection({ form, errors, setField }) {
  return (
    <section className="oa-card">
      <div className="oa-card-head oa-head-split">
        <h2 className="oa-card-title">
          <span className="material-symbols-outlined oa-ico oa-ico-primary">history_edu</span>
          HECHOS DE LA DEMANDA (NARRATIVA DEL TRABAJADOR)
        </h2>
      </div>

      <div className="oa-card-body">
        <div className="oa-grid-2 oa-mb-6">
          <div className="oa-field">
            <label className="oa-label">Responsable del Despido (Persona imputada)</label>
            <input
              className={`oa-input ${errors.responsable_despido ? "oa-input-error" : ""}`}
              type="text"
              value={form.responsable_despido}
              onChange={(e) => setField("responsable_despido", e.target.value)}
            />
            {errors.responsable_despido ? <div className="oa-error">{errors.responsable_despido}</div> : null}
          </div>

          <div className="oa-field">
            <label className="oa-label">Jefes Inmediatos Mencionado</label>
            <input
              type="text"
              className={`oa-input ${errors.jefes_inmediatos ? "oa-input-error" : ""}`}
              value={form.jefes_inmediatos}
              placeholder="Jefes Inmediatos"
              onChange={(e) => setField("jefes_inmediatos", e.target.value)}
            />
            {errors.jefes_inmediatos ? <div className="oa-error">{errors.jefes_inmediatos}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}