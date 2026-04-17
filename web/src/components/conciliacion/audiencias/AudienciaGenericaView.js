// src/components/laboral/AudienciaGenericaView.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Alert,
  Image,
  Upload,
  Form,
  DatePicker,
  Input,
  notification,
} from "antd";
import { EditOutlined, FilePdfOutlined, InboxOutlined } from "@ant-design/icons";

import dayjs from "dayjs";
import { useDispatch } from "react-redux";
import { actionConstanciaCumplimientoCreate } from "../../../redux/actions/conciliacion/conciliacion";
import {
  prestacionesLabels,
  parsePrestaciones,
  formatFormaPago,
  formatTipoPago,
  resolveAbogadoNombre,
} from "./audienciaHelpers";

import {PATH} from "../../../redux/utils"
const API_BASE = `${PATH}/uploads/conciliaciones/`;
const { Title, Text } = Typography;
const toFullUrl = (url,id) => {
  if (!url) return null;
  if (typeof url !== "string") return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${id}/${url}`;
};

const mapStatusToResultado = (idStatus, incomparecencia) => {
  switch (idStatus) {
    case 2:
      return "convenio";
    case 3:
      return "diferimiento";
    case 4:
      return "no_conciliacion";
    case 5:
      return "archivo_solicitante";
    case 6:
      return "archivo_patron";
    default:
      if (incomparecencia) return "incomparecencia";
      return "desconocido";
  }
};

const fmtCurrencyOrDash = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const num = Number(v);
  if (Number.isNaN(num)) return String(v);
  return `${num.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  })} MXN`;
};

function AudienciaGenericaView({ label = "Segunda", data, onEdit, abogadoIndex, header }) {
  const { Dragger } = Upload;
  const [constForm] = Form.useForm();
  const dispatch = useDispatch();

  // fallback seguro para que NO truene antes del return
  const safeData = data || {};
  console.log(header)
  console.log(safeData)

  const expedienteVal = header?.expediente || safeData?.expediente || null;

  const documento = safeData.documento || null;
const documentoPreviews = Array.isArray(documento?.previews)
    ? documento.previews
    : [];
  const constanciaDoc = safeData.documento_constancia || null;
  const constanciaRecibida = safeData.is_constancia_documento == 1 && !!constanciaDoc;

  // Hooks SIEMPRE arriba, sin returns antes
  const [constanciaFileList, setConstanciaFileList] = useState([]);
  const [constanciaUploading, setConstanciaUploading] = useState(false);
  const [constanciaDocState, setConstanciaDocState] = useState(constanciaDoc);

  useEffect(() => {
    setConstanciaDocState(constanciaDoc);
  }, [constanciaDoc]);

  // ahora sí: early return
  if (!data) return null;


  const constanciaPreviews = Array.isArray(constanciaDoc?.previews)
    ? constanciaDoc.previews
    : [];

  const constanciaPreviewUrl =
    constanciaPreviews.length > 0 && constanciaPreviews[0].url
      ? toFullUrl(constanciaPreviews[0].url,header.id)
      : null;

  const hasConstanciaPreview = !!constanciaPreviewUrl;

  const hasDocumentoPreview =
    documentoPreviews.length > 0 && documentoPreviews[0].url;
  const mainDocumentoPreviewUrl = hasDocumentoPreview
    ? toFullUrl(documentoPreviews[0].url,header.id)
    : null;

  // =========================
  // Resultado y textos base
  // =========================
  const resultado =
    data.resultado ||
    mapStatusToResultado(data.id_conciliacion_status, data.incomparecencia);

  const resumenPretensiones =
    data.resumen_pretensiones_html || data.pretension_trabajador || "";

  // =========================
  // Prestaciones reclamadas
  // =========================
  const prestacionesRawPrimary = Array.isArray(data.prestaciones)
    ? data.prestaciones
    : null;

  const prestacionesRawFallback =
    data.prestaciones !== undefined ? data.prestaciones : null;

  let prestacionesTabla = [];

  if (Array.isArray(prestacionesRawPrimary) && prestacionesRawPrimary.length) {
    prestacionesTabla = prestacionesRawPrimary.map((p) => {
      const codigo = p.prestacion || p.codigo || p;
      const monto =
        p.monto !== null && p.monto !== undefined && p.monto !== ""
          ? Number(p.monto)
          : null;
      return {
        codigo,
        label: prestacionesLabels[codigo] || codigo,
        monto,
      };
    });
  } else if (
    Array.isArray(prestacionesRawFallback) &&
    prestacionesRawFallback.length
  ) {
    if (typeof prestacionesRawFallback[0] === "object") {
      prestacionesTabla = prestacionesRawFallback.map((p) => {
        const codigo = p.prestacion || p.codigo || p;
        const monto =
          p.monto !== null && p.monto !== undefined && p.monto !== ""
            ? Number(p.monto)
            : null;
        return {
          codigo,
          label: prestacionesLabels[codigo] || codigo,
          monto,
        };
      });
    } else {
      const codigos = prestacionesRawFallback.map((c) => String(c));
      prestacionesTabla = codigos.map((c) => ({
        codigo: c,
        label: prestacionesLabels[c] || c,
        monto: null,
      }));
    }
  } else if (
    typeof prestacionesRawFallback === "string" &&
    prestacionesRawFallback.trim() !== ""
  ) {
    const codigos = parsePrestaciones(prestacionesRawFallback);
    prestacionesTabla = codigos.map((c) => ({
      codigo: c,
      label: prestacionesLabels[c] || c,
      monto: null,
    }));
  }

  const totalPrestaciones = prestacionesTabla.reduce(
    (acc, p) => acc + (p.monto || 0),
    0
  );

  // =========================
  // Pagos de convenio
  // =========================
  const pagosConvenio = Array.isArray(data.pagos_convenio)
    ? data.pagos_convenio.map((p) => ({
        monto: p.monto,
        forma_pago: p.forma_pago,
        fecha: p.fecha,
        tipo_pago: p.tipo_pago,
      }))
    : [];

  const montoConvenioTotal =
    data.monto_convenio != null && data.monto_convenio !== ""
      ? Number(data.monto_convenio)
      : pagosConvenio.reduce((acc, p) => acc + Number(p.monto || 0), 0);

  const formaPagoConvenio =
    data.forma_pago_convenio != null && data.forma_pago_convenio !== ""
      ? data.forma_pago_convenio
      : pagosConvenio.length
      ? pagosConvenio[0].forma_pago
      : null;

  const riesgosHtml = data.riesgos_detectados || data.riesgos || "";
  const motivoArchivo = data.motivo_archivo || data.motivo_resultado || "";

  const abogadoNombre =
    resolveAbogadoNombre(
      data.id_abogado,
      abogadoIndex,
      data.nombre_abogado
    ) || "—";

  // =========================
  // Flags de visibilidad
  // =========================
  const baseShowObjeto =
    (resumenPretensiones &&
      resumenPretensiones.replace(/<[^>]+>/g, "").trim() !== "") ||
    prestacionesTabla.length > 0;

  const showObjeto =
    baseShowObjeto &&
    resultado !== "convenio" &&
    resultado !== "archivo_solicitante" &&
    resultado !== "archivo_patron" &&
    resultado !== "incomparecencia";

  const hasNegociacionData =
    (data.propuesta_final_trabajador !== null &&
      data.propuesta_final_trabajador !== undefined &&
      data.propuesta_final_trabajador !== "") ||
    (data.propuesta_final_patron !== null &&
      data.propuesta_final_patron !== undefined &&
      data.propuesta_final_patron !== "");

  const showNegociacion =
    hasNegociacionData &&
    resultado !== "convenio" &&
    resultado !== "archivo_solicitante" &&
    resultado !== "archivo_patron" &&
    resultado !== "incomparecencia";

  const showPagosConvenio =
    resultado === "convenio" && pagosConvenio.length > 0;

  const showAudienciaDiferida =
    resultado === "diferimiento" && data.fecha_proxima_audiencia;

  const showMotivoArchivo =
    (resultado === "archivo_solicitante" ||
      resultado === "archivo_patron") &&
    motivoArchivo.trim() !== "";

  // =========================
  // Alert
  // =========================
  let alertType = "info";
  let alertMessage = "Resultado de la audiencia";
  let alertDescription =
    "Resultado registrado para esta audiencia prejudicial.";

  if (resultado === "convenio") {
    alertType = "success";
    alertMessage = "CONVENIO CELEBRADO";
    alertDescription =
      "Se celebró convenio prejudicial en esta audiencia, con monto y forma de pago registrados.";
  } else if (resultado === "no_conciliacion") {
    alertType = "warning";
    alertMessage = "NO HUBO CONVENIO";
    alertDescription =
      "La audiencia concluyó sin convenio; se registró la no conciliación.";
  } else if (resultado === "diferimiento") {
    alertType = "info";
    alertMessage = "AUDIENCIA DIFERIDA / NUEVA FECHA";
    alertDescription =
      "La audiencia se difirió y se programó una nueva fecha para continuar la negociación.";
  } else if (
    resultado === "archivo_solicitante" ||
    resultado === "archivo_patron"
  ) {
    alertType = "warning";
    alertMessage = "ASUNTO ARCHIVADO";
    alertDescription =
      "El expediente fue archivado conforme al resultado registrado en esta audiencia.";
  } else if (resultado === "incomparecencia") {
    alertType = "warning";
    alertMessage = "INCOMPARECENCIA";
    alertDescription =
      "Se levantó constancia de incomparecencia en esta audiencia prejudicial.";
  }
const pickDoc = (doc) => {
  if (!doc) return { fileName: null, openUrl: null };

  const openUrl =
    doc?.path ||
    (Array.isArray(doc?.previews) && doc.previews[0]?.url) ||
    doc?.preview_url ||
    null;

  const fileName =
    doc?.filename ||
    doc?.original_name ||
    doc?.name ||
    (openUrl ? String(openUrl).split("/").pop() : null);

  return { fileName, openUrl };
};
const handleGuardarCumplimientoView = async () => {
  try {
    const v = await constForm.validateFields();

    if (!expedienteVal) {
      notification.error({
        message: "Datos incompletos",
        description: "No se encontró el expediente.",
      });
      return;
    }

    if (!constanciaFileList.length) {
      notification.error({
        message: "Falta archivo",
        description: "Selecciona la constancia antes de guardar.",
      });
      return;
    }

    setConstanciaUploading(true);

    const file = constanciaFileList[0];

    const payload = {
        id:safeData.documento.id_conciliacion,
      id_conciliacion_audiencia:safeData.id,
      expediente: String(expedienteVal).replaceAll("/", "-"), // por si llega con diagonales
      fecha_cumplimiento: v.fecha_cumplimiento
        ? dayjs(v.fecha_cumplimiento).format("YYYY-MM-DD")
        : null,
      estado_cumplimiento: v.estado_cumplimiento || "completo",
      notas_cumplimiento: v.notas_cumplimiento || "",
      file,
    };

    await dispatch(
      actionConstanciaCumplimientoCreate(payload, (resp) => {
        // actualiza UI si backend devuelve algo
        if (resp?.filename || resp?.path || resp?.url) {
          setConstanciaDocState((prev) => ({
            ...(prev || {}),
            filename: resp.filename || prev?.filename,
            path: resp.path || resp.url || resp.file_url || prev?.path,
            previews: resp.preview_url ? [{ url: resp.preview_url }] : (prev?.previews || []),
            created_at: resp.created_at || prev?.created_at,
          }));
        }
      })
    );

    notification.success({
      message: "Guardado",
      description: "Se guardó la constancia y el cumplimiento.",
    });

    constForm.resetFields();
    setConstanciaFileList([]);
    setConstanciaUploading(false);
  } catch (err) {
    notification.error({
      message: "Error",
      description: "No se pudo guardar. Revisa los campos e intenta de nuevo.",
    });
    setConstanciaUploading(false);
  }
};

const openFile = (url,id) => {
  if (!url) return;
  const full = url.startsWith("http") ? url : `${API_BASE}${id}/${url}`;
  window.open(full, "_blank", "noopener,noreferrer");
};

const DocumentOpenBox = ({
  title,
  doc,
  emptyText,
  buttonText,
  variant = "primary", // "primary" | "dark"
  icon = "picture_as_pdf",
  badgeText = null,
  metaLeft = null,
  metaRight = null,
  id,
}) => {
  const { fileName, openUrl } = pickDoc(doc);
  const has = !!openUrl;

  return (
    <div className={`aud-doc-card ${variant === "dark" ? "is-dark" : ""}`}>
      <div className="aud-doc-card__row">
        <div className="aud-doc-card__icon">
          <span className="material-symbols-outlined">{icon}</span>
        </div>

        <div className="aud-doc-card__content">
          <div className="aud-doc-card__head">
            <div className="aud-doc-card__title">{title}</div>

            {badgeText && (
              <span className="aud-doc-card__badge">
                <span className="aud-doc-card__badge-dot" />
                {badgeText}
              </span>
            )}
          </div>

          <div className="aud-doc-card__filename">
            <span className="material-symbols-outlined">description</span>
            {has ? (fileName || "Documento cargado") : emptyText}
          </div>

          {(metaLeft || metaRight) && (
            <div className="aud-doc-card__chips">
              {metaLeft && <span className="aud-doc-card__chip">{metaLeft}</span>}
              {metaRight && <span className="aud-doc-card__chip">{metaRight}</span>}
            </div>
          )}

          <div className="aud-doc-card__actions">
            <button
              className={`aud-doc-card__btn ${variant === "dark" ? "is-dark" : ""}`}
              onClick={() => openFile(openUrl,id)}
              disabled={!has}
            >
              <span>{buttonText}</span>
              <span className="material-symbols-outlined">open_in_new</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  return (
    <Card
      className="laboral-exp-audiencia-card"
      style={{ marginTop: 32, marginBottom: 32 }}
      bodyStyle={{ padding: 32 }}
    >
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={4} style={{ marginBottom: 6 }}>
            {label} audiencia prejudicial
          </Title>
          <Text type="secondary">
            Resumen de la sesión de negociación correspondiente.
          </Text>

          <div
            className="audiencia-header-value audiencia-header-abogado"
            style={{ marginTop: 18 }}
          >
            <span className="audiencia-header-abogado-label" style={{marginRight:5}}>
              Abogado / apoderado legal
            </span>
            <span className="audiencia-header-abogado-name">
              {abogadoNombre}
            </span>
          </div>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<EditOutlined />}
            className="custom-button"
            onClick={onEdit}
          >
            Editar
          </Button>
        </Col>
      </Row>

      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        {/* RESULTADO DE LA AUDIENCIA */}
        <Card
          size="small"
          type="inner"
          title=" Resultado de la audiencia"
          className="audiencia-view-card"
        >
          <Alert
            type={alertType}
            message={alertMessage}
            description={alertDescription}
            showIcon
            style={{ marginBottom: 18 }}
          />

          {/* Motivo del archivo / constancia */}
          {showMotivoArchivo && (
            <div className="audiencia-summary-card">
              <div className="audiencia-summary-header">
                Motivo del archivo / constancia
              </div>
              <div className="audiencia-summary-body">
                <div className="audiencia-summary-row">
                  <div className="audiencia-summary-value">
                    {motivoArchivo}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pagos de convenio (sólo en CONVENIO) */}
          {showPagosConvenio && (
            <div className="audiencia-summary-card">
              <div className="audiencia-summary-header">
                Pagos registrados del convenio
              </div>
              <div className="audiencia-summary-body pagos">
                <table className="audiencia-table resumen">
                  <thead>
                    <tr>
                      <th style={{ width: "8%" }}>#</th>
                      <th style={{ width: "22%" }}>Monto</th>
                      <th style={{ width: "24%" }}>Fecha</th>
                      <th style={{ width: "23%" }}>Forma de pago</th>
                      <th style={{ width: "23%" }}>Tipo de pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosConvenio.map((p, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{fmtCurrencyOrDash(p.monto)}</td>
                        <td>
                          {p.fecha
                            ? dayjs(p.fecha).format("DD/MM/YYYY")
                            : "—"}
                        </td>
                        <td>{formatFormaPago(p.forma_pago)}</td>
                        <td>{formatTipoPago(p.tipo_pago)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audiencia diferida (sólo en DIFERIMIENTO) */}
          {showAudienciaDiferida && (
            <div className="audiencia-summary-card">
              <div className="audiencia-summary-header">
                Audiencia diferida
              </div>
              <div className="audiencia-summary-body">
                <div className="audiencia-summary-row">
                  <div className="audiencia-summary-label">
                    Próxima audiencia programada
                  </div>
                  <div className="audiencia-summary-value">
                    {dayjs(data.fecha_proxima_audiencia).format(
                      "DD/MM/YYYY HH:mm"
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* OBJETO DE LA RECLAMACIÓN */}
        {showObjeto && (
          <Card
            size="small"
            type="inner"
            title=" Objeto de la reclamación"
            className="audiencia-view-card"
          >
            <Row gutter={[32, 16]} style={{ marginTop: 20 }}>
              <Col xs={24} md={12}>
                <Title level={5} className="audiencia-subtitle">
                  Pretensiones del trabajador
                </Title>

                <div
                  className="audiencia-html"
                  dangerouslySetInnerHTML={{
                    __html: resumenPretensiones,
                  }}
                />
              </Col>

              <Col xs={24} md={12}>
                <Title level={5} className="audiencia-subtitle">
                  Prestaciones reclamadas
                </Title>

                {prestacionesTabla.length === 0 ? (
                  <Text type="secondary">Sin prestaciones marcadas.</Text>
                ) : (
                  <div className="audiencia-table-container">
                    <table className="audiencia-table detalle">
                      <thead>
                        <tr>
                          <th>Prestación</th>
                          <th>Monto estimado (MXN)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prestacionesTabla.map((p) => (
                          <tr key={p.codigo}>
                            <td>{p.label}</td>
                            <td>
                              {p.monto != null
                                ? p.monto.toLocaleString("es-MX", {
                                    style: "currency",
                                    currency: "MXN",
                                  })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <th>Total estimado</th>
                          <td>
                            {totalPrestaciones > 0
                              ? totalPrestaciones.toLocaleString("es-MX", {
                                  style: "currency",
                                  currency: "MXN",
                                })
                              : "—"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </Col>
            </Row>
          </Card>
        )}

        {/* DESARROLLO DE LA NEGOCIACIÓN */}
        {showNegociacion && (
          <Card
            size="small"
            type="inner"
            title=" Desarrollo de la negociación"
            className="audiencia-view-card"
          >
            <div className="audiencia-table-container">
              <table className="audiencia-table detalle">
                <tbody>
                  <tr>
                    <th>Propuesta final del trabajador</th>
                    <td>
                      {fmtCurrencyOrDash(data.propuesta_final_trabajador)}
                    </td>
                    <th>Propuesta final del patrón</th>
                    <td>{fmtCurrencyOrDash(data.propuesta_final_patron)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* DOCUMENTO DE LA AUDIENCIA (CONVENIO + CONSTANCIA) */}
{resultado === "convenio" && (
  <Card
    size="small"
    type="inner"
    title="Documento de la audiencia"
    className="audiencia-view-card"
  >
    <div className="aud-doc-grid">
      {/* Convenio */}
      <DocumentOpenBox
        title="Documento del convenio"
        doc={documento}
        emptyText="Aún no se ha subido el documento del convenio."
        buttonText="Ver Documento"
        variant="primary"
        id={header.id}
        icon="picture_as_pdf"
        metaLeft={documento?.size_mb ? `${documento.size_mb} MB` : null}
        metaRight={documento?.status_text || "Finalizado"}
      />

   {(() => {
  const hasConstancia = !!pickDoc(constanciaDocState).openUrl;

  return (
    <div className="aud-doc-card is-constancia">
      <div className="aud-doc-card__row">
        <div className="aud-doc-card__icon">
          <span className="material-symbols-outlined">verified</span>
        </div>

        <div className="aud-doc-card__content">
          {hasConstancia && (
            <>
              <div className="aud-doc-card__head">
                <div className="aud-doc-card__title">
                  Constancia de Cumplimiento
                </div>
              </div>

              <div className="aud-doc-card__filename">
                <span className="material-symbols-outlined">description</span>
                {pickDoc(constanciaDocState).fileName || "Documento cargado"}
              </div>

              <div className="aud-doc-card__chips">
                <span className="aud-doc-card__chip">
                  {constanciaDocState?.size_mb
                    ? `${constanciaDocState.size_mb} MB`
                    : "—"}
                </span>
                <span className="aud-doc-card__chip">
                  {constanciaRecibida ? "Validado" : "Pendiente"}
                </span>
              </div>

              <div className="aud-doc-card__actions">
                <button
                  className="aud-doc-card__btn is-dark"
                  onClick={() =>
                    openFile(pickDoc(constanciaDocState).openUrl,header.id)
                  }
                >
                  <span>Ver Constancia</span>
                  <span className="material-symbols-outlined">
                    open_in_new
                  </span>
                </button>
              </div>
            </>
          )}

          {!hasConstancia && (
            <div className="aud-const-form aud-const-form--only">
              <div className="aud-const-form__title">
                Cumplimiento de Convenio
              </div>

              <Form
                form={constForm}
                layout="vertical"
              >
                <Form.Item label="Cargar constancia de cumplimiento">
                  <Dragger
                    multiple={false}
                    maxCount={1}
                    accept=".pdf,.png,.jpg,.jpeg"
                    fileList={constanciaFileList}
                    beforeUpload={(file) => {
                      setConstanciaFileList([file]);
                      return false;
                    }}
                    onRemove={() => setConstanciaFileList([])}
                    showUploadList
                    disabled={constanciaUploading}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p style={{ fontWeight: 600 }}>
                      Subir un archivo o arrastrar y soltar
                    </p>
                    <p style={{ color: "#6b7280", fontSize: 12 }}>
                      PDF, PNG, JPG hasta 10MB
                    </p>
                  </Dragger>
                </Form.Item>

                <Row gutter={[12, 0]}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Fecha de cumplimiento"
                      name="fecha_cumplimiento"
                      rules={[
                        { required: true, message: "Selecciona la fecha." },
                      ]}
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Notas de cumplimiento"
                      name="notas_cumplimiento"
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Describe detalles adicionales..."
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <div className="aud-const-form__actions">
                  <Button onClick={() => constForm.resetFields()}>
                    Cancelar
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleGuardarCumplimientoView}
                    loading={constanciaUploading}
                  >
                    Guardar
                  </Button>
                </div>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
})()}

    </div>
  </Card>
)}


        {/* RIESGOS */}
        <Card
          size="small"
          type="inner"
          title=" Riesgos"
          className="audiencia-view-card"
        >
          <div className="audiencia-table-container audiencia-riesgos-container">
            <table className="audiencia-table detalle">
              <tbody>
                <tr>
                  <th>Riesgos detectados</th>
                  <td colSpan={3}>
                    <div className="audiencia-riesgos-box">
                      {riesgosHtml ? (
                        <div
                          className="audiencia-html"
                          dangerouslySetInnerHTML={{ __html: riesgosHtml }}
                        />
                      ) : (
                        <span style={{ color: "#9CA3AF" }}>
                          Sin riesgos registrados.
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </Space>
         <style>
        {`
