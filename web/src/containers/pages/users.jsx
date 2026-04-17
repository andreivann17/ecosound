// src/containers/pages/expedientes.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Layout,
  Card,
  Space,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Tooltip,
  Typography,
  Dropdown,
  Alert,
  Empty,
  Drawer,
  Checkbox,
  Grid,
  message,
} from "antd";
import {
  ReloadOutlined,
  MoreOutlined,
  PlusOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import Contenido from "../../components/navigation/content.jsx";
import AddExpedienteModal from "../../components/modals/expedientes/AddCasoPrejudicialModal.js";
import { actionConciliacionGet } from "../../redux/actions/conciliacion/conciliacion.js";
import { useDispatch, useSelector } from "react-redux";

const { Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const STORAGE_KEY_COLS = "expedientes.columns.v2";
const STORAGE_KEY_DENSITY = "expedientes.density.v1";

const backgroundStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  width: "100%",
  background: "linear-gradient(90deg, #0b1b2b 75%,#0b1b2be4 100%)",
};

// ================= Debounce =================
function useDebouncedCallback(cb, delay) {
  const ref = useRef();
  useEffect(() => () => clearTimeout(ref.current), []);
  return useCallback(
    (...args) => {
      clearTimeout(ref.current);
      ref.current = setTimeout(() => cb(...args), delay);
    },
    [cb, delay]
  );
}

// ================= Chips (resumen) =================
function ChipsResumen({ value, onClear }) {
  const chips = [];
  if (value.search) chips.push({ key: "search", label: `Búsqueda: "${value.search}"` });
  if (value.status && value.status.toLowerCase() !== "cualquiera")
    chips.push({ key: "status", label: `Status: ${value.status}` });
  if (value.ciudad && value.ciudad.toLowerCase() !== "cualquiera")
    chips.push({ key: "ciudad", label: `Ciudad: ${value.ciudad}` });
  if (value.abogado && value.abogado.toLowerCase() !== "cualquiera")
    chips.push({ key: "abogado", label: `Responsable: ${value.abogado}` });

  if (!chips.length) return null;
  return (
    <Space wrap size={[8, 8]} style={{ marginTop: 8 }}>
      {chips.map((c) => (
        <Tag key={c.key} closable onClose={(e) => { e.preventDefault(); onClear(c.key); }}>
          {c.label}
        </Tag>
      ))}
    </Space>
  );
}

// ================= Filtros inline =================
function FiltersInline({ value, onChange, onApply, catalogs, showSearch = true }) {
  const debouncedQ = useDebouncedCallback((q) => onChange({ ...value, search: q }), 400);

  const anyOpt = { value: "cualquiera", label: "Cualquiera" };
  const statusOpts = [anyOpt, ...(catalogs.statusesInResults || catalogs.statuses || []).map((v) => ({ value: v, label: v }))];
  const ciudadOpts = [anyOpt, ...(catalogs.ciudadesInResults || catalogs.ciudades || []).map((v) => ({ value: v, label: v }))];
  const abos = catalogs.abogadosInResults || catalogs.abogado || catalogs.abogados || [];
  const abogadoOpts = [anyOpt, ...abos.map((v) => ({ value: v, label: v }))];

  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 4 };

  const Labeled = ({ label, children }) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );

  const DEFAULTS_INLINE = { search: "", status: "cualquiera", ciudad: "cualquiera", abogado: "cualquiera" };
  const isDefaultInline = (f) =>
    (f?.search ?? "") === "" &&
    (f?.status ?? "cualquiera") === "cualquiera" &&
    (f?.ciudad ?? "cualquiera") === "cualquiera" &&
    (f?.abogado ?? "cualquiera") === "cualquiera";

  return (
    <Space wrap size={8} style={{ width: "100%", display: "flex", justifyContent: "flex-end", alignItems: "flex-end" }}>
      {showSearch && (
        <Labeled label="Buscar">
          <Input.Search
            allowClear
            defaultValue={value.search}
            onChange={(e) => debouncedQ(e.target.value)}
            onSearch={() => onApply && onApply()}
            placeholder="Buscar…"
            style={{ width: 260 }}
          />
        </Labeled>
      )}

      <Labeled label="Status">
        <Select value={value.status || "cualquiera"} onChange={(v) => onChange({ ...value, status: v })} placeholder="Cualquiera" style={{ width: 180 }} options={statusOpts} />
      </Labeled>

      <Labeled label="Sede">
        <Select value={value.ciudad || "cualquiera"} onChange={(v) => onChange({ ...value, ciudad: v })} placeholder="Cualquiera" style={{ width: 180 }} options={ciudadOpts} />
      </Labeled>

      <Labeled label="Responsable">
        <Select value={value.abogado || "cualquiera"} onChange={(v) => onChange({ ...value, abogado: v })} placeholder="Cualquiera" style={{ width: 220 }} options={abogadoOpts} />
      </Labeled>

      <Button icon={<ReloadOutlined />} onClick={() => { if (isDefaultInline(value)) return; onChange({ ...DEFAULTS_INLINE }); }}>
        Restablecer
      </Button>
    </Space>
  );
}

