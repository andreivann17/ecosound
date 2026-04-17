// src/pages/materias/laboral/CrearExpedientePage.jsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography, Breadcrumb, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import FormCentroConciliacion from "../../components/forms/centro_conciliacion/FormCentroConciliacion";
import FormFueraJuicio from "../../components/forms/centro_conciliacion/FormCentroConciliacion";
// más adelante: FormTribunal, etc.

const { Title } = Typography;

export default function CrearExpedientePage() {
  const { tipo, idEstado, idCiudad } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(`/materias/laboral/`);
  };

  const commonProps = {
    tipo,
    idEstado,
    idCiudad,
    onSaved: () => handleBack(), // después de guardar regresa a la lista
    onCancel: () => handleBack(),
  };

  let form = <FormCentroConciliacion {...commonProps} />

  return (
     <main className="laboral-main">
    {/* NUEVO contenedor para alinear header + form */}
    <div className="expediente-page-container">
      <section className="laboral-header-section">
        <div className="laboral-header-left">
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="laboral-back-btn"
          >
            Volver a expedientes
          </Button>
          
        </div>

        <div className="laboral-location">
          <Breadcrumb
            items={[
              { title: "Panel principal", href: "/" },
              { title: "Materias", href: "/materias" },
              { title: "Laboral", href: "/materias/laboral" },
              { title: "Crear expediente" },
            ]}
          />
        </div>
      </section>

        {/* Aquí va el formulario específico */}
        {form}
      </div>
      <style>
        {`
        /* Contenedor centrado para la página de crear expediente */
.expediente-page-container {
  max-width: 1200px;      /* mismo ancho que el card del formulario */
  margin: 0 auto;         /* centra horizontalmente */
  padding: 16px 24px 40px;
}

/* Alinea título + breadcrumb como en las otras vistas */
.laboral-header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.laboral-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Que el botón de volver no tenga sangría extra */
.laboral-back-btn {
  padding-left: 0;
}

        `}
      </style>
    </main>

  );
}