.laboral-exp-audiencia-card {
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
}

/* Header */
.audiencia-header-value {
  font-weight: 500;
  color: #111827;
  font-size: 13px;
}

.audiencia-header-abogado {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #eef2ff;
  border: 1px solid #e0e7ff;
}

.audiencia-header-abogado-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: #4b5563;
}

.audiencia-header-abogado-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.audiencia-subtitle {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.audiencia-view-card {
  border-radius: 16px !important;
  border-color: #e5e7eb !important;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  margin-top: 8px;
}

.audiencia-view-card .ant-card-head {
  padding: 0 20px;
  min-height: 40px;
}

.audiencia-view-card .ant-card-head-title {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.audiencia-view-card .ant-card-body {
  padding: 20px 22px !important;
}

.audiencia-summary-card {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
  margin-top: 8px;
}

.audiencia-summary-header {
  background: #f9fafb;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.audiencia-summary-body {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.audiencia-summary-body.pagos {
  border-top: 1px solid #e5e7eb;
  margin-top: 0;
}

.audiencia-summary-row {
  display: grid;
  grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  font-size: 13px;
}

@media (max-width: 768px) {
  .audiencia-summary-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

.audiencia-summary-label {
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-size: 11px;
}

.audiencia-summary-value {
  font-weight: 500;
  color: #111827;
}

.audiencia-table-container {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 10px;
}

.audiencia-table.detalle {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.audiencia-table.detalle th {
  padding: 10px 16px;
  background: #f3f4f6;
  color: #374151;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.03em;
  border-bottom: 1px solid #e5e7eb;
}

.audiencia-table.detalle td {
  padding: 10px 16px;
  background: #ffffff;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
}

.audiencia-table.detalle tr:last-child th,
.audiencia-table.detalle tr:last-child td {
  border-bottom: none;
}

@media (max-width: 768px) {
  .audiencia-table.detalle tr {
    display: grid;
    grid-template-columns: 1fr;
  }

  .audiencia-table.detalle th {
    border-bottom: none;
  }

  .audiencia-table.detalle td {
    border-bottom: 1px solid #e5e7eb;
  }
}

.audiencia-riesgos-container {
  background: #fefce8;
  border-color: #fbbf24;
}

.audiencia-riesgos-container .audiencia-table.detalle th {
  background: #fef3c7;
  color: #92400e;
}

.audiencia-riesgos-box {
  padding: 10px 12px;
  background: #fffbeb;
  border-radius: 10px;
  border: 1px dashed #f59e0b;
  font-size: 13px;
  line-height: 1.5;
}

.audiencia-riesgos-box .audiencia-html p {
  margin-bottom: 4px;
}

        `}
      </style>
    </Card>
    
  );
}

export default AudienciaGenericaView;
