// src/pages/materias/laboral/LaboralProcedimientoPage/LaboralProcedimientoPage.jsx

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Typography, Button, Space, Input, DatePicker } from "antd";
import { SearchOutlined, PlusOutlined } from "@ant-design/icons";

// AJUSTA ESTE IMPORT A TU RUTA REAL:
import { actionEmpresasCard } from "../../redux/actions/empresas/empresas.js";
import ExpedienteCards from "../../components/expedientes/empresasCards.jsx";
import { PAGE_SIZE } from "./materias/laboral/laboralProcedimiento.config.js";
import useExpedientesProcedimiento from "./materias/laboral/useEmpresasProcedimientos.js";

import "./materias/laboral/LaboralProcedimientoPage.css";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const collapseSpaces = (str) => String(str || "").replace(/\s+/g, " ").trim();

export default function LaboralProcedimientoPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const concSlice = useSelector((state) => state.empresas || {});

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Si más adelante quieres permitir ver inactivos desde UI, cambia esto a state.
  const includeInactive = false;

  // ====== FILTROS PARA BACKEND ======
  const filtrosBusqueda = useMemo(() => {
    const q = collapseSpaces(search);
    return {
      q: q || undefined,
      include_inactive: includeInactive,
    };
  }, [search, includeInactive]);

  useEffect(() => {
    dispatch(actionEmpresasCard(filtrosBusqueda));
  }, [dispatch, filtrosBusqueda]);

  // ====== HOOK: ahora solo pagina (ya viene filtrado del backend) ======
  const {
    filteredExpedientes,
    paginatedExpedientes,
    totalExp,
  } = useExpedientesProcedimiento({
    concSlice,
    search,
    currentPage,
    pageSize: PAGE_SIZE,
    setCurrentPage,
  });

  const handleCrearExpediente = () => {
    navigate(`/empresas/crear/`, {});
  };

  return (
    <>
      <main className="laboral-main">
        <div className="laboral-content">
          <section className="laboral-header-section">
            <div>
              <Space direction="vertical" size={2}>
                <Title level={3} className="laboral-title">
                  Empresas
                </Title>
              </Space>
            </div>
          </section>

          <section className="laboral-section">
            <div className="laboral-toolbar" style={{ marginBottom: 20 }}>
              <div className="laboral-toolbar-left">
                <Title
                  level={4}
                  className="laboral-section-title"
                  style={{ marginBottom: 0 }}
                >
                  empresas ({totalExp})
                </Title>
                <Text type="secondary">{totalExp} encontrados</Text>
              </div>

              <div className="laboral-toolbar-right">
                <Input
                  allowClear
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar empresas o razón social"
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  className="laboral-search-input"
                />

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCrearExpediente}
                >
                  Crear Empresa
                </Button>
              </div>
            </div>

            <ExpedienteCards
              items={paginatedExpedientes}
              PAGE_SIZE={PAGE_SIZE}
              currentPage={currentPage}
              filteredExpedientes={filteredExpedientes}
              setCurrentPage={setCurrentPage}
              tipo={tipo}
            />
          </section>
        </div>
      </main>
    </>
  );
}
