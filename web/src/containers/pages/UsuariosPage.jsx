// src/containers/pages/UsuariosPage.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { usePermisos } from "../../context/PermisosContext";
import { actionUsuariosGet } from "../../redux/actions/usuarios/usuarios";

import { Button, Input, Space, Typography, Pagination } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";

import "./ContratosPage.css";
import "./UsuariosPage.css";

const { Title, Text } = Typography;

const API_BASE = `http://${window.location.hostname}:8000`;
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

        {/* HEADER */}
        <section className="contratos-header-section">
          <Space direction="vertical" size={2}>
            <Title level={2} className="contratos-title">
              Usuarios
            </Title>
            <Text className="contratos-subtitle">
              Gestión de usuarios del sistema
            </Text>
          </Space>
        </section>

        <section className="contratos-section">

          {/* FILTROS */}
          <div className="contratos-filters-panel">
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
            <div className="contratos-toolbar-right">
              {canInsertar && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate("/usuarios/crear")}
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
                        onClick={() => canConsultar ? navigate(`/usuarios/${user.code}`) : undefined}
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
    </main>
  );
}
