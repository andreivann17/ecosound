// src/containers/pages/UsuariosPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import { actionUsuariosGet } from "../../redux/actions/usuarios/usuarios";

import { Button, Input, Modal, Space, Typography, Pagination } from "antd";
import { PlusOutlined, SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { previewUsuariosReportPdf, printUsuariosReportPdf } from "../../components/utils/printUsuariosReportPdf";

import "./ContratosPage.css";
import "./UsuariosPage.css";

import { PATH as API_BASE } from "../../redux/utils";

const { Title, Text } = Typography;
const PAGE_SIZE = 20;

export default function UsuariosPage() {
  const dispatch = useDispatch();
  const { items = [] } = useSelector((state) => state.usuarios);
  const navigate = useNavigate();
  const { perm } = usePermisos() || { perm: () => true };
  const canConsultar = perm("usuarios", "consultar");
  const canInsertar  = perm("usuarios", "insertar");

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportHtml, setExportHtml]  = useState("");

  const handleExport = () => {
    setExportHtml(previewUsuariosReportPdf({ items: filteredItems }));
    setExportOpen(true);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

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
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por nombre o correo..."
                  suffix={<SearchOutlined className="contratos-input-suffix" />}
                  className="contratos-control"
                  allowClear
                />
              </div>
              <div>
                <Button
                  className="contratos-btn-clean"
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
              <div style={{ padding: "36px 12px", textAlign: "center", color: "rgba(0,0,0,0.55)" }}>
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
              style={{ background: "#01369e", borderColor: "#01369e" }}
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
