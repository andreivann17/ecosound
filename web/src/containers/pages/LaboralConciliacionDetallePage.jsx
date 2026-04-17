// src/pages/materias/laboral/LaboralExpedienteDetallePage.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Row,
  Col,
  Typography,
  Tag,
  Space,
  Button,
  Breadcrumb,
  Card,
  Tabs,
  Modal,
  notification,
} from "antd";
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";

import AudienciaPrejudicialCard from "../../components/conciliacion/AudienciaPrejudicialCard";
import HistorialProcesalCard from "../../components/conciliacion/HistorialProcesal";
import DocumentosCard from "../../components/conciliacion/DocumentosCard";
import MovimientosCard from "../../components/conciliacion/Movimientos";

import {
  actionConciliacionAudienciasGetByID,
  actionConciliacionDocumentosGet,
  actionConciliacionGetByID,
  actionAuditLogGet,
  actionConciliacionHistorialGetByID,
  actionConciliacionDocumentoCreate,
  actionConciliacionDocumentoDelete,
  actionConciliacionDelete,
} from "../../redux/actions/conciliacion/conciliacion";

import DatosExpedienteCard from "../../components/conciliacion/detalles/DatosExpedienteCard";
import ChecklistPrejudicialCard from "../../components/conciliacion/detalles/ChecklistPrejudicialCard";

import {
  fmtDate,
  statusColor,
  getRazonesSocialesText,
  getProximaAudiencia,
  getTipoLaboralLabel,
} from "../../components/conciliacion/detalles/laboralExpedienteFormatters";

import "../../components/conciliacion/detalles/LaboralExpedienteDetallePage.css";
import { de } from "date-fns/locale";


import {PATH} from "../../redux/utils"
const API_BASE = PATH;
const { Title, Text } = Typography;

const toTitleCase = (str) => {
  if (!str || typeof str !== "string") return "—";
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const MISSING_LABEL = "FALTA AGREGAR";

// null/undefined/""/"   "/NaN/"—"
const isEmpty = (v) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "number") return Number.isNaN(v);
  const s = String(v).trim();
  return s === "" || s === "—";
};

const MissingText = ({ inline = true }) => (
  <Text style={{ color: "#ad6800", fontWeight: 600, display: inline ? "inline" : "block" }}>
    {MISSING_LABEL}
  </Text>
);

