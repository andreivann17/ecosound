import React, { useEffect, useState, useRef } from "react";
import { Button, Spin, notification } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";

import FormEmpresas from "../../components/forms/empresas/FormEmpresas";

// OJO: usa LOS NOMBRES REALES de tus actions
import {
  actionEmpresaGetById,
  actionEmpresaCreate,
  actionEmpresaUpdateById,
} from "../../redux/actions/empresas/empresas.js";

export default function CrearEmpresaPage() {
  const formRef = useRef(null);

  // ✅ TU RUTA ES /empresas/:idEmpresa/editar
  const { idEmpresa } = useParams();

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const isEdit = Boolean(idEmpresa);

  const [loadingEdit, setLoadingEdit] = useState(false);
  const [detalleLocal, setDetalleLocal] = useState(null);

  const handleBack = () => navigate(isEdit ? `/empresas/${idEmpresa}` : "/empresas");

  useEffect(() => {
    if (!isEdit) return;

    let mounted = true;

    (async () => {
      try {
        setLoadingEdit(true);

        const data = await dispatch(actionEmpresaGetById(Number(idEmpresa)));

        if (!mounted) return;
        setDetalleLocal(data || null);
      } catch (e) {
        if (!mounted) return;

        notification.error({
          message: "No se pudo cargar la empresa",
          description: e?.response?.data?.detail || e?.message || "Sin detalle",
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
  }, [dispatch, isEdit, idEmpresa]);

  const onSubmit = async (payload) => {
    if (isEdit) {
      await dispatch(actionEmpresaUpdateById(Number(idEmpresa), payload));
      return;
    }
    await dispatch(actionEmpresaCreate(payload));
  };

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
              Volver a empresas
            </Button>
          </div>
        </section>

        {isEdit ? (
          <Spin spinning={loadingEdit} tip="Cargando empresa...">
            <FormEmpresas
              key={`empresa-edit-${idEmpresa}`} // ✅ fuerza re-render limpio al cambiar id
              ref={formRef}
              isEdit={isEdit}
              initialValues={detalleLocal || {}}
              onCancel={handleBack}
              onSaved={handleBack}
              onSubmit={onSubmit}
            />
          </Spin>
        ) : (
          <FormEmpresas
            ref={formRef}
            isEdit={false}
            initialValues={{}}
            onCancel={handleBack}
            onSaved={handleBack}
            onSubmit={onSubmit}
          />
        )}
      </div>

      <style>{`
        .expediente-page-container {
          max-width: 980px;
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
