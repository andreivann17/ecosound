import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./TabBitacora.css";
import { PATH } from "../../redux/utils";
import { actionTribunalDocumentosGetById } from "../../redux/actions/tribunal/tribunal";

const safeObj = (v) => (v && typeof v === "object" ? v : {});
const safeArr = (v) => (Array.isArray(v) ? v : []);

const pad2 = (n) => String(n).padStart(2, "0");
const ETAPA_NOMBRE_CANON = {
  1: "Presentación\ndemanda",
  2: "Acuerdos /\nPrevención",
  3: "Admisión",
  4: "Emplazamiento",
  5: "Contestación",
  6: "Reconvención\n(15 días)",
  7: "Réplica\n(8 días)",
  8: "Contrarréplica\n(5 días)",
  9: "Integración\nde la litis",
  10: "Audiencia Preliminar",
  11: "Audiencia\nde juicio",
  12: "Sentencia / Laudo",
  13: "Amparo\ndirecto",
  14: "Ejecución",
};

const CANON_FASE_GRUPO = (num) => (num >= 10 ? "FASE ORAL" : "FASE ESCRITA");
const fmtFechaShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = pad2(d.getDate());
  const mon = d.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
  const yy = d.getFullYear();
  return `${dd} ${mon} ${yy}`;
};

const fmtHora = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Hace ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  return `Hace ${diffDay} d`;
};

const normalizeDoc = (o = {}, idx = 0) => {
  const x = safeObj(o);

  const id =
    x?.id_tribunal_documento ||
    x?.id_documento ||
    x?.id ||
    x?.documento_id ||
    `${idx}`;

const filename =
  x?.filename ||
  x?.archivo_nombre ||
  x?.nombre_archivo ||
  x?.file_name ||
  x?.name ||
  x?.path ||              // ✅ aquí viene "1772336647278.pdf"
  "documento.pdf";

  const url =
    x?.url ||
    x?.documento_url ||
    x?.file_url ||
    x?.ruta ||
    x?.path ||
    "";

  const size =
    x?.size ||
    x?.archivo_size ||
    x?.file_size ||
    x?.peso ||
    "";

  const createdAt =
    x?.created_at ||
    x?.fecha ||
    x?.datetime ||
    x?.createdAt ||
    x?.ts ||
    null;

const etapaNumero =
  x?.num_etapa ||
  x?.id_tribunal_etapa ||   // ✅ aquí viene el link real del doc
  x?.etapaNumero ||
  x?.etapa ||
  x?.etapa_numero ||
  null;

  const etapaNombre =
    x?.etapa_nombre ||
    x?.nombre_etapa ||
    x?.etapaNombre ||
    "";

  const estado =
    x?.estado ||
    x?.status ||
    x?.situacion ||
    "";

  return {
    id: String(id),
    filename,
    url,
    size,
    createdAt,
    etapaNumero: etapaNumero != null ? Number(etapaNumero) : null,
    etapaNombre,
    estado,
    raw: x,
  };
};

const normalizeFase = (o = {}, fallbackNum = 0) => {
  const x = safeObj(o);

  const num =
    x?.num_etapa ??
    x?.num ??
    x?.etapa ??
    x?.numero ??
    fallbackNum;

  const nombre =
  ETAPA_NOMBRE_CANON[Number(num)] ||
  x?.nombre ||
  x?.etapa_nombre ||
  x?.titulo ||
  x?.title ||
  `Etapa ${num}`;

  const descripcion =
    x?.descripcion ||
    x?.detalle ||
    x?.subtitle ||
    x?.subtitulo ||
    "";

  const fecha =
    x?.fecha ||
    x?.created_at ||
    x?.updated_at ||
    x?.datetime ||
    null;

  const statusRaw =
    x?.status ||
    x?.estado ||
    x?.situacion ||
    "";

  const status = String(statusRaw || "").toUpperCase().trim(); // COMPLETADO | EN PROCESO | PENDIENTE

const faseGrupo =
  x?.fase ||
  x?.grupo ||
  x?.categoria ||
  x?.phase ||
  CANON_FASE_GRUPO(Number(num));
  const doc =
    x?.documento ||
    x?.doc ||
    x?.archivo ||
    null;

  return {
    num: Number(num),
    nombre: String(nombre || ""),
    descripcion: String(descripcion || ""),
    fecha,
    status,
    faseGrupo: String(faseGrupo || ""),
    documento: doc ? normalizeDoc(doc, 0) : null,
    raw: x,
  };
};

