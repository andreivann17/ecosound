export default function TribunalStats({ counts }) {
  const stats = [
    { label: "Próximas Audiencias", value: counts.conAudiencia },
    { label: "Términos Críticos", value: counts.conLimite },
    { label: "Pendientes", value: counts.sinCitatorio },
    { label: "Sin Actividad (15d+)", value: counts.sinAudiencia },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white p-4 rounded-xl shadow-sm border"
        >
          <div className="text-2xl font-bold">{s.value}</div>
          <div className="text-xs text-gray-500 uppercase mt-1">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
