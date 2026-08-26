import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { usePermisos } from "../../context/PermisosContext";
import { actionCiudadesGet } from "../../redux/actions/ciudades/ciudades";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  apiEventosInstance,
  authHeaderEventos,
} from "../../redux/actions/eventos/eventos";

import {
  Button,
  Modal,
  Form,
  Skeleton,
} from "antd";
import Toast from "../../components/toasts/toast";
import SuccessOverlay from "../../components/feedback/SuccessOverlay";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  FolderOpenOutlined,
  TeamOutlined,
  ExportOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

import "./EventoDetallePage.css";
import { PATH as API_BASE } from "../../redux/utils";

import { TIPO_EVENTO_MAP, CIUDAD_MAP, SERVICIO_LABEL } from "./EventoDetalle/constants";
import { buildServiceLabels, resolveServicios, fmtMoney, fmtFechaCorta, fmtHora, parseNum, getFileType } from "./EventoDetalle/helpers";

import DatosTab from "./EventoDetalle/tabs/DatosTab";
import HistorialTab from "./EventoDetalle/tabs/HistorialTab";
import PagosTab from "./EventoDetalle/tabs/PagosTab";
import EventoPdfTab from "./EventoDetalle/tabs/EventoPdfTab";
import ActividadTab from "./EventoDetalle/tabs/ActividadTab";
import DocumentosTab from "./EventoDetalle/tabs/DocumentosTab";
import EquipoTab from "./EventoDetalle/tabs/EquipoTab";
import TrabajadoresTab from "./EventoDetalle/tabs/TrabajadoresTab";

import PagoModal from "./EventoDetalle/modals/PagoModal";
import EquipoModal from "./EventoDetalle/modals/EquipoModal";
import TrabajadorModal from "./EventoDetalle/modals/TrabajadorModal";
import EditHoraModal from "./EventoDetalle/modals/EditHoraModal";
import ViewerDocModal from "./EventoDetalle/modals/ViewerDocModal";
import DeleteServiceModal from "./EventoDetalle/modals/DeleteServiceModal";
import DeleteServiceAgendaModal from "./EventoDetalle/modals/DeleteServiceAgendaModal";
import AgregarServicioModal from "./EventoDetalle/modals/AgregarServicioModal";

dayjs.locale("es");

