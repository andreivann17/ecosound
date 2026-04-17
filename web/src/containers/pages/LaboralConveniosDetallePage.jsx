// src/pages/materias/laboral/LaboralExpedienteDetallePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Row,
  Col,
  Typography,
  Space,
  Button,
  Breadcrumb,
  Card,
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
import { useDispatch } from "react-redux";

import { fmtDate } from "../../components/conciliacion/detalles/laboralExpedienteFormatters";
import {
  actionDesvinculacionGetById,
  actionAuditLogGet,
  actionDesvinculacionDeleteById
} from "../../redux/actions/desvinculaciones/desvinculaciones";

import DatosExpedienteCard from "../../components/desvinculaciones/detalles/DatosExpedienteCard";
import "../../components/conciliacion/detalles/LaboralExpedienteDetallePage.css";

const { Title, Text } = Typography;

export default function LaboralExpedienteDetallePage({ maps = {} }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { idExpediente } = useParams();

  // ESTE es el detalle (local), no redux
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
const [deletingExp, setDeletingExp] = useState(false);
  const {
    ciudadesById = {},
    estadosById = {},
  } = maps;

  // 1) Cargar detalle DIRECTO desde la action (retorno)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingDetalle(true);
        const data = await dispatch(actionDesvinculacionGetById(idExpediente));
        if (!mounted) return;

        setDetalle(data || null);
      } catch (err) {
        console.error(err);
        if (!mounted) return;

        notification.error({
          message: "Error al cargar",
          description: "No se pudo obtener el detalle de la desvinculación.",
        });
        setDetalle(null);
      } finally {
        if (mounted) setLoadingDetalle(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dispatch, idExpediente]);

  // 2) audit log cuando ya existe detalle.id
  useEffect(() => {
    if (!detalle?.id) return;
    dispatch(actionAuditLogGet({ id_modulo: 2, id_key: detalle.id, limit: 100 }));
  }, [dispatch, detalle?.id]);

  const ciudadName = useMemo(() => {
    if (!detalle) return "—";
    return (
      detalle.nombre_ciudad ||
      ciudadesById[detalle.id_ciudad]?.nombre ||
      ciudadesById[detalle.id_ciudad] ||
      (detalle.id_ciudad ? `#${detalle.id_ciudad}` : "—")
    );
  }, [detalle, ciudadesById]);

  const estadoName = useMemo(() => {
    if (!detalle) return "—";
    if (detalle.nombre_estado) return detalle.nombre_estado;

    const ciudad = ciudadesById[detalle.id_ciudad];
    if (ciudad && ciudad.id_estado && estadosById[ciudad.id_estado]) {
      return estadosById[ciudad.id_estado].nombre || estadosById[ciudad.id_estado].code;
    }
    return "—";
  }, [detalle, ciudadesById, estadosById]);

  const handleExportPDF = async () => {
    notification.info({
      message: "Exportar PDF",
      description: "Aquí deja tu lógica real de exportación si aplica.",
    });
  };

  if (loadingDetalle || !detalle) {
    return (
      <main className="laboral-exp-main">
        <div className="laboral-exp-content">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            className="laboral-exp-back"
            onClick={() => navigate(-1)}
          >
            Volver a expedientes
          </Button>

          <Card className="laboral-exp-summary-card p-2">
            <Text>{loadingDetalle ? "Cargando desvinculación..." : "Sin datos"}</Text>
          </Card>
        </div>
      </main>
    );
  }
const handleDeleteExpediente = () => {
  const idToDelete = detalle?.id; // ⚠️ cambia si tu PK real es otro (ej: detalle.id_conciliacion)

  if (!idToDelete) {
    notification.error({
      message: "No se puede eliminar",
      description: "No se encontró el ID del expediente/conciliación.",
    });
    return;
  }

  Modal.confirm({
    title: "Eliminar desvinculación",
    content:
      "Esta acción elimina la desvinculación y su información relacionada.",
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
          actionDesvinculacionDeleteById(idToDelete, () => {
            notification.success({
              message: "Desvinculación eliminada",
              description: "Se eliminó correctamente.",
            });
            navigate("/materias/laboral/desvinculaciones");
          })
        );
      } catch (error) {
        const msg =
          error?.response?.data?.detail ||
          error?.message ||
          "No se pudo eliminar la desvinculación.";

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
          onClick={() => navigate(-1)}
        >
          Volver a expedientes
        </Button>

        <section className="laboral-exp-header p-2">
          <div>
            <Space direction="vertical" size={4}>
              <Title level={3} className="laboral-exp-title">
                Detalle de desvinculación
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
                        {detalle.nombre_solicitante || "—"}{" "}
                        {detalle.nombre_empresa ? `vs ${detalle.nombre_empresa}` : ""}
                      </Title>
                      <Text type="secondary" className="laboral-exp-subtitle">
                        ID: {detalle.code ?? detalle.id ?? "—"}
                      </Text>
                    </div>
                  </Space>

                  <Space size="large" wrap className="laboral-exp-summary-meta">
                    <Space className="laboral-exp-meta-item">
                      <EnvironmentOutlined />
                      <Text>
                        Ubicación: {ciudadName}
                        {estadoName !== "—" ? `, ${estadoName}` : ""}
                      </Text>
                    </Space>

                    <Space className="laboral-exp-meta-item">
                      <CalendarOutlined />
                      <Text>Creado: {fmtDate(detalle.created_at)}</Text>
                    </Space>

                    <Space className="laboral-exp-meta-item">
                      <IdcardOutlined />
                      <Text>Creado Por: {detalle.nombre_usuario ?? "—"}</Text>
                    </Space>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Card>
        </section>

        <DatosExpedienteCard
          detalle={detalle}
          ciudadName={ciudadName}
          estadoName={estadoName}
          onExportPDF={handleExportPDF}
          exportingPDF={exportingPDF}
              onDeleteExpediente={handleDeleteExpediente}
  deletingExp={deletingExp}     
        />
      </div>
    </main>
  );
}
