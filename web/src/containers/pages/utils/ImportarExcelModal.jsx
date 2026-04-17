// src/components/ImportarExcelModal/ImportarExcelModal.jsx
//
// Uso en LaboralProcedimientoPage:
//
//   import ImportarExcelModal from "../../components/ImportarExcelModal/ImportarExcelModal";
//
//   <ImportarExcelModal
//     open={importModalOpen}
//     onClose={() => setImportModalOpen(false)}
//     onSuccess={() => dispatch(actionConciliacionGet(filtrosBusqueda))}
//     context={{
//       estado:           selectedEstadoId !== ALL ? selectedEstadoId : undefined,
//       ciudad:           selectedCiudadId !== ALL ? selectedCiudadId : undefined,
//       autoridad:        selectedAutoridadId !== ALL ? selectedAutoridadId : undefined,
//       tipo_conciliacion: tipoConfig.key,
//     }}
//   />
//
// Y en LaboralProcedimientoPage agrega el botón:
//
//   const [importModalOpen, setImportModalOpen] = useState(false);
//
//   <Button
//     icon={<UploadOutlined />}
//     onClick={() => setImportModalOpen(true)}
//     className="laboral-btn-import"
//   >
//     Importar Excel
//   </Button>

import React, { useState, useCallback, useRef } from "react";
import { Modal, Button, notification, Progress } from "antd";
import axios from "axios";
import { PATH } from "../../../redux/utils";
const API_BASE = `${PATH}`;
/* ─── helpers de auth (mismo patrón que la página) ─── */
const authHeader = () => {
  const token =
    localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const apiServicePost = axios.create({
  baseURL: API_BASE,
});

/* ─── constantes ─── */
const ACCEPTED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",                                           // .xls
  "text/csv",                                                            // .csv
];
const ACCEPTED_EXT = [".xlsx", ".xls", ".csv"];
const MAX_MB = 20;

