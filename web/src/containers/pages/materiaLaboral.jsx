import React from "react";
import { useNavigate } from "react-router-dom";
import HeaderNavbar from "../../components/navigation/header_navbar.jsx"; // ajusta la ruta si es necesario

import { Card, Row, Col, Typography, Button, Space, Tag, Breadcrumb } from "antd";
import {
  SolutionOutlined,
  TeamOutlined,
  BankOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  UserDeleteOutlined,
  ScheduleOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

function MateriaLaboral() {
  const navigate = useNavigate();

  // Estadísticas rápidas de materia laboral (placeholders)
  const summaryItems = [
    {
      key: "expedientes-laborales",
      label: "Expedientes laborales",
      value: "86",
      icon: <SolutionOutlined />,
    },
    {
      key: "audiencias-laborales",
      label: "Audiencias laborales esta semana",
      value: "5",
      icon: <ScheduleOutlined />,
    },
    {
      key: "clientes-laborales",
      label: "Clientes con asuntos laborales",
      value: "22",
      icon: <TeamOutlined />,
    },
  ];

  // Submódulos / tipos dentro de Laboral
  const laboralOptions = [
    {
      key: "fuera-juicio",
      title: "Procedimiento fuera de juicio",
      tag: "Previo a demanda",
      description:
        "Gestiones, negociaciones y acuerdos previos a la presentación formal de una demanda laboral.",
      icon: <SolutionOutlined />,
      route: "/materias/laboral/fuera-juicio",
      disabled: true,
    },
    {
      key: "centro-conciliacion",
      title: "Centro de conciliación",
      tag: "Conciliación",
      description:
        "Asuntos tramitados ante los Centros de Conciliación laboral, desde la cita inicial hasta el convenio.",
      icon: <TeamOutlined />,
      route: "/materias/laboral/centro-conciliacion",
      disabled: false,
    },
    {
      key: "tribunal",
      title: "Tribunal",
      tag: "Jurisdiccional",
      description:
        "Juicios laborales radicados ante el Tribunal laboral, incluyendo demandas, audiencias y resoluciones.",
      icon: <BankOutlined />,
      route: "/materias/laboral/tribunal",
      disabled: true,
    },
    {
      key: "junta-conciliacion",
      title: "Junta de conciliación",
      tag: "Histórico",
      description:
        "Asuntos heredados o en trámite ante Juntas de Conciliación y Arbitraje, aún en proceso o en ejecución.",
      icon: <TeamOutlined />,
      route: "/materias/laboral/junta-conciliacion",
      disabled: true,
    },
    {
      key: "documentacion",
      title: "Documentación",
      tag: "Expedientes",
      description:
        "Control de expedientes físicos y digitales, renuncias, convenios, contratos y evidencia laboral.",
      icon: <FolderOpenOutlined />,
      route: "/materias/laboral/documentacion",
      disabled: true,
    },
    {
      key: "desvinculaciones",
      title: "Desvinculaciones y Convenios",
      tag: "Expedientes",
      description: "Registro y control de bajas de empleados.",
      icon: <UserDeleteOutlined />,
      route: "/materias/laboral/desvinculaciones",
      disabled: false,
    },
  
  ];

  const handleOpenOption = (opt) => {
    if (!opt?.route) return;
    if (opt.disabled) return;
    navigate(opt.route);
  };

  return (
    <>
      {/* Si tu layout global ya pinta el header, deja esto comentado.
          Si no, descoméntalo. */}
      {/* <HeaderNavbar /> */}

      <main className="laboral-main">
        <div className="laboral-content">
          {/* Header principal */}
          <section className="laboral-header-section">
            <div>
              <Button
                  type="link"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate("/materias")}
                  className="laboral-back-btn"
                >
                  Volver a Materia
                </Button>

              <Title level={3} className="laboral-title">
                Materia laboral
              </Title>
              <Text className="laboral-subtitle">
                Define y organiza los tipos de procedimientos laborales que maneja
                el despacho. Esta estructura se utilizará para clasificar los
                expedientes laborales.
              </Text>
            </div>
            
          </section>

          {/* Opciones dentro de materia laboral */}
          <section className="laboral-modules-section">
            <Text className="laboral-section-title">
              Tipos de procedimientos laborales
            </Text>
            <Row gutter={[24, 24]}>
              {laboralOptions.map((opt) => (
                <Col key={opt.key} xs={24} sm={12} md={8}>
                  <Card
                    className={`laboral-card ${opt.disabled ? "laboral-card-disabled" : ""}`}
                    hoverable={!opt.disabled}
                    onClick={() => handleOpenOption(opt)}
                  >
                    <Space
                      direction="vertical"
                      size={10}
                      style={{ width: "100%" }}
                    >
                      <div className="laboral-card-header">
                        <div className="laboral-card-icon">{opt.icon}</div>
                        <div className="laboral-card-title">
                          <Title level={4}>{opt.title}</Title>
                          <Tag className="laboral-card-tag">{opt.tag}</Tag>
                        </div>
                      </div>

                      <Text className="laboral-card-description">
                        {opt.description}
                      </Text>

                      <div className="laboral-card-footer">
                        <Text type="secondary" className="laboral-card-hint">
                          Haz clic para administrar esta categoría laboral
                        </Text>
                        <Button
                          type="primary"
                          size="small"
                          disabled={opt.disabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOption(opt);
                          }}
                        >
                          Abrir
                        </Button>
                      </div>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>
        </div>
      </main>

      <style>
        {`
/* ============================
   LAYOUT GENERAL
   ============================ */
.laboral-main {
  background-color: #eef1f5;
  min-height: calc(100vh - 56px);
  padding: 40px 40px 24px;
}

.laboral-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* ============================
   HEADER
   ============================ */
.laboral-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}

.laboral-title {
  margin-bottom: 4px !important;
}

.laboral-subtitle {
  color: #7a7f87;
}

.laboral-location {
  align-self: center;
  font-size: 12px;
}

/* ============================
   TÍTULOS DE SECCIÓN
   ============================ */
.laboral-section-title {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #7a7f87;
  margin-bottom: 8px;
}

/* ============================
   RESUMEN / STATS LABORAL
   ============================ */
.laboral-summary-section {
  margin-bottom: 28px;
}

.laboral-summary-card {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #dde2eb;
  box-shadow: none;
  cursor: default;
}

.laboral-summary-card:hover {
  box-shadow: none;
  border-color: #dde2eb;
}

.laboral-summary-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #102a43;
  color: #ffd400;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-size: 15px;
}

.laboral-summary-text {
  display: flex;
  flex-direction: column;
}

.laboral-summary-value {
  font-weight: 600;
  font-size: 14px;
}

.laboral-summary-label {
  font-size: 11px;
  color: #7a7f87;
}

/* ============================
   TARJETAS DE OPCIONES LABORALES
   ============================ */
.laboral-modules-section {
  margin-top: 4px;
}

.laboral-card {
  border-radius: 14px !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(15, 34, 58, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
}

.laboral-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(15, 34, 58, 0.18);
}

.laboral-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.laboral-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #102a43;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #ffd400;
}

.laboral-card-title h4 {
  margin: 0;
}

.laboral-card-tag {
  margin-top: 2px;
  font-size: 10px;
  border-radius: 999px;
}

.laboral-card-description {
  font-size: 13px;
  color: #5b6270;
}

.laboral-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.laboral-card-hint {
  font-size: 11px;
}

/* ============================
   DISABLED
   ============================ */
.laboral-card-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.laboral-card-disabled:hover {
  transform: none !important;
  box-shadow: 0 4px 14px rgba(15, 34, 58, 0.08) !important;
}

.laboral-card-disabled,
.laboral-card-disabled * {
  cursor: not-allowed !important;
}

/* ============================
   RESPONSIVO
   ============================ */
@media (max-width: 768px) {
  .laboral-main {
    padding: 24px 16px;
  }

  .laboral-header-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .laboral-location {
    align-self: flex-start;
    margin-top: 8px;
  }

  .laboral-summary-section {
    margin-bottom: 20px;
  }
}
        `}
      </style>
    </>
  );
}

export default MateriaLaboral;
