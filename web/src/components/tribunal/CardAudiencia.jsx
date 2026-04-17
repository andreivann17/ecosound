// src/components/tribunal/documentos/CardAudiencia.jsx
import React, { useMemo, useState } from "react";
import {
  Row,
  Col,
  Typography,
  Card,
  Image,
  Button,
  Modal,
  Form,
  Upload,
  Tooltip,
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

function CardAudiencia({
  dataDetalles = {},
  data = {}, // tribunal docs: { count, items:[...] }
  onCreateDocumento, // (payload) => Promise
  onDeleteDocumento, // (doc) => Promise
  idExpediente,
}) {
  // ✅ tribunal docs items
  const documentos = useMemo(() => {
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.items?.items)) return data.items.items;
    return [];
  }, [data]);

  const placeholderPreview = `${PATH}/uploads/checklist_prejudicial/previews/placeholder_word.jpg`;

  // ====== MODAL CREAR DOCUMENTO ======
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [fileList, setFileList] = useState([]);

  // ====== EXPORTAR DOCUMENTOS ======
  const [exportMode, setExportMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  const resetExportState = () => {
    setExportMode(false);
    setSelectedDocs([]);
    setExportLoading(false);
  };

  const handleOpenCreate = () => {
    if (exportMode) resetExportState();
    createForm.resetFields();
    setFileList([]);
    setCreateOpen(true);
  };

  const handleCloseCreate = () => setCreateOpen(false);

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
        notification.error({
          message: "Tipo de archivo no válido",
          description: "Solo se permiten archivos en formato PDF o Word.",
        });
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false;
    },
    onRemove: () => setFileList([]),
  };

  const handleCreateSubmit = async () => {
    try {
      await createForm.validateFields();

      if (!fileList.length) {
        notification.error({
          message: "Archivo requerido",
          description: "Adjunta un archivo PDF o Word para continuar.",
        });
        return;
      }

      // ✅ Payload tribunal
      const payload = {
        id_tribunal: dataDetalles?.id, // tu PK de tribunal
        expediente: idExpediente, // por si tu backend lo usa
        file: fileList[0],
      };

      if (onCreateDocumento) {
        await onCreateDocumento(payload);
        notification.success({
          message: "Documento guardado",
          description:
            "El documento se creó y se asoció al expediente correctamente.",
        });
      } else {
        notification.warning({
          message: "Falta conectar action",
          description:
            "Conecta onCreateDocumento con tu action real de tribunal.",
        });
      }

      setCreateOpen(false);
    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      notification.error({
        message: "Error al crear documento",
        description: "Ocurrió un error al crear el documento.",
      });
    }
  };

  const handleDelete = async (doc) => {
    try {
      if (onDeleteDocumento) {
        await onDeleteDocumento(doc);
        notification.success({
          message: "Documento eliminado",
          description: "El documento se eliminó correctamente del expediente.",
        });
      } else {
        notification.warning({
          message: "Falta conectar action",
          description:
            "Conecta onDeleteDocumento con tu action real de tribunal.",
        });
      }
    } catch (e) {
      console.error(e);
      notification.error({
        message: "Error al eliminar",
        description: "No se pudo eliminar el documento.",
      });
    }
  };

  // ====== EXPORT (TRIBUNAL) ======
  // ⚠️ Tu export actual era /conciliaciones/documentos/export
  // Aquí NO invento endpoint. Te dejo listo para que pegues el tuyo.
  const handleExportButtonClick = async () => {
    if (!exportMode) {
      setExportMode(true);
      setSelectedDocs([]);
      return;
    }

    if (!selectedDocs.length) {
      notification.warning({
        message: "Sin documentos seleccionados",
        description:
          "No has seleccionado documentos para exportar. Selecciona al menos uno.",
      });
      return;
    }

    setExportLoading(true);
    try {
      notification.warning({
        message: "Falta endpoint de exportación (Tribunal)",
        description:
          "Aquí conecta tu endpoint real para exportar documentos de tribunal.",
      });
    } finally {
      setExportLoading(false);
      resetExportState();
    }
  };

  const handleCancelExport = () => {
    resetExportState();
    notification.info({
      message: "Selección cancelada",
      description: "Se canceló el modo de exportación.",
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

  const getSelectionIndex = (doc) => selectedDocs.findIndex((d) => d.id === doc.id);

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
          const previews = Array.isArray(doc.previews) ? doc.previews : [];
          const mainPreview =
            previews[0]?.url ? toFullUrl(previews[0].url) : placeholderPreview;

          const selectionIndex = getSelectionIndex(doc);
          const isSelected = selectionIndex >= 0;

          // ✅ Nombre display: si no tienes catálogo de tipos aquí, usa filename
          const displayName =
            doc?.path ? String(doc.path).split("/").pop() : "Documento";

          return (
            <Col key={doc.id} xs={24} sm={12} md={8} lg={6} xl={5}>
              <div
                className={`laboral-exp-checklist-preview laboral-exp-doc-card-exportable ${
                  exportMode && isSelected ? "laboral-exp-doc-card-selected" : ""
                }`}
                onClick={() => handleToggleSelectDoc(doc)}
              >
                <Tooltip title={displayName} placement="top" mouseEnterDelay={0.2}>
                  <div className="laboral-exp-pdf-preview-card">
                    <div className="laboral-exp-doc-actions">
                      <Text className="laboral-exp-doc-tag">{displayName}</Text>

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
                          onClick={(e) => e.stopPropagation()}
                        >
                          Eliminar
                        </Button>
                      </Popconfirm>
                    </div>

                    <div className="laboral-exp-pdf-preview-inner">
                      <Image.PreviewGroup>
                        <Image
                          className="laboral-exp-pdf-thumbnail"
                          src={mainPreview}
                          alt={displayName}
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
                            alt={`${displayName} - página ${p.page}`}
                            style={{ display: "none" }}
                          />
                        ))}
                      </Image.PreviewGroup>
                    </div>

                    {/* ✅ link directo al PDF real */}
                    {doc?.url ? (
                      <div style={{ marginTop: 10 }}>
                        <a href={`${PATH}${doc.url}`} target="_blank" rel="noreferrer">
                          Abrir PDF
                        </a>
                      </div>
                    ) : null}
                  </div>
                </Tooltip>

                {exportMode && isSelected && (
                  <div className="laboral-exp-doc-selection-badge">
                    {selectionIndex + 1}
                  </div>
                )}

                <div className="laboral-exp-pdf-caption-block">
                  {doc.created_at && (
                    <Text type="secondary" className="laboral-exp-doc-meta">
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
                      Documentos del expediente (Tribunal)
                    </Text>
                    <Text type="secondary" className="laboral-exp-section-sub">
                      Administra y visualiza los documentos asociados al expediente.
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
              <div className="laboral-exp-doc-toolbar">
                <div className="laboral-exp-doc-toolbar-left">
                  {exportMode ? (
                    <Text type="secondary">
                      Selecciona los documentos que quieras exportar haciendo clic sobre ellos.
                    </Text>
                  ) : (
                    <Text type="secondary"></Text>
                  )}
                </div>

                <Space>
                  {exportMode && (
                    <Button size="small" onClick={handleCancelExport} disabled={exportLoading}>
                      Cancelar selección
                    </Button>
                  )}
                  <Button
                    size="small"
                    type={exportMode ? "primary" : "default"}
                    loading={exportLoading}
                    onClick={handleExportButtonClick}
                  >
                    {exportMode ? `Exportar (${selectedDocs.length})` : "Exportar documentos"}
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

      <Modal
        title="Cargar documento"
        open={createOpen}
        onCancel={handleCloseCreate}
        onOk={handleCreateSubmit}
        okText="Guardar documento"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" preserve={false}>
          <Form.Item label="Archivo" required>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>
                Seleccionar archivo (PDF o Word)
              </Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12 }}>
              El archivo se asociará al expediente y se generarán sus páginas de vista previa.
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
        .laboral-exp-doc-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px 8px;
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
          max-width: 240px;
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
