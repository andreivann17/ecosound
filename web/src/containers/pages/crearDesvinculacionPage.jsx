import React, { useEffect, useMemo, useState, useRef } from "react";
import { Breadcrumb, Button, Spin, notification } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import FormDesvinculaciones from "../../components/forms/desvinculaciones/FormDesvinculaciones";
import { actionDesvinculacionGetById } from "../../redux/actions/desvinculaciones/desvinculaciones";

// OJO: ajusta estos imports a tus acciones reales si difieren
import { actionEstadosGet } from "../../redux/actions/estados/estados";
import { actionCiudadesGet } from "../../redux/actions/ciudades/ciudades";

import { actionEmpresasGet } from "../../redux/actions/empresas/empresas";

/* =========================
   Normalizadores (tal cual tu estilo)
   ========================= */
const coerceItems = (slice) => {
  if (!slice) return [];
  const data = slice.data ?? slice;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
};

const coerceEmpresasArray = (slice) => {
  if (Array.isArray(slice)) return slice;
  if (Array.isArray(slice?.items)) return slice.items;
  if (Array.isArray(slice?.data)) return slice.data;
  if (Array.isArray(slice?.list)) return slice.list;
  if (Array.isArray(slice?.items?.data)) return slice.items.data;
  if (Array.isArray(slice?.data?.items)) return slice.data.items;
  return [];
};

const pickCompanyName = (it) =>
  it?.nombre ??
  it?.nombre_cliente ??
  it?.empresa ??
  it?.name ??
  it?.razon_social ??
  it?.empresa_nombre ??
  "";

const pickCompanyId = (it) => it?.id_empresa ?? it?.id ?? null;

