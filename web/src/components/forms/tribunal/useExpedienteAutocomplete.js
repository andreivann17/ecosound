// src/components/tribunal/FormTribunal/useExpedienteAutocomplete.js
import { useRef, useState } from "react";
import { collapseSpaces, buildExpedienteOptionLabel } from "./formTribunal.helpers";

export default function useExpedienteAutocomplete({
  dispatch,
  actionConciliacionSearchExpedientes,
  setField,
  setSelectedCiudadId,
  setSelectedEstadoId,
  ciudadesById,
  empresasIndex,
  api,
}) {
  const [expedienteSearchValue, setExpedienteSearchValue] = useState("");
  const [expedienteOptions, setExpedienteOptions] = useState([]);
  const [expedienteSearching, setExpedienteSearching] = useState(false);

  const expedienteTimeoutRef = useRef(null);
  const expedienteHitsMapRef = useRef(new Map());

  const loadExpedientes = async (q) => {
    setExpedienteSearching(true);
    try {
      const hits = await dispatch(actionConciliacionSearchExpedientes({ q, limit: 6 }));
      const safeHits = Array.isArray(hits) ? hits : Array.isArray(hits?.items) ? hits.items : [];

      const map = new Map();
      safeHits.forEach((it) => {
        const id = String(it?.id_expediente ?? it?.id_tribunal ?? it?.id ?? "");
        if (id) map.set(id, it);
      });
      expedienteHitsMapRef.current = map;

      const opts = safeHits.slice(0, 6).map((it) => {
        const id = String(it?.id_expediente ?? it?.id_tribunal ?? it?.id ?? "");
        const numUnico = collapseSpaces(it?.num_unico || it?.numero_unico || it?.identificador || "");
        const numeroExp = collapseSpaces(it?.numero_expediente || it?.expediente || "");

        const value = numUnico || numeroExp || id;

        return {
          value,
          key: id || value,
          _raw: it,
          label: buildExpedienteOptionLabel(it),
        };
      });

      setExpedienteOptions(opts);
    } catch (err) {
      console.error("Error buscando expedientes (conciliación):", err?.response?.status || err);
      setExpedienteOptions([]);
    } finally {
      setExpedienteSearching(false);
    }
  };

  const handleExpedienteFocus = () => {
    if (!expedienteOptions.length) loadExpedientes("");
  };

  const handleExpedienteSearch = (value) => {
    const v = String(value ?? "");
    setExpedienteSearchValue(v);

    if (expedienteTimeoutRef.current) clearTimeout(expedienteTimeoutRef.current);
    expedienteTimeoutRef.current = setTimeout(() => loadExpedientes(v), 250);
  };

  const handleExpedienteChange = (value) => {
    const v = String(value ?? "");
    setExpedienteSearchValue(v);
    setField("num_unico", v);
    if (!v.trim()) setExpedienteOptions([]);
  };

  const handleExpedienteSelect = (value, option) => {
    const it = option?._raw || null;

    const exp = collapseSpaces(it?.expediente || it?.expediente_format || String(value ?? ""));
    setExpedienteSearchValue(exp);
    setField("num_unico", exp);

    if (!it) return;

    const trabajador = collapseSpaces(it?.nombre_trabajador || "");
    if (trabajador) setField("nombre_parte_actora", trabajador);

    const idCiudad = it?.id_ciudad != null ? Number(it.id_ciudad) : null;
    if (idCiudad != null && !Number.isNaN(idCiudad)) {
      setSelectedCiudadId(idCiudad);
      setField("ciudad", idCiudad);

      const c = ciudadesById?.[String(idCiudad)] || ciudadesById?.[idCiudad];
      const idEstado = c?.id_estado ?? c?.idEstado ?? null;
      if (idEstado != null && String(idEstado).trim() !== "") {
        const eid = Number(idEstado);
        setSelectedEstadoId(eid);
        setField("estado", eid);
      }
    }

    const empresaNombre = collapseSpaces(it?.nombre_empresa || "");
    if (empresaNombre) setField("empresa_nombre", empresaNombre);

    const empresaId = it?.id_empresa != null ? Number(it.id_empresa) : null;
    if (empresaId != null && !Number.isNaN(empresaId)) setField("empresa_id", empresaId);

    const rsArr = Array.isArray(it?.razones_sociales) ? it.razones_sociales : [];
    if (rsArr.length) {
      const empresaNombreLocal = collapseSpaces(it?.nombre_empresa || "");
      const bucket = empresaNombreLocal ? empresasIndex.get(empresaNombreLocal) : null;
      const opciones = Array.isArray(bucket?.razones) ? bucket.razones : [];

      const findOptionValue = (r) => {
        const label = collapseSpaces(r?.razon_social || "");
        const cands = [r?.id_empresa_razon_social, r?.id, r?.id_razon_social]
          .filter((x) => x != null && String(x).trim() !== "")
          .map((x) => String(x));

        for (const cid of cands) {
          const hit = opciones.find((o) => String(o.value) === cid);
          if (hit) return String(hit.value);
        }

        if (label) {
          const hit = opciones.find((o) => collapseSpaces(o.label || "").toLowerCase() === label.toLowerCase());
          if (hit) return String(hit.value == null ? hit.label : hit.value);
          return label;
        }

        return null;
      };

      const rsValues = rsArr
        .map(findOptionValue)
        .filter((v) => v != null && String(v).trim() !== "")
        .map((v) => String(v));

      if (rsValues.length) setField("empresa_razon_social_ids", rsValues);
    }

    const contacto = collapseSpaces(it?.nombre_contacto || "");
    if (contacto) {
      setField("corresponsal_nombre", contacto);
      setField("cliente_directo", 0);
    }
  };

  return {
    expedienteSearchValue,
    expedienteOptions,
    expedienteSearching,
    handleExpedienteFocus,
    handleExpedienteSearch,
    handleExpedienteSelect,
    handleExpedienteChange,
  };
}