// src/pages/materias/laboral/components/ChecklistPrejudicialCard.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  Divider,
  Typography,
  Space,
  Button,
  Form,
  Upload,
  Image,
  Spin,
  Modal,
  notification,
} from "antd";
import ReactQuill from "react-quill";
import { InboxOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";

import {
  actionConciliacionDocumentosGet,
  actionConciliacionGetByID,
} from "../../../redux/actions/conciliacion/conciliacion";
import {PATH} from "../../../redux/utils"
const API_BASE = PATH;
const { Text } = Typography;
const { Dragger } = Upload;

export default function ChecklistPrejudicialCard({ idExpediente }) {
  const dispatch = useDispatch();
  const { documentos, detalle } = useSelector((state) => state.conciliacion);

  // =========================
  //  ESTADO PROPUESTA PATRÓN
  // =========================
  const [propuestaPatron, setPropuestaPatron] = useState("");
  // "summary" = muestra bloque resumen, "edit" = muestra formulario
  const [propuestaMode, setPropuestaMode] = useState("edit");
  const [savingChecklistData, setSavingChecklistData] = useState(false);
  const [formChecklist] = Form.useForm();

  // =========================
  //  ESTADO CHECKLIST (ARCHIVO)
  // =========================
  const [checklistDoc, setChecklistDoc] = useState(null);
  const [hasChecklist, setHasChecklist] = useState(false);
  const [checklistUploading, setChecklistUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [checklistMeta, setChecklistMeta] = useState(null);

  // ---------------------------------
  // Inicializar propuesta desde detalle
  // ---------------------------------
  useEffect(() => {
    if (!detalle) return;

    const value =
      typeof detalle.propuesta_patron === "string"
        ? detalle.propuesta_patron
        : "";

    setPropuestaPatron(value);
    formChecklist.setFieldsValue({ propuesta_patron: value });

    // Si hay texto en BD => modo resumen, si no => modo edición
    if (value.trim()) {
      setPropuestaMode("summary");
    } else {
      setPropuestaMode("edit");
    }
  }, [detalle, formChecklist]);

  // --------------------------
  // Localizar documento checklist
  // --------------------------
  useEffect(() => {
    if (!documentos?.items?.items) {
      setChecklistDoc(null);
      return;
    }

    const found = documentos.items.items.find(
      (doc) =>
        Number(doc.id_conciliacion_tipo_documento) === 2 &&
        Number(doc.active) === 1
    );

    setChecklistDoc(found || null);
  }, [documentos, idExpediente]);

  // --------------------------
  // Derivar estado visual del checklist (archivo)
  // --------------------------
  useEffect(() => {
    if (!checklistDoc || !detalle) {
      setHasChecklist(false);
      setPreviewUrl(null);
      setChecklistMeta(null);
      return;
    }

    const preview = checklistDoc.previews?.[0]?.url
      ? `${API_BASE}${checklistDoc.previews[0].url}`
      : null;

    setHasChecklist(Boolean(preview));
    setPreviewUrl(preview);
    setChecklistMeta({
      expediente: detalle.expediente_format,
      fileUrl: null,
      fileName: checklistDoc.path,
      previewUrl: preview,
    });
  }, [checklistDoc, detalle]);

  // =========================
  //  HANDLERS PROPUESTA
  // =========================

  const handleChecklistDataSubmit = async (values) => {
    try {
      const expedienteVal = detalle?.expediente_format;

      if (!expedienteVal) {
        notification.error({
          message: "Expediente no disponible",
          description:
            "No se encontró el expediente para guardar la propuesta del patrón.",
        });
        return;
      }

      const payload = {
        expediente: expedienteVal,
        propuesta_patron: values.propuesta_patron || null,
      };

      setSavingChecklistData(true);

      const res = await fetch(
        `${PATH}/checklist-prejudicial/datos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok || json.status !== "ok") {
        console.error("Error backend (datos checklist):", json);
        notification.error({
          message: "Error al guardar",
          description:
            "No se pudieron guardar los datos del checklist (propuesta del patrón).",
        });
        setSavingChecklistData(false);
        return;
      }

      const newValue = values.propuesta_patron || "";
      setPropuestaPatron(newValue);
      // tras guardar, volvemos a modo resumen; si está vacío, se muestra placeholder
      setPropuestaMode("summary");

      dispatch(actionConciliacionGetByID(idExpediente));

      notification.success({
        message: "Datos guardados",
        description: "La propuesta del patrón se guardó correctamente.",
      });
      setSavingChecklistData(false);
    } catch (err) {
      console.error(err);
      notification.error({
        message: "Error de conexión",
        description:
          "Ocurrió un error de conexión al guardar la propuesta del patrón.",
      });
      setSavingChecklistData(false);
    }
  };

  const handleEditChecklistData = () => {
    setPropuestaMode("edit");
    formChecklist.setFieldsValue({
      propuesta_patron: propuestaPatron || "",
    });
  };

  // =========================
  //  HANDLERS CHECKLIST (ARCHIVO)
  // =========================

  const handleChecklistUpload = async ({ file, onSuccess, onError }) => {
    try {
      if (!detalle?.expediente_format) {
        notification.error({
          message: "Datos incompletos",
          description:
            "Falta el expediente_format en los datos del expediente.",
        });
        onError?.();
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("expediente", String(detalle.expediente_format));

      setChecklistUploading(true);

      const res = await fetch(
         `${PATH}/checklist-prejudicial/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await res.json();

      if (!res.ok || json.status !== "ok") {
        console.error("Error backend:", json);
        notification.error({
          message: "Error al importar",
          description: "No se pudo importar el checklist prejudicial.",
        });

        setChecklistUploading(false);
        onError?.(json);
        return;
      }

      const fullPreviewUrl = `${API_BASE}${json.preview_url}`;
      setPreviewUrl(fullPreviewUrl);
      setChecklistMeta({
        expediente: detalle.expediente_format,
        fileUrl: json.file_url,
        fileName: json.filename,
        previewUrl: json.preview_url,
      });
      setHasChecklist(true);

      notification.success({
        message: "Checklist importado",
        description: "El checklist prejudicial se importó correctamente.",
      });

      setChecklistUploading(false);
      onSuccess?.(json);

      // refrescamos documentos para que llegue checklistDoc actualizado
      dispatch(actionConciliacionDocumentosGet(idExpediente));
    } catch (err) {
      console.error(err);
      notification.error({
        message: "Error de conexión",
        description:
          "No se pudo conectar con el servidor al importar el checklist.",
      });
      setChecklistUploading(false);
      onError?.(err);
    }
  };

  const handleDeleteChecklist = () => {
    if (!checklistMeta || !checklistMeta.expediente) {
      notification.error({
        message: "Checklist no disponible",
        description: "No se encontró la información del checklist.",
      });
      return;
    }

    Modal.confirm({
      title: "Eliminar checklist",
      content:
        "Se eliminará el archivo del checklist prejudicial. ¿Deseas continuar?",
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      async onOk() {
        try {
          const res = await fetch(
             `${PATH}/checklist-prejudicial/delete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                expediente: checklistMeta.expediente,
                fileName: checklistMeta.fileName,
              }),
            }
          );

          const json = await res.json();

          if (!res.ok || json.status !== "ok") {
            console.error("Error backend (delete checklist):", json);
            notification.error({
              message: "Error al eliminar",
              description: "No se pudo eliminar el checklist.",
            });
            return;
          }

          // Solo afecta al archivo; la propuesta se mantiene intacta
          setHasChecklist(false);
          setChecklistMeta(null);
          setPreviewUrl(null);

          dispatch(actionConciliacionGetByID(idExpediente));
          dispatch(actionConciliacionDocumentosGet(idExpediente));

          notification.success({
            message: "Checklist eliminado",
            description: "El checklist se eliminó correctamente.",
          });
        } catch (err) {
          console.error(err);
          notification.error({
            message: "Error de conexión",
            description:
              "Ocurrió un error de conexión al eliminar el checklist.",
          });
        }
      },
    });
  };

  // =========================
  //  RENDER
  // =========================

  return (
    <Card className="laboral-exp-detail-card laboral-exp-detail-card-main p-2">
      <div className="laboral-exp-checklist-panel laboral-exp-checklist-panel--visible">
        <div className="laboral-exp-section-header">
          <div>
            <Text className="laboral-exp-section-title">
              Checklist prejudicial
            </Text>
            <Text type="secondary" className="laboral-exp-section-sub">
              Puedes capturar la propuesta del patrón aunque no se haya cargado
              el checklist. Opcionalmente, también puedes subir el documento
              cuando lo tengas.
            </Text>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
       

            {/* Botones fijos: uno para propuesta, otro para checklist */}
            <Space>
              {propuestaMode === "summary" && (
                <Button size="small" onClick={handleEditChecklistData}>
                  Editar datos
                </Button>
              )}

              {hasChecklist && (
                <Button size="small" danger onClick={handleDeleteChecklist}>
                  Eliminar checklist
                </Button>
              )}
            </Space>
          </div>
        </div>

        <Divider className="laboral-exp-section-divider" />

        <div className="laboral-exp-checklist-grid">
          {/* ==================
              IZQUIERDA: PROPUESTA
             ================== */}
          <div className="laboral-exp-checklist-form">
            {propuestaMode === "summary" ? (
              <div className="laboral-exp-checklist-summary">
                <div className="laboral-exp-checklist-summary-title">
                  <Text strong>Datos capturados del checklist</Text>
                </div>

                <div className="laboral-exp-checklist-summary-items">
                  <div className="laboral-exp-checklist-item">
                    <span className="laboral-exp-checklist-item-label">
                      PROPUESTA DEL PATRÓN
                    </span>
                    <div
                      className="laboral-exp-checklist-item-value"
                      dangerouslySetInnerHTML={{
                        __html: propuestaPatron?.trim()
                          ? propuestaPatron
                          : "<em>Sin propuesta registrada</em>",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Form
                form={formChecklist}
                layout="vertical"
                onFinish={handleChecklistDataSubmit}
              >
                <Form.Item
                  label="Propuesta del patrón"
                  name="propuesta_patron"
                >
                  <ReactQuill
                    theme="snow"
                    style={{ height: 180, marginBottom: 40 }}
                  />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={savingChecklistData}
                    >
                      Guardar datos del checklist
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            )}
          </div>

          {/* ==================
              DERECHA: ARCHIVO CHECKLIST
             ================== */}
          <div className="laboral-exp-checklist-preview">
            <div className="laboral-exp-pdf-preview-wrapper laboral-exp-pdf-preview-wrapper--compact">
              {hasChecklist && previewUrl ? (
                <div className="laboral-exp-pdf-preview-card">
                  <div className="laboral-exp-pdf-preview-inner">
                    <Image.PreviewGroup>
                      {/* Thumbnail principal */}
                      <Image
                        className="laboral-exp-pdf-thumbnail"
                        src={
                          previewUrl ||
                           `${PATH}/uploads/conciliacion/previews/placeholder_word.jpg`
                        }
                        alt="Vista previa del checklist prejudicial"
                        preview={{
                          maskClassName: "laboral-exp-pdf-mask",
                          mask: (
                            <span className="laboral-exp-pdf-mask-text">
                              <FilePdfOutlined style={{ marginRight: 8 }} />
                              Ver documento completo
                            </span>
                          ),
                        }}
                      />

                      {/* Páginas adicionales ocultas pero dentro del grupo */}
                      {Array.isArray(checklistDoc?.previews) &&
                        checklistDoc.previews
                          .slice(1)
                          .map((p) => (
                            <Image
                              key={`checklist-page-${
                                p.page ?? p.id ?? Math.random()
                              }`}
                              src={`${API_BASE}${p.url}`}
                              alt={`Checklist prejudicial - página ${p.page}`}
                              style={{ display: "none" }}
                            />
                          ))}
                    </Image.PreviewGroup>
                  </div>
                </div>
              ) : (
                <Dragger
                  name="file"
                  multiple={false}
                  showUploadList={false}
                  accept=".pdf,.doc,.docx,image/*"

                  customRequest={handleChecklistUpload}
                  disabled={checklistUploading}
                  className="laboral-exp-checklist-dragger"
                >
                  {checklistUploading ? (
                    <div style={{ padding: "12px 0" }}>
                      <Spin />
                      <p
                        className="laboral-exp-checklist-dragger-title"
                        style={{ marginTop: 12 }}
                      >
                        Importando checklist...
                      </p>
                      <p className="laboral-exp-checklist-dragger-sub">
                        Espera un momento mientras procesamos el archivo.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="laboral-exp-checklist-dragger-title">
                        Haz clic o arrastra un archivo para importar el
                        checklist
                      </p>
                      <p className="laboral-exp-checklist-dragger-sub">
                        Solo se permiten archivos PDF o Word. Este documento se
                        usará para llenar el detalle del acuerdo y mostrar una
                        captura, pero es opcional para guardar la propuesta del
                        patrón.
                      </p>
                    </>
                  )}
                </Dragger>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