const collapseSpaces = (s) =>
  String(s ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normLabel = (txt) => collapseSpaces(txt || "").trim().toLowerCase();

const buildRSOption = ({ label, value, empresa_id }) => ({
  label: collapseSpaces(label || ""),
  value: value ?? collapseSpaces(label || ""),
  empresa_id: empresa_id ?? null,
});

const dedupRazones = (arr = []) => {
  const map = new Map();
  for (const r of arr) {
    const key = `${normLabel(r.label)}|${r.empresa_id ?? "null"}`;
    const existing = map.get(key);
    if (!existing) map.set(key, r);
    else if (existing.value == null && r.value != null) map.set(key, r);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
};

const buildEmpresasIndex = (items = []) => {
  const byName = new Map();
  if (!Array.isArray(items)) return byName;

  items.forEach((it) => {
    const name = collapseSpaces(pickCompanyName(it));
    if (!name) return;

    const idEmpresa = pickCompanyId(it);

    if (!byName.has(name)) {
      byName.set(name, { empresaIds: new Set(), razones: [], raw: [] });
    }

    const bucket = byName.get(name);
    bucket.raw.push(it);

    if (idEmpresa != null) bucket.empresaIds.add(idEmpresa);

    const rsArr = Array.isArray(it?.razones_sociales) ? it.razones_sociales : [];
    rsArr.forEach((rs) => {
      const label = rs?.nombre ?? rs?.razon_social ?? rs?.name ?? "";
      const value = rs?.id_empresa_razon_social ?? rs?.id ?? null;
      const empresa_id = rs?.id_empresa ?? idEmpresa ?? null;
      if (!label) return;
      bucket.razones.push(buildRSOption({ label, value, empresa_id }));
    });

    const plainRS =
      it?.razon_social && String(it.razon_social).trim() !== "" ? String(it.razon_social) : null;

    if (plainRS) {
      bucket.razones.push(buildRSOption({ label: plainRS, value: null, empresa_id: idEmpresa }));
    }
  });

  for (const [name, bucket] of byName.entries()) {
    bucket.razones = dedupRazones(bucket.razones);
    byName.set(name, bucket);
  }

  return byName;
};

export default function CrearExpedientePage() {
  const formRef = useRef(null);
  const location = useLocation();
  const { idExpediente } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isEdit = Boolean(idExpediente);

  const [loadingEdit, setLoadingEdit] = useState(false);
  const [detalleLocal, setDetalleLocal] = useState(null);
const idCiudad =
    location.state?.ciudad ??
    null;
  // ===== Redux slices (ajusta nombres si tu store difiere)
 const estadosSlice = useSelector((state) => state?.estados || {});
const ciudadesSlice = useSelector((state) => state?.ciudades || {});
const empresasSlice = useSelector((state) => state?.empresas || {});

const estadosItems = useMemo(() => coerceItems(estadosSlice), [estadosSlice]);
const ciudadesItems = useMemo(() => coerceItems(ciudadesSlice), [ciudadesSlice]);
const empresasItems = useMemo(() => coerceEmpresasArray(empresasSlice), [empresasSlice]);


  const empresasIndex = useMemo(() => buildEmpresasIndex(empresasItems), [empresasItems]);

const ciudadOptions = useMemo(() => {
  return ciudadesItems
    .map((c) => ({
      label: collapseSpaces(c?.nombre || c?.code || `Ciudad ${c?.id}`),
      value: c?.id,
      id_estado: c?.id_estado,   // 🔥 ESTA LÍNEA ES LA CLAVE
    }))
    .filter((o) => o.label && o.value != null && o.id_estado != null)
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}, [ciudadesItems]);

const estadoOptions = useMemo(() => {
  return estadosItems
    .map((e) => ({
      label: collapseSpaces(e?.nombre || e?.name || `Estado ${e?.id}`),
      value: e?.id,
    }))
    .filter((o) => o.label && o.value != null)
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}, [estadosItems]);

  const empresaNombreOptionsBase = useMemo(() => {
    const names = Array.from(empresasIndex.keys());
    return names
      .map((n) => ({ label: n, value: n }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [empresasIndex]);

  const handleBack = () => {
 
    navigate("/materias/laboral/desvinculaciones");
  };

  // ===== Carga catálogos (para que el HIJO pueda pintar selects)
useEffect(() => {
  dispatch(actionEstadosGet({}));
  dispatch(actionCiudadesGet({}));
  dispatch(actionEmpresasGet());
}, [dispatch]);

console.log(estadoOptions)
  // ===== Carga detalle (EDIT MODE)
  useEffect(() => {
    if (!isEdit) return;

    let mounted = true;

    (async () => {
      try {
        setLoadingEdit(true);
        const data = await dispatch(actionDesvinculacionGetById(idExpediente));
        if (!mounted) return;
        setDetalleLocal(data || null);
      } catch (e) {
        if (!mounted) return;
        notification.error({
          message: "No se pudo cargar el expediente",
          description: e?.message || "Sin detalle",
          placement: "bottomRight",
        });
        setDetalleLocal(null);
      } finally {
        if (mounted) setLoadingEdit(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dispatch, isEdit, idExpediente]);

  const formNode = (
    <FormDesvinculaciones
  ref={formRef}
  variant="standalone_full"
  isEdit={isEdit}
  idCiudad={idCiudad}
  idDesvinculacion={detalleLocal?.id ?? detalleLocal?.id_desvinculacion ?? null}
  initialValues={detalleLocal || {}}
  onSaved={handleBack}
  onCancel={handleBack}
  catalogEstadoOptions={estadoOptions}
  catalogCiudadOptions={ciudadOptions}
  catalogEmpresaNombreOptionsBase={empresaNombreOptionsBase}
  catalogEmpresasIndex={empresasIndex}
  catalogEmpresasItems={empresasItems}
/>

  );

  return (
    <main className="laboral-main">
      <div className="expediente-page-container">
        <section className="laboral-header-section">
          <div className="laboral-header-left">
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              className="laboral-back-btn"
            >
              Volver a expedientes
            </Button>
          </div>

      
        </section>

        {isEdit ? (
          <Spin spinning={loadingEdit} tip="Cargando expediente...">
            {formNode}
          </Spin>
        ) : (
          formNode
        )}
      </div>

      <style>{`
        .expediente-page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 24px 40px;
        }

        .laboral-header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .laboral-header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .laboral-back-btn {
          padding-left: 0;
        }
      `}</style>
    </main>
  );
}