// ================= Filtros (barra) =================
function FiltersBar({ value, onChange, onApply, onAdd, onOpenColumns, catalogs }) {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const clearChip = (key) => {
    const next = { ...value };
    if (key === "search") next.search = "";
    else next[key] = "cualquiera";
    onChange(next);
  };

  return (
    <Card bordered style={{ position: "sticky", top: 0, zIndex: 10, borderRadius: 12, marginBottom: 8 }} bodyStyle={{ padding: 12 }}>
      {!isMobile ? (
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 8, alignItems: "center" }}>
          <Button type="primary" className="custom-button" icon={<PlusOutlined />} onClick={onAdd}>Agregar expediente</Button>
          <FiltersInline value={value} onChange={onChange} onApply={onApply} catalogs={catalogs} showSearch />
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>Agregar expediente</Button>
          <Input.Search
            defaultValue={value.search}
            allowClear
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            onSearch={onApply}
            placeholder="Buscar…"
            style={{ flex: 1, minWidth: 160 }}
            size="small"
          />
          <Button icon={<FilterOutlined />} onClick={() => setDrawerOpen(true)}>Filtros</Button>
        </div>
      )}

      <ChipsResumen value={value} onClear={clearChip} />

      <Drawer title="Filtros" placement="bottom" height="auto" open={drawerOpen} onClose={() => setDrawerOpen(false)} destroyOnClose>
        <FiltersInline value={value} onChange={onChange} onApply={() => { onApply && onApply(); setDrawerOpen(false); }} catalogs={catalogs} showSearch={false} />
      </Drawer>
    </Card>
  );
}

// ================= Columnas (drawer) =================
function useColumnSettings(defaultCols) {
  const [open, setOpen] = useState(false);
  const [colsState, setColsState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COLS);
    if (saved) return JSON.parse(saved);
    return defaultCols.map((c) => ({ key: c.key, visible: c.defaultVisible !== false }));
  });

  const visibleKeys = useMemo(() => new Set(colsState.filter((c) => c.visible).map((c) => c.key)), [colsState]);
  const toggle = (key) => setColsState((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  const reset = () => setColsState(defaultCols.map((c) => ({ key: c.key, visible: c.defaultVisible !== false })));
  const persist = () => localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify(colsState));

  const DrawerUI = (
    <Drawer title="Columnas visibles" width={360} open={open} onClose={() => setOpen(false)} extra={
      <Space>
        <Button onClick={reset}>Restablecer</Button>
        <Button type="primary" onClick={() => { persist(); setOpen(false); }}>Guardar</Button>
      </Space>
    }>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        {defaultCols.map((col) => (
          <Checkbox key={col.key} checked={visibleKeys.has(col.key)} onChange={() => toggle(col.key)}>
            {col.title}
          </Checkbox>
        ))}
      </Space>
    </Drawer>
  );

  return { visibleKeys, setOpen, DrawerUI };
}

// ================= Util: color del status =================
function statusTagColor(status) {
  switch (status) {
    case "CONCLUIDO": return "success";
    case "REVISAR": return "processing";
    case "RIESGO": return "error";
    case "NEGOCIAR": return "warning";
    default: return "default";
  }
}

// ================= Tabla =================
function ExpedientesTable({ items, densityState, onOpenColumns, onEdit }) {
  const defaultColumns = useMemo(
    () => [
      { title: "ID", dataIndex: "id", key: "id", width: 90, fixed: "left", render: (v) => <Text code>{v}</Text> },
      { title: "Exp", dataIndex: "exp", key: "exp", width: 100 },
      { title: "Año", dataIndex: "anio", key: "anio", width: 90 },
      {
        title: "Actor",
        dataIndex: "actor",
        key: "actor",
        width: 260,
        render: (v) => (
          <Tooltip title={v} placement="topLeft">
            <Text ellipsis style={{ maxWidth: 240, display: "inline-block" }}>{v}</Text>
          </Tooltip>
        ),
      },
      {
        title: "Empresa",
        dataIndex: "empresa",
        key: "empresa",
        width: 240,
        render: (v) => (
          <Tooltip title={v} placement="topLeft">
            <Text ellipsis style={{ maxWidth: 220, display: "inline-block" }}>{v}</Text>
          </Tooltip>
        ),
      },
      { title: "Estatus", dataIndex: "estatus", key: "estatus", width: 240 },
      { title: "Específico", dataIndex: "especifico", key: "especifico", width: 260 },
      { title: "Responsable", dataIndex: "abogado", key: "abogado", width: 180 },
      { title: "Sede", dataIndex: "ciudad", key: "ciudad", width: 120 },
      { title: "Status", dataIndex: "status", key: "status", width: 140, render: (v) => <Tag color={statusTagColor(v)}>{v}</Tag> },
      {
        title: "Acciones",
        key: "actions",
        fixed: "right",
        width: 100,
        render: (_, row) => (
          <Dropdown
            trigger={["click"]}
            menu={{
              items: [
                { key: "view", label: "Ver expediente" },
                { type: "divider" },
                { key: "edit", label: "Editar" },
              ],
              onClick: ({ key }) => {
                if (key === "edit") {
                  onEdit ? onEdit(row) : message.info(`edit – id ${row.id}`);
                } else {
                  message.info(`${key} – id ${row.id}`);
                }
              },
            }}
          >
            <Button type="text" shape="circle" icon={<MoreOutlined />} aria-label={`Acciones del expediente ${row.id}`} />
          </Dropdown>
        ),
      },
    ],
    [onEdit]
  );

  const { visibleKeys, setOpen, DrawerUI } = useColumnSettings(defaultColumns);
  useEffect(() => { if (onOpenColumns) onOpenColumns(() => setOpen(true)); }, [onOpenColumns, setOpen]);

  const columns = useMemo(() => defaultColumns.filter((c) => visibleKeys.has(c.key)), [defaultColumns, visibleKeys]);

  return (
    <Card bordered style={{ borderRadius: 12 }}>
      <div style={{ minHeight: 800 }}>
        <Table
          rowKey={(r) => r.id}
          dataSource={items}
          columns={columns}
          size={densityState}
          pagination={false}
          scroll={{ x: 1400 }}
          locale={{ emptyText: <Empty description="Sin resultados" /> }}
        />
      </div>
      {DrawerUI}
    </Card>
  );
}