// fallback fijo (1..14) si tu backend no manda fases aún
const defaultFases = [
  { num: 1,  faseGrupo: "FASE ESCRITA", nombre: "Presentación\ndemanda", descripcion: "Registro inicial en oficialía de partes." },
  { num: 2,  faseGrupo: "FASE ESCRITA", nombre: "Acuerdos /\nPrevención", descripcion: "Acuerdos y prevenciones del Tribunal." },
  { num: 3,  faseGrupo: "FASE ESCRITA", nombre: "Admisión", descripcion: "Admisión de la demanda." },
  { num: 4,  faseGrupo: "FASE ESCRITA", nombre: "Emplazamiento", descripcion: "Notificación y emplazamiento al demandado." },
  { num: 5,  faseGrupo: "FASE ESCRITA", nombre: "Contestación", descripcion: "Contestación del demandado a la demanda." },
  { num: 6,  faseGrupo: "FASE ESCRITA", nombre: "Reconvención\n(15 días)", descripcion: "Reconvención, si aplica." },
  { num: 7,  faseGrupo: "FASE ESCRITA", nombre: "Réplica\n(8 días)", descripcion: "Réplica del actor." },
  { num: 8,  faseGrupo: "FASE ESCRITA", nombre: "Contrarréplica\n(5 días)", descripcion: "Contrarréplica del demandado." },
  { num: 9,  faseGrupo: "FASE ESCRITA", nombre: "Integración\nde la litis", descripcion: "Integración de la litis." },

  { num: 10, faseGrupo: "FASE ORAL", nombre: "Audiencia Preliminar", descripcion: "Audiencia preliminar." },
  { num: 11, faseGrupo: "FASE ORAL", nombre: "Audiencia\nde juicio", descripcion: "Audiencia de juicio." },
  { num: 12, faseGrupo: "FASE ORAL", nombre: "Sentencia / Laudo", descripcion: "Sentencia o laudo." },
  { num: 13, faseGrupo: "FASE ORAL", nombre: "Amparo\ndirecto", descripcion: "Impugnación mediante amparo directo." },
  { num: 14, faseGrupo: "FASE ORAL", nombre: "Ejecución", descripcion: "Etapa de ejecución." },
];

const extractFases = (detalle) => {
  const d = safeObj(detalle);

  const candidates = [
    d?.fases,
    d?.etapas,
    d?.etapas_procesales,
    d?.timeline_fases,
    d?.historial_fases,
    d?.etapa_procesal?.fases,
  ];

  const arr = candidates.find((x) => Array.isArray(x));
  const fases = safeArr(arr).map((x, i) => normalizeFase(x, i + 1));

  if (fases.length) {
    fases.sort((a, b) => (a.num || 0) - (b.num || 0));
    return fases;
  }

  return defaultFases.map((x) => normalizeFase(x, x.num));
};

