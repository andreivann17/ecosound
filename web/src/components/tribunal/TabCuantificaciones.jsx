import React, { useEffect, useMemo } from "react";
import "./TabCuantificaciones.css";
import { actionTribunalDocumentosGetById } from "../../redux/actions/tribunal/tribunal";
import { useDispatch } from "react-redux";

const safeObj = (v) => (v && typeof v === "object" ? v : {});
const safeArr = (v) => (Array.isArray(v) ? v : []);

const money = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return `$ ${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtShort = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString("es-ES", { day: "2-digit" });
  const mon = d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  const yr = d.toLocaleDateString("es-ES", { year: "numeric" });
  return `${day} ${mon} ${yr}`.replace(" de ", " ");
};

const iconByKey = (key) => {
  const k = String(key || "");
  if (k.includes("indemn")) return { icon: "gavel", box: "lq-icon lq-icon--orange" };
  if (k.includes("aguinaldo")) return { icon: "event_available", box: "lq-icon lq-icon--blue" };
  if (k.includes("vacacion")) return { icon: "beach_access", box: "lq-icon lq-icon--purple" };
  if (k.includes("prima_vac")) return { icon: "star", box: "lq-icon lq-icon--teal" };
  if (k.includes("prima_ant")) return { icon: "timer", box: "lq-icon lq-icon--gray" };
  if (k.includes("salarios")) return { icon: "work_history", box: "lq-icon lq-icon--indigo" };
  return { icon: "payments", box: "lq-icon lq-icon--gray" };
};

const labelByKey = (key) => {
  switch (key) {
    case "indemnizacion_const":
      return { title: "Indemnización Constitucional", sub: "3 meses de salario" };
    case "aguinaldo":
      return { title: "Aguinaldo", sub: "Proporcional" };
    case "vacaciones":
      return { title: "Vacaciones", sub: "Periodo aplicable" };
    case "prima_vacacional":
      return { title: "Prima Vacacional", sub: "25% sobre vacaciones" };
    case "prima_antiguedad":
      return { title: "Prima de Antigüedad", sub: "12 días por año" };
    case "salarios_caidos":
      return { title: "Salarios Caídos", sub: "Máximo 12 meses" };
    default:
      return { title: String(key || "Concepto"), sub: "" };
  }
};

const diffPill = (diff) => {
  const n = Number(diff);
  if (Number.isNaN(n)) return { cls: "lq-pill lq-pill--muted", txt: "—" };
  if (n === 0) return { cls: "lq-pill lq-pill--ok", txt: money(0) };
  if (n > 0) return { cls: "lq-pill lq-pill--bad", txt: `+${money(n).replace("$ ", "$ ")}` };
  return { cls: "lq-pill lq-pill--ok", txt: money(n) };
};

export default function TabCuantificaciones({
  detalle = null,
  expedienteId,
  conceptos = null,
  onExportar = () => {},
  onNuevoConcepto = () => {},
  onEditarConcepto = () => {},
}) {
  const d = safeObj(detalle);
  const dispatch = useDispatch();
  useEffect(() => {
    if (expedienteId) {
      dispatch(actionTribunalDocumentosGetById(expedienteId));
    }
  }, [dispatch, expedienteId]);
  // Si en el futuro guardas cuantificaciones en backend, léelas aquí:
  // d.cuantificaciones = { updated_at, sdi, items:[{key,title,subtitle,actor,patron}] }
  const cuant = safeObj(d?.cuantificaciones);

  // Prestaciones true en JSON (acciones_prestaciones.prestaciones)
  const prestaciones = safeObj(d?.acciones_prestaciones?.prestaciones);
  const prestacionesKeys = Object.keys(prestaciones).filter((k) => prestaciones[k] === true);

  const computedConceptos = useMemo(() => {
    // 1) Si te pasan "conceptos" por props, úsalo.
    if (Array.isArray(conceptos) && conceptos.length) {
      return conceptos.map((it, idx) => ({
        id: it.id ?? `${it.key ?? "c"}_${idx}`,
        key: it.key ?? it.concepto ?? `concepto_${idx}`,
        title: it.title ?? it.nombre ?? labelByKey(it.key).title,
        subtitle: it.subtitle ?? it.descripcion ?? labelByKey(it.key).sub,
        actor: it.actor ?? it.monto_actor ?? 0,
        patron: it.patron ?? it.monto_patron ?? 0,
      }));
    }

    // 2) Si backend ya envía items.
    const items = safeArr(cuant?.items);
    if (items.length) {
      return items.map((it, idx) => ({
        id: it.id ?? `${it.key ?? "c"}_${idx}`,
        key: it.key ?? it.concepto ?? `concepto_${idx}`,
        title: it.title ?? it.nombre ?? labelByKey(it.key).title,
        subtitle: it.subtitle ?? it.descripcion ?? labelByKey(it.key).sub,
        actor: it.actor ?? it.monto_actor ?? 0,
        patron: it.patron ?? it.monto_patron ?? 0,
      }));
    }

    // 3) Fallback: crea filas SOLO con las prestaciones true del JSON (montos 0 hasta que captures).
    if (prestacionesKeys.length) {
      return prestacionesKeys.map((k, idx) => {
        const m = labelByKey(k);
        return {
          id: `${k}_${idx}`,
          key: k,
          title: m.title,
          subtitle: m.sub,
          actor: 0,
          patron: 0,
        };
      });
    }

    return [];
  }, [conceptos, cuant, prestacionesKeys]);

  const totals = useMemo(() => {
    const totalActor = computedConceptos.reduce((acc, it) => acc + Number(it.actor || 0), 0);
    const totalPatron = computedConceptos.reduce((acc, it) => acc + Number(it.patron || 0), 0);
    const diff = totalActor - totalPatron;
    return { totalActor, totalPatron, diff };
  }, [computedConceptos]);

  const pct = useMemo(() => {
    if (!totals.totalActor) return null;
    const v = Math.max(0, Math.min(100, (totals.totalPatron / totals.totalActor) * 100));
    return v;
  }, [totals]);

  const updatedAt = cuant?.updated_at || d?.updated_at || d?.created_at || null;
  const sdi = cuant?.sdi || d?.condiciones_trabajo?.salario_diario_integrado || null;

  return (
    <div className="lq-wrap">
      {/* TOP CARDS */}
      <div className="lq-stats">
        <div className="lq-stat">
          <div className="lq-stat-bg" />
          <div className="lq-stat-h">TOTAL CONTINGENCIA ESTIMADA</div>
          <div className="lq-stat-money">
            <span className="lq-stat-amt">{money(totals.totalPatron)}</span>
            <span className="lq-stat-cur">MXN</span>
          </div>
          <div className="lq-stat-chip">
            <span className="material-symbols-outlined lq-chip-ic">trending_down</span>
            <span>{totals.totalActor ? `${Math.round(((totals.totalPatron - totals.totalActor) / totals.totalActor) * 100)}% vs Reclamo inicial` : "—"}</span>
          </div>
        </div>

        <div className="lq-stat">
          <div className="lq-stat-h">TOTAL RECLAMADO (ACTOR)</div>
          <div className="lq-stat-money">
            <span className="lq-stat-amt lq-red">{money(totals.totalActor)}</span>
            <span className="lq-stat-cur">MXN</span>
          </div>
          <div className="lq-bar">
            <div className="lq-barfill" style={{ width: "100%" }} />
          </div>
        </div>

        <div className="lq-stat">
          <div className="lq-stat-h">DIFERENCIA / RIESGO</div>
          <div className="lq-stat-money">
            <span className="lq-stat-amt lq-orange">{money(totals.diff)}</span>
            <span className="lq-stat-cur">MXN</span>
          </div>
          <div className="lq-stat-note">
            Discrepancia calculada entre pretensiones del actor y cálculo patronal.
          </div>
        </div>
      </div>

      {/* TABLE CARD */}
      <div className="lq-card">
        <div className="lq-card-head">
          <div>
            <div className="lq-card-title">
              <span className="material-symbols-outlined lq-title-ic">table_view</span>
              Desglose de Conceptos
            </div>
            <div className="lq-card-sub">
              Comparativa detallada de prestaciones reclamadas vs cálculo interno.
            </div>
          </div>

          <div className="lq-actions">
            <button className="lq-btn lq-btn--ghost" type="button" onClick={onExportar}>
              <span className="material-symbols-outlined">download</span>
              Exportar Excel
            </button>
            <button className="lq-btn lq-btn--primary" type="button" onClick={onNuevoConcepto}>
              <span className="material-symbols-outlined">add</span>
              Nuevo Concepto
            </button>
          </div>
        </div>

        <div className="lq-table-wrap">
          <table className="lq-table">
            <thead>
              <tr>
                <th>CONCEPTO</th>
                <th className="tr">MONTO RECLAMADO (ACTOR)</th>
                <th className="tr">MONTO CALCULADO (PATRÓN)</th>
                <th className="tr">DIFERENCIA / RIESGO</th>
                <th className="tc">ACCIONES</th>
              </tr>
            </thead>

            <tbody>
              {computedConceptos.length ? (
                computedConceptos.map((it) => {
                  const diff = Number(it.actor || 0) - Number(it.patron || 0);
                  const pill = diffPill(diff);
                  const ic = iconByKey(it.key);

                  return (
                    <tr key={it.id}>
                      <td>
                        <div className="lq-concept">
                          <div className={ic.box}>
                            <span className="material-symbols-outlined">{ic.icon}</span>
                          </div>
                          <div>
                            <div className="lq-concept-title">{it.title}</div>
                            <div className="lq-concept-sub">{it.subtitle || "—"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="tr">{money(it.actor)}</td>
                      <td className="tr lq-blue">{money(it.patron)}</td>

                      <td className="tr">
                        <span className={pill.cls}>{pill.txt}</span>
                      </td>

                      <td className="tc">
                        <button
                          className="lq-edit"
                          type="button"
                          onClick={() => onEditarConcepto(it)}
                          aria-label="editar"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="lq-empty">
                    No hay conceptos capturados para cuantificación.
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr>
                <td className="tr">TOTALES</td>
                <td className="tr lq-red">{money(totals.totalActor)}</td>
                <td className="tr lq-blue">{money(totals.totalPatron)}</td>
                <td className="tr lq-orange">{money(totals.diff)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="lq-card-foot">
          <div className="lq-foot">
            <span className="material-symbols-outlined">info</span>
            <span>
              Cálculo actualizado al: {fmtShort(updatedAt)}.{" "}
              {sdi ? `Basado en salario diario integrado de ${money(sdi)} MXN.` : ""}
            </span>
          </div>

        
        </div>
      </div>
    </div>
  );
}
