import React from "react";
import ErrorPage from "./ErrorPage";

export default function Error403() {
  return (
    <ErrorPage
      code="403"
      title="Acceso denegado"
      description="No tienes permisos para ver este contenido. Si crees que esto es un error, contacta al administrador."
      color="#d97706"
      icon="🚫"
      primaryAction={{ label: "Ir al inicio", path: "/app/home" }}
      secondaryAction={{ label: "Volver atrás" }}
    />
  );
}