const extractDocs = (detalle) => {
  const d = safeObj(detalle);

  const docsArr =
    d?.items ||
    d?.documentos ||
    d?.docs ||
    d?.documentos_etapas ||
    d?.etapas_documentos ||
    d?.etapa_procesal?.documentos ||
    d?.pruebas_documentacion?.documentos ||
    [];

  const etapasArr = d?.etapas || [];

  // map: id_tribunal_etapa -> num_etapa
  const etapaIdToNum = new Map();
  safeArr(etapasArr).forEach((e) => {
    const idEt = Number(e?.id_tribunal_etapa);
    const num = Number(e?.num_etapa);
    if (Number.isFinite(idEt) && Number.isFinite(num)) etapaIdToNum.set(idEt, num);
  });

  // normaliza docs y convierte etapaNumero a num_etapa
  const docs = safeArr(docsArr).map((x, i) => {
    const nd = normalizeDoc(x, i);

    // el doc trae id_tribunal_etapa, necesitamos num_etapa
    const idEtapa = Number(nd?.etapaNumero);

// 1) intento por mapa (id real -> num_etapa)
let numEtapa = etapaIdToNum.get(idEtapa);

// 2) fallback: si backend manda num_etapa en id_tribunal_etapa (1..14), úsalo directo
if (!Number.isFinite(numEtapa) && Number.isFinite(idEtapa) && idEtapa >= 1 && idEtapa <= 14) {
  numEtapa = idEtapa;
}

return {
  ...nd,
  etapaNumero: Number.isFinite(numEtapa) ? numEtapa : null,
  etapaId: Number.isFinite(idEtapa) ? idEtapa : null,
};
  });

  return docs;
};
const pickBadge = (fase) => {
  const s = String(fase?.faseGrupo || fase?.status || "").toUpperCase();
  if (s.includes("COMPLET")) return { label: "Completado", cls: "tb2-status tb2-status--done" };
  if (s.includes("PROCESO")) return { label: "En proceso", cls: "tb2-status tb2-status--progress" };
  if (s.includes("PEND")) return { label: "Pendiente", cls: "tb2-status tb2-status--pending" };
  if (s.includes("ESCRITA")) return { label: "Fase escrita", cls: "tb2-status tb2-status--soft" };
  if (s.includes("ORAL")) return { label: "Fase oral", cls: "tb2-status tb2-status--soft" };
  if (s.includes("RESOL")) return { label: "Resolución", cls: "tb2-status tb2-status--soft" };
  if (s.includes("IMPUG")) return { label: "Impugnación", cls: "tb2-status tb2-status--soft" };
  if (s.includes("EJEC")) return { label: "Ejecución", cls: "tb2-status tb2-status--soft" };
  return { label: s ? s.toLowerCase() : "Etapa", cls: "tb2-status tb2-status--soft" };
};

