import React, { useState, useEffect, useRef } from "react";
import { Typography, Switch, Modal, Spin, Input, Button, InputNumber, Select, Tag, Upload } from "antd";
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
  DollarOutlined,
  ShopOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { PATH } from "../../redux/utils";
import { clearEmpresaConfigCache } from "../../components/utils/empresaConfig";
import Toast from "../../components/toasts/toast";
import "./ConfiguracionPage.css";

const { Title, Text } = Typography;

const api = axios.create({ baseURL: PATH });
const authHeader = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Selector de destinatarios de correo ───────────────────────────────────

const AVATAR_PALETTE = [
  "#6366f1","#0ea5e9","#10b981","#f59e0b",
  "#ef4444","#8b5cf6","#ec4899","#14b8a6",
];
const avatarColor  = (name = "") => AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];
const avatarInitials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

function AvatarCircle({ name, size = 26 }) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: "50%",
        background: avatarColor(name),
        color: "#fff",
        fontSize: size * 0.38,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {avatarInitials(name)}
    </span>
  );
}

function UserSelectorCorreo({ idModulo, sourceId }) {
  const [users, setUsers]       = useState([]);
  const [saved, setSaved]       = useState([]);   // lo que está en BD
  const [draft, setDraft]       = useState([]);   // borrador mientras edita
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [uResult, dResult] = await Promise.allSettled([
        api.get("/users", { headers: authHeader() }),
        api.get(`/config/correo/destinatarios?id_modulo=${idModulo}&source_id=${sourceId}`, { headers: authHeader() }),
      ]);
      if (!cancelled) {
        setUsers(uResult.status === "fulfilled" ? (uResult.value.data || []) : []);
        const ids = dResult.status === "fulfilled" ? (dResult.value.data?.user_ids || []).map(String) : [];
        setSaved(ids);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [idModulo, sourceId]);

  const handleEdit = () => { setDraft([...saved]); setIsEditing(true); };
  const handleCancel = () => { setDraft([]); setIsEditing(false); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/config/correo/destinatarios", {
        id_modulo: idModulo,
        source_id: sourceId,
        user_ids: draft.map(Number),
      }, { headers: authHeader() });
      setSaved(draft);
      setIsEditing(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const userMap = Object.fromEntries(users.map((u) => [String(u.id_user), u]));

  return (
    <div className="cfg-dest-panel">
      {/* ── Header ── */}
      <div className="cfg-dest-header">
        <UserOutlined className="cfg-dest-icon" />
        <span>¿A quién notificar?</span>
        <div className="cfg-dest-actions">
          {!isEditing ? (
            <button type="button" className="cfg-dest-btn cfg-dest-btn--edit" onClick={handleEdit}>
              Editar
            </button>
          ) : (
            <>
              <button type="button" className="cfg-dest-btn cfg-dest-btn--cancel" onClick={handleCancel}>
                Cancelar
              </button>
              <button
                type="button"
                className="cfg-dest-btn cfg-dest-btn--save"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Spin size="small" /> : "Guardar"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Vista: chips de solo lectura ── */}
      {!isEditing && (
        <div className="cfg-dest-view">
          {loading ? (
            <Spin size="small" />
          ) : saved.length === 0 ? (
            <span className="cfg-dest-empty">Sin destinatarios — haz clic en Editar para agregar</span>
          ) : (
            saved.map((id) => {
              const u = userMap[id];
              const name = u ? (u.name || u.email) : id;
              return (
                <div key={id} className="cfg-dest-chip-view">
                  <AvatarCircle name={name} size={30} />
                  <span className="cfg-dest-chip-name">{name}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Edición: select ── */}
      {isEditing && (
        <Select
          mode="multiple"
          style={{ width: "100%" }}
          placeholder="Busca y selecciona usuarios..."
          value={draft}
          onChange={setDraft}
          loading={loading}
          optionFilterProp="label"
          allowClear
          maxTagCount="responsive"
          popupMatchSelectWidth
          options={users.map((u) => ({
            value: String(u.id_user),
            label: u.name || u.email,
          }))}
          optionRender={(opt) => (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
              <AvatarCircle name={opt.label} size={26} />
              <span style={{ fontSize: 13, color: "#111827" }}>{opt.label}</span>
            </div>
          )}
          tagRender={(props) => {
            const u = userMap[props.value];
            const name = u ? (u.name || u.email) : props.label;
            return (
              <Tag closable onClose={props.onClose} className="cfg-dest-tag">
                <AvatarCircle name={name} size={18} />
                <span>{name}</span>
              </Tag>
            );
          }}
        />
      )}
    </div>
  );
}

// ── Panel Eventos ──────────────────────────────────────────────────────────

const CORREO_DEFAULTS = {
  correo_crear_evento:  false,
  correo_hora_evento:   false,
  correo_dia_evento:    false,
  correo_hora_sesion:   false,
  correo_dia_sesion:    false,
  correo_hora_misa:     false,
};

const RECORDATORIOS = [
  { key: "correo_hora_evento", label: "1 hora antes", sourceId: 2 },
  { key: "correo_dia_evento",  label: "1 día antes",  sourceId: 3 },
];

const SESION_RECORDATORIOS = [
  { key: "correo_hora_sesion", label: "1 hora antes de la sesión de fotos", sourceId: 7 },
  { key: "correo_dia_sesion",  label: "1 día antes de la sesión de fotos",  sourceId: 8 },
];

function PanelEventos() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
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
      toast("Error al cargar los tipos de evento");
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
      toast("Error al cargar configuración de correo");
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
      toast(`Tipo "${nombre}" agregado`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast(detail || "Error al agregar tipo");
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
          toast("Tipo eliminado");
        } catch {
          toast("Error al eliminar tipo");
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
        toast("Error al guardar configuración de correo");
      } finally {
        setSavingCorreo(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />

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

            <div className="cfg-correo-entry">
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
              {correo.correo_crear_evento && <UserSelectorCorreo idModulo={1} sourceId={1} />}
            </div>

            <div className="cfg-correo-section-label">
              <ClockCircleOutlined />
              Recordatorios automáticos del evento
            </div>

            {RECORDATORIOS.map((r) => (
              <div key={r.key} className="cfg-correo-entry">
                <div className="cfg-correo-row cfg-correo-row--recordatorio">
                  <div className="cfg-correo-row-info">
                    <span className="cfg-correo-row-label">{r.label}</span>
                  </div>
                  <Switch
                    size="small"
                    checked={correo[r.key]}
                    onChange={(v) => handleCorreoToggle(r.key, v)}
                  />
                </div>
                {correo[r.key] && <UserSelectorCorreo idModulo={1} sourceId={r.sourceId} />}
              </div>
            ))}

            <div className="cfg-correo-section-label">
              <CameraOutlined />
              Recordatorios sesión de fotografía
            </div>

            {SESION_RECORDATORIOS.map((r) => (
              <div key={r.key} className="cfg-correo-entry">
                <div className="cfg-correo-row cfg-correo-row--recordatorio">
                  <div className="cfg-correo-row-info">
                    <span className="cfg-correo-row-label">{r.label}</span>
                  </div>
                  <Switch
                    size="small"
                    checked={correo[r.key]}
                    onChange={(v) => handleCorreoToggle(r.key, v)}
                  />
                </div>
                {correo[r.key] && <UserSelectorCorreo idModulo={1} sourceId={r.sourceId} />}
              </div>
            ))}

            <div className="cfg-correo-entry">
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
              {correo.correo_hora_misa && <UserSelectorCorreo idModulo={1} sourceId={6} />}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}

// ── Paneles vacíos ─────────────────────────────────────────────────────────

function PanelGeneral() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  // ── Avisos ──
  const [avisos, setAvisos] = useState([]);
  const [loadingAvisos, setLoadingAvisos] = useState(true);
  const [inputAviso, setInputAviso] = useState("");
  const [addingAviso, setAddingAviso] = useState(false);

  // ── Ciudades ──
  const [ciudades, setCiudades] = useState([]);
  const [loadingCiudades, setLoadingCiudades] = useState(true);
  const [inputNombre, setInputNombre] = useState("");
  const [addingCiudad, setAddingCiudad] = useState(false);

  useEffect(() => {
    fetchAvisos();
    fetchCiudades();
  }, []);

  const notif = (_type, msg) => toast(msg);

  const fetchAvisos = async () => {
    setLoadingAvisos(true);
    try {
      const res = await api.get("/avisos", { headers: authHeader() });
      setAvisos((res.data || []).filter((a) => a.tipo === "app"));
    } catch {
      notif("error", "Error al cargar avisos");
    } finally {
      setLoadingAvisos(false);
    }
  };

  const handleAddAviso = async () => {
    const texto = inputAviso.trim();
    if (!texto) return;
    setAddingAviso(true);
    try {
      const res = await api.post("/avisos", { descripcion: texto }, { headers: authHeader() });
      setAvisos((prev) => [...prev, res.data]);
      setInputAviso("");
      notif("success", "Aviso agregado correctamente");
    } catch (err) {
      notif("error", err?.response?.data?.detail || "Error al agregar aviso");
    } finally {
      setAddingAviso(false);
    }
  };

  const handleDeleteAviso = (aviso) => {
    Modal.confirm({
      title: "¿Eliminar aviso?",
      content: <span>Se eliminará el aviso. Esta acción no se puede deshacer.</span>,
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await api.delete(`/avisos/${aviso.id_aviso}`, { headers: authHeader() });
          setAvisos((prev) => prev.filter((a) => a.id_aviso !== aviso.id_aviso));
          notif("success", "Aviso eliminado");
        } catch {
          notif("error", "Error al eliminar aviso");
        }
      },
    });
  };

  const fetchCiudades = async () => {
    setLoadingCiudades(true);
    try {
      const res = await api.get("/general/ciudades", { headers: authHeader() });
      setCiudades(res.data || []);
    } catch {
      notif("error", "Error al cargar ciudades");
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
      notif("success", `Ciudad "${nombre}" agregada`);
    } catch (err) {
      notif("error", err?.response?.data?.detail || "Error al agregar ciudad");
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
          notif("success", "Ciudad eliminada");
        } catch {
          notif("error", "Error al eliminar ciudad");
        }
      },
    });
  };

  return (
    <div className="cfg-panel-body">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />

      {/* ── Avisos de inicio ─────────────────────────── */}
      <div className="cfg-block">
        <div className="cfg-block-header">
          <AlertOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Avisos de inicio</div>
            <div className="cfg-block-desc">Mensajes que se muestran en la pantalla de inicio para todos los usuarios</div>
          </div>
        </div>

        <div className="cfg-tipo-add-row">
          <Input
            value={inputAviso}
            onChange={(e) => setInputAviso(e.target.value)}
            placeholder="Escribe el aviso..."
            className="cfg-tipo-input"
            onPressEnter={handleAddAviso}
            maxLength={300}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddAviso}
            loading={addingAviso}
            disabled={!inputAviso.trim()}
            className="cfg-tipo-btn-add"
          >
            Agregar
          </Button>
        </div>

        {loadingAvisos ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : avisos.length === 0 ? (
          <div className="cfg-tipo-empty">Sin avisos configurados</div>
        ) : (
          <div className="cfg-aviso-list">
            {avisos.map((a) => (
              <div key={a.id_aviso} className="cfg-aviso-item">
                <span className="cfg-aviso-item-text">{a.descripcion}</span>
                <button
                  type="button"
                  className="cfg-tipo-chip-del"
                  onClick={() => handleDeleteAviso(a)}
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

      {/* ── Ciudades ─────────────────────────────────── */}
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
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
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
      toast("Error al cargar categorías");
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
      toast("Error al cargar estados");
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
      toast("Error al cargar configuración de alertas");
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
      toast(`Categoría "${nombre}" agregada`);
    } catch (err) {
      toast(err?.response?.data?.detail || "Error al agregar categoría");
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
          toast("Categoría eliminada");
        } catch {
          toast("Error al eliminar categoría");
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
      toast(`Estado "${nombre}" agregado`);
    } catch (err) {
      toast(err?.response?.data?.detail || "Error al agregar estado");
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
          toast("Estado eliminado");
        } catch {
          toast("Error al eliminar estado");
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
        toast("Error al guardar configuración");
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
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />

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

            <div className="cfg-correo-entry">
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
              {alertas.correo_stock_minimo && <UserSelectorCorreo idModulo={3} sourceId={1} />}
            </div>

            <div className="cfg-correo-entry">
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
              {alertas.correo_movimiento && <UserSelectorCorreo idModulo={3} sourceId={2} />}
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
};

const SES_RECORDATORIOS = [
  { key: "correo_hora_antes", label: "1 hora antes", sourceId: 2 },
  { key: "correo_dia_antes",  label: "1 día antes",  sourceId: 3 },
];

function PanelSesiones() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
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
      toast("Error al cargar los tipos de sesión");
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
      toast("Error al cargar configuración de correo");
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
      toast(`Tipo "${nombre}" agregado`);
    } catch (err) {
      toast(err?.response?.data?.detail || "Error al agregar tipo");
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
          toast("Tipo eliminado");
        } catch {
          toast("Error al eliminar tipo");
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
        toast("Error al guardar configuración de correo");
      } finally {
        setSavingCorreo(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />

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

            <div className="cfg-correo-entry">
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
              {correo.correo_crear_sesion && <UserSelectorCorreo idModulo={10} sourceId={1} />}
            </div>

            <div className="cfg-correo-section-label">
              <ClockCircleOutlined />
              Recordatorios automáticos de la sesión
            </div>

            {SES_RECORDATORIOS.map((r) => (
              <div key={r.key} className="cfg-correo-entry">
                <div className="cfg-correo-row cfg-correo-row--recordatorio">
                  <div className="cfg-correo-row-info">
                    <span className="cfg-correo-row-label">{r.label}</span>
                  </div>
                  <Switch
                    size="small"
                    checked={correo[r.key]}
                    onChange={(v) => handleCorreoToggle(r.key, v)}
                  />
                </div>
                {correo[r.key] && <UserSelectorCorreo idModulo={10} sourceId={r.sourceId} />}
              </div>
            ))}

          </div>
        )}
      </div>

    </div>
  );
}

function PanelTrabajadores() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [puestos, setPuestos] = useState([]);
  const [loadingPuestos, setLoadingPuestos] = useState(true);
  const [inputNombre, setInputNombre] = useState("");
  const [addingPuesto, setAddingPuesto] = useState(false);

  useEffect(() => {
    fetchPuestos();
  }, []);

  const fetchPuestos = async () => {
    setLoadingPuestos(true);
    try {
      const res = await api.get("/trabajadores/puestos", { headers: authHeader() });
      setPuestos(res.data || []);
    } catch {
      toast("Error al cargar los tipos de puesto");
    } finally {
      setLoadingPuestos(false);
    }
  };

  const handleAddPuesto = async () => {
    const nombre = inputNombre.trim();
    if (!nombre) return;
    setAddingPuesto(true);
    try {
      const res = await api.post("/trabajadores/puestos", { nombre }, { headers: authHeader() });
      setPuestos((prev) => [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setInputNombre("");
      toast(`Puesto "${nombre}" agregado`);
    } catch (err) {
      toast(err?.response?.data?.detail || "Error al agregar puesto");
    } finally {
      setAddingPuesto(false);
    }
  };

  const handleDeletePuesto = (puesto) => {
    Modal.confirm({
      title: "¿Eliminar tipo de puesto?",
      content: (
        <span>
          Se eliminará <strong>{puesto.nombre}</strong>. Esta acción no se puede deshacer.
        </span>
      ),
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      onOk: async () => {
        try {
          await api.delete(`/trabajadores/puestos/${puesto.id_puesto}`, { headers: authHeader() });
          setPuestos((prev) => prev.filter((p) => p.id_puesto !== puesto.id_puesto));
          toast("Puesto eliminado");
        } catch {
          toast("Error al eliminar puesto");
        }
      },
    });
  };

  return (
    <div className="cfg-panel-body">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <div className="cfg-block">
        <div className="cfg-block-header">
          <TagOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Tipos de puesto</div>
            <div className="cfg-block-desc">Categorías que se asignan al registrar un trabajador</div>
          </div>
        </div>

        <div className="cfg-tipo-add-row">
          <Input
            value={inputNombre}
            onChange={(e) => setInputNombre(e.target.value)}
            placeholder="Nombre del nuevo tipo..."
            className="cfg-tipo-input"
            onPressEnter={handleAddPuesto}
            maxLength={60}
          />
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddPuesto}
            loading={addingPuesto}
            disabled={!inputNombre.trim()}
            className="cfg-tipo-btn-add"
          >
            Agregar
          </Button>
        </div>

        {loadingPuestos ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : puestos.length === 0 ? (
          <div className="cfg-tipo-empty">Sin tipos de puesto registrados</div>
        ) : (
          <div className="cfg-tipo-chips">
            {puestos.map((p) => (
              <div key={p.id_puesto} className="cfg-tipo-chip">
                <span className="cfg-tipo-chip-label">{p.nombre}</span>
                <button
                  type="button"
                  className="cfg-tipo-chip-del"
                  onClick={() => handleDeletePuesto(p)}
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

const USR_CORREO_DEFAULTS = {
  correo_crear_usuario:      false,
  correo_inicio_sesion:      false,
  correo_recuperar_password: false,
};

const USR_SWITCHES = [
  {
    key:       "correo_crear_usuario",
    label:     "Al crear un usuario",
    desc:      "Envía un correo de bienvenida cuando se registra un nuevo usuario en el sistema",
    highlight: true,
    sourceId:  1,
  },
  {
    key:       "correo_inicio_sesion",
    label:     "Al iniciar sesión",
    desc:      "Notifica por correo cada vez que cualquier usuario inicia sesión",
    highlight: false,
    sourceId:  2,
  },
  {
    key:       "correo_recuperar_password",
    label:     "Al recuperar contraseña",
    desc:      "Confirma por correo cuando el proceso de recuperación de contraseña se completa",
    highlight: false,
    sourceId:  3,
  },
];

function PanelUsuarios() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [correo, setCorreo] = useState(USR_CORREO_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get("/users/config/correo", { headers: authHeader() })
      .then((res) => setCorreo({ ...USR_CORREO_DEFAULTS, ...res.data }))
      .catch(() => toast("Error al cargar configuración"))
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
        toast("Error al guardar configuración");
      } finally {
        setSaving(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
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
              <div key={s.key} className="cfg-correo-entry">
                <div className={`cfg-correo-row${s.highlight ? " cfg-correo-row--highlight" : ""}`}>
                  <div className="cfg-correo-row-info">
                    <span className="cfg-correo-row-label">{s.label}</span>
                    <span className="cfg-correo-row-desc">{s.desc}</span>
                  </div>
                  <Switch
                    checked={correo[s.key]}
                    onChange={(v) => handleToggle(s.key, v)}
                  />
                </div>
                {correo[s.key] && <UserSelectorCorreo idModulo={4} sourceId={s.sourceId} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panel Agenda ───────────────────────────────────────────────────────────

function PanelAgenda() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };
  const [tipos, setTipos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [inputNombre, setInputNombre] = useState("");
  const [addingTipo, setAddingTipo] = useState(false);

  useEffect(() => {
    fetchTipos();
  }, []);

  const fetchTipos = async () => {
    setLoadingTipos(true);
    try {
      const res = await api.get("/agenda/config/tipos", { headers: authHeader() });
      setTipos(res.data || []);
    } catch {
      toast("Error al cargar los tipos de agenda");
    } finally {
      setLoadingTipos(false);
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
      toast(`Tipo "${nombre}" agregado`);
    } catch (err) {
      toast(err?.response?.data?.detail || "Error al agregar tipo");
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
          toast("Tipo eliminado");
        } catch {
          toast("Error al eliminar tipo");
        }
      },
    });
  };

  return (
    <div className="cfg-panel-body">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />

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

    </div>
  );
}

// ── Panel Gastos ───────────────────────────────────────────────────────────

function PanelGastos() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  const [tipos, setTipos] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [inputNombre, setInputNombre] = useState("");
  const [addingTipo, setAddingTipo] = useState(false);

  const [correo, setCorreo] = useState({ correo_registrar_gasto: false });
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
      const res = await api.get("/gastos/config/tipos", { headers: authHeader() });
      setTipos(res.data || []);
    } catch {
      toast("Error al cargar los tipos de gasto");
    } finally {
      setLoadingTipos(false);
    }
  };

  const fetchCorreo = async () => {
    setLoadingCorreo(true);
    try {
      const res = await api.get("/gastos/config/correo", { headers: authHeader() });
      setCorreo({ correo_registrar_gasto: false, ...res.data });
    } catch {
      toast("Error al cargar configuración de correo");
    } finally {
      setLoadingCorreo(false);
    }
  };

  const handleAddTipo = async () => {
    const nombre = inputNombre.trim();
    if (!nombre) return;
    setAddingTipo(true);
    try {
      const res = await api.post("/gastos/config/tipos", { nombre }, { headers: authHeader() });
      setTipos((prev) => [...prev, res.data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setInputNombre("");
      toast(`Tipo "${nombre}" agregado`);
    } catch (err) {
      toast(err?.response?.data?.detail || "Error al agregar tipo");
    } finally {
      setAddingTipo(false);
    }
  };

  const handleDeleteTipo = (tipo) => {
    Modal.confirm({
      title: "¿Eliminar tipo de gasto?",
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
          await api.delete(`/gastos/config/tipos/${tipo.id_tipo_gasto}`, { headers: authHeader() });
          setTipos((prev) => prev.filter((t) => t.id_tipo_gasto !== tipo.id_tipo_gasto));
          toast("Tipo eliminado");
        } catch {
          toast("Error al eliminar tipo");
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
        await api.put("/gastos/config/correo", next, { headers: authHeader() });
      } catch {
        toast("Error al guardar configuración de correo");
      } finally {
        setSavingCorreo(false);
      }
    }, 600);
  };

  return (
    <div className="cfg-panel-body">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />

      {/* ── Tipos de gasto ──────────────────────────── */}
      <div className="cfg-block">
        <div className="cfg-block-header">
          <TagOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Tipos de gasto</div>
            <div className="cfg-block-desc">Categorías que se asignan al registrar un gasto</div>
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
              <div key={t.id_tipo_gasto} className="cfg-tipo-chip">
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

      {/* ── Notificaciones ───────────────────────────── */}
      <div className="cfg-block">
        <div className="cfg-block-header">
          <MailOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">
              Notificaciones de correo
              {savingCorreo && <Spin size="small" style={{ marginLeft: 8 }} />}
            </div>
            <div className="cfg-block-desc">Correos automáticos relacionados al módulo de gastos</div>
          </div>
        </div>

        {loadingCorreo ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : (
          <div className="cfg-correo-list">
            <div className="cfg-correo-entry">
              <div className="cfg-correo-row cfg-correo-row--highlight">
                <div className="cfg-correo-row-info">
                  <span className="cfg-correo-row-label">Al registrar un gasto</span>
                  <span className="cfg-correo-row-desc">
                    Envía una notificación cuando se registra un nuevo gasto
                  </span>
                </div>
                <Switch
                  checked={correo.correo_registrar_gasto}
                  onChange={(v) => handleCorreoToggle("correo_registrar_gasto", v)}
                />
              </div>
              {correo.correo_registrar_gasto && <UserSelectorCorreo idModulo={9} sourceId={1} />}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Panel Datos de la empresa ────────────────────────────────────────────────

function PanelEmpresa() {
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = (msg) => { setToastMsg(msg); setShowToast(true); };

  const [empresa, setEmpresa] = useState({ nombre_empresa: "", path: null });
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [editandoEmpresa, setEditandoEmpresa] = useState(false);
  const [empresaDraft, setEmpresaDraft] = useState({ nombre_empresa: "", path: null });

  useEffect(() => {
    fetchEmpresa();
  }, []);

  const fetchEmpresa = async () => {
    setLoadingEmpresa(true);
    try {
      const res = await api.get("/general/empresa", { headers: authHeader() });
      const data = res.data || {};
      setEmpresa(data);
      setEmpresaDraft(data);
      setEditandoEmpresa(!data.nombre_empresa);
    } catch {
      toast("Error al cargar configuración de empresa");
    } finally {
      setLoadingEmpresa(false);
    }
  };

  const handleEditarEmpresa = () => {
    setEmpresaDraft({ ...empresa });
    setLogoFile(null);
    setLogoPreview(null);
    setEditandoEmpresa(true);
  };

  const handleCancelarEmpresa = () => {
    setEmpresaDraft({ ...empresa });
    setLogoFile(null);
    setLogoPreview(null);
    setEditandoEmpresa(false);
  };

  const handleLogoChange = (file) => {
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    return false;
  };

  const logoSrc = (path) => path ? `${PATH}/${path}` : null;

  const handleSaveEmpresa = async () => {
    const nombre = (empresaDraft.nombre_empresa || "").trim();
    if (!nombre) {
      toast("El nombre de la empresa es requerido");
      return;
    }
    setSavingEmpresa(true);
    try {
      const form = new FormData();
      form.append("nombre_empresa", nombre);
      if (logoFile) form.append("logo", logoFile);
      const res = await api.post("/general/empresa", form, {
        headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
      });
      const updated = { nombre_empresa: nombre, path: res.data.path || empresa.path };
      setEmpresa(updated);
      setEmpresaDraft(updated);
      setLogoFile(null);
      setLogoPreview(null);
      setEditandoEmpresa(false);
      clearEmpresaConfigCache();
      toast("Configuración de empresa guardada");
    } catch {
      toast("Error al guardar configuración de empresa");
    } finally {
      setSavingEmpresa(false);
    }
  };

  return (
    <div className="cfg-panel-body">
      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />

      <div className="cfg-block">
        <div className="cfg-block-header">
          <ShopOutlined className="cfg-block-icon" />
          <div>
            <div className="cfg-block-title">Datos de la empresa</div>
            <div className="cfg-block-desc">Nombre y logo usados en reportes PDF de todos los módulos</div>
          </div>
        </div>

        {loadingEmpresa ? (
          <div className="cfg-loading-row"><Spin size="small" /></div>
        ) : !editandoEmpresa ? (
          /* ── Modo vista ── */
          <div className="cfg-empresa-card">
            <div className={`cfg-empresa-logo-zone cfg-empresa-logo-zone--view${empresa.path ? " cfg-empresa-logo-zone--filled" : ""}`}>
              {empresa.path ? (
                <img src={logoSrc(empresa.path)} alt="Logo empresa" className="cfg-empresa-logo-img" />
              ) : (
                <div className="cfg-empresa-logo-empty">
                  <ShopOutlined className="cfg-empresa-logo-empty-icon" />
                  <span>Sin logo</span>
                </div>
              )}
            </div>
            <div className="cfg-empresa-fields">
              <div className="cfg-empresa-view-nombre">
                {empresa.nombre_empresa || <span className="cfg-empresa-view-vacio">Sin nombre configurado</span>}
              </div>
              <button type="button" className="cfg-empresa-edit-btn" onClick={handleEditarEmpresa}>
                Editar
              </button>
            </div>
          </div>
        ) : (
          /* ── Modo edición ── */
          <div className="cfg-empresa-card">
            <Upload accept="image/*" showUploadList={false} beforeUpload={handleLogoChange}>
              <div className={`cfg-empresa-logo-zone${(logoPreview || empresa.path) ? " cfg-empresa-logo-zone--filled" : ""}`}>
                {(logoPreview || empresa.path) ? (
                  <img
                    src={logoPreview || logoSrc(empresa.path)}
                    alt="Logo empresa"
                    className="cfg-empresa-logo-img"
                  />
                ) : (
                  <div className="cfg-empresa-logo-empty">
                    <UploadOutlined className="cfg-empresa-logo-empty-icon" />
                    <span>Subir logo</span>
                    <span className="cfg-empresa-logo-empty-hint">PNG · JPG · WEBP</span>
                  </div>
                )}
                <div className="cfg-empresa-logo-overlay">
                  <UploadOutlined />
                  <span>{empresa.path ? "Cambiar" : "Subir"}</span>
                </div>
              </div>
            </Upload>

            <div className="cfg-empresa-fields">
              <div className="cfg-empresa-field">
                <label className="cfg-empresa-label">Nombre de la empresa</label>
                <Input
                  value={empresaDraft.nombre_empresa || ""}
                  onChange={(e) => setEmpresaDraft((prev) => ({ ...prev, nombre_empresa: e.target.value }))}
                  placeholder="Nombre de la empresa"
                  className="cfg-empresa-input"
                  maxLength={225}
                  size="large"
                />
              </div>
              {logoFile && (
                <div className="cfg-empresa-file-badge">
                  <UploadOutlined style={{ fontSize: 12 }} />
                  {logoFile.name}
                </div>
              )}
              <div className="cfg-empresa-actions">
                <Button
                  onClick={handleSaveEmpresa}
                  loading={savingEmpresa}
                  className="cfg-tipo-btn-add"
                >
                  Guardar cambios
                </Button>
                <button type="button" className="cfg-empresa-cancel-btn" onClick={handleCancelarEmpresa}>
                  Cancelar
                </button>
              </div>
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
    key: "empresa",
    label: "Datos de la empresa",
    icon: <ShopOutlined />,
    color: "#92400e",
    bg: "linear-gradient(140deg, #92400e 0%, #f59e0b 100%)",
  },
  {
    key: "eventos",
    label: "Eventos",
    icon: <CalendarOutlined />,
    color: "#0f766e",
    bg: "linear-gradient(140deg, #065f46 0%, #10b981 100%)",
  },

  {
    key: "usuarios",
    label: "Usuarios",
    icon: <UserOutlined />,
    color: "#c2410c",
    bg: "linear-gradient(140deg, #c2410c 0%, #f97316 100%)",
  },
  {
    key: "trabajadores",
    label: "Trabajadores",
    icon: <TeamOutlined />,
    color: "#6d28d9",
    bg: "linear-gradient(140deg, #6d28d9 0%, #a78bfa 100%)",
  },
  {
    key: "agenda",
    label: "Agenda",
    icon: <ScheduleOutlined />,
    color: "#0369a1",
    bg: "linear-gradient(140deg, #0369a1 0%, #38bdf8 100%)",
  },
  {
    key: "gastos",
    label: "Gastos",
    icon: <DollarOutlined />,
    color: "#9f1239",
    bg: "linear-gradient(140deg, #9f1239 0%, #f43f5e 100%)",
  },
];

const PANELS = {
  general: PanelGeneral,
  empresa: PanelEmpresa,
  eventos: PanelEventos,
  inventario: PanelInventario,
  trabajadores: PanelTrabajadores,
  usuarios: PanelUsuarios,
  agenda: PanelAgenda,
  gastos: PanelGastos,
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
