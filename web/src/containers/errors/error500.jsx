import React from "react";
import ErrorPage from "./ErrorPage";

export default function Error500() {
  return (
    <ErrorPage
      code="500"
      title="Error del servidor"
      description="Algo salió mal en el servidor. Ya estamos trabajando para solucionarlo. Intenta de nuevo en unos momentos."
      color="#dc2626"
      icon="⚡"
      primaryAction={{ label: "Reintentar", path: "/app/home" }}
      secondaryAction={{ label: "Volver atrás" }}
    />
  );
}
