// src/components/laboral/PrimeraAudienciaForm.jsx
import React, {useEffect, useRef, useState } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Form,
  Select,
  Upload,
  DatePicker,
  InputNumber,
  Input,
  notification,
  Modal,
  Spin,              // ← agrega esto

} from "antd";
import {
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  InboxOutlined,
  CalendarOutlined,   // ← agrega esto
} from "@ant-design/icons";
import { useDispatch } from "react-redux";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import dayjs from "dayjs";

import PrestacionesTabla from "./PrestacionesTabla";
import {
  quillModules,
  quillFormats,
  parsePrestaciones,
} from "./audienciaHelpers";
import {
  actionConciliacionPrimeraAudiencia,
  actionConciliacionPrimeraAudienciaEdit,
} from "../../../redux/actions/conciliacion/conciliacion";
import {PATH} from "../../../redux/utils"
const API_BASE = PATH;
const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

function PrimeraAudienciaForm({
  header,
  initialData,
  onCancel,
  onSaved,
  dataAudiencias,
  isEdit,
  abogadoOptions,
  jump,
}) {
console.log("123345")
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const { idExpediente } = useParams();

  const location = useLocation();
  const navigate = useNavigate();

  const pagoRefs = useRef({});
  const addPagoButtonRef = useRef(null);

  const [hasConstancia, setHasConstancia] = useState(false);
  const [constanciaUploading, setConstanciaUploading] = useState(false);
  const [constanciaPreviewUrl, setConstanciaPreviewUrl] = useState(null);
  const [constanciaMeta, setConstanciaMeta] = useState(null);
  const [submitting, setSubmitting] = useState(false);

const [pagosFechaPicker, setPagosFechaPicker] = useState({
  open: false,
  fieldName: null,
});
  const resumenHeader =
    header ||
    location.state?.headerInfo || {
      expediente: "",
      trabajador: "",
      empresa: "",
      causaTerminacion: "",
      fechaAudiencia: "",
    };

  const resultadoValue = Form.useWatch("resultado", form);
  const [openFechaProximaPicker, setOpenFechaProximaPicker] = useState(false);
  const fechaProximaValue = Form.useWatch("fecha_proxima_audiencia", form);

  const makeFechaHoraInputHandler = (fieldName) => (e) => {
    let v = e.target.value.replace(/\D/g, "");

    let formatted = v;
    if (v.length > 2) formatted = v.slice(0, 2) + "/" + v.slice(2);
    if (v.length > 4)
      formatted = formatted.slice(0, 5) + "/" + formatted.slice(5);
    if (v.length > 8)
      formatted = formatted.slice(0, 10) + " " + formatted.slice(10);
    if (v.length > 10)
      formatted = formatted.slice(0, 13) + ":" + formatted.slice(13);
    formatted = formatted.slice(0, 16);

    e.target.value = formatted;

    form.setFieldsValue({
      [fieldName]: formatted,
    });
  };

  const handleFechaProximaCalendarChange = (value) => {
    const formatted = value ? value.format("DD/MM/YYYY HH:mm") : "";
    form.setFieldsValue({
      fecha_proxima_audiencia: formatted,
    });
  };
// Mascara para fechas DD/MM/YYYY
// Mascara para fechas DD/MM/YYYY
const makeFechaInputHandler = (fieldName) => (e) => {
  let v = e.target.value.replace(/\D/g, ""); // solo dígitos

  let formatted = v;
  if (v.length > 2) {
    formatted = v.slice(0, 2) + "/" + v.slice(2);
  }
  if (v.length > 4) {
    formatted = formatted.slice(0, 5) + "/" + formatted.slice(5);
  }
  formatted = formatted.slice(0, 10); // DD/MM/YYYY máximo

  e.target.value = formatted;

  // fieldName puede ser string o array (["pagos_convenio", index, "fecha"])
  form.setFieldsValue({
    [fieldName]: formatted,
  });
};



// Convierte fecha local → backend
const parseFechaToBackend = (str) => {
  if (!str) return null;
  const d = dayjs(str, "DD/MM/YYYY", true);
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
};

  const normFile = (e) => {
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

 const handleSave = async () => {
  try {
    await form.validateFields();
    const values = form.getFieldsValue(true);

    const {
      archivo_convenio,
      archivo_diferimiento,
      archivo_no_conciliacion,
      archivo_constancia_cumplimiento,
      ...rest
    } = values;

    const prestacionesArray = rest.prestaciones_reclamadas || [];
    const prestaciones_reclamadas = Array.isArray(prestacionesArray)
      ? prestacionesArray.join(",")
      : prestacionesArray;

   const pagosConvenioNormalizados = Array.isArray(rest.pagos_convenio)
  ? rest.pagos_convenio.map((p) => ({
      ...p,
      fecha: p.fecha
        ? dayjs(p.fecha, "DD/MM/YYYY HH:mm", true).format("YYYY-MM-DD HH:mm:ss")
        : null,
      tipo_pago: p.tipo_pago || null,
    }))
  : [];


    const parseFechaHoraToBackend = (str) => {
      if (!str) return null;
      const d = dayjs(str, "DD/MM/YYYY HH:mm", true);
      return d.isValid() ? d.format("YYYY-MM-DD HH:mm:ss") : null;
    };

    const payload = {
      ...rest,
      propuesta_final_patron: rest.propuesta_inicial_patron,
      propuesta_final_trabajador: rest.propuesta_inicial_trabajador,
    //  id_abogado: rest.id_abogado,
      prestaciones_reclamadas,
      pagos_convenio: pagosConvenioNormalizados,
      fecha_proxima_audiencia: parseFechaHoraToBackend(
        rest.fecha_proxima_audiencia
      ),
      meta: {
        expediente: resumenHeader.expediente,
        trabajador: resumenHeader.trabajador,
        empresa: resumenHeader.empresa,
        causaTerminacion: resumenHeader.causaTerminacion,
        fechaAudiencia: resumenHeader.fechaProximaAudiencia
          ? dayjs(resumenHeader.fechaProximaAudiencia).format(
              "YYYY-MM-DD HH:mm:ss"
            )
          : null,
      },
    };

    const filesMap = {
      archivo_convenio: archivo_convenio?.[0]?.originFileObj || null,
      archivo_diferimiento: archivo_diferimiento?.[0]?.originFileObj || null,
      archivo_no_conciliacion:
        archivo_no_conciliacion?.[0]?.originFileObj || null,
      archivo_constancia_cumplimiento:
        archivo_constancia_cumplimiento?.[0]?.originFileObj || null,
    };

    setSubmitting(true);

    if (isEdit) {
      await dispatch(
        actionConciliacionPrimeraAudienciaEdit(
          payload,
          idExpediente,
          dataAudiencias.id,
          () => {
            notification.success({
              message: "Minuta Guardada",
              description: "Minuta de primera audiencia guardada.",
            });
            onSaved?.();
          },
          filesMap
        )
      );
    } else {
      await dispatch(
        actionConciliacionPrimeraAudiencia(
          payload,
          idExpediente,
          () => {
            notification.success({
              message: "Minuta Guardada",
              description: "Minuta de primera audiencia guardada.",
            });
            onSaved?.();
          },
          filesMap
        )
      );
    }
  } catch (err) {
    const errorFields = err?.errorFields || [];
    if (errorFields.length) {
      notification.error({
        message: "Error",
        description: "Revisa los campos marcados en rojo.",
      });
      form.scrollToField(errorFields[0].name, { block: "center" });
    } else if (err?.message) {
      notification.error({
        message: "Error",
        description: err.message,
      });
    } else {
      notification.error({
        message: "Error",
        description: "No se pudo guardar la minuta.",
      });
    }
  } finally {
    setSubmitting(false);
  }
};


  // =========================
  // initialValues
  // =========================
  const initialValues = {
    resumen_pretensiones_html: initialData?.resumen_pretensiones_html || "",
    postura_patron_detalle: initialData?.postura_patron_detalle || "",
    ...initialData,
  };

  if (typeof initialValues.prestaciones_reclamadas === "string") {
    initialValues.prestaciones_reclamadas = parsePrestaciones(
      initialValues.prestaciones_reclamadas
    );
  }

  if (initialValues.fecha_pago_convenio) {
    initialValues.fecha_pago_convenio = dayjs(
      initialValues.fecha_pago_convenio
    );
  }

  if (initialValues.fecha_proxima_audiencia) {
  const d = dayjs(initialValues.fecha_proxima_audiencia);
  initialValues.fecha_proxima_audiencia = d.isValid()
    ? d.format("DD/MM/YYYY HH:mm")
    : "";
}


  const proximaAudienciaLabel = resumenHeader.fechaProximaAudiencia
    ? dayjs(resumenHeader.fechaProximaAudiencia).format(
        "D [de] MMMM [de] YYYY HH:mm"
      )
    : null;

  if (Array.isArray(initialValues.pagos_convenio)) {
    initialValues.pagos_convenio = initialValues.pagos_convenio.map((p) => ({
      ...p,
      fecha: p.fecha ? dayjs(p.fecha) : null,
      tipo_pago: p.tipo_pago || undefined,
    }));
  }

  const handleConstanciaUpload = async ({ file, onSuccess, onError }) => {
    try {
      const expedienteVal = resumenHeader?.expediente;
      if (!expedienteVal) {
        notification.error({
          message: "Datos incompletos",
          description:
            "No se encontró el expediente para asociar la constancia de cumplimiento.",
        });
        onError?.();
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("expediente", String(expedienteVal));

      setConstanciaUploading(true);

      const res = await fetch(
        `${API_BASE}/audiencia/constancia-cumplimiento/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await res.json();

      if (!res.ok || json.status !== "ok") {
        console.error("Error backend (constancia upload):", json);
        notification.error({
          message: "Error al importar constancia",
          description: "No se pudo importar la constancia de cumplimiento.",
        });
        setConstanciaUploading(false);
        onError?.(json);
        return;
      }

      const fullPreviewUrl = `${API_BASE}${json.preview_url}`;
      setConstanciaPreviewUrl(fullPreviewUrl);
      setConstanciaMeta({
        expediente: expedienteVal,
        fileName: json.filename,
        previewUrl: json.preview_url,
      });
      setHasConstancia(true);

      notification.success({
        message: "Constancia importada",
        description: "La constancia de cumplimiento se importó correctamente.",
      });

      setConstanciaUploading(false);
      onSuccess?.(json);
    } catch (err) {
      console.error(err);
      notification.error({
        message: "Error de conexión",
        description:
          "No se pudo conectar con el servidor al importar la constancia.",
      });
      setConstanciaUploading(false);
      onError?.(err);
    }
  };

  const handleDeleteConstancia = () => {
    if (!constanciaMeta?.expediente || !constanciaMeta?.fileName) {
      notification.error({
        message: "Constancia no disponible",
        description: "No se encontró la información de la constancia.",
      });
      return;
    }

    Modal.confirm({
      title: "Eliminar constancia",
      content:
        "Se eliminará el archivo de constancia de cumplimiento del convenio. ¿Deseas continuar?",
      okText: "Sí, eliminar",
      okType: "danger",
      cancelText: "Cancelar",
      async onOk() {
        try {
          const res = await fetch(
            `${API_BASE}/audiencia/constancia-cumplimiento/delete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                expediente: constanciaMeta.expediente,
                fileName: constanciaMeta.fileName,
              }),
            }
          );

          const json = await res.json();

          if (!res.ok || json.status !== "ok") {
            console.error("Error backend (constancia delete):", json);
            notification.error({
              message: "Error al eliminar",
              description:
                "No se pudo eliminar la constancia de cumplimiento.",
            });
            return;
          }

          setHasConstancia(false);
          setConstanciaMeta(null);
          setConstanciaPreviewUrl(null);

          notification.success({
            message: "Constancia eliminada",
            description: "La constancia se eliminó correctamente.",
          });
        } catch (err) {
          console.error(err);
          notification.error({
            message: "Error de conexión",
            description:
              "Ocurrió un error de conexión al eliminar la constancia.",
          });
        }
      },
    });
  };


