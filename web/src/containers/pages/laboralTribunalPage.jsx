import React, { useMemo, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Typography,
  Button,
  Space,
  DatePicker,
  notification,
  Input,
  Select,
  AutoComplete,
  Row,
  Col,
  Modal,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  ClockCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import "../../components/tribunal/TribunalPage.css";
import "../../components/tribunal/TribunalTablePage.css";

// tus acciones reales (mismas que usas en LaboralProcedimientoPage)
import { actionAutoridadesTribunalGet } from "../../redux/actions/autoridades/autoridades.js";
import { actionTribunalCards } from "../../redux/actions/tribunal/tribunal.js";

// tus hooks reales (mismos que ya tienes)
import useLaboralCatalogos from "./materias/laboral/useLaboralCatalogos.js";
import useTribunalProcedimiento from "./materias/laboral/useTribunalProcedimiento.js";

// tu config real (si ya existe ahí)
import { laboralTiposConfig, PAGE_SIZE } from "./materias/laboral/laboralProcedimiento.config.js";
import ImportarExcelModal from "./utils/ImportarExcelModal.jsx";
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const coerceItems = (slice) => {
  if (!slice) return [];
  const data = slice.data ?? slice;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.items?.items)) return data.items.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
};

const collapseSpaces = (str) => String(str || "").replace(/\s+/g, " ").trim();

const formatDateShortEs = (d) => {
  if (!d) return "N/A";
  const x = dayjs(d);
  if (!x.isValid()) return String(d);
  return x.format("DD MMM YYYY");
};

const pickNextEvent = (exp) => {
  // prioridad práctica (ajústala si quieres):
  // 1) límite contestación (crítico)
  // 2) audiencia conciliadora (warning)
  // 3) recepción demanda (info)
  if (exp?.fecha_limite_contestacion) {
    return {
      eventoFecha: formatDateShortEs(exp.fecha_limite_contestacion),
      eventoTipo: "Límite contestación",
      eventoKind: "red",
      eventoIcon: "error_outline",
    };
  }
  if (exp?.fecha_audiencia_conciliadora) {
    return {
      eventoFecha: formatDateShortEs(exp.fecha_audiencia_conciliadora),
      eventoTipo: "Audiencia",
      eventoKind: "yellow",
      eventoIcon: "warning",
    };
  }
  if (exp?.fecha_recepcion_demanda) {
    return {
      eventoFecha: formatDateShortEs(exp.fecha_recepcion_demanda),
      eventoTipo: "Recepción demanda",
      eventoKind: "blue",
      eventoIcon: "info",
    };
  }
  return {
    eventoFecha: "N/A",
    eventoTipo: "Sin fecha próxima",
    eventoKind: "gray",
    eventoIcon: "schedule",
  };
};

const mapExpedienteToRow = (exp) => {
  const doc = exp?.id_tribunal_documento_citatorio;
const hasCitatorio = doc !== null && doc !== undefined && Number(doc) !== 0;

  const id = Number(exp?.id);

  const isArchived = exp?.active === 0 || exp?.active === "0";

  let estatus = { label: "SIN DEMANDA", kind: "yellow", icon: "schedule" };

if (isArchived) {
  estatus = { label: "ARCHIVADO", kind: "gray", icon: "pause" };
} else if (hasCitatorio) {
  estatus = { label: "CON DEMANDA", kind: "green", icon: "check_circle" };
} else {
  estatus = { label: "SIN DEMANDA", kind: "yellow", icon: "schedule" };
}

  const actorName = exp?.nombre_trabajador || exp?.trabajador_nombre || exp?.actor || exp?.nombre_parte_actora || "";
  const razones = Array.isArray(exp?.razones_sociales)
  ? exp.razones_sociales
      .map((x) => collapseSpaces(x?.razon_social || ""))
      .filter(Boolean)
  : [];

const contraName =
  razones.length > 0
    ? razones.join(" vs ")
    : (exp?.empresa_nombre || exp?.contraparte || exp?.corresponsal || "");
  const accion = exp?.accion_intentada || exp?.accion || "";

  const tribunal = exp?.nombre_autoridad || exp?.tribunal || "";
  const ubicacion = `${exp?.nombre_estado || ""}${exp?.nombre_estado && exp?.nombre_ciudad ? " / " : ""}${exp?.nombre_ciudad || ""}`.trim();

  const evento = pickNextEvent(exp);
const titleParts = [actorName || "—"];
if (contraName) titleParts.push(contraName);
const caseTitle = titleParts.join(" vs ");

  return {
        id: Number.isFinite(id) ? id : null, // <-- ESTO ES LO IMPORTANTE

    expediente: exp?.expediente_format || exp?.expediente || String(exp?.id || ""),
  actor: actorName || "—",
    contraparte: contraName || "—",
  caseTitle,
    accion: accion || "—",
    estatus,
    tribunal: tribunal || "—",
    ubicacion: ubicacion || "—",
    ...evento,
  };
};

