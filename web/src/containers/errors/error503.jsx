import React from "react";
import ErrorPage from "./ErrorPage";

export default function Error503() {
  return (
    <ErrorPage
      code="503"
      title="Servicio no disponible"
      description="El servicio está temporalmente fuera de línea por mantenimiento. Vuelve a intentarlo en breve."
      color="#7c3aed"
      icon="🔧"
      primaryAction={{ label: "Ir al inicio", path: "/app/home" }}
      secondaryAction={{ label: "Volver atrás" }}
    />
  );
}