export default function TabBitacora({ detalle, onVerDocumento,expedienteId }) {
  const [q, setQ] = useState("");
  const dispatch = useDispatch();
  const [selectedEtapa, setSelectedEtapa] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);

  // ✅ AQUI ESTÁ TODO (items + etapas)
  const documentosResp = useSelector((s) => s.tribunal?.documentos);

  // ✅ fuente real: redux (si no hay, cae a detalle)
  const source = documentosResp && typeof documentosResp === "object" ? documentosResp : detalle;

  const fases = useMemo(() => extractFases(source), [source]);
  const docs = useMemo(() => extractDocs(source), [source]);

  // si alguna fase trae documento embebido, lo “mezclamos” como opción
  const faseDocs = useMemo(() => {
    const out = [];
    fases.forEach((f) => {
      if (f?.documento?.url || f?.documento?.filename) {
        out.push({
          ...f.documento,
          etapaNumero: f.num,
          etapaNombre: f.nombre,
        });
      }
    });
    return out;
  }, [fases]);

  const allDocs = useMemo(() => {
    const map = new Map();
    [...docs, ...faseDocs].forEach((d) => {
      if (!d) return;
      const key = d.id || d.url || d.filename;
      if (!key) return;
      if (!map.has(key)) map.set(key, d);
    });
    return Array.from(map.values());
  }, [docs, faseDocs]);

  const filteredFases = useMemo(() => {
    const qq = String(q || "").toLowerCase().trim();
    if (!qq) return fases;
    return fases.filter((f) => {
      const hay = [
        `0${f.num}`.slice(-2),
        f.nombre,
        f.descripcion,
        fmtFechaShort(f.fecha),
        fmtHora(f.fecha),
        f.faseGrupo,
        f.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(qq);
    });
  }, [fases, q]);

  useEffect(() => {
    if (expedienteId) {
      dispatch(actionTribunalDocumentosGetById(expedienteId));
    }
  }, [dispatch, expedienteId]);
const selectedDoc = useMemo(() => {
  if (!selectedDocId) return null;

  return (
    allDocs.find(
      (d) =>
        String(d.id) === String(selectedDocId) &&
        Number(d.etapaNumero) === Number(selectedEtapa)
    ) || null
  );
}, [allDocs, selectedDocId, selectedEtapa]);

  // init: seleccionar etapa/doc (si hay)
  useEffect(() => {
    if (!fases.length) return;

    if (selectedEtapa == null) {
      // si hay alguna en proceso -> esa
      const inProc = fases.find((f) => String(f.faseGrupo || f.status || "").toUpperCase().includes("PROCESO"));
      setSelectedEtapa(inProc?.num ?? fases[0].num);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fases]);

useEffect(() => {
  if (selectedEtapa == null) return;

  const docsDeEtapa = allDocs
    .filter((d) => d?.etapaNumero != null && Number(d.etapaNumero) === Number(selectedEtapa))
    .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));

  if (docsDeEtapa.length) {
    setSelectedDocId(String(docsDeEtapa[0].id));
    return;
  }

  setSelectedDocId(null);
}, [selectedEtapa, allDocs]);

  const fileMeta = useMemo(() => {
    if (!selectedDoc) return null;
    const when = selectedDoc.createdAt;
    const whenText = when ? `Subido ${timeAgo(when)} a las ${fmtHora(when)}` : "";
    return {
      filename: selectedDoc.filename || "Documento",
      size: selectedDoc.size || "",
      whenText: whenText || "",
    url: (() => {
  const u = String(selectedDoc.url || "");
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return `${PATH}${u}`;   // ✅ aquí se concatena correctamente
})(),
    };
  }, [selectedDoc]);
const onClickFase = (f) => {
  setSelectedEtapa(f.num);

  const docDeEtapa = allDocs
    .filter((d) => d?.etapaNumero != null && Number(d.etapaNumero) === Number(f.num))
    .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0];

  if (docDeEtapa?.id) {
    setSelectedDocId(String(docDeEtapa.id));
    return;
  }

  setSelectedDocId(null);
};


  const onFullScreen = () => {
    const el = document.getElementById("tb2-viewer");
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    el.requestFullscreen?.();
  };

  const onDownload = () => {
    if (!fileMeta?.url) return;
    window.open(fileMeta.url, "_blank", "noopener,noreferrer");
  };

  const onPrint = () => {
    if (!fileMeta?.url) return;
    window.open(fileMeta.url, "_blank", "noopener,noreferrer");
  };