useEffect(() => {
  if (jump?.type === "adelantar") {
    // fuerza el resultado a convenio
    form.setFieldsValue({ resultado: "convenio" });

    // opcional: limpia campos que ya no aplican cuando es convenio
    form.setFieldsValue({
      fecha_proxima_audiencia: "",
      motivo_archivo: "",
      archivo_diferimiento: [],
      archivo_no_conciliacion: [],
    });
  }
}, [jump?.ts, jump?.type, form]);

  return (
    <>
      <Card
        className="laboral-exp-audiencia-card"
        style={{ marginTop: 24 }}
        bodyStyle={{ padding: 24 }}
      >
          <Spin spinning={submitting} tip="Guardando minuta...">

        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4} style={{ marginBottom: 4 }}>
              Primera audiencia prejudicial · Minuta interna
              {proximaAudienciaLabel && <> · {proximaAudienciaLabel}</>}
            </Title>
          </Col>
          <Col>
            <Space>
              <Button onClick={onCancel}>Cancelar</Button>
             <Button
  type="primary"
  icon={<SaveOutlined />}
  onClick={handleSave}
  loading={submitting}
  disabled={submitting}
>
  Guardar
</Button>
            </Space>
          </Col>
        </Row>

        <Form
          form={form}
          layout="vertical"
          className="audiencia-ant-form"
          initialValues={initialValues}
        >
          {/* CARD 3 · RESULTADO DE LA AUDIENCIA */}
          <Card
            size="small"
            className="audiencia-edit-card"
            title=" Resultado de la audiencia"
          >
            <Row gutter={[16, 8]} align="top">
              {/* Resultado + Abogado → en la misma fila */}
              <Col xs={24} md={14}>
                <Form.Item
                  label="Resultado de la audiencia"
                  name="resultado"
                  rules={[
                    { required: true, message: "Selecciona el resultado." },
                  ]}
                >
                  <Select
                    placeholder="Selecciona el resultado"
                    showSearch
                    style={{ width: "100%" }}
                    optionFilterProp="children"
                  >
                    <Option value="convenio">Convenio</Option>
                    <Option value="no_conciliacion">
                      Constancia de no conciliación
                    </Option>
                    <Option value="diferimiento">
                      Diferimiento / nueva audiencia
                    </Option>
                    <Option value="archivo_solicitante">
                      Archivo por incomparecencia del solicitante
                    </Option>
                    <Option value="archivo_patron">
                      Archivo por incomparecencia del patrón
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
{/*
              <Col xs={24} md={10}>
                <Form.Item
                  label="Abogado / apoderado legal"
                  name="id_abogado"
                  rules={[
                    { required: true, message: "Selecciona el abogado." },
                  ]}
                >
                  <Select
                    placeholder="Selecciona abogado"
                    options={abogadoOptions}
                    showSearch
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
*/}
              {/* DOCUMENTO DIFERIMIENTO */}
              {resultadoValue === "diferimiento" && (
                <Col xs={24} md={10}>
                  <Form.Item
                    label="Documento de diferimiento"
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                    name="archivo_diferimiento"
                  >
                    <Dragger
                      name="file"
                      multiple={false}
                      beforeUpload={() => false}
                      maxCount={1}
                      accept=".pdf,.doc,.docx,image/*"
                      style={{ width: "100%" }}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p style={{ fontWeight: 500 }}>
                        Haz clic o arrastra el documento de diferimiento
                      </p>
                      <p style={{ color: "#6b7280", fontSize: 12 }}>
                        Carga el documento escaneado de diferimiento /
                        reprogramación de audiencia.
                      </p>
                    </Dragger>
                  </Form.Item>
                </Col>
              )}
            </Row>

            {/* Pagos convenio */}
            {resultadoValue === "convenio" && (
              <>
                <Form.List name="pagos_convenio">
                  {(fields, { add, remove }) => {
                    const handleAddPago = () => {
                      add();
                      setTimeout(() => {
                        const pagos =
                          form.getFieldValue("pagos_convenio") || [];
                        const lastIndex = pagos.length - 1;
                        const ref =
                          pagoRefs.current[`monto-${lastIndex}`];
                        if (ref && ref.focus) ref.focus();
                      }, 0);
                    };

                    return (
                      <>
                        <Form.Item
                          label="Pagos del convenio"
                          style={{ marginTop: 8, marginBottom: 8 }}
                        >
                          <div style={{ marginBottom: 10 }}>
                            <Button
                              type="dashed"
                              icon={<PlusOutlined />}
                              onClick={handleAddPago}
                              ref={addPagoButtonRef}
                            >
                              Agregar pago
                            </Button>
                          </div>

                          <div className="audiencia-table-container">
                            <table className="audiencia-table detalle">
                              <thead>
                                <tr>
                                  <th
                                    style={{
                                      width: "1%",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    #
                                  </th>
                                  <th style={{ width: "25%" }}>
                                    Monto (MXN)
                                  </th>
                                  <th style={{ width: "20%" }}>Fecha</th>
                                  <th style={{ width: "20%" }}>
                                    Método de pago
                                  </th>
                                  <th style={{ width: "20%" }}>
                                    Tipo de pago (inmediato / diferido)
                                  </th>
                                  <th style={{ width: "10%" }}>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fields.length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={6}
                                      style={{
                                        textAlign: "center",
                                        fontSize: 12,
                                        color: "#6b7280",
                                      }}
                                    >
                                      No hay pagos registrados. Usa el botón{" "}
                                      <strong>“Agregar pago”</strong>.
                                    </td>
                                  </tr>
                                )}

                                {fields.map((field, index) => (
                                  <tr key={field.key}>
                                    <td
                                      style={{
                                        textAlign: "center",
                                        width: "1%",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {index + 1}
                                    </td>

                                    {/* MONTO */}
                                    <td>
                                      <Form.Item
                                        {...field}
                                        name={[field.name, "monto"]}
                                        fieldKey={[field.fieldKey, "monto"]}
                                        rules={[
                                          {
                                            required: true,
                                            message: "Monto requerido.",
                                          },
                                        ]}
                                        style={{ marginBottom: 0 }}
                                      >
                                        <InputNumber
                                          style={{ width: "100%" }}
                                          min={0}
                                          step={0.01}
                                          placeholder="Ej. 20,000.00"
                                          controls={false}
                                          ref={(el) =>
                                            (pagoRefs.current[
                                              `monto-${field.name}`
                                            ] = el)
                                          }
                                         formatter={(value) => {
                                              if (value === undefined || value === null || value === "") return "";
                                              const [intPart, decPart] = value.toString().split(".");
                                              const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                                              return decPart !== undefined
                                                ? `$ ${intWithCommas}.${decPart}`
                                                : `$ ${intWithCommas}`;
                                            }}

                                            parser={(value) => {
                                              if (!value) return "";
                                              return value
                                                .replace(/\$/g, "")   // quita $
                                                .replace(/\s/g, "")   // quita espacios
                                                .replace(/,/g, "");   // quita separadores de miles (NO LOS CAMBIA POR PUNTO)
                                            }}


                                          onPressEnter={(e) => {
                                            e.preventDefault();
                                            const ref =
                                              pagoRefs.current[
                                                `fecha-${field.name}`
                                              ];
                                            if (ref && ref.focus) ref.focus();
                                          }}
                                        />
                                      </Form.Item>
                                    </td>

                                
                                  {/* FECHA */}
                                      <td>
  <Form.Item
    {...field}
    name={[field.name, "fecha"]}
    fieldKey={[field.fieldKey, "fecha"]}
    rules={[
      {
        required: true,
        message: "Fecha y hora requeridas.",
      },
    ]}
    style={{ marginBottom: 0 }}
  >
    {(() => {
      const fieldPath = ["pagos_convenio", field.name, "fecha"];
      const rawValue = form.getFieldValue(fieldPath);

      let textValue = "";
      if (rawValue) {
        if (dayjs.isDayjs(rawValue)) {
          textValue = rawValue.format("DD/MM/YYYY HH:mm");
        } else {
          textValue = rawValue;
        }
      }

      const isOpen =
        pagosFechaPicker.open &&
        pagosFechaPicker.fieldName === field.name;

      return (
        <div style={{ position: "relative" }}>
          <Input
            placeholder="DD/MM/YYYY HH:mm"
            maxLength={16}
            value={textValue}
            onChange={makeFechaHoraInputHandler(fieldPath)}
            suffix={
              <CalendarOutlined
                style={{ cursor: "pointer", color: "#1677ff" }}
                onClick={() =>
                  setPagosFechaPicker({
                    open: true,
                    fieldName: field.name,
                  })
                }
              />
            }
            ref={(el) =>
              (pagoRefs.current[`fecha-${field.name}`] = el)
            }
          />

          <DatePicker
            open={isOpen}
            onOpenChange={(open) => {
              if (!open) {
                setPagosFechaPicker((prev) => ({
                  ...prev,
                  open: false,
                }));
              }
            }}
            format="DD/MM/YYYY HH:mm"
            showTime={{ format: "HH:mm" }}
            value={
              textValue
                ? dayjs(textValue, "DD/MM/YYYY HH:mm", true)
                : null
            }
            onChange={(v) => {
              form.setFields([
                {
                  name: fieldPath,
                  value: v ? v.format("DD/MM/YYYY HH:mm") : "",
                },
              ]);
              setPagosFechaPicker((prev) => ({
                ...prev,
                open: false,
              }));
            }}
            style={{
              position: "absolute",
              opacity: 0,
              pointerEvents: "none",
              width: 0,
              height: 0,
            }}
            getPopupContainer={() => document.body}
          />
        </div>
      );
    })()}
  </Form.Item>
</td>





                                    {/* MÉTODO DE PAGO */}
                                    <td>
                                      <Form.Item
                                        {...field}
                                        name={[field.name, "forma_pago"]}
                                        fieldKey={[
                                          field.fieldKey,
                                          "forma_pago",
                                        ]}
                                        rules={[
                                          {
                                            required: true,
                                            message:
                                              "Método de pago requerido.",
                                          },
                                        ]}
                                        style={{ marginBottom: 0 }}
                                      >
                                        <Select
                                          placeholder="Selecciona método de pago"
                                          showSearch
                                          optionFilterProp="children"
                                          ref={(el) =>
                                            (pagoRefs.current[
                                              `forma-${field.name}`
                                            ] = el)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              const ref =
                                                pagoRefs.current[
                                                  `tipo-${field.name}`
                                                ];
                                              if (ref && ref.focus)
                                                ref.focus();
                                            }
                                          }}
                                        >
                                          <Option value="1">Efectivo</Option>
                                          <Option value="2">
                                            Transferencia
                                          </Option>
                                          <Option value="3">Cheque</Option>
                                          <Option value="4">
                                            Orden de Pago
                                          </Option>
                                        </Select>
                                      </Form.Item>
                                    </td>

                                    {/* TIPO DE PAGO */}
                                    <td>
                                      <Form.Item
                                        {...field}
                                        name={[field.name, "tipo_pago"]}
                                        fieldKey={[
                                          field.fieldKey,
                                          "tipo_pago",
                                        ]}
                                        rules={[
                                          {
                                            required: true,
                                            message: "Tipo de pago requerido.",
                                          },
                                        ]}
                                        style={{ marginBottom: 0 }}
                                      >
                                        <Select
                                          placeholder="Selecciona tipo de pago"
                                          showSearch
                                          optionFilterProp="children"
                                          ref={(el) =>
                                            (pagoRefs.current[
                                              `tipo-${field.name}`
                                            ] = el)
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              if (
                                                addPagoButtonRef.current &&
                                                addPagoButtonRef.current.focus
                                              ) {
                                                addPagoButtonRef.current.focus();
                                              }
                                            }
                                          }}
                                        >
                                          <Option value="inmediato">
                                            Inmediato
                                          </Option>
                                          <Option value="diferido">
                                            Diferido
                                          </Option>
                                        </Select>
                                      </Form.Item>
                                    </td>

                                    {/* ACCIONES */}
                                    <td style={{ textAlign: "center" }}>
                                      <Button
                                        danger
                                        type="text"
                                        icon={<DeleteOutlined />}
                                        onClick={() => remove(field.name)}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Form.Item>
                      </>
                    );
                  }}
                </Form.List>
              </>
            )}

            {/* DOCUMENTOS CONVENIO */}
            {resultadoValue === "convenio" && (
              <div
                className="audiencia-summary-card"
                style={{ marginTop: 8, marginBottom: 12 }}
              >
                <div className="audiencia-summary-header">Documentos</div>

                <div className="audiencia-summary-body">
                  <Row gutter={[16, 8]}>
                    {/* Documento del convenio celebrado */}
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Documento del convenio celebrado"
                        name="archivo_convenio"
                        valuePropName="fileList"
                        getValueFromEvent={normFile}
                      >
                        <Dragger
                          name="file"
                          multiple={false}
                          beforeUpload={() => false}
                          maxCount={1}
                          accept=".pdf,.doc,.docx,image/*"
                          style={{ width: "100%" }}
                        >
                          <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                          </p>
                          <p style={{ fontWeight: 500 }}>
                            Haz clic o arrastra el archivo del convenio
                          </p>
                          <p style={{ color: "#6b7280", fontSize: 12 }}>
                            Se recomienda cargar el convenio firmado en PDF o
                            Word.
                          </p>
                        </Dragger>
                      </Form.Item>
                    </Col>

                    {/* Constancia de conciliación / cumplimiento */}
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Constancia de conciliación / cumplimiento"
                        name="archivo_constancia_cumplimiento"
                        valuePropName="fileList"
                        getValueFromEvent={normFile}
                      >
                        <Dragger
                          name="file"
                          multiple={false}
                          beforeUpload={() => false}
                          maxCount={1}
                          accept=".pdf,.doc,.docx,image/*"
                          style={{ width: "100%" }}
                        >
                          <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                          </p>
                          <p style={{ fontWeight: 500 }}>
                            Haz clic o arrastra la constancia de cumplimiento
                          </p>
                          <p style={{ color: "#6b7280", fontSize: 12 }}>
                            Esta constancia se usará para acreditar el
                            cumplimiento total del convenio.
                          </p>
                        </Dragger>
                      </Form.Item>
                    </Col>
                  </Row>

                  <div
                    className="audiencia-summary-row"
                    style={{ marginTop: 12 }}
                  >
                    <div className="audiencia-summary-label">Nota</div>
                    <div className="audiencia-summary-value">
                      El convenio se considera completamente cumplido cuando se
                      ha recibido y digitalizado la constancia firmada.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Diferimiento */}
            {resultadoValue === "diferimiento" && (
  <>
    <Row gutter={[16, 8]}>
      <Col xs={24} md={12}>
        <Form.Item
          label="Próxima audiencia programada"
          name="fecha_proxima_audiencia"
          rules={[
            {
              required: true,
              message: "Indica la fecha de la nueva audiencia.",
            },
          ]}
        >
          <div style={{ position: "relative" }}>
            <Input
              placeholder="DD/MM/YYYY HH:mm"
              maxLength={16}
              value={fechaProximaValue || ""}
              onChange={makeFechaHoraInputHandler("fecha_proxima_audiencia")}
              suffix={
                <CalendarOutlined
                  style={{ cursor: "pointer", color: "#1677ff" }}
                  onClick={() => setOpenFechaProximaPicker(true)}
                />
              }
            />

            <DatePicker
              open={openFechaProximaPicker}
              onOpenChange={setOpenFechaProximaPicker}
              format="DD/MM/YYYY HH:mm"
              showTime={{ format: "HH:mm" }}
              value={
                fechaProximaValue
                  ? dayjs(fechaProximaValue, "DD/MM/YYYY HH:mm", true)
                  : null
              }
              onChange={handleFechaProximaCalendarChange}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                pointerEvents: "none",
                width: 0,
                height: 0,
              }}
              getPopupContainer={(trigger) => trigger.parentNode}
            />
          </div>
        </Form.Item>
      </Col>
    </Row>
  </>
)}


            {/* Archivo por incomparecencia */}
            {(resultadoValue === "archivo_solicitante" ||
              resultadoValue === "archivo_patron") && (
              <>
                <Form.Item
                  label="Motivo del archivo / constancia"
                  name="motivo_archivo"
                  rules={[
                    {
                      required: true,
                      message: "Describe el motivo del archivo.",
                    },
                  ]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Ej. El solicitante no asistió a la audiencia; se archiva por falta de interés..."
                  />
                </Form.Item>

                <Form.Item
                  label="Adjuntar documento"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                  name="archivo_no_conciliacion"
                >
                  <Dragger
                    name="file"
                    multiple={false}
                    beforeUpload={() => false}
                    maxCount={1}
                    accept=".pdf,.doc,.docx,image/*"
                    style={{ width: "100%" }}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p style={{ fontWeight: 500 }}>
                      Haz clic o arrastra el documento de archivo / constancia
                    </p>
                    <p style={{ color: "#6b7280", fontSize: 12 }}>
                      Carga el documento que respalda el archivo por
                      incomparecencia.
                    </p>
                  </Dragger>
                </Form.Item>
              </>
            )}
          </Card>

          {/* CARD 1 · OBJETO DE LA RECLAMACIÓN */}
          {resultadoValue !== "convenio" &&
            resultadoValue !== "archivo_solicitante" &&
            resultadoValue !== "archivo_patron" && (
              <>
                <Card
                  size="small"
                  className="audiencia-edit-card"
                  title=" Objeto de la reclamación"
                >
                  <Row gutter={[16, 8]}>
                    {/* IZQUIERDA · ReactQuill */}
                    <Col xs={24} md={12}>
                      <Title level={5} style={{ marginBottom: 8 }}>
                        Pretensiones del trabajador
                      </Title>

                      <Form.Item
                        label="Resumen de las pretensiones del trabajador"
                        name="resumen_pretensiones_html"
                        rules={[
                          {
                            required: true,
                            message:
                              "Escribe el resumen de las pretensiones del trabajador.",
                          },
                        ]}
                      >
                        <div className="audiencia-quill-wrapper">
                          <ReactQuill
                            theme="snow"
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Ejemplo: El solicitante manifestó haber sido despedido injustificadamente..."
                            value={
                              form.getFieldValue(
                                "resumen_pretensiones_html"
                              ) || ""
                            }
                            onChange={(content) => {
                              form.setFieldsValue({
                                resumen_pretensiones_html: content,
                              });
                            }}
                          />
                        </div>
                      </Form.Item>
                    </Col>

                    {/* DERECHA · Tabla prestaciones */}
                    <Col xs={24} md={12}>
                      <PrestacionesTabla form={form} />
                    </Col>
                  </Row>
                </Card>

                {/* CARD 2 · DESARROLLO DE LA NEGOCIACIÓN */}
                <Card
                  size="small"
                  className="audiencia-edit-card"
                  title=" Negociación"
                >
                  <Row gutter={[16, 8]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Propuesta final del trabajador (MXN)"
                        name="propuesta_inicial_trabajador"
                      >
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          step={0.01}
                          placeholder="Ej. 165000.50"
                          controls={false}
                          formatter={(value) => {
                            if (!value && value !== 0) return "";
                            const parts = value.toString().split(".");
                            const integer = parts[0].replace(
                              /\B(?=(\d{3})+(?!\d))/g,
                              ","
                            );
                            const decimals = parts[1]
                              ? `.${parts[1]}`
                              : "";
                            return `$ ${integer}${decimals}`;
                          }}
                          parser={(value) =>
                            value.replace(/\$\s?/, "").replace(/,/g, "")
                          }
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Propuesta final del patrón (MXN)"
                        name="propuesta_inicial_patron"
                      >
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          step={0.01}
                          placeholder="Ej. 18500.75"
                          controls={false}
                          formatter={(value) => {
                            if (!value && value !== 0) return "";
                            const parts = value.toString().split(".");
                            const integer = parts[0].replace(
                              /\B(?=(\d{3})+(?!\d))/g,
                              ","
                            );
                            const decimals = parts[1]
                              ? `.${parts[1]}`
                              : "";
                            return `$ ${integer}${decimals}`;
                          }}
                          parser={(value) =>
                            value.replace(/\$\s?/, "").replace(/,/g, "")
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              </>
            )}

          {/* CARD RIESGOS Y OBSERVACIONES */}
          <Card
            size="small"
            className="audiencia-edit-card"
            title=" Riesgos y observaciones"
          >
            <Form.Item name="riesgos_detectados" style={{ width: "100%" }}>
              <div className="audiencia-quill-wrapper">
                <ReactQuill
                  theme="snow"
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Ejemplo: Riesgos detectados, postura de las partes, acciones inmediatas recomendadas..."
                  value={form.getFieldValue("riesgos_detectados") || ""}
                  onChange={(content) => {
                    form.setFieldsValue({
                      riesgos_detectados: content,
                    });
                  }}
                />
              </div>
            </Form.Item>
          </Card>
        </Form>
          </Spin>

      </Card>
    </>
  );
}

export default PrimeraAudienciaForm;
