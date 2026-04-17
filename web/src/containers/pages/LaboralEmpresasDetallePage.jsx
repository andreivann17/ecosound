// src/pages/materias/empresas/EmpresaDetallePage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Row,
  Col,
  Typography,
  Space,
  Button,
  Card,
  Modal,
  notification,
} from "antd";
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  CalendarOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { useDispatch } from "react-redux";

import { fmtDate } from "../../components/conciliacion/detalles/laboralExpedienteFormatters";


import {
  actionEmpresaGetById,
  actionEmpresaDelete,
} from "../../redux/actions/empresas/empresas";

import DatosEmpresaCard from "../../components/empresas/detalles/DatosCard";
import "../../components/conciliacion/detalles/LaboralExpedienteDetallePage.css";

const { Title, Text } = Typography;

export default function EmpresaDetallePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { idEmpresa } = useParams();
const location = useLocation();
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [deleting, setDeleting] = useState(false);


  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingDetalle(true);
        const data = await dispatch(actionEmpresaGetById(idEmpresa));
        if (!mounted) return;
        setDetalle(data || null);
      } catch (err) {
        console.error(err);
        if (!mounted) return;

        notification.error({
          message: "Error al cargar",
          description: "No se pudo obtener el detalle de la empresa.",
        });
        setDetalle(null);
      } finally {
        if (mounted) setLoadingDetalle(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dispatch, idEmpresa]);

  const handleExportPDF = async () => {
    notification.info({
      message: "Exportar PDF",
      description: "Aquí va tu lógica real si aplica.",
    });
  };

  const handleDeleteEmpresa = () => {

    
    const idToDelete = detalle?.id_empresa ?? detalle?.id;

    if (!idToDelete) {
      notification.error({
        message: "No se puede eliminar",
        description: "No se encontró el ID de la empresa.",
      });
      return;
    }

    Modal.confirm({
      title: "Eliminar empresa",
      content: "Esta acción elimina la empresa y su información relacionada.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      okButtonProps: { loading: deleting, disabled: deleting },
      cancelButtonProps: { disabled: deleting },
      onOk: async () => {
        try {
          setDeleting(true);

          await dispatch(
            actionEmpresaDelete(idToDelete, () => {
              notification.success({
                message: "Empresa eliminada",
                description: "Se eliminó correctamente.",
              });
              navigate("/empresas");
            })
          );
        } catch (error) {
          const msg =
            error?.response?.data?.detail ||
            error?.message ||
            "No se pudo eliminar la empresa.";

          notification.error({
            message: "Error al eliminar",
            description: msg,
          });
        } finally {
          setDeleting(false);
        }
      },
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
              onClick={() => navigate(`/empresas${location.search}`)}
          >
            Volver
          </Button>

          <Card className="laboral-exp-summary-card p-2">
            <Text>{loadingDetalle ? "Cargando empresa..." : "Sin datos"}</Text>
          </Card>
        </div>
      </main>
    );
  }

  const idLabel = detalle.code ?? detalle.id_empresa ?? detalle.id ?? "—";

  const renderContent = () => (
    <DatosEmpresaCard
      detalle={detalle}
      onExportPDF={handleExportPDF}
      exportingPDF={exportingPDF}
      onDeleteEmpresa={handleDeleteEmpresa}
      deleting={deleting}
    />
  );

  return (
    <main className="laboral-exp-main">
      <div className="laboral-exp-content">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          className="laboral-exp-back"
           onClick={() => navigate(`/empresas${location.search}`)}
        >
          Volver
        </Button>

        <section className="laboral-exp-header p-2">
          <div>
            <Space direction="vertical" size={10}>
              <Title level={3} className="laboral-exp-title">
                Detalle de empresa
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
                        {detalle.nombre || "—"}
                      </Title>

                      <Text type="secondary" className="laboral-exp-subtitle">
                        ID: {idLabel}
                      </Text>
                    </div>
                  </Space>

                  <Space size="large" wrap className="laboral-exp-summary-meta">
                    <Space className="laboral-exp-meta-item">
                      <CalendarOutlined />
                      <Text>Creado: {fmtDate(detalle.created_at)}</Text>
                    </Space>

                    <Space className="laboral-exp-meta-item">
                      <CalendarOutlined />
                      <Text>Actualizado: {fmtDate(detalle.updated_at)}</Text>
                    </Space>

                    <Space className="laboral-exp-meta-item">
                      <IdcardOutlined />
                      <Text>Creado por (ID): {detalle.id_user_created ?? "—"}</Text>
                    </Space>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Card>
        </section>


        {/* Contenido según "tab" */}
        {renderContent()}
      </div>
    </main>
  );
}