export default function TribunalTablePage() {
  const dispatch = useDispatch();

const [dark, setDark] = useState(false);
const [view, setView] = useState("cards"); // "cards" | "table"
const ALL = "__all__";
const [importModalOpen, setImportModalOpen] = useState(false);

// selects base (igual que tu page real)
const [selectedEstadoId, setSelectedEstadoId] = useState(ALL);
const [selectedCiudadId, setSelectedCiudadId] = useState(ALL);

// autoridad
const [selectedAutoridadId, setSelectedAutoridadId] = useState(ALL);
const [selectedAutoridadData, setSelectedAutoridadData] = useState(null);

// filtros UI
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("todos"); // para KPIs (si lo quieres clickable)
const [dateRange, setDateRange] = useState(null);
const [searchDebounced, setSearchDebounced] = useState("");

// paginado
const rowsPerPage = PAGE_SIZE || 5;
const [page, setPage] = useState(1);

// slices reales
const tribunalSlice = useSelector((state) => state.tribunal || {});
const autoridadesSlice = useSelector((state) => state.autoridades || {});

// catálogos reales
const {
  estadosOptions,
  ciudadesOptions,
  estadoSeleccionado,
  ciudadSeleccionada,
  estadosById,
  ciudadesById,
} = useLaboralCatalogos(selectedEstadoId, selectedCiudadId);

// carga autoridades (igual que tu page real)
useEffect(() => {
  dispatch(actionAutoridadesTribunalGet({}));
}, [dispatch]);

const autoridadesItems = useMemo(() => coerceItems(autoridadesSlice), [autoridadesSlice]);

const estadosOptionsFinal = useMemo(() => {
  const base = Array.isArray(estadosOptions) ? estadosOptions : [];
  return [{ label: "Todos los estados", value: ALL }, ...base];
}, [estadosOptions]);

const ciudadesOptionsFinal = useMemo(() => {
  const base = Array.isArray(ciudadesOptions) ? ciudadesOptions : [];

  // Estado = ALL -> todas las ciudades
  if (selectedEstadoId === ALL) {
    return [{ label: "Todas las ciudades", value: ALL }, ...base];
  }

  // Filtra por estado seleccionado (blindado con ciudadesById)
  const byEstado = base.filter((o) => {
    const city = ciudadesById?.[String(o.value)] || ciudadesById?.[Number(o.value)];
    const idEstado = city?.id_estado ?? city?.idEstado ?? null;
    return Number(idEstado) === Number(selectedEstadoId);
  });

  return [{ label: "Todas las ciudades", value: ALL }, ...byEstado];
}, [ciudadesOptions, ciudadesById, selectedEstadoId]);

const autoridadOptions = useMemo(() => {
  // Ciudad = ALL -> solo “todas”
  if (!selectedCiudadId || selectedCiudadId === ALL) {
    return [{ label: "Todas las autoridades", value: ALL, data: null }];
  }

  const base = (autoridadesItems || [])
    .filter((au) => Number(au?.id_ciudad || 0) === Number(selectedCiudadId))
    .map((au) => ({
      label: collapseSpaces(au?.nombre || ""),
      value: au?.id,
      data: au,
    }))
    .filter((o) => o.label);

  return [{ label: "Todas las autoridades", value: ALL, data: null }, ...base];
}, [autoridadesItems, selectedCiudadId]);
// si por alguna razón llega null, lo normalizas a ALL
useEffect(() => {
  if (selectedEstadoId == null) {
    setSelectedEstadoId(ALL);
    setSelectedCiudadId(ALL);
    setSelectedAutoridadId(ALL);
    setSelectedAutoridadData(null);
    setPage(1);
  }
}, [selectedEstadoId]);

// si cambias estado y la ciudad ya no es válida, fuerza ALL
useEffect(() => {
  const base = Array.isArray(ciudadesOptionsFinal) ? ciudadesOptionsFinal : [];
  if (!base.length) return;

  const exists = base.some((o) => String(o.value) === String(selectedCiudadId));
  if (exists) return;

  setSelectedCiudadId(ALL);
  setSelectedAutoridadId(ALL);
  setSelectedAutoridadData(null);
  setPage(1);
}, [ciudadesOptionsFinal, selectedCiudadId]);

// autoridad: si la seleccion no existe en la lista, fuerza ALL (no “primera”)
useEffect(() => {
  const disponibles = Array.isArray(autoridadOptions) ? autoridadOptions : [];
  if (!disponibles.length) return;

  const exists = disponibles.some((o) => String(o.value) === String(selectedAutoridadId));
  if (exists) return;

  setSelectedAutoridadId(ALL);
  setSelectedAutoridadData(null);
  setPage(1);
}, [autoridadOptions, selectedAutoridadId]);
const handleChangeEstado = (value) => {
  const v = value ?? ALL;

  setSelectedEstadoId(v);
  setSelectedCiudadId(ALL);

  setSelectedAutoridadId(ALL);
  setSelectedAutoridadData(null);

  setPage(1);
};

const handleChangeCiudad = (value) => {
  const v = value ?? ALL;

  setSelectedCiudadId(v);

  setSelectedAutoridadId(ALL);
  setSelectedAutoridadData(null);

  setPage(1);
};

const handleChangeAutoridad = (value) => {
  const v = value ?? ALL;
  setSelectedAutoridadId(v);

  const found = (autoridadOptions || []).find((o) => String(o.value) === String(v));
  setSelectedAutoridadData(found?.data || null);

  setPage(1);
};

// tipoConfig real
const tipoConfig = (laboralTiposConfig && laboralTiposConfig["tribunal"]) || { key: "tribunal" };

// filtros backend (igual que tu page real)
const filtrosBusqueda = useMemo(() => {
  if (!selectedEstadoId || !selectedCiudadId) return null;

  const expediente = collapseSpaces(searchDebounced);

  return {
    id_estado: selectedEstadoId !== ALL ? Number(selectedEstadoId) : undefined,
    id_ciudad: selectedCiudadId !== ALL ? Number(selectedCiudadId) : undefined,
    id_autoridad: selectedAutoridadId !== ALL ? Number(selectedAutoridadId) : undefined,
    search: expediente || undefined,
    fecha_inicio: dateRange?.[0] ? dayjs(dateRange[0]).format("YYYY-MM-DD") : undefined,
    fecha_fin: dateRange?.[1] ? dayjs(dateRange[1]).format("YYYY-MM-DD") : undefined,
  };
}, [
  selectedEstadoId,
  selectedCiudadId,
  selectedAutoridadId,
  searchDebounced,
  dateRange,
]);
const navigate = useNavigate();

const handleCrearExpediente = () => {
  if (!selectedEstadoId || !selectedCiudadId || !selectedAutoridadId) return;

  const nombreIdent = selectedAutoridadData?.nombre_identificacion_ciudad || "";

  // mismo path/estado que ya usas en tu LaboralProcedimientoPage
  navigate(`/materias/laboral/tribunal/crear/`, {
    state: {
      estado: selectedEstadoId,
      ciudad: selectedCiudadId,
      idAutoridad: selectedAutoridadId,
      nombreIdentificacionCiudad: nombreIdent || null,
    },
  });
};

const filtrosKey = useMemo(() => JSON.stringify(filtrosBusqueda || {}), [filtrosBusqueda]);
const lastKeyRef = useRef("");

useEffect(() => {
  if (!filtrosBusqueda) return;

  if (lastKeyRef.current === filtrosKey) return;
  lastKeyRef.current = filtrosKey;

  dispatch(actionTribunalCards(filtrosBusqueda));
}, [dispatch, filtrosKey, filtrosBusqueda]);

useEffect(() => {
  const t = setTimeout(() => setSearchDebounced(search), 350);
  return () => clearTimeout(t);
}, [search]);


// tu lógica real de filtro/paginado (hook)
const {
  statusCounts,
  filteredExpedientes,
  paginatedExpedientes,
  totalExp,
} = useTribunalProcedimiento({
  concSlice: tribunalSlice,
  search,
  statusFilter,
  dateRange,
  currentPage: page,
  pageSize: rowsPerPage,
  setCurrentPage: setPage,
});

// mapeo a tu formato de tarjetas/tabla (SIN tocar el diseño)
const rows = useMemo(
  () => (paginatedExpedientes || []).map(mapExpedienteToRow),
  [paginatedExpedientes]
);
console.log(rows)
const total = totalExp || 0;
const shown = rows.length;

const totalPages = Math.max(1, Math.ceil((total || 0) / rowsPerPage));


function TableView({ pageRows, total, totalPages, page, setPage }) {
  return (
    <div className="tableCard">
      <div className="tableScroll">
        <table className="table">
          <thead className="thead">
            <tr>
              
              <th className="th">Expediente / Actor</th>
              <th className="th">Acción &amp; Estatus</th>
              <th className="th">Tribunal</th>
              <th className="th">Próximo Evento</th>
              <th className="th th--actions">Acciones</th>
            </tr>
          </thead>

          <tbody className="tbody">
            {pageRows.map((r) => (
              <tr key={r.expediente} className="tr">
              
                <td className="td">
                  <div className="cellStack">
                    <div className="exp">{r.expediente}</div>
                    <div className="actor">{r.actor}</div>
                    <div className="contra">{r.contraparte}</div>
                  </div>
                </td>

                <td className="td">
                  <div className="cellStack">
                    <div className="accion">{r.accion}</div>
                    <StatusPill kind={r.estatus.kind} icon={r.estatus.icon} label={r.estatus.label} />
                  </div>
                </td>

                <td className="td">
                  <div className="cellStack">
                    <div className="tribunal" title={r.tribunal}>
                      {r.tribunal}
                    </div>
                    <div className="ubic">
                      <span className="material-icons-round ubic__icon">place</span>
                      {r.ubicacion}
                    </div>
                  </div>
                </td>

                <td className="td td--nowrap">
                  <div className="cellStack">
                    <div className={`evento evento--${r.eventoKind}`}>
                      <span className="material-icons-round evento__icon">{r.eventoIcon}</span>
                      {r.eventoFecha}
                    </div>
                    <div className="eventoSub">{r.eventoTipo}</div>
                  </div>
                </td>

                <td className="td td--actions td--nowrap">
                  <div className="rowActions">
                  <button
  className="act"
  type="button"
  title="Ver detalles"
  onClick={() => navigate(`/materias/laboral/tribunal/${r.id || r.code}`)}
>
  <span className="material-icons-round">visibility</span>
</button>

                  
                    <button className="act act--danger" type="button" title="Más">
                      <span className="material-icons-round">more_vert</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FooterPager total={total} totalPages={totalPages} page={page} setPage={setPage} />
    </div>
  );
}

function CardsView({ rows, total, totalPages, page, setPage }) {
  return (
    <div className="cardsWrap">
      <div className="cardsGrid">
        {rows.map((r) => (
          <article key={r.expediente} className="caseCard">
            <div className="caseCard__body">
              <div className="caseTop">
                <div className="caseTop__left">
                 <div className="caseName">{r.caseTitle}</div>

                </div>
                <div className="caseTop__right">
                  <div className="caseExp">{r.expediente}</div>
                </div>
              </div>

              <div className="caseActionRow">
                <span className="material-icons-round caseActionRow__icon">description</span>
                <div className="caseActionRow__text">{r.accion}</div>

                <StatusPill kind={r.estatus.kind} icon={r.estatus.icon} label={r.estatus.label} />

              </div>

              <div className="caseSep" />

              <div className="caseMeta">
                <div className="caseMeta__row">
                  <span className="material-icons-round caseMeta__icon">gavel</span>
                  <span className="caseMeta__text">{r.tribunal}</span>
                </div>
                <div className="caseMeta__row">
                  <span className="material-icons-round caseMeta__icon">location_on</span>
                  <span className="caseMeta__text">{r.ubicacion}</span>
                </div>
              </div>

              <div className="caseDates">
                <div className="caseDate">
                  <span className="material-icons-round caseDate__icon">calendar_today</span>
                  <div>
                    <div className="caseDate__label">PRÓXIMO EVENTO</div>
                    <div className={`caseDate__value caseDate__value--${r.eventoKind}`}>
                      {r.eventoFecha}
                    </div>
                    <div className="caseDate__sub">{r.eventoTipo}</div>
                  </div>
                </div>
              </div>

              <div className="caseActions">
                <button
  className="caseBtn"
  type="button"
  onClick={() => navigate(`/materias/laboral/tribunal/${r.id || r.code}`)}
>
  <span className="material-icons-round">visibility</span>
  Ver detalles
</button>

            
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="cardsFooter">
        <FooterPager total={total} totalPages={totalPages} page={page} setPage={setPage} />
      </div>
    </div>
  );
}
function FooterPager({ total, totalPages, page, setPage }) {
  const pageSize = PAGE_SIZE || 5;
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="tableFooter">
      <div className="tableFooter__left">
        Mostrando <span className="strong">{start}</span> a <span className="strong">{end}</span> de{" "}
        <span className="strong">{total}</span> resultados
      </div>
     <div className="pager" aria-label="Pagination">
        <button
          className="pager__btn"
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label="Previous"
        >
          <span className="material-icons-round">chevron_left</span>
        </button>

        {Array.from({ length: totalPages }).map((_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              className={p === page ? "pager__page pager__page--active" : "pager__page"}
              type="button"
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          );
        })}

        <button
          className="pager__btn"
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          aria-label="Next"
        >
          <span className="material-icons-round">chevron_right</span>
        </button>
      </div>
    </div>
  );
}


  return (
    <div className={dark ? "app dark" : "app"}>
     

      <main className="content">
        <div className="container">
          <div className="headerRow">
            <div className="headerRow__left">
              <a className="backlink" href="#/">
                <span className="material-icons-round backlink__icon">arrow_back</span>
                Volver a Inicio
              </a>

              <h1 className="title">Tribunal · Materia laboral</h1>
              {estadoSeleccionado && ciudadSeleccionada ? (
  <Text className="laboral-subtitle">
    Expedientes de tribunal en <b>{estadoSeleccionado.nombre}</b> /{" "}
    <b>{ciudadSeleccionada.nombre}</b>.
  </Text>
) : (
  <Text className="laboral-subtitle">
    Selecciona un estado y una ciudad para ver los expedientes.
  </Text>
)}
            </div>

           
          </div>

          <div className="laboral-filters-panel">
  {/* FILA 1 */}
  <Row gutter={[16, 14]}>
    <Col xs={24} md={8}>
      <div className="laboral-field">
        <div className="laboral-field-label">ESTADO</div>
        <Select
          showSearch
          options={estadosOptionsFinal}
          value={selectedEstadoId}
          onChange={handleChangeEstado}
          className="laboral-control"
        />
      </div>
    </Col>

    <Col xs={24} md={8}>
      <div className="laboral-field">
        <div className="laboral-field-label">CIUDAD</div>
        <Select
          showSearch
          options={ciudadesOptionsFinal}
          value={selectedCiudadId}
          onChange={handleChangeCiudad}
          disabled={!selectedEstadoId}
          className="laboral-control"
        />
      </div>
    </Col>

    <Col xs={24} md={8}>
      <div className="laboral-field">
        <div className="laboral-field-label">AUTORIDAD</div>
        <Select
          showSearch
          options={autoridadOptions}
          value={selectedAutoridadId}
          onChange={(value, option) => {
            setSelectedAutoridadId(value ?? ALL);
            setSelectedAutoridadData(option?.data || null);
          }}
          disabled={!selectedCiudadId}
          className="laboral-control"
        />
      </div>
    </Col>
  </Row>

  {/* FILA 2 */}
  <Row gutter={[16, 14]} align="bottom">
    {/* BUSCADOR */}
    <Col xs={24} lg={12}>
      <div className="laboral-field">
        <div className="laboral-field-label">BUSCADOR</div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por expediente, empresa..."
          suffix={<SearchOutlined />}
          className="laboral-control"
        />
      </div>
    </Col>

    {/* FECHA */}
    <Col xs={24} lg={7}>
      <div className="laboral-field">
        <div className="laboral-field-label">FECHA DE PRESENTACION DEMANDA</div>
        <RangePicker
          value={dateRange}
          onChange={(v) => setDateRange(v)}
          format="YYYY-MM-DD"
          className="laboral-control"
        />
      </div>
    </Col>

    {/* BOTÓN LIMPIAR */}
    <Col xs={24} lg={5}>
      <div className="laboral-field">
        <div className="laboral-field-label">&nbsp;</div>
        <div className="laboral-actions">
          <Button
            onClick={() => {
              setSearch("");
              setDateRange(null);
            }}
            className="laboral-btn-clean"
          >
            Limpiar
          </Button>
        </div>
      </div>
    </Col>
  </Row>
</div>

          <div className="kpis">
         <KpiCard icon="warning" iconBg="yellow" value={String(statusCounts?.proximasAudiencias || 0)} label="Próximas Audiencias" />
<KpiCard icon="error_outline" iconBg="red" value={String(statusCounts?.terminosCriticos || 0)} label="Términos Críticos" />
<KpiCard icon="info" iconBg="blue" value={String(statusCounts?.pendientesNotificar || 0)} label="Pendientes de Notificar" />
<KpiCard icon="schedule" iconBg="gray" value={String(statusCounts?.sinActividad15d || 0)} label="Sin Actividad (15d+)" />


          </div>

          <div className="section">
            <div className="sectionHead">
              <div className="sectionHead__left">
                <h2 className="sectionTitle">Expedientes ({total})</h2>
                <div className="sectionMeta">{shown} mostrados</div>
              </div>

            <div className="sectionHead__right">
  <div className="sectionHead__buttons">
    <Button
      type="secondary"
      style={{ minWidth: 160 }}
      icon={<PlusOutlined />}
      className="laboral-btn-create"
    >
      Exportar
    </Button>
<Button
  icon={<UploadOutlined />}
  onClick={() => setImportModalOpen(true)}
  className="laboral-btn-import"
>
  Importar Excel
</Button>
<ImportarExcelModal
  open={importModalOpen}
  onClose={() => setImportModalOpen(false)}
  onSuccess={() => dispatch(actionTribunalCards(filtrosBusqueda))}
  context={{
    estado:            selectedEstadoId !== ALL ? selectedEstadoId : undefined,
    ciudad:            selectedCiudadId !== ALL ? selectedCiudadId : undefined,
    autoridad:         selectedAutoridadId !== ALL ? selectedAutoridadId : undefined,
    tipo_conciliacion: tipoConfig.key,
  }}
/>
    <Button
      type="primary"
      style={{ minWidth: 160 }}
      icon={<PlusOutlined />}
      onClick={handleCrearExpediente}
      className="laboral-btn-create custom-button"
    >
      Crear
    </Button>
  </div>

  <div className="sectionHead__segmented">
    <div className="segmented">
      <button
        className={view === "cards" ? "segmented__btn segmented__btn--active" : "segmented__btn"}
        onClick={() => setView("cards")}
      >
        Tarjetas
      </button>

      <button
        className={view === "table" ? "segmented__btn segmented__btn--active" : "segmented__btn"}
        onClick={() => setView("table")}
      >
        Tabla
      </button>
    </div>
  </div>
</div>
            </div>

           
        {view === "table" ? (
  <TableView
    pageRows={rows}
    total={total}
    totalPages={totalPages}
    page={page}
    setPage={setPage}
  />
) : (
 <CardsView
  rows={rows}
  total={total}
  totalPages={totalPages}
  page={page}
  setPage={setPage}
/>

)}


          </div>
        </div>

        <button className="fab" type="button" aria-label="Crear expediente">
          <span className="material-icons-round">add</span>
        </button>
      </main>

     
    </div>
  );
}

function KpiCard({ icon, iconBg, value, label }) {
  return (
    <div className="kpi">
      <div className={`kpi__icon kpi__icon--${iconBg}`}>
        <span className="material-icons-round">{icon}</span>
      </div>
      <div className="kpi__text">
        <div className="kpi__value">{value}</div>
        <div className="kpi__label">{label}</div>
      </div>
    </div>
  );
}

function StatusPill({ kind, icon, label }) {
  return (
    <span className={`pill pill--${kind}`}>
      <span className="material-icons-round pill__icon">{icon}</span>
      {label}
    </span>
  );
}
