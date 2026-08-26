// src/containers/pages/UsuariosPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import { actionUsuariosGet } from "../../redux/actions/usuarios/usuarios";

import { Button, Input, AutoComplete, Modal, Space, Typography, Pagination } from "antd";
import { PlusOutlined, SearchOutlined, DownloadOutlined, ArrowUpOutlined, UserOutlined, MailOutlined } from "@ant-design/icons";
import { previewUsuariosReportPdf, printUsuariosReportPdf } from "../../components/utils/printUsuariosReportPdf";

import "./ContratosPage.css";
import "./UsuariosPage.css";

import { PATH as API_BASE } from "../../redux/utils";

const { Title, Text } = Typography;
const PAGE_SIZE = 20;

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildSuggestionPool = (items) => {
  const seen = new Set();
  const pool = [];
  items.forEach((u) => {
    const name = (u.name || "").trim();
    const nameKey = `n:${name.toLowerCase()}`;
    if (name && !seen.has(nameKey)) {
      seen.add(nameKey);
      pool.push({ label: name, type: "usuario" });
    }
    const email = (u.email || "").trim();
    const emailKey = `e:${email.toLowerCase()}`;
    if (email && !seen.has(emailKey)) {
      seen.add(emailKey);
      pool.push({ label: email, type: "correo" });
    }
  });
  return pool;
};

const toSuggestionOptions = (pool) =>
  pool.slice(0, 5).map((item, idx) => ({
    value: item.label,
    label: (
      <div className="contratos-suggest-option" style={{ "--i": idx }}>
        <span className="contratos-suggest-icon">
          {item.type === "correo" ? <MailOutlined /> : <UserOutlined />}
        </span>
        <span className="contratos-suggest-text">{item.label}</span>
        <span className="contratos-suggest-type">
          {item.type === "correo" ? "Correo" : "Usuario"}
        </span>
      </div>
    ),
  }));