export default function EventoDetallePage() {
  const { idEvento } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { perm } = usePermisos() || { perm: () => true };
  const canEditar   = perm("eventos", "editar");
  const canEliminar = perm("eventos", "eliminar");
  const canConsultarUsuarios = perm("usuarios", "consultar");
  const canConsultarPaquetes = perm("paquetes", "consultar");

  const ciudadesRaw = useSelector((s) => {
    const d = s.ciudades?.data;
    return Array.isArray(d) ? d : [];
  });
  const ciudadesOptions = ciudadesRaw.map((c) => ({ label: c.nombre, value: c.id_ciudad }));
  const ciudadMap = Object.fromEntries(ciudadesRaw.map((c) => [c.id_ciudad, c.nombre]));

  useEffect(() => {
    if (ciudadesRaw.length === 0) dispatch(actionCiudadesGet());
  }, [dispatch, ciudadesRaw.length]);

  const [evento, setEvento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [savingPago, setSavingPago] = useState(false);
  const [pagoForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("datos");

  const [actividad, setActividad] = useState([]);
  const [loadingActividad, setLoadingActividad] = useState(false);

  const [equipoEvento, setEquipoEvento] = useState([]);
  const [loadingEquipo, setLoadingEquipo] = useState(false);
  const [catalogoEquipo, setCatalogoEquipo] = useState([]);
  const [loadingCatalogo, setLoadingCatalogo] = useState(false);
  const [equipoModalOpen, setEquipoModalOpen] = useState(false);
  const [equipoSearch, setEquipoSearch] = useState("");
  const [equipoCantidades, setEquipoCantidades] = useState({});
  const [savingEquipoId, setSavingEquipoId] = useState(null);

  const [trabajadoresEvento, setTrabajadoresEvento] = useState([]);
  const [loadingTrabajadores, setLoadingTrabajadores] = useState(false);
  const [catalogoTrabajadores, setCatalogoTrabajadores] = useState([]);
  const [puestosEvento, setPuestosEvento] = useState([]);
  const [trabajadoresModalOpen, setTrabajadoresModalOpen] = useState(false);
  const [trabSearch, setTrabSearch] = useState("");
  const [trabSelectedId, setTrabSelectedId] = useState(null);
  const [trabSelectedPuesto, setTrabSelectedPuesto] = useState(null);
  const [trabHoraInicio, setTrabHoraInicio] = useState(null);
  const [trabHoraFin, setTrabHoraFin] = useState(null);
  const [savingTrab, setSavingTrab] = useState(false);
  const [trabServicioData, setTrabServicioData] = useState({});
  const [trabActiveTab, setTrabActiveTab] = useState(null);
  const [editHoraModal, setEditHoraModal] = useState(null); // { ct }
  const [editHoraInicio, setEditHoraInicio] = useState(null);
  const [editHoraFin, setEditHoraFin] = useState(null);
  const [savingEditHora, setSavingEditHora] = useState(false);

  const [eventoPdfs, setEventoPdfs] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [viewerDoc, setViewerDoc] = useState(null);

  const [paquetesSonido, setPaquetesSonido] = useState([]);
  const [paquetesFoto, setPaquetesFoto] = useState([]);
  const [paquetesDecoracion, setPaquetesDecoracion] = useState([]);
  const [paquetesBarra, setPaquetesBarra] = useState([]);

  const [editingServiceKey, setEditingServiceKey] = useState(null);
  const [editingServiceForm, setEditingServiceForm] = useState({});
  const [savingService, setSavingService] = useState(false);
  const [deleteServiceModal, setDeleteServiceModal] = useState(null);
  const [agendaServiceModal, setAgendaServiceModal] = useState(null);
  const [deletingService, setDeletingService] = useState(false);

  const [editingClientCard, setEditingClientCard] = useState(false);
  const [editingClientForm, setEditingClientForm] = useState({});
  const [savingClientCard, setSavingClientCard] = useState(false);

  const [editingFinancialCard, setEditingFinancialCard] = useState(false);
  const [editingFinancialForm, setEditingFinancialForm] = useState({});
  const [savingFinancialCard, setSavingFinancialCard] = useState(false);

  const [editingMisaCard, setEditingMisaCard] = useState(false);
  const [editingMisaForm, setEditingMisaForm] = useState({});
  const [savingMisaCard, setSavingMisaCard] = useState(false);

  const [servicioModalOpen, setServicioModalOpen] = useState(false);
  const [nuevoServicioTipo, setNuevoServicioTipo] = useState(null);
  const [savingServicio, setSavingServicio] = useState(false);
  const [servicioForm] = Form.useForm();

  const pdfInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toast = useCallback((msg) => { setToastMsg(msg); setShowToast(true); }, []);
  const [success, setSuccess] = useState({ show: false, title: "", subtitle: "" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      apiEventosInstance.get(`/eventos/${idEvento}`, { headers: authHeaderEventos() }),
      apiEventosInstance.get("/eventos/config/paquetes-sonido",     { headers: authHeaderEventos() }),
      apiEventosInstance.get("/eventos/config/paquetes-fotografia", { headers: authHeaderEventos() }),
      apiEventosInstance.get("/eventos/config/paquetes-decoracion",  { headers: authHeaderEventos() }).catch(() => ({ data: [] })),
      apiEventosInstance.get("/eventos/config/paquetes-barra",      { headers: authHeaderEventos() }).catch(() => ({ data: [] })),
    ])
      .then(([evRes, psRes, pfRes, pbqRes, pbrRes]) => {
        if (mounted) {
          setEvento(evRes.data);
          setPaquetesSonido(Array.isArray(psRes.data)  ? psRes.data  : []);
          setPaquetesFoto(Array.isArray(pfRes.data)    ? pfRes.data  : []);
          setPaquetesDecoracion(Array.isArray(pbqRes.data) ? pbqRes.data : []);
          setPaquetesBarra(Array.isArray(pbrRes.data)    ? pbrRes.data : []);
        }
      })
      .catch(() => toast("No se pudo cargar el evento"))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [idEvento]);

  const fetchPagos = useCallback(async () => {
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/pagos`,
        { headers: authHeaderEventos() }
      );
      setPagos(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setPagos([]);
    }
  }, [idEvento]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  const fetchActividad = useCallback(async () => {
    setLoadingActividad(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/actividad`,
        { headers: authHeaderEventos() }
      );
      setActividad(Array.isArray(data) ? data : data.items ?? []);
    } catch {
      setActividad([]);
    } finally {
      setLoadingActividad(false);
    }
  }, [idEvento]);

  const fetchDocumentos = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/documentos`,
        { headers: authHeaderEventos() }
      );
      const docs = Array.isArray(data) ? data : [];
      const pdfs = docs.filter((d) => d.id_tipo_documento === 1);
      const validPdfs = (
        await Promise.all(
          pdfs.map(async (d) => {
            try {
              const res = await fetch(`${API_BASE}/${d.path}`, { method: "HEAD" });
              return res.ok ? d : null;
            } catch {
              return null;
            }
          })
        )
      ).filter(Boolean);
      setEventoPdfs(validPdfs);
      setDocumentos(docs.filter((d) => d.id_tipo_documento !== 1));
    } catch {
      setEventoPdfs([]);
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [idEvento]);

  const fetchEquipoEvento = useCallback(async () => {
    setLoadingEquipo(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/equipo`,
        { headers: authHeaderEventos() }
      );
      setEquipoEvento(Array.isArray(data) ? data : []);
    } catch {
      setEquipoEvento([]);
    } finally {
      setLoadingEquipo(false);
    }
  }, [idEvento]);

  const fetchCatalogo = useCallback(async () => {
    setLoadingCatalogo(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/equipo-catalogo`,
        { headers: authHeaderEventos() }
      );
      setCatalogoEquipo(Array.isArray(data) ? data : []);
    } catch {
      setCatalogoEquipo([]);
    } finally {
      setLoadingCatalogo(false);
    }
  }, [idEvento]);

  const fetchTrabajadoresEvento = useCallback(async () => {
    setLoadingTrabajadores(true);
    try {
      const { data } = await apiEventosInstance.get(
        `/eventos/${idEvento}/trabajadores`,
        { headers: authHeaderEventos() }
      );
      setTrabajadoresEvento(Array.isArray(data) ? data : []);
    } catch {
      setTrabajadoresEvento([]);
    } finally {
      setLoadingTrabajadores(false);
    }
  }, [idEvento]);

  const fetchCatalogoTrabajadores = useCallback(async () => {
    try {
      const [resTrab, resPuestos] = await Promise.all([
        apiEventosInstance.get("/trabajadores", { headers: authHeaderEventos() }),
        apiEventosInstance.get("/trabajadores/puestos", { headers: authHeaderEventos() }),
      ]);
      setCatalogoTrabajadores(Array.isArray(resTrab.data) ? resTrab.data : []);
      setPuestosEvento(Array.isArray(resPuestos.data) ? resPuestos.data : []);
    } catch {
      setCatalogoTrabajadores([]);
      setPuestosEvento([]);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "actividad") fetchActividad();
    if (activeTab === "evento-pdf" || activeTab === "documentos") fetchDocumentos();
    if (activeTab === "equipo") fetchEquipoEvento();
    if (activeTab === "trabajadores") fetchTrabajadoresEvento();
  }, [activeTab, fetchActividad, fetchDocumentos, fetchEquipoEvento, fetchTrabajadoresEvento]);

  const handleDelete = () => {
    Modal.confirm({
      title: "Eliminar evento",
      content: "El evento se marcará como inactivo. Esta acción se puede revertir.",
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          setDeleting(true);
          await apiEventosInstance.delete(`/eventos/${idEvento}`, {
            headers: authHeaderEventos(),
          });
          setSuccess({
            show: true,
            title: "¡Evento eliminado!",
            subtitle: `El evento de "${evento?.cliente_nombre || ""}" se eliminó correctamente.`,
          });
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar");
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const handleDeleteAbono = (pago) => {
    Modal.confirm({
      title: "Eliminar abono",
      content: `¿Eliminar el abono de ${fmtMoney(pago.monto)}? Esta acción no se puede deshacer.`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          await apiEventosInstance.delete(
            `/eventos/${idEvento}/pagos/${pago.id || pago.id_pago}`,
            { headers: authHeaderEventos() }
          );
          toast("Abono eliminado");
          fetchPagos();
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar abono");
        }
      },
    });
  };

  const handleAddPago = async () => {
    let values;
    try { values = await pagoForm.validateFields(); } catch { return; }
    setSavingPago(true);
    try {
      await apiEventosInstance.post(
        `/eventos/${idEvento}/pagos`,
        {
          monto: String(values.monto),
          fecha: dayjs(values.fecha).format("YYYY-MM-DDTHH:mm:ss"),
          descripcion: values.descripcion?.trim() || null,
        },
        { headers: authHeaderEventos() }
      );
      toast("Abono registrado exitosamente");
      pagoForm.resetFields();
      setPagoModalOpen(false);
      fetchPagos();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar abono");
    } finally {
      setSavingPago(false);
    }
  };

  const handleUploadPdf = async (file) => {
    if (!file) return;
    if (getFileType(file.name) !== "pdf") {
      toast("Solo se permiten archivos PDF para el evento");
      return;
    }
    setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiEventosInstance.post(
        `/eventos/${idEvento}/documentos?id_tipo_documento=1`,
        fd,
        { headers: { ...authHeaderEventos(), "Content-Type": "multipart/form-data" } }
      );
      toast("Evento PDF subido correctamente");
      fetchDocumentos();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al subir el PDF");
    } finally {
      setUploadingPdf(false);
      if (pdfInputRef.current) pdfInputRef.current.value = "";
    }
  };

  const handleUploadDoc = async (file) => {
    if (!file) return;
    setUploadingDoc(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiEventosInstance.post(
        `/eventos/${idEvento}/documentos?id_tipo_documento=2`,
        fd,
        { headers: { ...authHeaderEventos(), "Content-Type": "multipart/form-data" } }
      );
      toast("Documento subido correctamente");
      fetchDocumentos();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al subir el documento");
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = (doc) => {
    Modal.confirm({
      title: "Eliminar documento",
      content: `¿Eliminar "${doc.filename}"? Esta acción es reversible.`,
      okText: "Eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      centered: true,
      onOk: async () => {
        try {
          await apiEventosInstance.delete(
            `/eventos/${idEvento}/documentos/${doc.id}`,
            { headers: authHeaderEventos() }
          );
          toast("Documento eliminado");
          fetchDocumentos();
        } catch (err) {
          toast(err?.response?.data?.detail || err.message || "Error al eliminar");
        }
      },
    });
  };

  const getDocUrl = (doc) => `${API_BASE}/${doc.path}`;

  const refetchEvento = useCallback(async () => {
    try {
      const { data } = await apiEventosInstance.get(`/eventos/${idEvento}`, { headers: authHeaderEventos() });
      if (data) setEvento(data);
    } catch { /* ignore */ }
  }, [idEvento]);

  const handleSaveClientCard = async () => {
    setSavingClientCard(true);
    try {
      const { data } = await apiEventosInstance.patch(
        `/eventos/${idEvento}`,
        {
          cliente_nombre: editingClientForm.cliente_nombre,
          celular: editingClientForm.celular,
          domicilio: editingClientForm.domicilio,
          comentarios: editingClientForm.comentarios,
        },
        { headers: authHeaderEventos() }
      );
      await refetchEvento();
      setEditingClientCard(false);
      toast("Datos del cliente actualizados");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingClientCard(false);
    }
  };

  const handleSaveFinancialCard = async () => {
    setSavingFinancialCard(true);
    try {
      const { data } = await apiEventosInstance.patch(
        `/eventos/${idEvento}`,
        {
          importe: editingFinancialForm.importe,
          importe_anticipo: editingFinancialForm.importe_anticipo,
          fecha_anticipo: editingFinancialForm.fecha_anticipo
            ? dayjs(editingFinancialForm.fecha_anticipo).format("YYYY-MM-DD")
            : null,
        },
        { headers: authHeaderEventos() }
      );
      await refetchEvento();
      setEditingFinancialCard(false);
      toast("Importes actualizados");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingFinancialCard(false);
    }
  };

  const handleSaveMisaCard = async () => {
    setSavingMisaCard(true);
    try {
      await apiEventosInstance.patch(
        `/eventos/${idEvento}`,
        {
          direccion_misa: editingMisaForm.direccion_misa?.trim() || null,
          fecha_misa: editingMisaForm.fecha_misa
            ? `${dayjs(editingMisaForm.fecha_misa).format("YYYY-MM-DD")}T${editingMisaForm.hora_misa ? dayjs(editingMisaForm.hora_misa).format("HH:mm") : "00:00"}:00`
            : null,
        },
        { headers: authHeaderEventos() }
      );
      await refetchEvento();
      setEditingMisaCard(false);
      toast("Información de la misa actualizada");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingMisaCard(false);
    }
  };

  const startEditService = (sv, idx) => {
    setEditingServiceKey(idx);
    setEditingServiceForm({
      fecha: sv.fecha ? dayjs(sv.fecha) : null,
      hora_inicio: sv.hora_inicio || "",
      hora_final: sv.hora_final || "",
      id_ciudad: sv.id_ciudad || null,
      lugar: sv.lugar || "",
      id_paquete: sv.id_paquete || null,
      comentarios: sv.comentarios || "",
    });
  };

  const handleSaveService = async (sv) => {
    const updatedServicios = (evento.servicios || []).map((s) => {
      if (s.id_evento_servicio !== sv.id_evento_servicio) return s;
      return {
        ...s,
        fecha: editingServiceForm.fecha
          ? dayjs(editingServiceForm.fecha).format("YYYY-MM-DD")
          : s.fecha,
        hora_inicio: editingServiceForm.hora_inicio || s.hora_inicio,
        hora_final: editingServiceForm.hora_final || s.hora_final,
        id_ciudad: editingServiceForm.id_ciudad ?? s.id_ciudad,
        lugar: editingServiceForm.lugar ?? s.lugar,
        id_paquete: editingServiceForm.id_paquete ?? s.id_paquete,
        comentarios: editingServiceForm.comentarios ?? s.comentarios,
      };
    });
    setSavingService(true);
    try {
      const { data } = await apiEventosInstance.patch(
        `/eventos/${idEvento}`,
        { servicios: updatedServicios },
        { headers: authHeaderEventos() }
      );
      await refetchEvento();
      setEditingServiceKey(null);
      toast("Servicio actualizado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al guardar");
    } finally {
      setSavingService(false);
    }
  };

  // Paso 1: confirmar eliminación del servicio -> pasa al paso 2 (agenda).
  const handleConfirmDeleteService = () => {
    setAgendaServiceModal(deleteServiceModal);
    setDeleteServiceModal(null);
  };

  // Paso 2: decide si también se elimina la entrada de agenda asociada.
  const handleDeleteService = async (eliminarAgenda) => {
    const sv = agendaServiceModal;
    if (!sv) return;
    const updatedServicios = (evento.servicios || []).filter(
      (s) => s.id_evento_servicio !== sv.id_evento_servicio
    );
    setDeletingService(true);
    try {
      await apiEventosInstance.patch(
        `/eventos/${idEvento}`,
        {
          servicios: updatedServicios,
          servicio_eliminado: sv,
          eliminar_agenda_servicio: !!eliminarAgenda,
        },
        { headers: authHeaderEventos() }
      );
      await refetchEvento();
      setAgendaServiceModal(null);
      toast("Servicio eliminado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al eliminar");
    } finally {
      setDeletingService(false);
    }
  };

  const handleOpenAddServicio = () => {
    setNuevoServicioTipo(null);
    servicioForm.resetFields();
    setServicioModalOpen(true);
  };

  const handleAddServicio = async () => {
    if (!nuevoServicioTipo) {
      toast("Selecciona un tipo de servicio");
      return;
    }
    let values;
    try {
      values = await servicioForm.validateFields();
    } catch {
      return;
    }
    const nuevoServicio = {
      id_servicio: nuevoServicioTipo,
      fecha: values.fecha ? dayjs(values.fecha).format("YYYY-MM-DD") : null,
      hora_inicio: values.hora_inicio ? dayjs(values.hora_inicio).format("HH:mm") : null,
      hora_final: values.hora_final ? dayjs(values.hora_final).format("HH:mm") : null,
      id_ciudad: values.id_ciudad || null,
      lugar: values.lugar || null,
      id_paquete: values.id_paquete || null,
      comentarios: values.comentarios || null,
    };
    const updatedServicios = [...(evento.servicios || []), nuevoServicio];
    setSavingServicio(true);
    try {
      await apiEventosInstance.patch(
        `/eventos/${idEvento}`,
        { servicios: updatedServicios },
        { headers: authHeaderEventos() }
      );
      await refetchEvento();
      setServicioModalOpen(false);
      servicioForm.resetFields();
      setNuevoServicioTipo(null);
      toast("Servicio agregado");
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al agregar");
    } finally {
      setSavingServicio(false);
    }
  };

  if (loading) {
    return (
      <div className="cd-main">
        <div className="cd-content">

          <div className="cd-header-card">
            <div className="cd-header-top">
              <div>
                <div className="cd-header-name-row">
                  <Skeleton.Input active size="large" style={{ width: 320, height: 28 }} />
                  <Skeleton.Button active size="small" style={{ width: 76 }} />
                </div>
                <div className="cd-header-meta">
                  <Skeleton.Input active size="small" style={{ width: 130 }} />
                  <Skeleton.Input active size="small" style={{ width: 150 }} />
                  <Skeleton.Input active size="small" style={{ width: 120 }} />
                </div>
              </div>
              <div className="cd-header-actions">
                <Button icon={<ExportOutlined />} className="cd-btn-export" disabled>
                  Exportar
                </Button>
                {canEliminar && (
                  <Button icon={<DeleteOutlined />} className="cd-btn-delete" disabled>
                    Eliminar
                  </Button>
                )}
              </div>
            </div>

            <div className="cd-header-tabs">
              <button className={`cd-tab-btn ${activeTab === "datos" ? "cd-tab-btn-active" : ""}`} onClick={() => setActiveTab("datos")}>
                <FileTextOutlined />
                Datos del evento
              </button>
              <button className={`cd-tab-btn ${activeTab === "evento-pdf" ? "cd-tab-btn-active" : ""}`} onClick={() => setActiveTab("evento-pdf")}>
                <FilePdfOutlined />
                Evento Visor
              </button>
              <button className={`cd-tab-btn ${activeTab === "pagos" ? "cd-tab-btn-active" : ""}`} onClick={() => setActiveTab("pagos")}>
                <DollarOutlined />
                Abonos y Pagos
              </button>
              <button className={`cd-tab-btn ${activeTab === "historial" ? "cd-tab-btn-active" : ""}`} onClick={() => setActiveTab("historial")}>
                <ClockCircleOutlined />
                Historial
              </button>
              <button className={`cd-tab-btn ${activeTab === "trabajadores" ? "cd-tab-btn-active" : ""}`} onClick={() => setActiveTab("trabajadores")}>
                <TeamOutlined />
                Trabajadores
              </button>
              <button className={`cd-tab-btn ${activeTab === "documentos" ? "cd-tab-btn-active" : ""}`} onClick={() => setActiveTab("documentos")}>
                <FolderOpenOutlined />
                Documentos
              </button>
              <button className={`cd-tab-btn ${activeTab === "actividad" ? "cd-tab-btn-active" : ""}`} onClick={() => setActiveTab("actividad")}>
                <HistoryOutlined />
                Actividad
              </button>
            </div>
          </div>

          <div className="cd-bento-grid">
            <div className="cd-card cd-card-client">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><UserOutlined /></div>
                <h2 className="cd-card-title">Datos del cliente</h2>
              </div>
              <Skeleton active title={false} paragraph={{ rows: 4 }} />
            </div>

            <div className="cd-card cd-card-financial">
              <div className="cd-card-header">
                <div className="cd-card-icon-wrap"><DollarOutlined /></div>
                <h2 className="cd-card-title">Resumen de Importes</h2>
              </div>
              <Skeleton active title={false} paragraph={{ rows: 4 }} />
            </div>

            <div className="cd-servicios-banner">
              <div className="cd-servicios-banner-icon"><AppstoreOutlined /></div>
              <div className="cd-servicios-banner-text">
                <h3 className="cd-servicios-banner-title">Servicios del evento</h3>
                <p className="cd-servicios-banner-sub">
                  Equipos y paquetes contratados para este evento.
                </p>
              </div>
            </div>

            <div className="cd-servicios-row">
              {[0, 1].map((i) => (
                <div key={i} className="cd-card cd-card-servicio">
                  <div className="cd-card-header">
                    <div className="cd-card-icon-wrap">
                      <Skeleton.Avatar active size="small" shape="square" />
                    </div>
                    <Skeleton.Input active size="small" style={{ width: 110 }} />
                  </div>
                  <Skeleton active title={false} paragraph={{ rows: 3 }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (!evento) return null;

  const totalPagosAdicionales = pagos.reduce((a, p) => a + parseNum(p.monto), 0);
  const resta = (() => {
    if (!evento.importe) return null;
    const total = parseNum(evento.importe);
    const anticipo = parseNum(evento.importe_anticipo);
    return total - anticipo - totalPagosAdicionales;
  })();

  const tipoLabel = TIPO_EVENTO_MAP[evento.id_tipo_evento] ||
    (evento.id_paquete_fotografia || evento.lugar_fotografia || evento.datetime_fotografia
      ? "Fotografía"
      : "Sesión");
  const horaInicio = fmtHora(evento.hora_inicio);
  const horaFinal = fmtHora(evento.hora_final);

  const timelineEvents = [];
  const createdAt = evento.datetime || evento.created_at || evento.fecha_creacion;
  if (createdAt) {
    timelineEvents.push({
      key: "creation",
      fecha: createdAt,
      titulo: "Registrado en el sistema",
      descripcion: `Evento registrado para ${evento.cliente_nombre}`,
      tipo: "sistema",
      monto: null,
    });
  }
  if (evento.fecha_creacion_contrato) {
    timelineEvents.push({
      key: "fecha_celebracion",
      fecha: evento.fecha_creacion_contrato,
      titulo: "Fecha de celebración del contrato",
      descripcion: `Contrato celebrado con ${evento.cliente_nombre}`,
      tipo: "sistema",
      monto: null,
    });
  }
  if (evento.fecha_anticipo && parseNum(evento.importe_anticipo) > 0) {
    timelineEvents.push({
      key: "anticipo",
      fecha: evento.fecha_anticipo,
      titulo: "Anticipo recibido",
      descripcion: `Se recibió un anticipo de ${fmtMoney(evento.importe_anticipo)}`,
      tipo: "pago",
      monto: evento.importe_anticipo,
    });
  }
  pagos.forEach((p) => {
    timelineEvents.push({
      key: `pago-${p.id}`,
      fecha: p.fecha,
      titulo: "Abono registrado",
      descripcion: p.descripcion || `Abono adicional`,
      tipo: "pago",
      monto: p.monto,
    });
  });
  const serviceLabels = buildServiceLabels(evento?.servicios || []);
  resolveServicios(evento).forEach((sv, idx) => {
    if (!sv.fecha) return;
    const label = serviceLabels[sv.id_evento_servicio] || SERVICIO_LABEL[sv.id_servicio] || "Servicio";
    const lugarSv = sv.lugar || ciudadMap[sv.id_ciudad] || CIUDAD_MAP[sv.id_ciudad] || "";
    const horaSv = sv.hora_inicio
      ? `${fmtHora(sv.hora_inicio)}${sv.hora_final ? ` - ${fmtHora(sv.hora_final)}` : ""}`
      : "";
    timelineEvents.push({
      key: `servicio-${sv.id_evento_servicio ?? idx}`,
      fecha: sv.fecha,
      titulo: `Servicio: ${label}`,
      descripcion: [lugarSv, horaSv].filter(Boolean).join(" · ") || label,
      tipo: "servicio",
      id_servicio: sv.id_servicio,
      monto: null,
    });
  });
  timelineEvents.sort((a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf());

  const mainPdf = eventoPdfs[0] ?? null;

  const esCancelado =
    evento.cancelado === true || String(evento.status || "").toLowerCase() === "cancelado";
  const esConcluido =
    !esCancelado && !!evento.fecha_evento && dayjs(evento.fecha_evento).isBefore(dayjs().startOf("day"));
  const statusKey = esCancelado ? "cancelado" : esConcluido ? "concluido" : "activo";
  const statusLabel = { activo: "Activo", concluido: "Concluido", cancelado: "Cancelado" }[statusKey];

  return (
    <div className="cd-main">
      <div className="cd-content">


        <div className="cd-header-card">
          <div className="cd-header-top">
            <div>
              <div className="cd-header-name-row">
                <h1 className="cd-client-name">
                  {(evento.cliente_nombre + " - " + tipoLabel || "—").toUpperCase()}
                </h1>
                <span className={`cd-status-badge cd-status-${statusKey}`}>
                  {statusLabel.toUpperCase()}
                </span>
              </div>
              <div className="cd-header-meta">
                {evento.code && (
                  <span className="cd-meta-item">
                    <FileTextOutlined />
                    Folio: {evento.code}
                  </span>
                )}
                {createdAt && (
                  <span className="cd-meta-item">
                    <CalendarOutlined />
                    Creado: {fmtFechaCorta(createdAt)}
                  </span>
                )}
                {evento.created_by_nombre && (
                  <span
                    className={`cd-meta-item${evento.created_by_code && canConsultarUsuarios ? " cd-meta-link" : ""}`}
                    onClick={() => {
                      if (evento.created_by_code && canConsultarUsuarios) {
                        navigate(`/app/usuarios/${evento.created_by_code}`);
                      }
                    }}
                    title={evento.created_by_code && !canConsultarUsuarios ? "Sin permiso de consulta" : undefined}
                  >
                    <UserOutlined />
                    {evento.created_by_nombre}
                  </span>
                )}
              </div>
            </div>

            <div className="cd-header-actions">
              <Button
                icon={<ExportOutlined />}
                className="cd-btn-export"
                onClick={() => {}}
              >
                Exportar
              </Button>
              {canEliminar && (
                <Button
                  icon={<DeleteOutlined />}
                  className="cd-btn-delete"
                  loading={deleting}
                  disabled={success.show}
                  onClick={handleDelete}
                >
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          <div className="cd-header-tabs">
            <button
              className={`cd-tab-btn ${activeTab === "datos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              <FileTextOutlined />
              Datos del evento
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "evento-pdf" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("evento-pdf")}
            >
              <FilePdfOutlined />
              Evento Visor
            </button>
             <button
              className={`cd-tab-btn ${activeTab === "pagos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("pagos")}
            >
              <DollarOutlined />
              Abonos y Pagos
            </button>


            <button
              className={`cd-tab-btn ${activeTab === "historial" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("historial")}
            >
              <ClockCircleOutlined />
              Historial
            </button>

            <button
              className={`cd-tab-btn ${activeTab === "trabajadores" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("trabajadores")}
            >
              <TeamOutlined />
              Trabajadores
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "documentos" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("documentos")}
            >
              <FolderOpenOutlined />
              Documentos
            </button>
            <button
              className={`cd-tab-btn ${activeTab === "actividad" ? "cd-tab-btn-active" : ""}`}
              onClick={() => setActiveTab("actividad")}
            >
              <HistoryOutlined />
              Actividad

            </button>
          </div>
        </div>

        {/* Tab 1: Datos del evento */}
        {activeTab === "datos" && (
          <DatosTab
            evento={evento}
            paquetesSonido={paquetesSonido}
            paquetesFoto={paquetesFoto}
            paquetesDecoracion={paquetesDecoracion}
            paquetesBarra={paquetesBarra}
            eventoPdfs={eventoPdfs}
            ciudadesOptions={ciudadesOptions}
            resta={resta}
            editingClientCard={editingClientCard}
            setEditingClientCard={setEditingClientCard}
            editingClientForm={editingClientForm}
            setEditingClientForm={setEditingClientForm}
            savingClientCard={savingClientCard}
            handleSaveClientCard={handleSaveClientCard}
            editingFinancialCard={editingFinancialCard}
            setEditingFinancialCard={setEditingFinancialCard}
            editingFinancialForm={editingFinancialForm}
            setEditingFinancialForm={setEditingFinancialForm}
            savingFinancialCard={savingFinancialCard}
            handleSaveFinancialCard={handleSaveFinancialCard}
            editingMisaCard={editingMisaCard}
            setEditingMisaCard={setEditingMisaCard}
            editingMisaForm={editingMisaForm}
            setEditingMisaForm={setEditingMisaForm}
            savingMisaCard={savingMisaCard}
            handleSaveMisaCard={handleSaveMisaCard}
            editingServiceKey={editingServiceKey}
            setEditingServiceKey={setEditingServiceKey}
            editingServiceForm={editingServiceForm}
            setEditingServiceForm={setEditingServiceForm}
            savingService={savingService}
            startEditService={startEditService}
            handleSaveService={handleSaveService}
            setDeleteServiceModal={setDeleteServiceModal}
            onOpenAddServicio={handleOpenAddServicio}
            navigate={navigate}
            canConsultarPaquetes={canConsultarPaquetes}
          />
        )}

        {/* Tab 2: Historial */}
        {activeTab === "historial" && (
          <HistorialTab timelineEvents={timelineEvents} />
        )}

        {/* Tab 3: Pagos */}
        {activeTab === "pagos" && (
          <PagosTab
            evento={evento}
            pagos={pagos}
            totalPagosAdicionales={totalPagosAdicionales}
            resta={resta}
            setPagoModalOpen={setPagoModalOpen}
            handleDeleteAbono={handleDeleteAbono}
          />
        )}

        {/* Tab 4: PDF */}
        {activeTab === "evento-pdf" && (
          <EventoPdfTab
            loadingDocs={loadingDocs}
            pdfInputRef={pdfInputRef}
            handleUploadPdf={handleUploadPdf}
            uploadingPdf={uploadingPdf}
            mainPdf={mainPdf}
            getDocUrl={getDocUrl}
          />
        )}

        {/* Tab 5: Actividad */}
        {activeTab === "actividad" && (
          <ActividadTab actividad={actividad} loadingActividad={loadingActividad} />
        )}

        {/* Tab 6: Documentos */}
        {activeTab === "documentos" && (
          <DocumentosTab
            loadingDocs={loadingDocs}
            docInputRef={docInputRef}
            handleUploadDoc={handleUploadDoc}
            uploadingDoc={uploadingDoc}
            documentos={documentos}
            getDocUrl={getDocUrl}
            setViewerDoc={setViewerDoc}
            handleDeleteDoc={handleDeleteDoc}
          />
        )}

        {/* Tab 7: Equipo */}
        {activeTab === "equipo" && (
          <EquipoTab
            idEvento={idEvento}
            loadingEquipo={loadingEquipo}
            equipoEvento={equipoEvento}
            setEquipoSearch={setEquipoSearch}
            setEquipoCantidades={setEquipoCantidades}
            fetchCatalogo={fetchCatalogo}
            setEquipoModalOpen={setEquipoModalOpen}
            fetchEquipoEvento={fetchEquipoEvento}
            toast={toast}
          />
        )}

        {/* Tab: Trabajadores */}
        {activeTab === "trabajadores" && (
          <TrabajadoresTab
            idEvento={idEvento}
            evento={evento}
            trabajadoresEvento={trabajadoresEvento}
            loadingTrabajadores={loadingTrabajadores}
            serviceLabels={serviceLabels}
            setTrabSearch={setTrabSearch}
            setTrabSelectedId={setTrabSelectedId}
            setTrabSelectedPuesto={setTrabSelectedPuesto}
            setTrabHoraInicio={setTrabHoraInicio}
            setTrabHoraFin={setTrabHoraFin}
            setTrabServicioData={setTrabServicioData}
            setTrabActiveTab={setTrabActiveTab}
            fetchCatalogoTrabajadores={fetchCatalogoTrabajadores}
            setTrabajadoresModalOpen={setTrabajadoresModalOpen}
            setEditHoraModal={setEditHoraModal}
            setEditHoraInicio={setEditHoraInicio}
            setEditHoraFin={setEditHoraFin}
            fetchTrabajadoresEvento={fetchTrabajadoresEvento}
            toast={toast}
          />
        )}

      </div>

      {/* Modal: Agregar servicio */}
      <AgregarServicioModal
        servicioModalOpen={servicioModalOpen}
        setServicioModalOpen={setServicioModalOpen}
        servicioForm={servicioForm}
        handleAddServicio={handleAddServicio}
        savingServicio={savingServicio}
        nuevoServicioTipo={nuevoServicioTipo}
        setNuevoServicioTipo={setNuevoServicioTipo}
        ciudadesOptions={ciudadesOptions}
        paquetesSonido={paquetesSonido}
        paquetesFoto={paquetesFoto}
        paquetesDecoracion={paquetesDecoracion}
        paquetesBarra={paquetesBarra}
      />

      {/* Modal: Agregar abono */}
      <PagoModal
        pagoModalOpen={pagoModalOpen}
        setPagoModalOpen={setPagoModalOpen}
        pagoForm={pagoForm}
        handleAddPago={handleAddPago}
        savingPago={savingPago}
      />

      {/* Modal: Agregar equipo */}
      <EquipoModal
        idEvento={idEvento}
        equipoModalOpen={equipoModalOpen}
        setEquipoModalOpen={setEquipoModalOpen}
        equipoSearch={equipoSearch}
        setEquipoSearch={setEquipoSearch}
        loadingCatalogo={loadingCatalogo}
        catalogoEquipo={catalogoEquipo}
        equipoCantidades={equipoCantidades}
        setEquipoCantidades={setEquipoCantidades}
        savingEquipoId={savingEquipoId}
        setSavingEquipoId={setSavingEquipoId}
        fetchEquipoEvento={fetchEquipoEvento}
        fetchCatalogo={fetchCatalogo}
        toast={toast}
      />

      {/* Modal: Agregar trabajador */}
      <TrabajadorModal
        idEvento={idEvento}
        evento={evento}
        trabajadoresModalOpen={trabajadoresModalOpen}
        setTrabajadoresModalOpen={setTrabajadoresModalOpen}
        trabSelectedId={trabSelectedId}
        setTrabSelectedId={setTrabSelectedId}
        catalogoTrabajadores={catalogoTrabajadores}
        serviceLabels={serviceLabels}
        trabActiveTab={trabActiveTab}
        setTrabActiveTab={setTrabActiveTab}
        trabServicioData={trabServicioData}
        setTrabServicioData={setTrabServicioData}
        puestosEvento={puestosEvento}
        trabSelectedPuesto={trabSelectedPuesto}
        setTrabSelectedPuesto={setTrabSelectedPuesto}
        trabHoraInicio={trabHoraInicio}
        setTrabHoraInicio={setTrabHoraInicio}
        trabHoraFin={trabHoraFin}
        setTrabHoraFin={setTrabHoraFin}
        savingTrab={savingTrab}
        setSavingTrab={setSavingTrab}
        fetchTrabajadoresEvento={fetchTrabajadoresEvento}
        toast={toast}
      />

      {/* Modal: Editar horario de trabajador */}
      <EditHoraModal
        idEvento={idEvento}
        editHoraModal={editHoraModal}
        setEditHoraModal={setEditHoraModal}
        editHoraInicio={editHoraInicio}
        setEditHoraInicio={setEditHoraInicio}
        editHoraFin={editHoraFin}
        setEditHoraFin={setEditHoraFin}
        savingEditHora={savingEditHora}
        setSavingEditHora={setSavingEditHora}
        fetchTrabajadoresEvento={fetchTrabajadoresEvento}
        toast={toast}
      />

      {/* Modal: Visor de documento */}
      <ViewerDocModal
        viewerDoc={viewerDoc}
        setViewerDoc={setViewerDoc}
        getDocUrl={getDocUrl}
      />

      {/* Modal: Confirmar eliminar servicio (paso 1) */}
      <DeleteServiceModal
        deleteServiceModal={deleteServiceModal}
        setDeleteServiceModal={setDeleteServiceModal}
        deletingService={deletingService}
        handleDeleteService={handleConfirmDeleteService}
      />

      {/* Modal: Confirmar eliminación de la agenda asociada (paso 2) */}
      <DeleteServiceAgendaModal
        agendaServiceModal={agendaServiceModal}
        setAgendaServiceModal={setAgendaServiceModal}
        deletingService={deletingService}
        onDeleteService={handleDeleteService}
      />

      <Toast show={showToast} msg={toastMsg} setShow={setShowToast} />
      <SuccessOverlay
        show={success.show}
        title={success.title}
        subtitle={success.subtitle}
        onDone={() => navigate("/app/eventos")}
      />
    </div>
  );
}
