import React, { useState, useEffect, useRef } from "react";
import { Typography, Switch, Modal, Spin, Input, Button, InputNumber, message } from "antd";
import {
  CalendarOutlined,
  ToolOutlined,
  CameraOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  MailOutlined,
  TagOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  AlertOutlined,
  SwapOutlined,
  ScheduleOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { PATH } from "../../redux/utils";
import "./ConfiguracionPage.css";

const { Title, Text } = Typography;

const api = axios.create({ baseURL: PATH });
const authHeader = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Panel Eventos ──────────────────────────────────────────────────────────

const CORREO_DEFAULTS = {
  correo_crear_evento: false,
  correo_hora_evento:  false,
  correo_dia_evento:   false,
  correo_mes_evento:   false,
  correo_anual_evento: false,
  correo_hora_misa:    false,
};

const RECORDATORIOS = [
  { key: "correo_hora_evento",  label: "1 hora antes" },
  { key: "correo_dia_evento",   label: "1 día antes" },
  { key: "correo_anual_evento", label: "1 semana antes" },
  { key: "correo_mes_evento",   label: "1 mes antes" },
];

function PanelEventos() {
  const [tipos, setTipos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [inputNombre, setInputNombre] = useState("");
  const [addingTipo, setAddingTipo] = useState(false);

  const [correo, setCorreo] = useState(CORREO_DEFAULTS);
  const [loadingCorreo, setLoadingCorreo] = useState(true);
  const [savingCorreo, setSavingCorreo] = useState(false);

  const saveDebounceRef = useRef(null);

  useEffect(() => {
    fetchTipos();
    fetchCorreo();
  }, []);

  const fetchTipos = async () => {
    setLoadingTipos(true);
    try {
      const res = await api.get("/eventos/config/tipos", { headers: authHeader() });
      setTipos(res.data || []);
    } catch {
      message.error("Error al cargar los tipos de evento");
    } finally {
      setLoadingTipos(false);
    }
  };

  const fetchCorreo = async () => {
    setLoadingCorreo(true);
    try {
      const res = await api.get("/eventos/config/correo", { headers: authHeader() });
      setCorreo({ ...CORREO_DEFAULTS, ...res.data });
    } catch {
      message.error("Error al cargar configuración de correo");
    } finally {
      setLoadingCorreo(false);
    }
  };

  const handleAddTipo = async () => {
    const nombre = inputNombre.trim();
    if (!nombre) return;
    setAddingTipo(true);
    try {
      const res = await api.post("/eventos/config/tipos", { nombre }, { headers: authHeader() });
      setTipos((prev) => [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setInputNombre("");
      message.success(`Tipo "${nombre}" agregado`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      message.error(detail || "Error al agregar tipo");
    } finally {
      setAddingTipo(false);
    }
  };

  const handleDeleteTipo = (tipo) => {
    Modal.confirm({
      title: "¿Eliminar tipo de evento?",
      content: (
        <span>
          Se eliminará <strong>{tipo.nombre}</strong>. Esta acción no se puede deshacer.
        </span>
      ),
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await api.delete(`/eventos/config/tipos/${tipo.id_tipo_evento}`, { headers: authHeader() });
          setTipos((prev) => prev.filter((t) => t.id_tipo_evento !== tipo.id_tipo_evento));
          message.success("Tipo eliminado");
        } catch {
          message.error("Error al eliminar tipo");
        }
      },
    });
  };

  const handleCorreoToggle = (key, value) => {
    const next = { ...correo, [key]: value };
    setCorreo(next);

    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      setSavingCorreo(true);
      try {
        await api.put("/eventos/config/correo", next, { headers: authHeader() });
      } catch {
        message.error("Error al guardar configuración de correo");
      } finally {
        setSavingCorreo(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">

      {/* ── Tipos de evento ─────────────────────────── */}
      <div className="cfg-block">
        <div className="cfg-block-header">
          <TagOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Tipos de evento</div>
            <div className="cfg-block-desc">Categorías que se asignan al crear un evento</div>
          </div>
        </div>

        <div className="cfg-tipo-add-row">
          <Input
            value={inputNombre}
            onChange={(e) => setInputNombre(e.target.value)}
            placeholder="Nombre del nuevo tipo..."
            className="cfg-tipo-input"
            onPressEnter={handleAddTipo}
            maxLength={60}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddTipo}
            loading={addingTipo}
            disabled={!inputNombre.trim()}
            className="cfg-tipo-btn-add"
          >
            Agregar
          </Button>
        </div>

        {loadingTipos ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : tipos.length === 0 ? (
          <div className="cfg-tipo-empty">Sin tipos registrados</div>
        ) : (
          <div className="cfg-tipo-chips">
            {tipos.map((t) => (
              <div key={t.id_tipo_evento} className="cfg-tipo-chip">
                <span className="cfg-tipo-chip-label">{t.nombre}</span>
                <button
                  type="button"
                  className="cfg-tipo-chip-del"
                  onClick={() => handleDeleteTipo(t)}
                  title="Eliminar"
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cfg-divider" style={{marginBottom:50}} />

      {/* ── Notificaciones de correo ─────────────────── */}
      <div className="cfg-block">
        <div className="cfg-block-header">
          <MailOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">
              Notificaciones de correo
              {savingCorreo && <Spin size="small" style={{ marginLeft: 8 }} />}
            </div>
            <div className="cfg-block-desc">Elige cuándo se envían correos automáticos al cliente</div>
          </div>
        </div>

        {loadingCorreo ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : (
          <div className="cfg-correo-list">

            <div className="cfg-correo-row cfg-correo-row--highlight">
              <div className="cfg-correo-row-info">
                <span className="cfg-correo-row-label">Al crear un evento</span>
                <span className="cfg-correo-row-desc">Envía confirmación al cliente cuando se registra un evento nuevo</span>
              </div>
              <Switch
                checked={correo.correo_crear_evento}
                onChange={(v) => handleCorreoToggle("correo_crear_evento", v)}
              />
            </div>

            <div className="cfg-correo-section-label">
              <ClockCircleOutlined />
              Recordatorios automáticos del evento
            </div>

            <div className="cfg-correo-grid">
              {RECORDATORIOS.map((r) => (
                <div key={r.key} className="cfg-correo-grid-item">
                  <span className="cfg-correo-grid-label">{r.label}</span>
                  <Switch
                    size="small"
                    checked={correo[r.key]}
                    onChange={(v) => handleCorreoToggle(r.key, v)}
                  />
                </div>
              ))}
            </div>

            <div className="cfg-correo-row">
              <div className="cfg-correo-row-info">
                <span className="cfg-correo-row-label">1 hora antes de la misa</span>
                <span className="cfg-correo-row-desc">Recordatorio enviado antes de la hora de misa registrada en el evento</span>
              </div>
              <Switch
                checked={correo.correo_hora_misa}
                onChange={(v) => handleCorreoToggle("correo_hora_misa", v)}
              />
            </div>

          </div>
        )}
      </div>

    </div>
  );
}

// ── Paneles vacíos ─────────────────────────────────────────────────────────

function PanelGeneral() {
  const [ciudades, setCiudades] = useState([]);
  const [loadingCiudades, setLoadingCiudades] = useState(true);
  const [inputNombre, setInputNombre] = useState("");
  const [addingCiudad, setAddingCiudad] = useState(false);

  useEffect(() => { fetchCiudades(); }, []);

  const fetchCiudades = async () => {
    setLoadingCiudades(true);
    try {
      const res = await api.get("/general/ciudades", { headers: authHeader() });
      setCiudades(res.data || []);
    } catch {
      message.error("Error al cargar ciudades");
    } finally {
      setLoadingCiudades(false);
    }
  };

  const handleAddCiudad = async () => {
    const nombre = inputNombre.trim();
    if (!nombre) return;
    setAddingCiudad(true);
    try {
      const res = await api.post("/general/ciudades", { nombre }, { headers: authHeader() });
      setCiudades((prev) => [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setInputNombre("");
      message.success(`Ciudad "${nombre}" agregada`);
    } catch (err) {
      message.error(err?.response?.data?.detail || "Error al agregar ciudad");
    } finally {
      setAddingCiudad(false);
    }
  };

  const handleDeleteCiudad = (ciudad) => {
    Modal.confirm({
      title: "¿Eliminar ciudad?",
      content: (
        <span>
          Se eliminará <strong>{ciudad.nombre}</strong>. Esta acción no se puede deshacer.
        </span>
      ),
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await api.delete(`/general/ciudades/${ciudad.id_ciudad}`, { headers: authHeader() });
          setCiudades((prev) => prev.filter((c) => c.id_ciudad !== ciudad.id_ciudad));
          message.success("Ciudad eliminada");
        } catch {
          message.error("Error al eliminar ciudad");
        }
      },
    });
  };

  return (
    <div className="cfg-panel-body">
      <div className="cfg-block">
        <div className="cfg-block-header">
          <EnvironmentOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Ciudades</div>
            <div className="cfg-block-desc">Ciudades disponibles para asociar a eventos y agenda</div>
          </div>
        </div>

        <div className="cfg-tipo-add-row">
          <Input
            value={inputNombre}
            onChange={(e) => setInputNombre(e.target.value)}
            placeholder="Nombre de la ciudad..."
            className="cfg-tipo-input"
            onPressEnter={handleAddCiudad}
            maxLength={80}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddCiudad}
            loading={addingCiudad}
            disabled={!inputNombre.trim()}
            className="cfg-tipo-btn-add"
          >
            Agregar
          </Button>
        </div>

        {loadingCiudades ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : ciudades.length === 0 ? (
          <div className="cfg-tipo-empty">Sin ciudades registradas</div>
        ) : (
          <div className="cfg-tipo-chips">
            {ciudades.map((c) => (
              <div key={c.id_ciudad} className="cfg-tipo-chip">
                <span className="cfg-tipo-chip-label">{c.nombre}</span>
                <button
                  type="button"
                  className="cfg-tipo-chip-del"
                  onClick={() => handleDeleteCiudad(c)}
                  title="Eliminar"
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ALERTAS_DEFAULTS = {
  stock_minimo: 0,
  correo_stock_minimo: false,
  correo_movimiento: false,
};

function PanelInventario() {
  // ── Categorías ──
  const [categorias, setCategorias] = useState([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const [inputCat, setInputCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  // ── Estados ──
  const [estados, setEstados] = useState([]);
  const [loadingEst, setLoadingEst] = useState(true);
  const [inputEst, setInputEst] = useState("");
  const [addingEst, setAddingEst] = useState(false);

  // ── Alertas ──
  const [alertas, setAlertas] = useState(ALERTAS_DEFAULTS);
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  const [savingAlertas, setSavingAlertas] = useState(false);
  const alertasDebounceRef = useRef(null);

  useEffect(() => {
    fetchCategorias();
    fetchEstados();
    fetchAlertas();
  }, []);

  const fetchCategorias = async () => {
    setLoadingCat(true);
    try {
      const res = await api.get("/inventario/categorias", { headers: authHeader() });
      setCategorias(res.data || []);
    } catch {
      message.error("Error al cargar categorías");
    } finally {
      setLoadingCat(false);
    }
  };

  const fetchEstados = async () => {
    setLoadingEst(true);
    try {
      const res = await api.get("/inventario/config/estados", { headers: authHeader() });
      setEstados(res.data || []);
    } catch {
      message.error("Error al cargar estados");
    } finally {
      setLoadingEst(false);
    }
  };

  const fetchAlertas = async () => {
    setLoadingAlertas(true);
    try {
      const res = await api.get("/inventario/config/alertas", { headers: authHeader() });
      setAlertas({ ...ALERTAS_DEFAULTS, ...res.data });
    } catch {
      message.error("Error al cargar configuración de alertas");
    } finally {
      setLoadingAlertas(false);
    }
  };

  const handleAddCat = async () => {
    const nombre = inputCat.trim();
    if (!nombre) return;
    setAddingCat(true);
    try {
      const res = await api.post("/inventario/categorias", { nombre }, { headers: authHeader() });
      setCategorias((prev) => [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setInputCat("");
      message.success(`Categoría "${nombre}" agregada`);
    } catch (err) {
      message.error(err?.response?.data?.detail || "Error al agregar categoría");
    } finally {
      setAddingCat(false);
    }
  };

  const handleDeleteCat = (cat) => {
    Modal.confirm({
      title: "¿Eliminar categoría?",
      content: <span>Se eliminará <strong>{cat.nombre}</strong>. Esta acción no se puede deshacer.</span>,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await api.delete(`/inventario/categorias/${cat.id_categoria_equipo}`, { headers: authHeader() });
          setCategorias((prev) => prev.filter((c) => c.id_categoria_equipo !== cat.id_categoria_equipo));
          message.success("Categoría eliminada");
        } catch {
          message.error("Error al eliminar categoría");
        }
      },
    });
  };

  const handleAddEst = async () => {
    const nombre = inputEst.trim();
    if (!nombre) return;
    setAddingEst(true);
    try {
      const res = await api.post("/inventario/config/estados", { nombre }, { headers: authHeader() });
      setEstados((prev) => [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setInputEst("");
      message.success(`Estado "${nombre}" agregado`);
    } catch (err) {
      message.error(err?.response?.data?.detail || "Error al agregar estado");
    } finally {
      setAddingEst(false);
    }
  };

  const handleDeleteEst = (est) => {
    Modal.confirm({
      title: "¿Eliminar estado?",
      content: <span>Se eliminará <strong>{est.nombre}</strong>. Esta acción no se puede deshacer.</span>,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await api.delete(`/inventario/config/estados/${est.id_inventario_estado}`, { headers: authHeader() });
          setEstados((prev) => prev.filter((e) => e.id_inventario_estado !== est.id_inventario_estado));
          message.success("Estado eliminado");
        } catch {
          message.error("Error al eliminar estado");
        }
      },
    });
  };

  const saveAlertas = (next) => {
    if (alertasDebounceRef.current) clearTimeout(alertasDebounceRef.current);
    alertasDebounceRef.current = setTimeout(async () => {
      setSavingAlertas(true);
      try {
        await api.put("/inventario/config/alertas", next, { headers: authHeader() });
      } catch {
        message.error("Error al guardar configuración");
      } finally {
        setSavingAlertas(false);
      }
    }, 600);
  };

  const handleAlertaChange = (key, value) => {
    const next = { ...alertas, [key]: value };
    setAlertas(next);
    saveAlertas(next);
  };

  return (
    <div className="cfg-panel-body">

      {/* ── Categorías de equipo ── */}
      <div className="cfg-block">
        <div className="cfg-block-header">
          <AppstoreOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Categorías de equipo</div>
            <div className="cfg-block-desc">Grupos para clasificar el equipo en el inventario</div>
          </div>
        </div>
        <div className="cfg-tipo-add-row">
          <Input
            value={inputCat}
            onChange={(e) => setInputCat(e.target.value)}
            placeholder="Nombre de la nueva categoría..."
            className="cfg-tipo-input"
            onPressEnter={handleAddCat}
            maxLength={60}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddCat}
            loading={addingCat}
            disabled={!inputCat.trim()}
            className="cfg-tipo-btn-add"
          >
            Agregar
          </Button>
        </div>
        {loadingCat ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : categorias.length === 0 ? (
          <div className="cfg-tipo-empty">Sin categorías registradas</div>
        ) : (
          <div className="cfg-tipo-chips">
            {categorias.map((c) => (
              <div key={c.id_categoria_equipo} className="cfg-tipo-chip">
                <span className="cfg-tipo-chip-label">{c.nombre}</span>
                <button type="button" className="cfg-tipo-chip-del" onClick={() => handleDeleteCat(c)} title="Eliminar">
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cfg-divider" style={{marginBottom:50}}/>

      {/* ── Estados de inventario ── */}
      <div className="cfg-block">
        <div className="cfg-block-header">
          <TagOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Estados de inventario</div>
            <div className="cfg-block-desc">Estados posibles para el equipo (ej. activo, baja, reparación)</div>
          </div>
        </div>
        <div className="cfg-tipo-add-row">
          <Input
            value={inputEst}
            onChange={(e) => setInputEst(e.target.value)}
            placeholder="Nombre del nuevo estado..."
            className="cfg-tipo-input"
            onPressEnter={handleAddEst}
            maxLength={60}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddEst}
            loading={addingEst}
            disabled={!inputEst.trim()}
            className="cfg-tipo-btn-add"
          >
            Agregar
          </Button>
        </div>
        {loadingEst ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : estados.length === 0 ? (
          <div className="cfg-tipo-empty">Sin estados registrados</div>
        ) : (
          <div className="cfg-tipo-chips">
            {estados.map((e) => (
              <div key={e.id_inventario_estado} className="cfg-tipo-chip">
                <span className="cfg-tipo-chip-label">{e.nombre}</span>
                <button type="button" className="cfg-tipo-chip-del" onClick={() => handleDeleteEst(e)} title="Eliminar">
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cfg-divider" style={{marginBottom:50}}/>

      {/* ── Alertas de stock ── */}
      <div className="cfg-block">
        <div className="cfg-block-header">
          <AlertOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">
              Alertas y notificaciones
              {savingAlertas && <Spin size="small" style={{ marginLeft: 8 }} />}
            </div>
            <div className="cfg-block-desc">Configuración de alertas automáticas del inventario</div>
          </div>
        </div>

        {loadingAlertas ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : (
          <div className="cfg-correo-list">

            <div className="cfg-correo-row">
              <div className="cfg-correo-row-info">
                <span className="cfg-correo-row-label">Cantidad mínima de stock</span>
                <span className="cfg-correo-row-desc">Alerta cuando el stock disponible de un equipo baje de este número</span>
              </div>
              <InputNumber
                min={0}
                max={9999}
                value={alertas.stock_minimo}
                onChange={(v) => handleAlertaChange("stock_minimo", v ?? 0)}
                className="cfg-stock-input"
                controls
              />
            </div>

            <div className="cfg-correo-row cfg-correo-row--highlight">
              <div className="cfg-correo-row-info">
                <span className="cfg-correo-row-label">Enviar correo al llegar al mínimo</span>
                <span className="cfg-correo-row-desc">Notifica por correo cuando el stock de un equipo alcance la cantidad mínima</span>
              </div>
              <Switch
                checked={alertas.correo_stock_minimo}
                onChange={(v) => handleAlertaChange("correo_stock_minimo", v)}
              />
            </div>

            <div className="cfg-correo-row">
              <div className="cfg-correo-row-info">
                <span className="cfg-correo-row-label">Enviar correo al registrar un movimiento</span>
                <span className="cfg-correo-row-desc">Notifica por correo cada vez que se registra una entrada, salida o baja de equipo</span>
              </div>
              <Switch
                checked={alertas.correo_movimiento}
                onChange={(v) => handleAlertaChange("correo_movimiento", v)}
              />
            </div>

          </div>
        )}
      </div>

    </div>
  );
}

const SES_CORREO_DEFAULTS = {
  correo_crear_sesion: false,
  correo_hora_antes:   false,
  correo_dia_antes:    false,
  correo_semana_antes: false,
  correo_mes_antes:    false,
};

const SES_RECORDATORIOS = [
  { key: "correo_hora_antes",   label: "1 hora antes" },
  { key: "correo_dia_antes",    label: "1 día antes" },
  { key: "correo_semana_antes", label: "1 semana antes" },
  { key: "correo_mes_antes",    label: "1 mes antes" },
];

function PanelSesiones() {
  const [tipos, setTipos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [inputNombre, setInputNombre] = useState("");
  const [addingTipo, setAddingTipo] = useState(false);

  const [correo, setCorreo] = useState(SES_CORREO_DEFAULTS);
  const [loadingCorreo, setLoadingCorreo] = useState(true);
  const [savingCorreo, setSavingCorreo] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchTipos();
    fetchCorreo();
  }, []);

  const fetchTipos = async () => {
    setLoadingTipos(true);
    try {
      const res = await api.get("/sesiones-fotos/config/tipos", { headers: authHeader() });
      setTipos(res.data || []);
    } catch {
      message.error("Error al cargar los tipos de sesión");
    } finally {
      setLoadingTipos(false);
    }
  };

  const fetchCorreo = async () => {
    setLoadingCorreo(true);
    try {
      const res = await api.get("/sesiones-fotos/config/correo", { headers: authHeader() });
      setCorreo({ ...SES_CORREO_DEFAULTS, ...res.data });
    } catch {
      message.error("Error al cargar configuración de correo");
    } finally {
      setLoadingCorreo(false);
    }
  };

  const handleAddTipo = async () => {
    const nombre = inputNombre.trim();
    if (!nombre) return;
    setAddingTipo(true);
    try {
      const res = await api.post("/sesiones-fotos/config/tipos", { nombre }, { headers: authHeader() });
      setTipos((prev) => [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setInputNombre("");
      message.success(`Tipo "${nombre}" agregado`);
    } catch (err) {
      message.error(err?.response?.data?.detail || "Error al agregar tipo");
    } finally {
      setAddingTipo(false);
    }
  };

  const handleDeleteTipo = (tipo) => {
    Modal.confirm({
      title: "¿Eliminar tipo de sesión?",
      content: <span>Se eliminará <strong>{tipo.nombre}</strong>. Esta acción no se puede deshacer.</span>,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await api.delete(`/sesiones-fotos/config/tipos/${tipo.id_tipo_sesion}`, { headers: authHeader() });
          setTipos((prev) => prev.filter((t) => t.id_tipo_sesion !== tipo.id_tipo_sesion));
          message.success("Tipo eliminado");
        } catch {
          message.error("Error al eliminar tipo");
        }
      },
    });
  };

  const handleCorreoToggle = (key, value) => {
    const next = { ...correo, [key]: value };
    setCorreo(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSavingCorreo(true);
      try {
        await api.put("/sesiones-fotos/config/correo", next, { headers: authHeader() });
      } catch {
        message.error("Error al guardar configuración de correo");
      } finally {
        setSavingCorreo(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">

      <div className="cfg-block">
        <div className="cfg-block-header">
          <TagOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Tipos de sesión</div>
            <div className="cfg-block-desc">Categorías que se asignan al crear una sesión fotográfica</div>
          </div>
        </div>

        <div className="cfg-tipo-add-row">
          <Input
            value={inputNombre}
            onChange={(e) => setInputNombre(e.target.value)}
            placeholder="Nombre del nuevo tipo..."
            className="cfg-tipo-input"
            onPressEnter={handleAddTipo}
            maxLength={60}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddTipo}
            loading={addingTipo}
            disabled={!inputNombre.trim()}
            className="cfg-tipo-btn-add"
          >
            Agregar
          </Button>
        </div>

        {loadingTipos ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : tipos.length === 0 ? (
          <div className="cfg-tipo-empty">Sin tipos registrados</div>
        ) : (
          <div className="cfg-tipo-chips">
            {tipos.map((t) => (
              <div key={t.id_tipo_sesion} className="cfg-tipo-chip">
                <span className="cfg-tipo-chip-label">{t.nombre}</span>
                <button type="button" className="cfg-tipo-chip-del" onClick={() => handleDeleteTipo(t)} title="Eliminar">
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cfg-divider" />

      <div className="cfg-block">
        <div className="cfg-block-header">
          <MailOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">
              Notificaciones de correo
              {savingCorreo && <Spin size="small" style={{ marginLeft: 8 }} />}
            </div>
            <div className="cfg-block-desc">Elige cuándo se envían correos automáticos al cliente</div>
          </div>
        </div>

        {loadingCorreo ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : (
          <div className="cfg-correo-list">

            <div className="cfg-correo-row cfg-correo-row--highlight">
              <div className="cfg-correo-row-info">
                <span className="cfg-correo-row-label">Al crear una sesión</span>
                <span className="cfg-correo-row-desc">Envía confirmación al cliente cuando se registra una sesión nueva</span>
              </div>
              <Switch
                checked={correo.correo_crear_sesion}
                onChange={(v) => handleCorreoToggle("correo_crear_sesion", v)}
              />
            </div>

            <div className="cfg-correo-section-label">
              <ClockCircleOutlined />
              Recordatorios automáticos de la sesión
            </div>

            <div className="cfg-correo-grid">
              {SES_RECORDATORIOS.map((r) => (
                <div key={r.key} className="cfg-correo-grid-item">
                  <span className="cfg-correo-grid-label">{r.label}</span>
                  <Switch
                    size="small"
                    checked={correo[r.key]}
                    onChange={(v) => handleCorreoToggle(r.key, v)}
                  />
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}

const TRAB_CORREO_DEFAULTS = { correo_crear_trabajador: false };

function PanelTrabajadores() {
  const [correo, setCorreo] = useState(TRAB_CORREO_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get("/trabajadores/config/correo", { headers: authHeader() })
      .then((res) => setCorreo({ ...TRAB_CORREO_DEFAULTS, ...res.data }))
      .catch(() => message.error("Error al cargar configuración"))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key, value) => {
    const next = { ...correo, [key]: value };
    setCorreo(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.put("/trabajadores/config/correo", next, { headers: authHeader() });
      } catch {
        message.error("Error al guardar configuración");
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">
      <div className="cfg-block">
        <div className="cfg-block-header">
          <MailOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">
              Notificaciones de correo
              {saving && <Spin size="small" style={{ marginLeft: 8 }} />}
            </div>
            <div className="cfg-block-desc">Correos automáticos relacionados al módulo de trabajadores</div>
          </div>
        </div>

        {loading ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : (
          <div className="cfg-correo-list">
            <div className="cfg-correo-row cfg-correo-row--highlight">
              <div className="cfg-correo-row-info">
                <span className="cfg-correo-row-label">Al registrar un trabajador</span>
                <span className="cfg-correo-row-desc">Envía una notificación cuando se crea un nuevo trabajador en el sistema</span>
              </div>
              <Switch
                checked={correo.correo_crear_trabajador}
                onChange={(v) => handleToggle("correo_crear_trabajador", v)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const USR_CORREO_DEFAULTS = {
  correo_crear_usuario:      false,
  correo_inicio_sesion:      false,
  correo_recuperar_password: false,
};

const USR_SWITCHES = [
  {
    key:   "correo_crear_usuario",
    label: "Al crear un usuario",
    desc:  "Envía un correo de bienvenida cuando se registra un nuevo usuario en el sistema",
    highlight: true,
  },
  {
    key:   "correo_inicio_sesion",
    label: "Al iniciar sesión",
    desc:  "Notifica por correo cada vez que cualquier usuario inicia sesión",
    highlight: false,
  },
  {
    key:   "correo_recuperar_password",
    label: "Al recuperar contraseña",
    desc:  "Confirma por correo cuando el proceso de recuperación de contraseña se completa",
    highlight: false,
  },
];

function PanelUsuarios() {
  const [correo, setCorreo] = useState(USR_CORREO_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get("/users/config/correo", { headers: authHeader() })
      .then((res) => setCorreo({ ...USR_CORREO_DEFAULTS, ...res.data }))
      .catch(() => message.error("Error al cargar configuración"))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (key, value) => {
    const next = { ...correo, [key]: value };
    setCorreo(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.put("/users/config/correo", next, { headers: authHeader() });
      } catch {
        message.error("Error al guardar configuración");
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">
      <div className="cfg-block">
        <div className="cfg-block-header">
          <MailOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">
              Notificaciones de correo
              {saving && <Spin size="small" style={{ marginLeft: 8 }} />}
            </div>
            <div className="cfg-block-desc">Correos automáticos relacionados a la gestión de usuarios</div>
          </div>
        </div>

        {loading ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : (
          <div className="cfg-correo-list">
            {USR_SWITCHES.map((s) => (
              <div key={s.key} className={`cfg-correo-row${s.highlight ? " cfg-correo-row--highlight" : ""}`}>
                <div className="cfg-correo-row-info">
                  <span className="cfg-correo-row-label">{s.label}</span>
                  <span className="cfg-correo-row-desc">{s.desc}</span>
                </div>
                <Switch
                  checked={correo[s.key]}
                  onChange={(v) => handleToggle(s.key, v)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel Agenda ───────────────────────────────────────────────────────────

const AGENDA_CORREO_DEFAULTS = { correo_crear_agenda: false };

function PanelAgenda() {
  const [tipos, setTipos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [inputNombre, setInputNombre] = useState("");
  const [addingTipo, setAddingTipo] = useState(false);

  const [correo, setCorreo] = useState(AGENDA_CORREO_DEFAULTS);
  const [loadingCorreo, setLoadingCorreo] = useState(true);
  const [savingCorreo, setSavingCorreo] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchTipos();
    fetchCorreo();
  }, []);

  const fetchTipos = async () => {
    setLoadingTipos(true);
    try {
      const res = await api.get("/agenda/config/tipos", { headers: authHeader() });
      setTipos(res.data || []);
    } catch {
      message.error("Error al cargar los tipos de agenda");
    } finally {
      setLoadingTipos(false);
    }
  };

  const fetchCorreo = async () => {
    setLoadingCorreo(true);
    try {
      const res = await api.get("/agenda/config/correo", { headers: authHeader() });
      setCorreo({ ...AGENDA_CORREO_DEFAULTS, ...res.data });
    } catch {
      message.error("Error al cargar configuración de correo");
    } finally {
      setLoadingCorreo(false);
    }
  };

  const handleAddTipo = async () => {
    const nombre = inputNombre.trim();
    if (!nombre) return;
    setAddingTipo(true);
    try {
      const res = await api.post("/agenda/config/tipos", { nombre }, { headers: authHeader() });
      setTipos((prev) => [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setInputNombre("");
      message.success(`Tipo "${nombre}" agregado`);
    } catch (err) {
      message.error(err?.response?.data?.detail || "Error al agregar tipo");
    } finally {
      setAddingTipo(false);
    }
  };

  const handleDeleteTipo = (tipo) => {
    Modal.confirm({
      title: "¿Eliminar tipo de agenda?",
      content: (
        <span>
          Se eliminará <strong>{tipo.nombre}</strong>. Esta acción no se puede deshacer.
        </span>
      ),
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await api.delete(`/agenda/config/tipos/${tipo.id_agenda_evento}`, { headers: authHeader() });
          setTipos((prev) => prev.filter((t) => t.id_agenda_evento !== tipo.id_agenda_evento));
          message.success("Tipo eliminado");
        } catch {
          message.error("Error al eliminar tipo");
        }
      },
    });
  };

  const handleCorreoToggle = (key, value) => {
    const next = { ...correo, [key]: value };
    setCorreo(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSavingCorreo(true);
      try {
        await api.put("/agenda/config/correo", next, { headers: authHeader() });
      } catch {
        message.error("Error al guardar configuración de correo");
      } finally {
        setSavingCorreo(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">

      <div className="cfg-block">
        <div className="cfg-block-header">
          <TagOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Tipos de agenda</div>
            <div className="cfg-block-desc">Categorías que se asignan al crear un evento de agenda</div>
          </div>
        </div>

        <div className="cfg-tipo-add-row">
          <Input
            value={inputNombre}
            onChange={(e) => setInputNombre(e.target.value)}
            placeholder="Nombre del nuevo tipo..."
            className="cfg-tipo-input"
            onPressEnter={handleAddTipo}
            maxLength={60}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddTipo}
            loading={addingTipo}
            disabled={!inputNombre.trim()}
            className="cfg-tipo-btn-add"
          >
            Agregar
          </Button>
        </div>

        {loadingTipos ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : tipos.length === 0 ? (
          <div className="cfg-tipo-empty">Sin tipos registrados</div>
        ) : (
          <div className="cfg-tipo-chips">
            {tipos.map((t) => (
              <div key={t.id_agenda_evento} className="cfg-tipo-chip">
                <span className="cfg-tipo-chip-label">{t.nombre}</span>
                <button
                  type="button"
                  className="cfg-tipo-chip-del"
                  onClick={() => handleDeleteTipo(t)}
                  title="Eliminar"
                >
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cfg-divider" style={{ marginBottom: 50 }} />

      <div className="cfg-block">
        <div className="cfg-block-header">
          <MailOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">
              Notificaciones de correo
              {savingCorreo && <Spin size="small" style={{ marginLeft: 8 }} />}
            </div>
            <div className="cfg-block-desc">Correos automáticos relacionados al módulo de agenda</div>
          </div>
        </div>

        {loadingCorreo ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : (
          <div className="cfg-correo-list">
            <div className="cfg-correo-row cfg-correo-row--highlight">
              <div className="cfg-correo-row-info">
                <span className="cfg-correo-row-label">Al crear una agenda manualmente</span>
                <span className="cfg-correo-row-desc">
                  Envía una notificación cuando se registra un nuevo evento de agenda
                </span>
              </div>
              <Switch
                checked={correo.correo_crear_agenda}
                onChange={(v) => handleCorreoToggle("correo_crear_agenda", v)}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Módulos ────────────────────────────────────────────────────────────────

const MODULES = [
  {
    key: "general",
    label: "General",
    icon: <SettingOutlined />,
    color: "#374151",
    bg: "linear-gradient(140deg, #374151 0%, #9ca3af 100%)",
  },
  {
    key: "eventos",
    label: "Eventos",
    icon: <CalendarOutlined />,
    color: "#0f766e",
    bg: "linear-gradient(140deg, #065f46 0%, #10b981 100%)",
  },
  {
    key: "inventario",
    label: "Inventario",
    icon: <ToolOutlined />,
    color: "#1d4ed8",
    bg: "linear-gradient(140deg, #1d4ed8 0%, #3b82f6 100%)",
  },
  {
    key: "sesiones",
    label: "Sesiones",
    icon: <CameraOutlined />,
    color: "#be185d",
    bg: "linear-gradient(140deg, #be185d 0%, #f472b6 100%)",
  },
  {
    key: "trabajadores",
    label: "Trabajadores",
    icon: <TeamOutlined />,
    color: "#6d28d9",
    bg: "linear-gradient(140deg, #6d28d9 0%, #a78bfa 100%)",
  },
  {
    key: "usuarios",
    label: "Usuarios",
    icon: <UserOutlined />,
    color: "#c2410c",
    bg: "linear-gradient(140deg, #c2410c 0%, #f97316 100%)",
  },
  {
    key: "agenda",
    label: "Agenda",
    icon: <ScheduleOutlined />,
    color: "#0369a1",
    bg: "linear-gradient(140deg, #0369a1 0%, #38bdf8 100%)",
  },
];

const PANELS = {
  general: PanelGeneral,
  eventos: PanelEventos,
  inventario: PanelInventario,
  sesiones: PanelSesiones,
  trabajadores: PanelTrabajadores,
  usuarios: PanelUsuarios,
  agenda: PanelAgenda,
};

// ── Página ─────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const [active, setActive] = useState("general");

  const activeModule = MODULES.find((m) => m.key === active);

  return (
    <main className="cfg-main">
      <div className="cfg-layout">

        <aside className="cfg-sidebar">
          <div className="cfg-sidebar-header">
            <Title level={5} className="cfg-sidebar-title">Configuración</Title>
          </div>

          <nav className="cfg-nav">
            {MODULES.map((mod) => (
              <button
                key={mod.key}
                type="button"
                className={`cfg-nav-item${active === mod.key ? " cfg-nav-item--active" : ""}`}
                onClick={() => setActive(mod.key)}
                style={active === mod.key ? { "--mod-color": mod.color } : {}}
              >
                <span
                  className="cfg-nav-icon"
                  style={{ background: active === mod.key ? mod.bg : undefined }}
                >
                  {mod.icon}
                </span>
                <span className="cfg-nav-label">{mod.label}</span>
                {active === mod.key && <span className="cfg-nav-active-bar" />}
              </button>
            ))}
          </nav>
        </aside>

        <section className="cfg-content">
          <div className="cfg-content-card">
            <div className="cfg-content-header">
              <span
                className="cfg-content-icon"
                style={{ background: activeModule?.bg }}
              >
                {activeModule?.icon}
              </span>
              <div>
                <Title level={3} className="cfg-content-title">{activeModule?.label}</Title>
                <Text type="secondary" className="cfg-content-subtitle">
                  Configuración del módulo
                </Text>
              </div>
            </div>
            <div className="cfg-content-inner-divider" />
            {React.createElement(PANELS[active] || PanelGeneral)}
          </div>
        </section>

      </div>
    </main>
  );
}