/* ═══════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════ */
export default function ImportarExcelModal({ open, onClose, onSuccess, context = {}, endpoint = "tribunal/importar-excel", title = "Importar expedientes desde Excel" }) {
  /* estado interno */
  const [file, setFile]           = useState(null);          // File object
  const [dragging, setDragging]   = useState(false);
  const [phase, setPhase]         = useState("idle");        // idle | uploading | success | error
  const [progress, setProgress]   = useState(0);
  const [errorMsg, setErrorMsg]   = useState("");
  const [result, setResult]       = useState(null);          // respuesta backend
  const fileInputRef              = useRef(null);

  /* ── reset completo ── */
  const reset = useCallback(() => {
    setFile(null);
    setDragging(false);
    setPhase("idle");
    setProgress(0);
    setErrorMsg("");
    setResult(null);
  }, []);

  const handleClose = () => {
    if (phase === "uploading") return;
    reset();
    onClose();
  };

  /* ── validación del archivo ── */
  const validate = (f) => {
    if (!f) return "No se seleccionó ningún archivo.";
    const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
    const typeOk = ACCEPTED_TYPES.includes(f.type) || ACCEPTED_EXT.includes(ext);
    if (!typeOk) return `Formato no válido. Solo se aceptan: ${ACCEPTED_EXT.join(", ")}`;
    if (f.size > MAX_MB * 1024 * 1024)
      return `El archivo supera el límite de ${MAX_MB} MB.`;
    return null;
  };

  const pickFile = (f) => {
    const err = validate(f);
    if (err) {
      notification.error({ message: "Archivo inválido", description: err });
      return;
    }
    setFile(f);
    setPhase("idle");
    setErrorMsg("");
    setResult(null);
  };

  /* ── drag & drop ── */
  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  /* ── input file nativo ── */
  const onInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
    e.target.value = "";          // permite re-seleccionar el mismo archivo
  };

  /* ── envío al backend ── */
  const handleUpload = async () => {
    if (!file || phase === "uploading") return;

    setPhase("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      /* contexto extra para el backend */
      Object.entries(context).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, v);
      });

      const { data } = await apiServicePost.post(
        endpoint,
        formData,
        {
          headers: {
            ...authHeader(),
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (evt) => {
            const pct = evt.total
              ? Math.round((evt.loaded * 100) / evt.total)
              : 40;
            setProgress(pct);
          },
        }
      );

      setProgress(100);
      setResult(data);
      setPhase("success");

      if (data?.errores > 0) {
        notification.error({
          message: "Hubo un error en el archivo",
          description: "Revisa el archivo e intenta de nuevo.",
        });
      } else {
        notification.success({
          message: "Importación exitosa",
          description: `Se procesaron ${data?.total ?? data?.insertados ?? "los"} registros correctamente.`,
        });
        if (typeof onSuccess === "function") onSuccess(data);
      }

    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Error al importar el archivo.";
      setPhase("error");
      setErrorMsg(msg);
      notification.error({ message: "Error en importación", description: msg });
    }
  };

  /* ────────────────────────────────────────────
     Render helpers
     ──────────────────────────────────────────── */
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const ext = file ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  const iconColor = ext === ".csv" ? "#0369a1" : "#16a34a";

  /* ── zona drop ── */
  const DropZone = () => (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "#16a34a" : "#d1d5db"}`,
        borderRadius: 12,
        padding: "40px 24px",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "#f0fdf4" : "#fafafa",
        transition: "all 0.2s ease",
        userSelect: "none",
      }}
    >
      {/* icono Excel SVG */}
      <div style={{ marginBottom: 14 }}>
        <ExcelIcon size={52} color={dragging ? "#16a34a" : "#6b7280"} />
      </div>

      <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "#111827" }}>
        Arrastra tu archivo aquí
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>
        o haz clic para seleccionarlo
      </p>
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af" }}>
        Formatos aceptados: <b>.xlsx</b>, <b>.xls</b>, <b>.csv</b> — máx. {MAX_MB} MB
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXT.join(",")}
        onChange={onInputChange}
        style={{ display: "none" }}
      />
    </div>
  );

  /* ── tarjeta del archivo seleccionado ── */
  const FileCard = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        border: "1.5px solid #e5e7eb",
        borderRadius: 10,
        background: "#fff",
      }}
    >
      <ExcelIcon size={36} color={iconColor} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {file.name}
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
          {formatBytes(file.size)}
        </div>
      </div>

      {phase !== "uploading" && phase !== "success" && (
        <button
          onClick={(e) => { e.stopPropagation(); reset(); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
            fontSize: 18,
            lineHeight: 1,
            padding: 4,
            borderRadius: 6,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
          title="Quitar archivo"
        >
          ✕
        </button>
      )}
    </div>
  );

  /* ── barra de progreso ── */
  const UploadingState = () => (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
          Subiendo archivo…
        </span>
        <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>
          {progress}%
        </span>
      </div>
      <Progress
        percent={progress}
        showInfo={false}
        strokeColor={{ "0%": "#16a34a", "100%": "#4ade80" }}
        trailColor="#e5e7eb"
        strokeWidth={8}
        style={{ borderRadius: 8 }}
      />
    </div>
  );

  /* ── estado éxito ── */
  const hayErrores = result && result.errores > 0;
  const SuccessState = () => (
    <div
      style={{
        marginTop: 20,
        padding: "18px 20px",
        borderRadius: 10,
        background: hayErrores ? "#fef2f2" : "#f0fdf4",
        border: `1.5px solid ${hayErrores ? "#fecaca" : "#bbf7d0"}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {hayErrores
          ? <span style={{ color: "#ef4444", fontSize: 20, lineHeight: 1 }}>⚠</span>
          : <CheckIcon />}
        <span style={{ fontWeight: 700, fontSize: 15, color: hayErrores ? "#991b1b" : "#15803d" }}>
          {hayErrores ? "Hubo un error en el archivo" : "Importación completada"}
        </span>
      </div>

      {result && !hayErrores && (
        <div style={{ fontSize: 13, color: "#166534", paddingLeft: 30 }}>
          {result.total !== undefined && (
            <div>• <b>{result.total}</b> registros procesados</div>
          )}
          {result.insertados !== undefined && (
            <div>• <b>{result.insertados}</b> insertados</div>
          )}
          {result.actualizados !== undefined && (
            <div>• <b>{result.actualizados}</b> actualizados</div>
          )}
        </div>
      )}
    </div>
  );

  /* ── estado error ── */
  const ErrorState = () => (
    <div
      style={{
        marginTop: 16,
        padding: "14px 16px",
        borderRadius: 10,
        background: "#fef2f2",
        border: "1.5px solid #fecaca",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span style={{ color: "#ef4444", fontSize: 18, lineHeight: 1.2 }}>⚠</span>
      <span style={{ fontSize: 13, color: "#991b1b" }}>{errorMsg}</span>
    </div>
  );

  /* ══════════ render principal ══════════ */
  return (
    <Modal
      open={open}
      onCancel={handleClose}
      closable={phase !== "uploading"}
      maskClosable={phase !== "uploading"}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ExcelIcon size={22} color="#16a34a" />
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            {title}
          </span>
        </div>
      }
      width={520}
      centered
      destroyOnClose
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button
            onClick={handleClose}
            disabled={phase === "uploading"}
          >
            {phase === "success" ? "Cerrar" : "Cancelar"}
          </Button>

          {phase !== "success" && (
            <Button
              type="primary"
              onClick={handleUpload}
              loading={phase === "uploading"}
              disabled={!file || phase === "uploading"}
              style={{
                background: "#16a34a",
                borderColor: "#16a34a",
                fontWeight: 600,
                minWidth: 120,
              }}
            >
              {phase === "uploading" ? "Importando…" : "Importar"}
            </Button>
          )}

          {phase === "success" && (
            <Button
              type="primary"
              onClick={reset}
              style={{
                background: "#16a34a",
                borderColor: "#16a34a",
                fontWeight: 600,
              }}
            >
              Importar otro
            </Button>
          )}
        </div>
      }
    >
      <div style={{ padding: "4px 0 8px" }}>

        {/* zona drop: visible salvo en éxito */}
        {phase !== "success" && (
          <>
            {!file ? (
              <DropZone />
            ) : (
              <>
                <FileCard />
                {phase === "uploading" && <UploadingState />}
                {phase === "error"     && <ErrorState />}
              </>
            )}
          </>
        )}

        {/* tarjeta de éxito */}
        {phase === "success" && (
          <>
            <FileCard />
            <SuccessState />
          </>
        )}

       
      </div>
    </Modal>
  );
}

/* ─── Iconos SVG inline (sin dependencias extra) ─── */
function ExcelIcon({ size = 32, color = "#16a34a" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="6" fill={color} fillOpacity="0.1" />
      <path
        d="M18 5H10C8.9 5 8 5.9 8 7V25C8 26.1 8.9 27 10 27H22C23.1 27 24 26.1 24 25V11L18 5Z"
        fill={color}
        fillOpacity="0.15"
      />
      <path d="M18 5V11H24" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M10 5H18L24 11V25C24 26.1 23.1 27 22 27H10C8.9 27 8 26.1 8 25V7C8 5.9 8.9 5 10 5Z"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M13 17L15.5 20.5L18 17" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 20.5H18"            stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M13 14H19"              stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="10" r="10" fill="#16a34a" />
      <path d="M5.5 10.5L8.5 13.5L14.5 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
