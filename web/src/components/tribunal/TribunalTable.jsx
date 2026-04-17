import dayjs from "dayjs";

export default function TribunalTable({ items }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
      <table className="min-w-full divide-y">
        <thead className="bg-gray-50">
          <tr className="text-xs uppercase text-gray-500">
            <th className="px-6 py-3">Expediente / Actor</th>
            <th className="px-6 py-3">Acción & Estatus</th>
            <th className="px-6 py-3">Tribunal</th>
            <th className="px-6 py-3">Próximo Evento</th>
            <th className="px-6 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((exp) => (
            <tr key={exp.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="font-semibold">{exp.expediente}</div>
                <div className="text-sm text-gray-500">
                  {exp.nombre_trabajador} vs
                </div>
                <div className="text-xs text-gray-400">
                  {exp.empresa_nombre}
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="text-sm font-medium">
                  {exp.accion_intentada}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {exp.id_tribunal_documento_citatorio
                    ? "Con Citatorio"
                    : "Pendiente"}
                </span>
              </td>

              <td className="px-6 py-4 text-sm">
                {exp.nombre_autoridad}
                <div className="text-xs text-gray-400">
                  {exp.nombre_estado} / {exp.nombre_ciudad}
                </div>
              </td>

              <td className="px-6 py-4 text-sm">
                {exp.fecha_limite_contestacion
                  ? dayjs(exp.fecha_limite_contestacion).format("DD MMM YYYY")
                  : "N/A"}
              </td>

              <td className="px-6 py-4 text-right text-sm">
                <button className="text-gray-400 hover:text-blue-600">
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
