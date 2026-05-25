import React from "react";
import ErrorPage from "./ErrorPage";

export default function Error401() {
  return (
    <ErrorPage
      code="401"
      title="Sesión requerida"
      description="Necesitas iniciar sesión para acceder a esta sección. Si ya tienes cuenta, ingresa con tus credenciales."
      color="#2563eb"
      icon="🔒"
      primaryAction={{ label: "Iniciar sesión", path: "/login" }}
      secondaryAction={{ label: "Volver atrás" }}
    />
  );
}
