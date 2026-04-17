// src/components/tribunal/DocumentosTribunalCard.jsx
import React from "react";
import CardAudiencia from "./CardAudiencia";

export default function DocumentosTribunalCard({
  detalle,
  idExpediente,
  dataDocumentos,
}) {
  // dataDocumentos viene de pruebas_documentacion.documentos
  // shape: { count, items:[...docs...] }

  return (
    <CardAudiencia
      dataDetalles={detalle}
      data={dataDocumentos}
      idExpediente={idExpediente}
      // Cuando me pegues tus actions reales de crear/eliminar tribunal,
      // aquí conectas:
      // onCreateDocumento={(payload) => dispatch(actionTribunalDocumentoCreate(payload))}
      // onDeleteDocumento={(payload) => dispatch(actionTribunalDocumentoDelete(payload))}
    />
  );
}