// ================= Página principal =================
function ExpedientesPage() {
  const dispatch = useDispatch();
  const expedSlice = useSelector((state) => state.expedientes || {});
  const data = expedSlice.data || {};
  const items = data.items || [];
  const [open, setOpen] = useState(false);

  // Edición
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const catalogs = {
    statuses: data.statuses || [],
    ciudades: data.ciudades || [],
    abogado: data.abogado || [],
    abogadosInResults: data.abogadosInResults || [],
    statusesInResults: data.statusesInResults || [],
    ciudadesInResults: data.ciudadesInResults || [],
  };

  // Filtros
  const DEFAULT_FILTERS = useMemo(() => ({
    search: "",
    status: "cualquiera",
    ciudad: "cualquiera",
    abogado: "cualquiera",
  }), []);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Densidad persistida
  const [density, setDensity] = useState(localStorage.getItem(STORAGE_KEY_DENSITY) || "middle");
  useEffect(() => localStorage.setItem(STORAGE_KEY_DENSITY, density), [density]);

  // Carga inicial
  useEffect(() => { dispatch(actionConciliacionGet({})); }, [dispatch]);

  // Reactivo por filtros
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    dispatch(actionConciliacionGet(filters));
  }, [dispatch, filters]);

  const applyFilters = useCallback(() => { dispatch(actionConciliacionGet(filters)); }, [dispatch, filters]);

  // Drawer columnas
  const columnOpenerRef = useRef(null);
  const wireOpenColumns = (fn) => { columnOpenerRef.current = fn; };
  const openColumns = () => columnOpenerRef.current && columnOpenerRef.current();

  // Handlers
  const handleAdd = () => setOpen(true);
  const handleEdit = useCallback((row) => { setEditRow(row || null); setEditOpen(true); }, []);

  const mapRowToInitialValues = (row) => {
    if (!row) return {};
    return {
      exp: row.exp ?? "",
      anio: row.anio ?? "",
      actor: row.actor ?? "",
      empresa: row.empresa ?? "",
      estatus: row.estatus ?? "",
      especifico: row.especifico ?? "",
      abogado: row.abogado ?? "",
      ciudad: row.ciudad ?? "",
      status: row.status ?? "",
    };
  };

  return (
    <>
      {/* Modal AGREGAR */}
      <AddExpedienteModal
        open={open}
        setOpen={setOpen}
        onClose={() => setOpen(false)}
        catalogs={catalogs}
        onSaved={() => dispatch(actionConciliacionGet(filters))} // refresca respetando filtros
      />

      {/* Modal EDITAR (usa mismo componente, oculta Importar) */}
      <AddExpedienteModal
        open={editOpen}
        setOpen={setEditOpen}
        onClose={() => setEditOpen(false)}
        catalogs={catalogs}
        initialValues={mapRowToInitialValues(editRow)}
        mode="edit"
        recordId={editRow?.id}
        hideImport
        // No pasamos onSaved porque tu actionExpedienteUpdate ya hace refetch global
      />

      <Layout style={styles.fullLayout}>
        <Contenido backgroundStyle={backgroundStyle} title={"Expedientes"} icon={"fas fa-file marginr-1 "} />
        <Content style={styles.content}>
          <div style={styles.container}>
            <FiltersBar
              value={filters}
              onChange={setFilters}
              onApply={applyFilters}
              onAdd={handleAdd}
              onOpenColumns={openColumns}
              catalogs={catalogs}
            />
            <ExpedientesTable
              items={items}
              densityState={density}
              onOpenColumns={wireOpenColumns}
              onEdit={handleEdit}
            />
          </div>
        </Content>
      </Layout>
    </>
  );
}

export default ExpedientesPage;

const styles = {
  fullLayout: { minHeight: "100vh", backgroundColor: "#F5F7FA" },
  content: { padding: 30 },
  container: { marginLeft: "90px", margin: "0 auto" },
};