// Devuelve texto normal o el placeholder amarillo
const showOrMissing = (value, renderValue) => {
  if (isEmpty(value)) return <MissingText />;
  return renderValue ? renderValue(value) : <Text>{String(value)}</Text>;
};
export default function LaboralExpedienteDetallePage({ maps = {} }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { idExpediente } = useParams();
  const location = useLocation();

const [activeMainTab, setActiveMainTab] = useState("1");
const [audienciaJump, setAudienciaJump] = useState(null);
const [deletingExp, setDeletingExp] = useState(false);

  const { documentos, detalle, audiencias } = useSelector(
    (state) => state.conciliacion
  );


  const [exportingPDF, setExportingPDF] = useState(false);

  // carga inicial de datos
// 1) carga inicial por expediente
useEffect(() => {
  dispatch(actionConciliacionDocumentosGet(idExpediente));
  dispatch(actionConciliacionGetByID(idExpediente));
  dispatch(actionConciliacionAudienciasGetByID(idExpediente));
  dispatch(actionConciliacionHistorialGetByID(idExpediente));
}, [dispatch, idExpediente]);

// 2) audit log depende de detalle.id (cuando ya existe)
useEffect(() => {
  if (!detalle?.id) return;
  dispatch(actionAuditLogGet({ id_modulo: 1, id_key: detalle.id, limit: 100 }));
}, [dispatch, detalle?.id]);


  const handleExportPDF = async () => {
    if (!detalle?.expediente_format) {
      notification.error({
        message: "Expediente no disponible",
        description: "No se encontró el expediente_format para exportar.",
      });
      return;
    }

    try {
      setExportingPDF(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE}/conciliaciones/${detalle.expediente_format}/export-membrete`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!res.ok) {
        throw new Error("Error al generar el PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `expediente_${
        detalle.expediente_format || detalle.expediente || "expediente"
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      notification.success({
        message: "PDF generado",
        description: "El expediente se exportó correctamente.",
      });
    } catch (err) {
      console.error(err);
      notification.error({
        message: "Error al exportar",
        description: "No se pudo generar el PDF del expediente.",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  if (!detalle) {
    return (
      <main className="laboral-exp-main">
        <div className="laboral-exp-content">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            className="laboral-exp-back"
            onClick={() => navigate("/materias/laboral/centro-conciliacion")}
          >
            Volver a expedientes
          </Button>

          <Card className="laboral-exp-summary-card p-2">
            <Text>Cargando expediente...</Text>
          </Card>
        </div>
      </main>
    );
  }

  const {
    ciudadesById = {},
    estadosById = {},
    abogadosById = {},
    statusById = {},
    ambitoById = { 1: "Local", 2: "Federal" },
  } = maps;

  const ciudadName =
    detalle.nombre_ciudad ||
    ciudadesById[detalle.id_ciudad]?.nombre ||
    ciudadesById[detalle.id_ciudad] ||
    (detalle.id_ciudad ? `#${detalle.id_ciudad}` : "—");

  const estadoName = (() => {
    if (detalle.nombre_estado) return detalle.nombre_estado;
    const ciudad = ciudadesById[detalle.id_ciudad];
    if (ciudad && ciudad.id_estado && estadosById[ciudad.id_estado]) {
      return (
        estadosById[ciudad.id_estado].nombre ||
        estadosById[ciudad.id_estado].code
      );
    }
    return "—";
  })();

  const ambitoName =
    detalle.nombre_comptencia ||
    ambitoById[detalle.id_competencia] ||
    (detalle.id_competencia ? `#${detalle.id_competencia}` : "—");

  const ObjetoName =
    detalle.nombre_objeto ||
    ambitoById[detalle.id_objeto] ||
    (detalle.id_objeto ? `#${detalle.id_objeto}` : "—");

  const statusName =
    statusById[detalle.id_conciliacion_status]?.nombre || detalle.status;

  const abogadoName =
    detalle.nombre_abogado ||
    abogadosById[detalle.id_abogado]?.nombre ||
    abogadosById[detalle.id_abogado] ||
    (detalle.id_abogado ? `#${detalle.id_abogado}` : "—");

  const proximaAudiencia = getProximaAudiencia(detalle);
  const tipoLaboralLabel = getTipoLaboralLabel(detalle);
const handleAdelantarAudiencia = () => {
  setActiveMainTab("2");
  setAudienciaJump({ ts: Date.now(), type: "adelantar" });
  
};
const handleDeleteExpediente = () => {
  const idToDelete = detalle?.id; // ⚠️ cambia si tu PK real es otro (ej: detalle.id_conciliacion)

  if (!idToDelete) {
    notification.error({
      message: "No se puede eliminar",
      description: "No se encontró el idExpediente del expediente/conciliación.",
    });
    return;
  }

  Modal.confirm({
    title: "Eliminar expediente",
    content:
      "Esta acción elimina el expediente y su información relacionada.",
    okText: "Eliminar",
    okType: "danger",
    cancelText: "Cancelar",
    centered: true,
    okButtonProps: { loading: deletingExp, disabled: deletingExp },
    cancelButtonProps: { disabled: deletingExp },
    onOk: async () => {
      try {
        setDeletingExp(true);

        await dispatch(
          actionConciliacionDelete(idToDelete, () => {
            notification.success({
              message: "Expediente eliminado",
              description: "Se eliminó correctamente.",
            });
            navigate("/materias/laboral/centro-conciliacion");
          })
        );
      } catch (error) {
        const msg =
          error?.response?.data?.detail ||
          error?.message ||
          "No se pudo eliminar el expediente.";

        notification.error({
          message: "Error al eliminar",
          description: msg,
        });
      } finally {
        setDeletingExp(false);
      }
    },
  });
};

  return (
    <main className="laboral-exp-main">
      <div className="laboral-exp-content">
        <Button
  type="link"
  icon={<ArrowLeftOutlined />}
  className="laboral-exp-back"
  onClick={() => navigate(`/materias/laboral/centro-conciliacion${location.search}`)}
>
  Volver a expedientes
</Button>

        <section className="laboral-exp-header p-2">
          <div>
            <Space direction="vertical" size={4}>
              <Title level={3} className="laboral-exp-title">
                Detalle de expediente · {tipoLaboralLabel}
              </Title>
            </Space>
          </div>

        </section>

        <section className="laboral-exp-section">
          <Card className="laboral-exp-summary-card p-2">
            <Row align="middle" gutter={[16, 16]} justify="space-between">
              <Col flex="auto">
                <Space direction="vertical" size={8}>
                  <Space align="center" wrap>
                    <div className="laboral-exp-icon-badge">
                      <FileTextOutlined />
                    </div>
                    <div className="laboral-exp-summary-title">
                      <Title level={4} style={{ margin: 0 }}>
                       {toTitleCase(detalle.nombre_trabajador)} vs{" "}
                        {getRazonesSocialesText(detalle)}
                      </Title>
                      <Text
                        type="secondary"
                        className="laboral-exp-subtitle"
                      >
                        Núm. de expediente: {detalle.expediente || "Sin número"}
                      </Text>
                    </div>
                    <Tag
                      color={statusColor(detalle.id_conciliacion_status)}
                      className="laboral-exp-status-tag"
                    >
                      {statusName || "Sin status"}
                    </Tag>
                  </Space>

                  <Space size="large" wrap className="laboral-exp-summary-meta">
                    <Space className="laboral-exp-meta-item">
                      <EnvironmentOutlined />
                      <Text>
                          Creado:{" "}
                        {ciudadName}
                        {estadoName !== "—" ? `, ${estadoName}` : ""}
                      </Text>
                    </Space>
                    <Space className="laboral-exp-meta-item">
                      <CalendarOutlined />
                      <Text>
                        Creado:{" "}
                        {fmtDate(
                          detalle.fecha_creacion_expediente ||
                            detalle.created_at
                        )}
                      </Text>
                    </Space>
                    <Space className="laboral-exp-meta-item">
                      <IdcardOutlined />
                      <Text>Creado por: {toTitleCase(detalle.nombre_usuario)}</Text>
                    </Space>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Card>
        </section>

        <Tabs
          className="laboral-exp-tabs"
          defaultActiveKey="1"
          
          activeKey={activeMainTab}
  onChange={setActiveMainTab}
          animated
          items={[
            {
              label: "Principal",
              key: "1",
              children: (
                <>
                  <section className="laboral-exp-section">
                    <DatosExpedienteCard
                    audiencias={audiencias}
  detalle={detalle}
  ObjetoName={ObjetoName}
  estadoName={estadoName}
  ciudadName={ciudadName}
  ambitoName={ambitoName}
  proximaAudiencia={proximaAudiencia}
  onExportPDF={handleExportPDF}
    exportingPDF={exportingPDF}

  onAdelantarAudiencia={handleAdelantarAudiencia} 
    onDeleteExpediente={handleDeleteExpediente}
  deletingExp={deletingExp}      
/>

                  </section>

                  <section className="laboral-exp-section">
                    <ChecklistPrejudicialCard idExpediente={idExpediente} />
                  </section>
                </>
              ),
            },
            {
              label: "Audiencia Prejudicial",
              key: "2",
              children: (
                <AudienciaPrejudicialCard
                  data={detalle}
                  dataAudiencias={audiencias}
                            jump={audienciaJump} // ✅ NUEVO

                />
              ),
            },
            {
              label: "Historia Procesal",
              key: "3",
              children: <HistorialProcesalCard data={detalle} />,
            },
            {
              label: "Documentos",
              key: "4",
              children: (
                <DocumentosCard
                  data={documentos}
                  dataDetalles={detalle}
                  idExpediente={idExpediente}
                  tiposDocumentos={documentos?.items?.tipos_documentos}
                  onCreateDocumento={(payload) =>
                    dispatch(actionConciliacionDocumentoCreate(payload))
                  }
                  onDeleteDocumento={(payload) =>
                    dispatch(actionConciliacionDocumentoDelete(payload))
                  }
                />
              ),
            },
         
             {
              label: "Actividad",
              key: "6",
              children: <MovimientosCard  />,
            },
          ]}
        />
      </div>
    </main>
  );
}
