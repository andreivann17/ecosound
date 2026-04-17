import React, { useEffect, useRef } from "react";

export default function EtapasCitatorioSection({
  form,
  errors,
  submitting,
  setField,
  openCitatorioPicker,
  onCitatorioPicked,
  viewCitatorio,
  deleteCitatorio,
  citatorioInputRef,
}) {
  
function addBusinessDays(startDate, days) {
  if (!days || days <= 0) return "";

  const date = new Date(startDate + "T00:00:00");
  // NO contar el día inicial
  date.setDate(date.getDate() + 1);

  let added = 0;

  while (added < days) {
    const day = date.getDay();

    if (day !== 0 && day !== 6) {
      added++;
      if (added === days) break;
    }

    date.setDate(date.getDate() + 1);
  }

  // formateo LOCAL (no UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
useEffect(() => {
  if (form.fecha_notificacion_demanda && form.dias_limite > 0) {
    const fechaCalculada = addBusinessDays(
      form.fecha_notificacion_demanda,
      form.dias_limite
    );
    setField("fecha_limite_contestacion", fechaCalculada);
  }
}, [form.fecha_notificacion_demanda, form.dias_limite]);
  return (
    <section className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">

      <div className="p-6 flex flex-col lg:flex-row gap-8">
        <div className="lg:w-2/3 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
   <div className="mb-4 flex items-center gap-2">
  <span className="material-symbols-outlined text-primary text-[18px]">
    calendar_month
  </span>
  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase">
    Términos y Plazos
  </h3>
</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
           <div className="oa-field">
              <label className="oa-label">
                <span className="oa-req">*</span> Fecha de Notificación de la Demanda
              </label>
              <input
                className={`oa-input ${errors.fecha_notificacion_demanda ? "oa-input-error" : ""}`}
                type="date"
                value={form.fecha_notificacion_demanda || ""}
                onChange={(e) => setField("fecha_notificacion_demanda", e.target.value)}
                disabled={submitting}
              />
              {errors.fecha_notificacion_demanda ? (
                <div className="oa-error">{errors.fecha_notificacion_demanda}</div>
              ) : null}
            </div>
             <div className="oa-field">
  <label className="oa-label">
    <span className="oa-req">*</span> Días para contestación
  </label>
  <input
    className={`oa-input ${errors.dias_limite ? "oa-input-error" : ""}`}
    type="number"
    min="1"
    value={form.dias_limite || ""}
    onChange={(e) => {
      const val = Number(e.target.value);
      if (val > 0) setField("dias_limite", val);
    }}
    disabled={submitting}
  />
  {errors.dias_limite ? (
    <div className="oa-error">{errors.dias_limite}</div>
  ) : null}
</div>
            <div className="space-y-1">
    
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Fecha Límite Contestación
              </label>
             <input
  className="oa-input w-full bg-slate-100 dark:bg-slate-800"
  type="date"
  value={form.fecha_limite_contestacion || ""}
  disabled
/>
              {errors.fecha_limite_contestacion ? (
                <div className="oa-error">{errors.fecha_limite_contestacion}</div>
              ) : null}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                Fecha Audiencia Conciliatoria
              </label>
              <input
                className={`oa-input ${errors.fecha_audiencia_conciliatoria ? "oa-input-error" : ""} w-full bg-white dark:bg-slate-900`}
                type="date"
                value={form.fecha_audiencia_conciliatoria || ""}
                onChange={(e) => setField("fecha_audiencia_conciliatoria", e.target.value)}
                disabled={submitting}
              />
              {errors.fecha_audiencia_conciliatoria ? (
                <div className="oa-error">{errors.fecha_audiencia_conciliatoria}</div>
              ) : null}
            </div>

        

            <div className="oa-field">
              <label className="oa-label">
                <span className="oa-req">*</span> Fecha de Presentación de la Demanda
              </label>
              <input
                className={`oa-input ${errors.fecha_presentacion_demanda ? "oa-input-error" : ""}`}
                type="date"
                value={form.fecha_presentacion_demanda || ""}
                onChange={(e) => setField("fecha_presentacion_demanda", e.target.value)}
                disabled={submitting}
              />
              {errors.fecha_presentacion_demanda ? (
                <div className="oa-error">{errors.fecha_presentacion_demanda}</div>
              ) : null}
            </div>
             <div className="oa-field">
              <label className="oa-label">
                Fecha de Recepcion de la Demanda en el Despacho
              </label>
              <input
                className={`oa-input `}
                type="date"
                value={form.fecha_recepcion_demanda || ""}
                onChange={(e) => setField("fecha_recepcion_demanda", e.target.value)}
                disabled={submitting}
              />
            
            </div>
              <div className="oa-field">
              <label className="oa-label">
                Fecha de Radicación de la Demanda
              </label>
              <input
                className={`oa-input `}
                type="date"
                value={form.fecha_radicacion_demanda || ""}
                onChange={(e) => setField("fecha_radicacion_demanda", e.target.value)}
                disabled={submitting}
              />
            
            </div>
            <div className="oa-field">
              <label className="oa-label">
                Fecha de Emision del Citatorio (CCL)
              </label>
              <input
                className={`oa-input `}
                type="date"
                value={form.fecha_emision_citatorio|| ""}
                onChange={(e) => setField("fecha_emision_citatorio", e.target.value)}
                disabled={submitting}
              />
            
            </div>
             <div className="oa-field">
              <label className="oa-label">
                Fecha de Constancia de no Conciliacion
              </label>
              <input
                className={`oa-input `}
                type="date"
                value={form.fecha_constancia_conciliacion || ""}
                onChange={(e) => setField("fecha_constancia_conciliacion", e.target.value)}
                disabled={submitting}
              />
            
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              Observaciones de la etapa actual
            </label>
            <textarea
              type="text"
              className={`oa-input ${errors.observaciones_etapa_actual ? "oa-input-error" : ""}`}
              value={form.observaciones_etapa_actual || ""}
              onChange={(e) => setField("observaciones_etapa_actual", e.target.value)}
              disabled={submitting}
            />
            {errors.observaciones_etapa_actual ? (
              <div className="oa-error">{errors.observaciones_etapa_actual}</div>
            ) : null}
          </div>

          {/* CITATORIO multi */}
          <div className="mt-6">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-2">
              DEMANDA/NOTIFICACION (documentos)
            </label>

            <div
              className="oa-dropzone"
              onClick={openCitatorioPicker}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openCitatorioPicker();
              }}
            >
              <div className="oa-dropzone-ico">
                <span className="material-symbols-outlined oa-dropzone-ico-sym">attach_file</span>
              </div>

              <p className="oa-dropzone-title">
                {Array.isArray(form.citatorio) && form.citatorio.length
                  ? "DEMANDA/NOTIFICACION cargada"
                  : "Anexar DEMANDA/NOTIFICACION"}
              </p>

              <p className="oa-dropzone-sub">
                {Array.isArray(form.citatorio) && form.citatorio.length
                  ? `${form.citatorio.length} archivo(s)`
                  : "PDF, PNG, JPG (varios archivos)"}
              </p>
            </div>

            <input
              ref={citatorioInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              style={{ display: "none" }}
              onChange={onCitatorioPicked}
            />

            {Array.isArray(form.citatorio) && form.citatorio.length ? (
              <div className="mt-3 flex flex-col gap-2">
                {form.citatorio.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-2">
                    <div className="text-sm truncate" title={row.filename}>
                      {row.filename}
                    </div>

                    <div className="flex gap-2">
                      <button type="button" className="oa-btn-lite" onClick={() => viewCitatorio(row)}>
                        <span className="material-symbols-outlined oa-btn-lite-ico">visibility</span>
                        Ver
                      </button>
                      <button
                        type="button"
                        className="oa-btn-lite oa-btn-lite-danger"
                        onClick={() => deleteCitatorio(row.id)}
                      >
                        <span className="material-symbols-outlined oa-btn-lite-ico">delete</span>
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}