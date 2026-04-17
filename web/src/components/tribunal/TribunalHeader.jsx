export default function TribunalHeader({ estado, ciudad, onCreate }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <a className="text-primary text-sm flex items-center gap-1 mb-1 font-medium">
          ← Volver a Inicio
        </a>
        <h1 className="text-2xl font-semibold">Tribunal · Materia laboral</h1>
        <p className="text-sm text-gray-500 mt-1">
          Expedientes de tribunal en{" "}
          <span className="font-medium">
            {estado?.nombre || "—"} / {ciudad?.nombre || "—"}
          </span>
        </p>
      </div>

      <div className="flex gap-3">
        <button className="border px-4 py-2 rounded-md text-sm shadow-sm">
          Exportar
        </button>
        <button
          onClick={onCreate}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm shadow-sm"
        >
          + Crear expediente
        </button>
      </div>
    </div>
  );
}
