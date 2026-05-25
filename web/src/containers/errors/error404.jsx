import React from "react";
import ErrorPage from "./ErrorPage";

export default function Error404() {
  return (
    <ErrorPage
      code="404"
      title="Página no encontrada"
      description="La página que buscas no existe o fue movida a otra ubicación. Verifica la dirección e intenta de nuevo."
      color="#2e5f4d"
      icon="🔍"
      primaryAction={{ label: "Ir al inicio", path: "/app/home" }}
      secondaryAction={{ label: "Volver atrás" }}
    />
  );
}
