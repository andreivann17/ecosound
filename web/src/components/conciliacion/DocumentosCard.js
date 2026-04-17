import {
  Row,
  Col,
  Typography,
  Divider,
  Card,
  Image,
  Tabs,
  Button,
  Modal,
  Form,
  Select,
  Upload,
  Tooltip ,
  Popconfirm,
  notification,
  Space,
} from "antd";
import {
  FilePdfOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import {PATH} from "../../redux/utils"
const API_BASE_URL = PATH;
const { Text } = Typography;

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const toFullUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
};

// ID del tipo de documento para Checklist prejudicial
const CHECKLIST_TIPO_ID = 2;

function CardAudiencia({
  dataDetalles={},
  data = {}, // { id_conciliacion, expediente_format?, count, items, tipos_documentos }
  tiposDocumentos = [], // opcional; si no viene, se toma de data.tipos_documentos
  onCreateDocumento, // (payload) => Promise
  onDeleteDocumento, // (doc) => Promise
  idExpediente,
  // onExportDocumentos, // si quieres seguir usando un handler externo, lo puedes reactivar
}) {
  // items de documentos
  const documentos = Array.isArray(data.items?.items) ? data.items.items : [];

  // catálogo de tipos
  const tipos =
    tiposDocumentos.length > 0
      ? tiposDocumentos
      : Array.isArray(data.tipos_documentos)
      ? data.tipos_documentos
      : [];

  const placeholderPreview = `${PATH}/uploads/checklist_prejudicial/previews/placeholder_word.jpg`;

  // ========= helpers =========
  const isChecklistDoc = (doc) =>
    Number(doc.id_conciliacion_tipo_documento) === CHECKLIST_TIPO_ID;

  // tipos permitidos en el modal (se excluye Checklist prejudicial)
  const tiposParaCrear = tipos.filter(
    (td) => Number(td.id) !== CHECKLIST_TIPO_ID
  );

  // ====== MODAL CREAR DOCUMENTO ======
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [fileList, setFileList] = useState([]);


  // ====== EXPORTAR DOCUMENTOS ======
  const [exportMode, setExportMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]); // mantiene el orden
  const [exportLoading, setExportLoading] = useState(false);

  const resetExportState = () => {
    setExportMode(false);
    setSelectedDocs([]);
    setExportLoading(false);
  };

  const handleOpenCreate = () => {
    // si estaba en modo export, se apaga
    if (exportMode) {
      resetExportState();
    }
    createForm.resetFields();
    setFileList([]);
    setCreateOpen(true);
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
  };

  const handleCreateSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      if (!fileList.length) {
        notification.error({
  message: "Archivo requerido",
  description: "Adjunta un archivo PDF o Word para continuar.",
});
        return;
      }


      const payload = {
        id_conciliacion: dataDetalles.id,
        expediente: idExpediente,
        file: fileList[0],
      };

      if (onCreateDocumento) {
        await onCreateDocumento(payload);
          notification.success({
            message: "Documento guardado",
            description: "El documento se creó y se asoció al expediente correctamente.",
          });
      } 

      setCreateOpen(false);
    } catch (err) {
      if (err?.errorFields) return; // error de validación
      console.error(err);
      // DESPUÉS
        notification.error({
          message: "Error al crear documento",
          description: "Ocurrió un error al crear el documento. Inténtalo nuevamente.",
        });

    }
  };

  const uploadProps = {
    multiple: false,
    fileList,
    beforeUpload: (file) => {
      const isAllowed =
        file.type === "application/pdf" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword";

      if (!isAllowed) {
        // DESPUÉS
        notification.error({
          message: "Tipo de archivo no válido",
          description: "Solo se permiten archivos en formato PDF o Word.",
        });
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false; // no subir automáticamente
    },
    onRemove: () => {
      setFileList([]);
    },
  };

  
  // ====== ELIMINAR DOCUMENTO ======
  const handleDelete = async (doc) => {
    // por seguridad: nunca borrar checklist desde aquí
    if (isChecklistDoc(doc)) {
      // DESPUÉS
        notification.warning({
          message: "Acción no permitida",
          description:
            "El Checklist prejudicial solo se puede gestionar desde la sección principal del expediente.",
        });

      return;
    }

    try {
      if (onDeleteDocumento) {
        await onDeleteDocumento(doc);
     
          notification.success({
            message: "Documento eliminado",
            description: "El documento se eliminó correctamente del expediente.",
          });

      } else {
      // DESPUÉS
notification.success({
  message: "Documento eliminado",
  description: "El documento se eliminó correctamente (modo simulado).",
});

      }
    } catch (e) {
      console.error(e);
     // DESPUÉS
notification.error({
  message: "Error al eliminar",
  description: "No se pudo eliminar el documento. Revisa la conexión o intenta de nuevo.",
});

    }
  };
const authHeader = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const doExportRequest = async () => {
  const payload = {
    documentos: selectedDocs.map((d) => ({
      id_conciliacion: d.id_conciliacion,
      path: d.path,
      nombre: d.nombre,
    })),
  };

  setExportLoading(true);

  const url = `${API_BASE_URL}/conciliaciones/documentos/export`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),              // <- aquí simplemente esparces el objeto
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Error exportando documentos:", res.status, text);
      throw new Error("No se pudo exportar los documentos.");
    }

    const blob = await res.blob();

    const expedienteName =
      data.expediente_format || data.expediente || data.id_conciliacion || "expediente";

    const zipName = `documentos_${expedienteName}.zip`;

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = zipName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);

 
  } catch (err) {
    console.error(err);
    notification.error({
      message: "Error al exportar",
      description: err.message || "No se pudo exportar los documentos.",
    });
  } finally {
    setExportLoading(false);
  }
};



  const handleExportButtonClick = async () => {
    // 1er click: activar modo exportación
    if (!exportMode) {
      setExportMode(true);
      setSelectedDocs([]);
      return;
    }

    // 2do click: intentar exportar
    if (!selectedDocs.length) {
      // DESPUÉS
notification.warning({
  message: "Sin documentos seleccionados",
  description:
    "No has seleccionado documentos para exportar. Selecciona al menos uno para continuar.",
});

      return;
    }

    try {
      await doExportRequest();
     // DESPUÉS
notification.success({
  message: "Exportación generada",
  description: `Se creó el archivo ZIP con ${selectedDocs.length} documento(s) seleccionados.`,
});

    } catch (e) {
      console.error(e);
      // DESPUÉS
notification.error({
  message: "Error al exportar",
  description:
    "Ocurrió un error al exportar los documentos. Inténtalo nuevamente o contacta al administrador.",
});

      return;
    } finally {
      resetExportState();
    }
  };

  const handleCancelExport = () => {
    resetExportState();
 // DESPUÉS
notification.info({
  message: "Selección cancelada",
  description: "Se canceló el modo de exportación de documentos.",
});

  };

  const handleToggleSelectDoc = (doc) => {
    if (!exportMode) return;

    setSelectedDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return [...prev, doc];
    });
  };

  const getSelectionIndex = (doc) => {
    return selectedDocs.findIndex((d) => d.id === doc.id);
  };

 
  // ====== GRID DE DOCUMENTOS ======
  const renderGrid = (docs) => {
    if (!docs || docs.length === 0) {
      return (
        <Text type="secondary">
          No hay documentos registrados en esta sección.
        </Text>
      );
    }

    return (
      <Row
        gutter={[32, 40]}
        justify="flex-start"
        align="stretch"
        style={{ padding: "24px 24px 8px" }}
      >
        {docs.map((doc) => {
          const previews = doc.previews || [];
          const mainPreview =
            previews[0]?.url ? toFullUrl(previews[0].url) : placeholderPreview;

          const esChecklist = isChecklistDoc(doc);
          const selectionIndex = getSelectionIndex(doc);
          const isSelected = selectionIndex >= 0;
          const isOtro =
          String(doc?.nombre || "").trim().toLowerCase() === "otro" ||
          Number(doc?.id_conciliacion_tipo_documento) === 14;

        const displayName = isOtro
          ? (doc?.path ? String(doc.path).split("/").pop() : "Documento")
          : (doc?.nombre || "Documento");

          return (
            <Col
              key={doc.id}
              xs={24}
              sm={12}
              md={8}
              lg={6}
              xl={5}
            >
              <div
                className={`laboral-exp-checklist-preview laboral-exp-doc-card-exportable ${
                  exportMode && isSelected
                    ? "laboral-exp-doc-card-selected"
                    : ""
                }`}
                onClick={() => handleToggleSelectDoc(doc)}
              >    <Tooltip
  title={displayName}
  placement="top"
  mouseEnterDelay={0.2}
>
                <div className="laboral-exp-pdf-preview-card">
                  <div className="laboral-exp-doc-actions">
                  
  <Text className="laboral-exp-doc-tag">
    {displayName}
    {esChecklist && " (Checklist prejudicial)"}
  </Text>





                    {/* NO mostrar eliminar si es checklist */}
                    {!esChecklist && (
                      <Popconfirm
                        title="Eliminar documento"
                        description="Esta acción no se puede deshacer. ¿Deseas continuar?"
                        okText="Eliminar"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true, size: "small" }}
                        onConfirm={() => handleDelete(doc)}
                      >
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()} // evitar que seleccione/deseleccione al borrar
                        >
                          Eliminar
                        </Button>
                      </Popconfirm>
                    )}
                  </div>

                  <div className="laboral-exp-pdf-preview-inner">
                    <Image.PreviewGroup>
                      <Image
                        className="laboral-exp-pdf-thumbnail"
                        src={mainPreview}
                        alt={doc.nombre || "Documento"}
                        // En modo exportación no abrimos el preview
                        preview={
                          exportMode
                            ? false
                            : {
                                maskClassName: "laboral-exp-pdf-mask",
                                mask: (
                                  <span className="laboral-exp-pdf-mask-text">
                                    <FilePdfOutlined style={{ marginRight: 8 }} />
                                    Ver documento completo
                                  </span>
                                ),
                              }
                        }
                      />

                      {previews.slice(1).map((p) => (
                        <Image
                          key={`${doc.id}-page-${p.page}`}
                          src={toFullUrl(p.url)}
                          alt={`${doc.nombre || "Documento"} - página ${
                            p.page
                          }`}
                          style={{ display: "none" }}
                        />
                      ))}
                    </Image.PreviewGroup>
                  </div>
                </div>
</Tooltip>
                {/* Badge de selección con número de orden */}
                {exportMode && isSelected && (
                  <div className="laboral-exp-doc-selection-badge">
                    {selectionIndex + 1}
                  </div>
                )}

                <div className="laboral-exp-pdf-caption-block">
                  {doc.created_at && (
                    <Text
                      type="secondary"
                      className="laboral-exp-doc-meta"
                    >
                      Cargado el {fmtDate(doc.created_at)}
                    </Text>
                  )}
                </div>
              </div>
              
            </Col>
          );
        })}
      </Row>
    );
  };


  return (
    <>
      <section className="laboral-exp-section">
        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} md={24} lg={24}>
            <Card
              className="laboral-exp-detail-card-main"
              title={
                <div className="laboral-exp-section-header p-2">
                  <div>
                    <Text className="laboral-exp-section-title">
                      Documentos del expediente
                    </Text>
                    <Text
                      type="secondary"
                      className="laboral-exp-section-sub"
                    >
                      Administra y visualiza los documentos asociados a la
                      conciliación.
                    </Text>
                  </div>
                </div>
              }
              extra={
                <Button
                  size="middle"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleOpenCreate}
                >
                  Cargar documento
                </Button>
              }
            >

              {/* Barra de herramientas de exportación */}
              <div className="laboral-exp-doc-toolbar">
                <div className="laboral-exp-doc-toolbar-left">
                  {exportMode ? (
                    <Text type="secondary">
                      Selecciona los documentos que quieras exportar haciendo
                      clic sobre ellos.
                    </Text>
                  ) : (
                    <Text type="secondary">
                    </Text>
                  )}
                </div>
                <Space>
                  {exportMode && (
                    <Button
                      size="small"
                      onClick={handleCancelExport}
                      disabled={exportLoading}
                    >
                      Cancelar selección
                    </Button>
                  )}
                  <Button
                    size="small"
                    type={exportMode ? "primary" : "default"}
                    loading={exportLoading}
                    onClick={handleExportButtonClick}
                  >
                    {exportMode
                      ? `Exportar (${selectedDocs.length})`
                      : "Exportar documentos"}
                  </Button>
                </Space>
              </div>

                          <div style={{ padding: "12px 24px 24px" }}>
                {renderGrid(documentos)}
              </div>

            </Card>
          </Col>
        </Row>
      </section>

      {/* MODAL CREAR DOCUMENTO (sin checklist) */}
      <Modal
        title="Cargar documento"
        open={createOpen}
        onCancel={handleCloseCreate}
        onOk={handleCreateSubmit}
        okText="Guardar documento"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          preserve={false}
        >
  

          <Form.Item label="Archivo" required>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>
                Seleccionar archivo (PDF o Word)
              </Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12 }}>
              El archivo se asociará al expediente y se generarán sus páginas de
              vista previa.
            </Text>
          </Form.Item>
        </Form>
      </Modal>

      <style>
        {`
        .laboral-exp-detail-card-main {
          box-shadow: none !important;
          border-radius: 24px;
          background: #ffffff;
          border: 1px solid rgba(15, 23, 42, 0.04);
        }

        .laboral-exp-section-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .laboral-exp-doc-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px 8px;
        }

        .laboral-exp-doc-toolbar-left {
          max-width: 60%;
        }

        .laboral-exp-checklist-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .laboral-exp-doc-card-exportable {
          cursor: pointer;
        }

        .laboral-exp-doc-card-selected .laboral-exp-pdf-preview-card {
          box-shadow: 0 0 0 2px #1677ff, 0 22px 45px rgba(15, 23, 42, 0.18);
        }

        .laboral-exp-pdf-preview-card {
          width: 100%;
          max-width: 380px;
          margin: 0 auto;
          padding: 12px 12px 16px;
          border-radius: 28px;
          background: #ffffff;
          box-shadow: 0 22px 45px rgba(15, 23, 42, 0.18);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .laboral-exp-doc-card-exportable:hover .laboral-exp-pdf-preview-card {
          transform: translateY(-4px);
          box-shadow: 0 26px 55px rgba(15, 23, 42, 0.24);
        }

        .laboral-exp-doc-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          gap: 8px;
        }

        .laboral-exp-doc-tag {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .laboral-exp-pdf-preview-inner {
          border-radius: 22px;
          overflow: hidden;
        }

        .laboral-exp-pdf-thumbnail {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
          background: #f9fafb;
        }

        .laboral-exp-pdf-caption-block {
          text-align: center;
        }

        .laboral-exp-doc-meta {
          display: block;
          font-size: 12px;
          margin-top: 2px;
        }

        .laboral-exp-doc-selection-badge {
          position: absolute;
          top: 6px;
          right: 10px;
          min-width: 24px;
          height: 24px;
          padding: 0 6px;
          border-radius: 999px;
          background: #1677ff;
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px #ffffff;
        }
        `}
      </style>
    </>
  );
}

export default CardAudiencia;
