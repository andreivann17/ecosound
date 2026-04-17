export default function TribunalFilters({
  estadosOptions,
  ciudadesOptions,
  estadoId,
  ciudadId,
  autoridadId,
  setEstadoId,
  setCiudadId,
  setAutoridadId,
  search,
  setSearch,
  setDateRange,
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border flex flex-col md:flex-row gap-4">
      <select
        className="border rounded-md p-2 text-sm"
        value={estadoId || ""}
        onChange={(e) => setEstadoId(Number(e.target.value))}
      >
        <option value="">Estado</option>
        {estadosOptions.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>

      <select
        className="border rounded-md p-2 text-sm"
        value={ciudadId || ""}
        onChange={(e) => setCiudadId(Number(e.target.value))}
      >
        <option value="">Ciudad</option>
        {ciudadesOptions.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <input
        className="border rounded-md p-2 text-sm flex-1"
        placeholder="Buscar expediente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
}