const docsDeEtapa = useMemo(() => {
  if (selectedEtapa == null) return [];
  return allDocs
    .filter((d) => d?.etapaNumero != null && Number(d.etapaNumero) === Number(selectedEtapa))
    .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
}, [allDocs, selectedEtapa]);
  return (
    <div className="tb2-root">
      {/* left */}
      <div className="tb2-left">
        <div className="tb2-left-head">
          <div className="tb2-left-title">
            <span className="material-symbols-outlined tb2-ico">segment</span>
            Fases del juicio
          </div>

          <div className="tb2-search">
            <span className="material-symbols-outlined tb2-search-ico">search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="tb2-search-input"
              placeholder="Buscar etapa o fecha..."
              type="text"
            />
          </div>
        </div>

        <div className="tb2-left-body tb2-scroll">
          {filteredFases.map((f) => {
            const isActive = Number(selectedEtapa) === Number(f.num);
            const badge = pickBadge(f);
            const fecha = f.raw?.fecha_notificacion_demanda
            ? fmtFechaShort(f.raw.fecha_notificacion_demanda)
            : "--/--/----";
            const hora =  "";

            return (
              <button
                key={f.num}
                type="button"
                className={`tb2-fase ${isActive ? "tb2-fase--active" : ""}`}
                onClick={() => onClickFase(f)}
              >
                <div className="tb2-fase-top">
                  <span className={badge.cls}>{badge.label}</span>
                  <span className="tb2-fase-date">
                    {fecha} {hora ? ` ${hora}` : ""}
                  </span>
                </div>

                <div className={`tb2-fase-name ${isActive ? "tb2-fase-name--active" : ""}`}>
                  {pad2(f.num)}. {f.nombre}
                </div>

                {f.descripcion ? <div className="tb2-fase-desc">{f.descripcion}</div> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* right */}
      <div className="tb2-right" id="tb2-viewer">
  {/* HEADER */}
  <div className="tb2-right-head">
    <div className="tb2-headLeft">
      <div className="tb2-docTitle">{fileMeta?.filename || "—"}</div>
      <div className="tb2-docSub">
        {(fileMeta?.size ? `${fileMeta.size} • ` : "") + (fileMeta?.whenText || "")}
      </div>
    </div>

    <div className="tb2-actions">
      <button type="button" className="tb2-iconbtn" title="Imprimir" onClick={onPrint} disabled={!fileMeta?.url}>
        <span className="material-symbols-outlined">print</span>
      </button>

      <button type="button" className="tb2-iconbtn" title="Descargar" onClick={onDownload} disabled={!fileMeta?.url}>
        <span className="material-symbols-outlined">download</span>
      </button>

      <div className="tb2-sep" />

      <button type="button" className="tb2-fullbtn" onClick={onFullScreen} disabled={!fileMeta?.url}>
        <span className="material-symbols-outlined">open_in_full</span>
        Pantalla completa
      </button>

      {onVerDocumento && selectedDoc ? (
        <button
          type="button"
          className="tb2-viewbtn"
          onClick={() => onVerDocumento(selectedDoc)}
          disabled={!selectedDoc?.url}
        >
          Ver Documento
        </button>
      ) : null}
    </div>
  </div>

  {/* STRIP THUMBNAILS (altura fija) */}
  <div className="tb2-stripBar">
    <button
      type="button"
      className="tb2-stripNav"
      onClick={() => {
        const el = document.getElementById("tb2-strip");
        if (el) el.scrollLeft -= 240;
      }}
      aria-label="Anterior"
      disabled={docsDeEtapa.length <= 1}
    >
      <span className="material-symbols-outlined">chevron_left</span>
    </button>

    <div className="tb2-strip" id="tb2-strip">
      {docsDeEtapa.map((d) => {
        const active = String(d.id) === String(selectedDocId);
        return (
          <button
            key={d.id}
            type="button"
            className={`tb2-docCard ${active ? "tb2-docCard--active" : ""}`}
            onClick={() => setSelectedDocId(String(d.id))}
          >
            <div className="tb2-docIcon">
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </div>
            <div className="tb2-docCardText">{d.filename || d.path || "Documento"}</div>
          </button>
        );
      })}
    </div>

    <button
      type="button"
      className="tb2-stripNav"
      onClick={() => {
        const el = document.getElementById("tb2-strip");
        if (el) el.scrollLeft += 240;
      }}
      aria-label="Siguiente"
      disabled={docsDeEtapa.length <= 1}
    >
      <span className="material-symbols-outlined">chevron_right</span>
    </button>
  </div>

  {/* VIEWER (ocupa el resto, sin encimarse) */}
  <div className="tb2-viewerArea">
    {fileMeta?.url ? (
      <iframe title={fileMeta.filename || "Documento"} src={fileMeta.url} className="tb2-iframe" frameBorder="0" />
    ) : (
      <div className="tb2-empty">
        <div className="tb2-empty-title">Sin documento</div>
        <div className="tb2-empty-sub">Selecciona un documento de la etapa.</div>
      </div>
    )}
  </div>
</div>
    </div>
  );
}