export default function UsuariosPage() {
  const dispatch = useDispatch();
  const { items = [] } = useSelector((state) => state.usuarios);
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("usuarios", "consultar");
  const canInsertar  = perm("usuarios", "insertar");

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportHtml, setExportHtml]  = useState("");

  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const scrollEl = document.querySelector(".content-electron") || window;
    const onScroll = () => {
      const top = scrollEl === window ? window.scrollY : scrollEl.scrollTop;
      setShowBackToTop(top > 300);
    };
    scrollEl.addEventListener("scroll", onScroll);
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  const handleExport = async () => {
    const html = await previewUsuariosReportPdf({ items: filteredItems });
    setExportHtml(html);
    setExportOpen(true);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const suggestionPool = useMemo(() => buildSuggestionPool(items), [items]);

  const handleSearchInput = (value) => {
    setSearch(value);
    const q = (value || "").trim().toLowerCase();
    const filtered = q
      ? suggestionPool.filter((item) => item.label.toLowerCase().includes(q))
      : shuffleArray(suggestionPool);
    setSearchOptions(toSuggestionOptions(filtered));
  };

  const handleSearchFocus = () => {
    if (!search) {
      setSearchOptions(toSuggestionOptions(shuffleArray(suggestionPool)));
    }
  };

  const handleSearchSelect = (value) => {
    setSearch(value);
    setSearchDebounced(value);
    setCurrentPage(1);
  };

  const lastFetchKey = useRef("");

  const fetchParams = useMemo(
    () => ({ search: searchDebounced || undefined }),
    [searchDebounced]
  );

  useEffect(() => {
    const key = JSON.stringify(fetchParams);
    if (lastFetchKey.current === key) return;
    lastFetchKey.current = key;
    dispatch(actionUsuariosGet(fetchParams));
  }, [dispatch, fetchParams]);

  const filteredItems = useMemo(() => {
    if (!searchDebounced) return items;
    const q = searchDebounced.toLowerCase();
    return items.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [items, searchDebounced]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  return (
    <main className="contratos-main">
      <div className="contratos-content">

        <section className="contratos-section" style={{ marginTop: 0 }}>

          {/* FILTROS + HEADER */}
          <div className="contratos-filters-panel">
            <Space direction="vertical" size={2} style={{ marginBottom: 16 }}>
              <Title level={2} className="contratos-title">Usuarios</Title>
              <Text className="contratos-subtitle">Gestión de usuarios del sistema</Text>
            </Space>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="contratos-field-label">Buscar usuario</div>
                <AutoComplete
                  value={search}
                  options={searchOptions}
                  onSearch={handleSearchInput}
                  onFocus={handleSearchFocus}
                  onSelect={handleSearchSelect}
                  className="contratos-control"
                  popupClassName="contratos-suggest-dropdown"
                  filterOption={false}
                  allowClear
                  onClear={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                >
                  <Input
                    placeholder="Buscar por nombre o correo..."
                    suffix={<SearchOutlined className="contratos-input-suffix" />}
                  />
                </AutoComplete>
              </div>
              <div style={{ minWidth: 220 }}>
                <Button
                  className="contratos-btn-clean"
                  style={{ width: "100%" }}
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="contratos-toolbar">
            <div className="contratos-toolbar-left">
              <Title level={4} style={{ marginBottom: 0 }}>
                Usuarios ({filteredItems.length})
              </Title>
              <Text type="secondary">{filteredItems.length} encontrados</Text>
            </div>
            <div className="contratos-toolbar-right" style={{ display: "flex", gap: 8 }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                className="laboral-btn-import"
                style={{ flex: "none" }}
              >
                Exportar
              </Button>
              {canInsertar && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/app/usuarios/crear")}
                  className="laboral-btn-create custom-button"
                >
                  Crear Usuario
                </Button>
              )}
            </div>
          </div>

          {/* CARDS */}
          <div className="contratos-expedientes-card">
            {filteredItems.length > PAGE_SIZE && (
              <div style={{ marginBottom: 16, textAlign: "right" }}>
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={filteredItems.length}
                  onChange={(page) => setCurrentPage(page)}
                  size="small"
                  showSizeChanger={false}
                />
              </div>
            )}

            <div className="usr-grid">
              {paginatedItems.map((user) => {
                const initials = (user.name || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div key={user.id_user || user.code} className="usr-card">
                    <div className="usr-card-image">
                      {user.path ? (
                        <img
                          src={`${API_BASE}/${user.path}`}
                          alt={user.name}
                          className="usr-card-img"
                        />
                      ) : (
                        <div className="usr-card-avatar">
                          <span className="usr-card-initials">{initials}</span>
                        </div>
                      )}
                    </div>
                    <div className="usr-card-body">
                      <div className="usr-card-name">{user.name || "—"}</div>
                      <div className="usr-card-email">{user.email || "—"}</div>
                      <div className="usr-card-badges">
                        <span className={`usr-badge ${user.active ? "usr-badge-active" : "usr-badge-inactive"}`}>
                          {user.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                    <div className="usr-card-footer">
                      <button
                        className="usr-btn-detail"
                        onClick={() => canConsultar ? navigate(`/app/usuarios/${user.code}`) : undefined}
                        style={!canConsultar ? { cursor: "not-allowed", opacity: 0.45 } : {}}
                        title={!canConsultar ? "Sin permiso de consulta" : undefined}
                      >
                        VER DETALLES
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {paginatedItems.length === 0 && (
              <div style={{ padding: "36px 12px", textAlign: "center", color: "var(--eh-ink-muted, rgba(0,0,0,0.55))" }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  Sin usuarios que coincidan con los filtros
                </div>
              </div>
            )}

            {filteredItems.length > PAGE_SIZE && (
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={filteredItems.length}
                  onChange={(page) => setCurrentPage(page)}
                  size="small"
                  showSizeChanger={false}
                />
              </div>
            )}
          </div>

        </section>
      </div>

      {showBackToTop && (
        <button
          type="button"
          className="usr-back-to-top"
          onClick={() => {
            const scrollEl = document.querySelector(".content-electron");
            if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: "smooth" });
            else window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="Volver arriba"
        >
          <ArrowUpOutlined />
        </button>
      )}

      {/* ── Modal: Exportar ── */}
      <Modal
        open={exportOpen}
        onCancel={() => setExportOpen(false)}
        title="Previsualización — Reporte de Usuarios"
        width={1020}
        centered
        destroyOnClose
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              onClick={() => setExportOpen(false)}
              style={{ background: "#374151", borderColor: "#374151", color: "#fff" }}
            >
              Cerrar
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              style={{ background: "var(--eh-primary-btn)", borderColor: "var(--eh-primary-btn)" }}
              onClick={() => printUsuariosReportPdf({ items: filteredItems })}
            >
              Exportar PDF
            </Button>
          </div>
        }
      >
        <div style={{ height: "72vh", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <iframe
            title="preview-usuarios"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
            srcDoc={exportHtml}
          />
        </div>
      </Modal>
    </main>
  );
}
