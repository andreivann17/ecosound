import React from "react";
import { useNavigate } from "react-router-dom";
import HeaderNavbar from "../../components/navigation/header_navbar.jsx";

import { Card, Row, Col, Typography, Button, Space, Tag, Breadcrumb } from "antd";
import {
  BookOutlined,
  CheckCircleOutlined,
  AppstoreOutlined,
  SolutionOutlined,
  AlertOutlined,
  ReconciliationOutlined,
  HomeOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

function Materias() {
  const navigate = useNavigate();

  // Estadísticas rápidas (luego las ligas a datos reales)
  const summaryItems = [
    {
      key: "materias-total",
      label: "Materias registradas",
      value: "42",
      icon: <BookOutlined />,
    },
    {
      key: "materias-activas",
      label: "Materias activas",
      value: "18",
      icon: <CheckCircleOutlined />,
    },
    {
      key: "materias-tipos",
      label: "Tipos configurados",
      value: "7",
      icon: <AppstoreOutlined />,
    },
  ];

  // Tipos de materia
  const materias = [
    {
      key: "laboral",
      title: "Laboral",
      tag: "Frecuente",
      description:
        "Conflictos individuales y colectivos de trabajo, despidos, prestaciones y seguridad social.",
      icon: <SolutionOutlined />,
      route: "/materias/laboral",
      disabled: false,
    },
    {
      key: "penal",
      title: "Penal",
      tag: "Alta sensibilidad",
      description:
        "Delitos, procedimientos penales y estrategias de defensa o asesoría jurídica especializada.",
      icon: <AlertOutlined />,
      route: "/materias/penal",
      disabled: true,
    },
    {
      key: "mercantil",
      title: "Mercantil",
      tag: "Empresarial",
      description:
        "Controversias entre comerciantes, contratos mercantiles, títulos de crédito y obligaciones.",
      icon: <ReconciliationOutlined />,
      route: "/materias/mercantil",
      disabled: true,
    },
    {
      key: "civil",
      title: "Civil",
      tag: "Patrimonial",
      description:
        "Contratos civiles, obligaciones, daños y perjuicios, arrendamientos y controversias de propiedad.",
      icon: <HomeOutlined />,
      route: "/materias/civil",
      disabled: true,
    },
    {
      key: "familiar",
      title: "Familiar",
      tag: "Personas",
      description:
        "Divorcios, guardia y custodia, pensiones alimenticias y procedimientos de adopción.",
      icon: <TeamOutlined />,
      route: "/materias/familiar",
      disabled: true,
    },
    {
      key: "agrario",
      title: "Agrario",
      tag: "Tierras",
      description:
        "Ejidos, comunidades agrarias, tenencia de la tierra y conflictos sobre uso y aprovechamiento.",
      icon: <EnvironmentOutlined />,
      route: "/materias/agrario",
      disabled: true,
    },
    {
      key: "otro",
      title: "Otra materia",
      tag: "Personalizada",
      description:
        "Configura otros tipos de materia que maneje el despacho y no estén cubiertos en las categorías anteriores.",
      icon: <AppstoreOutlined />,
      route: "/materias/otro",
      disabled: true,
    },
  ];

  const handleOpenMateria = (mat) => {
    if (!mat?.route) return;
    if (mat.disabled) return;
    navigate(mat.route);
  };

  return (
    <>
      {/* Si tu layout global ya pinta el header, deja esto comentado.
          Si no, descoméntalo. */}
      {/* <HeaderNavbar /> */}

      <main className="materias-main">
        <div className="materias-content">
          {/* Header principal */}
         <section className="materias-header-section">
  <div>
    <Button
      type="link"
      icon={<ArrowLeftOutlined />}
      onClick={() => navigate("/home")}
      className="materias-back-btn"
    >
      Volver a Inicio
    </Button>

    <Title level={3} className="materias-title">
      Materias
    </Title>
    <Text className="materias-subtitle">
      Configura los tipos de materia que atiende el despacho. Esta
      configuración se utilizará al registrar expedientes y
      conciliaciones.
    </Text>
  </div>
</section>


          {/* Tipos de materia */}
          <section className="materias-modules-section">
            <Text className="materias-section-title">Tipos de materia</Text>
            <Row gutter={[24, 24]}>
              {materias.map((mat) => (
                <Col key={mat.key} xs={24} sm={12} md={8}>
                  <Card
                    className={`materias-card ${
                      mat.disabled ? "materias-card-disabled" : ""
                    }`}
                    hoverable={!mat.disabled}
                    onClick={() => handleOpenMateria(mat)}
                  >
                    <Space direction="vertical" size={10} style={{ width: "100%" }}>
                      <div className="materias-card-header">
                        <div className="materias-card-icon">{mat.icon}</div>
                        <div className="materias-card-title">
                          <Title level={4}>{mat.title}</Title>
                          <Tag className="materias-card-tag">{mat.tag}</Tag>
                        </div>
                      </div>

                      <Text className="materias-card-description">
                        {mat.description}
                      </Text>

                      <div className="materias-card-footer">
                        <Text type="secondary" className="materias-card-hint">
                          Haz clic para ir a esta materia
                        </Text>
                        <Button
                          type="primary"
                          size="small"
                          disabled={mat.disabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMateria(mat);
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
.materias-main {
  background-color: #eef1f5;
  min-height: calc(100vh - 56px);
  padding: 40px 40px 24px;
}

.materias-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* ============================
   HEADER
   ============================ */
.materias-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}

.materias-title {
  margin-bottom: 4px !important;
}

.materias-subtitle {
  color: #7a7f87;
}

.materias-location {
  align-self: center;
  font-size: 12px;
}

/* ============================
   TÍTULOS DE SECCIÓN
   ============================ */
.materias-section-title {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #7a7f87;
  margin-bottom: 8px;
}

/* ============================
   RESUMEN / STATS
   ============================ */
.materias-summary-section {
  margin-bottom: 28px;
}

.materias-summary-card {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #dde2eb;
  box-shadow: none;
  cursor: default;
}

.materias-summary-card:hover {
  box-shadow: none;
  border-color: #dde2eb;
}

.materias-summary-icon {
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

.materias-summary-text {
  display: flex;
  flex-direction: column;
}

.materias-summary-value {
  font-weight: 600;
  font-size: 14px;
}

.materias-summary-label {
  font-size: 11px;
  color: #7a7f87;
}

/* ============================
   TARJETAS DE MATERIA
   ============================ */
.materias-modules-section {
  margin-top: 4px;
}

.materias-card {
  border-radius: 14px !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(15, 34, 58, 0.08);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
}

.materias-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(15, 34, 58, 0.18);
}

.materias-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.materias-card-icon {
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

.materias-card-title h4 {
  margin: 0;
}

.materias-card-tag {
  margin-top: 2px;
  font-size: 10px;
  border-radius: 999px;
}

.materias-card-description {
  font-size: 13px;
  color: #5b6270;
}

.materias-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}

.materias-card-hint {
  font-size: 11px;
}

/* ============================
   DISABLED
   ============================ */
.materias-card-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.materias-card-disabled:hover {
  transform: none !important;
  box-shadow: 0 4px 14px rgba(15, 34, 58, 0.08) !important;
}

.materias-card-disabled,
.materias-card-disabled * {
  cursor: not-allowed !important;
}

/* ============================
   RESPONSIVO
   ============================ */
@media (max-width: 768px) {
  .materias-main {
    padding: 24px 16px;
  }

  .materias-header-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .materias-location {
    align-self: flex-start;
    margin-top: 8px;
  }

  .materias-summary-section {
    margin-bottom: 20px;
  }
}.materias-back-btn {
  padding: 0;
  height: auto;
  font-size: 13px;
  margin-bottom: 6px;
  
}

.materias-back-btn:hover {
  color: #1f4d7a;
}

        `}
      </style>
    </>
  );
}

export default Materias;
