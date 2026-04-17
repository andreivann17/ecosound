// src/pages/laboral/audiencias/PrimeraAudienciaPrejudicialForm.jsx
import React, { useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Button,
  Typography,
  Row,
  Col,
  Steps,
  Radio,
  DatePicker,
  Card,
  notification,
  Checkbox,
  Select,
  Upload,
} from "antd";
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import dayjs from "dayjs";
import { actionConciliacionPrimeraAudiencia } from "../../redux/actions/conciliacion/conciliacion";
import { useDispatch } from "react-redux";
import { useParams, useLocation, useNavigate } from "react-router-dom";

const { Text, Title } = Typography;
const { Option } = Select;

/**
 * Formulario de MINUTA para la primera audiencia prejudicial.
 *
 * Props opcionales:
 *  - onCancel: () => void
 *  - onSaved: (payload) => void
 *  - headerInfo: {
 *       expediente,
 *       trabajador,
 *       empresa,
 *       causaTerminacion,
 *       fechaAudiencia (string o Dayjs)
 *    }
 */
export default function PrimeraAudienciaPrejudicialForm({
  onCancel,
  onSaved,
  headerInfo,
}) {
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const [currentStep, setCurrentStep] = useState(0);
  const { idExpediente } = useParams();
const location = useLocation();
const navigate = useNavigate();

// Ejemplo por defecto (lo conservamos)
const defaultHeader = {
  expediente: "",
  trabajador: "",
  empresa: "",
  causaTerminacion: "",
  fechaAudiencia: "",
};

// Primero props.headerInfo (si algún día lo usas como modal)
// Luego lo que venga del navigate (... state.headerInfo)
// Finalmente, el ejemplo por defecto
const resumenHeader =
  headerInfo ||
  location.state?.headerInfo ||
  defaultHeader;

  // Toolbar mínima pero útil para la narrativa
  const quillModules = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["clean"],
    ],
  };

  const quillFormats = [
    "bold",
    "italic",
    "underline",
    "list",
    "bullet",
    "indent",
    "link",
  ];

  const steps = [
    { key: "1", title: "Objeto de la reclamación" },
    { key: "2", title: "Postura del Patrón" },
    { key: "3", title: "Negociación" },
    { key: "4", title: "Resultado" },
    { key: "5", title: "Riesgos y acciones" },
  ];

  // Para campos condicionales del cuarto paso
  const resultadoValue = Form.useWatch("resultado", form);

  // Campos que se validan por paso
  const stepFieldNames = [
    [
      "resumen_pretensiones_html",
      "monto_estimado_trabajador",
      "prestaciones_reclamadas",
    ], // Paso 0
    ["postura_patron_detalle", "reinstalacion_ofrecida"], // Paso 1
    [], // Paso 2 (todo opcional)
    ["resultado"], // Paso 3
    [], // Paso 4 (riesgos opcionales)
  ];

  const handleNext = async () => {
    const fieldsToValidate = stepFieldNames[currentStep] || [];
    try {
      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }
      setCurrentStep((prev) => prev + 1);
    } catch {
      // AntD ya muestra errores
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const normFile = (e) => {
    if (Array.isArray(e)) return e;
    return e?.fileList || [];
  };

  const handleSave = async () => {
    try {
      // 1) Valida solo los campos del step actual
      await form.validateFields();

      // 2) Trae TODOS los campos de TODOS los steps
      const values = form.getFieldsValue(true);

      // Separo los fileList para no meterlos crudos al payload JSON
      const {
        archivo_convenio,
        archivo_diferimiento,
        archivo_no_conciliacion,
        ...rest
      } = values;

      // ---- NORMALIZAR PRESTACIONES RECLAMADAS (STEP 1) ----
      // El Form.Item devuelve un array con los valores marcados.
      // Lo convertimos a una cadena "indemnizacion,prima_antiguedad,..." para guardar limpio.
      const prestacionesArray = rest.prestaciones_reclamadas || [];
      const prestaciones_reclamadas = Array.isArray(prestacionesArray)
        ? prestacionesArray.join(",")
        : prestacionesArray;

      // 3) Normalizo fechas + meta
      const payload = {
        ...rest,
        prestaciones_reclamadas, // aquí ya va normalizado el checkbox del paso 1
        fecha_pago_convenio: rest.fecha_pago_convenio
          ? dayjs(rest.fecha_pago_convenio).format("YYYY-MM-DD")
          : null,
        fecha_proxima_audiencia: rest.fecha_proxima_audiencia
          ? dayjs(rest.fecha_proxima_audiencia).format("YYYY-MM-DD HH:mm:ss")
          : null,
        meta: {
          expediente: resumenHeader.expediente,
          trabajador: resumenHeader.trabajador,
          empresa: resumenHeader.empresa,
          causaTerminacion: resumenHeader.causaTerminacion,
          fechaAudiencia: resumenHeader.fechaAudiencia
            ? dayjs(resumenHeader.fechaAudiencia).format(
                "YYYY-MM-DD HH:mm:ss"
              )
            : null,
        },
      };

      // 4) Map de archivos reales (originFileObj)
      const filesMap = {
        archivo_convenio: archivo_convenio?.[0]?.originFileObj || null,
        archivo_diferimiento: archivo_diferimiento?.[0]?.originFileObj || null,
        archivo_no_conciliacion:
          archivo_no_conciliacion?.[0]?.originFileObj || null,
      };
 

      // 5) Dispatch a la acción de Redux
      dispatch(
        actionConciliacionPrimeraAudiencia(
          payload,
          idExpediente,
          () => {
            notification.success("Minuta de primera audiencia guardada.");
            onSaved?.(payload);
          },
          filesMap
        )
      );

     
    } catch (err) {
      const errorFields = err?.errorFields || [];
      if (errorFields.length) {
        notification.error("Revisa los campos marcados en rojo.");
        form.scrollToField(errorFields[0].name, { block: "center" });
      } else {
        notification.error("No se pudo guardar la minuta.");
      }
    }
  };

  /* ===================== CONTENIDO POR PASO ===================== */

  const renderStepContent = () => {
    // 1) OBJETO DE LA RECLAMACIÓN
    if (currentStep === 0) {
      return (
        <Card size="small" className="audiencia-inner-card">
          {/* Resumen del expediente tipo cabecera */}
          <Title level={5} style={{ marginBottom: 8 }}>
            Resumen del expediente
          </Title>

          {/* Encabezado tipo ficha, solo lectura */}
          <Row gutter={[16, 8]} style={{ marginBottom: 4 }}>
            <Col xs={24} md={6}>
              <Text type="secondary">Trabajador</Text>
              <div>
                <strong>{resumenHeader.trabajador || "—"}</strong>
              </div>
            </Col>
            <Col xs={24} md={6}>
              <Text type="secondary">Empresa</Text>
              <div>
                <strong>{resumenHeader.empresa || "—"}</strong>
              </div>
            </Col>
            <Col xs={24} md={6}>
              <Text type="secondary">Objeto de la solicitud</Text>
              <div>
                <strong>{resumenHeader.causaTerminacion || "—"}</strong>
              </div>
            </Col>
            <Col xs={24} md={6}>
              <Text type="secondary">Fecha y hora de audiencia</Text>
              <div>
                <strong>
                  {resumenHeader.fechaAudiencia
                    ? dayjs(resumenHeader.fechaAudiencia).format(
                        "DD/MM/YYYY HH:mm"
                      )
                    : "—"}
                </strong>
              </div>
            </Col>
          </Row>

          <div className="audiencia-section-divider" />

          <Title level={5} style={{ marginBottom: 8 }}>
            1. Objeto de la reclamación
          </Title>

          {/* Resumen de pretensiones con editor rico */}
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
                placeholder="Ejemplo: El solicitante Javier López manifestó haber sido despedido injustificadamente..."
                value={form.getFieldValue("resumen_pretensiones_html") || ""}
                onChange={(content) => {
                  form.setFieldsValue({ resumen_pretensiones_html: content });
                }}
              />
            </div>
          </Form.Item>

          {/* Prestaciones reclamadas + monto en la misma fila */}
          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Monto estimado por el trabajador (MXN)"
                name="monto_estimado_trabajador"
                rules={[
                  {
                    required: true,
                    message: "Indica el monto estimado por el trabajador.",
                  },
                ]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={100}
                  placeholder="Ej. 110885.75"
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
  label="Prestaciones reclamadas"
  name="prestaciones_reclamadas"
  rules={[
    {
      required: true,
      message: "Selecciona al menos una prestación reclamada.",
    },
  ]}
>
  <Checkbox.Group>
    <Row gutter={[16, 0]}>
      <Col xs={0} md={4} />
      <Col xs={24} md={20}>
        <Row gutter={[32, 8]}>
          <Col xs={24} md={12}>
            <div className="audiencia-checkbox-column">
              <Checkbox value="indemnizacion">Indemnización</Checkbox>
              <Checkbox value="prima_antiguedad">
                Prima de antigüedad
              </Checkbox>
              <Checkbox value="aguinaldo_prop">
                Aguinaldo proporcional
              </Checkbox>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="audiencia-checkbox-column">
              <Checkbox value="salarios_caidos">Salarios caídos</Checkbox>
              <Checkbox value="vacaciones_prop">
                Vacaciones proporcionales
              </Checkbox>
              <Checkbox value="prima_vacacional">
                Prima vacacional
              </Checkbox>
            </div>
          </Col>
        </Row>
      </Col>
    </Row>
  </Checkbox.Group>
</Form.Item>

            </Col>
          </Row>
        </Card>
      );
    }

    // 2) POSTURA DEL PATRÓN (NUESTRA ESTRATEGIA)
    if (currentStep === 1) {
      return (
        <Card size="small" className="audiencia-inner-card">
          <Title level={5} style={{ marginBottom: 8 }}>
            2. Postura del Patrón (Nuestra Estrategia)
          </Title>

          <Text type="secondary" style={{ fontSize: 13 }}>
            Posición inicial adoptada por la representación patronal durante la
            audiencia.
          </Text>

          <Form.Item
            style={{ marginTop: 8 }}
            label="Detalle de la postura inicial"
            name="postura_patron_detalle"
            rules={[
              {
                required: true,
                message:
                  "Describe brevemente la postura inicial del patrón en la audiencia.",
              },
            ]}
          >
            <div className="audiencia-quill-wrapper">
              <ReactQuill
                theme="snow"
                modules={quillModules}
                formats={quillFormats}
                placeholder='Ej. "Se negó el despido. Se argumentó renuncia voluntaria/terminación por faltas (Art. 47 LFT) / Se reconoció el adeudo únicamente de partes proporcionales."'
                value={form.getFieldValue("postura_patron_detalle") || ""}
                onChange={(content) => {
                  form.setFieldsValue({ postura_patron_detalle: content });
                }}
              />
            </div>
          </Form.Item>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="¿Se ofreció reinstalación?"
                name="reinstalacion_ofrecida"
                rules={[
                  {
                    required: true,
                    message: "Indica si se ofreció o no reinstalación.",
                  },
                ]}
              >
                <Radio.Group>
                  <Radio value="si">Sí</Radio>
                  <Radio value="no">No</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Condiciones (si aplica)"
                name="condiciones_reinstalacion"
              >
                <Input.TextArea
                  rows={3}
                  placeholder='Ej. "Mismo puesto, salario y condiciones."'
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      );
    }

    // 3) NEGOCIACIÓN
    if (currentStep === 2) {
      return (
        <Card size="small" className="audiencia-inner-card">
          <Title level={5} style={{ marginBottom: 8 }}>
            3. Desarrollo de la negociación
          </Title>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Propuesta inicial del trabajador (MXN)"
                name="propuesta_inicial_trabajador"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={100}
                  placeholder="Ej. 165000"
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Propuesta inicial del patrón (MXN)"
                name="propuesta_inicial_patron"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={100}
                  placeholder="Ej. 18500"
                  controls={false}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Contraoferta intermedia del trabajador (MXN)"
                name="contra_trabajador_1"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={100}
                  placeholder="Opcional"
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Mejora del patrón (MXN)"
                name="contra_patron_1"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={100}
                  placeholder="Opcional"
                  controls={false}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Propuesta final del patrón en esta audiencia (MXN)"
                name="propuesta_final_patron"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={100}
                  placeholder="Ej. 30000"
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Intervención del conciliador (comentario breve)"
                name="intervencion_conciliador"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Ej. Sugirió un punto intermedio e invitó a la empresa a mejorar su oferta..."
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      );
    }

    // 4) RESULTADO
    if (currentStep === 3) {
      return (
        <Card size="small" className="audiencia-inner-card">
          <Title level={5} style={{ marginBottom: 8 }}>
            4. Resultado de la audiencia
          </Title>

          <Form.Item
            label="Resultado de la audiencia"
            name="resultado"
            rules={[{ required: true, message: "Selecciona el resultado." }]}
          >
            <Radio.Group>
              <Row gutter={[0, 8]}>
                <Col span={24}>
                  <Radio value="convenio">Convenio</Radio>
                </Col>
                <Col span={24}>
                  <Radio value="no_conciliacion">
                    Constancia de no conciliación
                  </Radio>
                </Col>
                <Col span={24}>
                  <Radio value="diferimiento">
                    Diferimiento / nueva audiencia
                  </Radio>
                </Col>
                <Col span={24}>
                  <Radio value="archivo_solicitante">
                    Archivo por incomparecencia del solicitante
                  </Radio>
                </Col>
                <Col span={24}>
                  <Radio value="archivo_patron">
                    Archivo / constancia por incomparecencia del patrón
                  </Radio>
                </Col>
              </Row>
            </Radio.Group>
          </Form.Item>

          {/* Bloques condicionales según resultado */}

          {resultadoValue === "convenio" && (
            <>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Monto total acordado (MXN)"
                    name="monto_convenio"
                    rules={[
                      {
                        required: true,
                        message: "Indica el monto total del convenio.",
                      },
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      step={100}
                      placeholder="Ej. 55000"
                      controls={false}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Forma de pago"
                    name="forma_pago_convenio"
                    rules={[
                      {
                        required: true,
                        message: "Indica la forma de pago.",
                      },
                    ]}
                  >
                    <Select placeholder="Selecciona la forma de pago">
                      <Option value="efectivo">Efectivo</Option>
                      <Option value="transferencia">Transferencia</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Fecha de pago (si aplica)"
                    name="fecha_pago_convenio"
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                      placeholder="Selecciona fecha"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Pagos parciales */}
              <Form.Item
                label="Pagos parciales (si aplica)"
                style={{ marginTop: 8 }}
              >
                <Form.List name="pagos_convenio">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map((field) => (
                        <Row
                          key={field.key}
                          gutter={[16, 8]}
                          align="middle"
                          style={{ marginBottom: 4 }}
                        >
                          <Col xs={24} md={6}>
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
                              label="Monto (MXN)"
                            >
                              <InputNumber
                                style={{ width: "100%" }}
                                min={0}
                                step={100}
                                placeholder="Ej. 20000"
                                controls={false}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item
                              {...field}
                              name={[field.name, "fecha"]}
                              fieldKey={[field.fieldKey, "fecha"]}
                              rules={[
                                {
                                  required: true,
                                  message: "Fecha requerida.",
                                },
                              ]}
                              label="Fecha"
                            >
                              <DatePicker
                                style={{ width: "100%" }}
                                format="DD/MM/YYYY"
                                placeholder="Selecciona fecha"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={10}>
                            <Form.Item
                              {...field}
                              name={[field.name, "forma_pago"]}
                              fieldKey={[field.fieldKey, "forma_pago"]}
                              rules={[
                                {
                                  required: true,
                                  message: "Forma de pago requerida.",
                                },
                              ]}
                              label="Forma de pago"
                            >
                              <Select placeholder="Selecciona forma de pago">
                                <Option value="efectivo">Efectivo</Option>
                                <Option value="transferencia">
                                  Transferencia
                                </Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={2}>
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              onClick={() => remove(field.name)}
                            />
                          </Col>
                        </Row>
                      ))}
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => add()}
                      >
                        Agregar pago parcial
                      </Button>
                    </>
                  )}
                </Form.List>
              </Form.Item>

              {/* Documento de convenio ratificado */}
              <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Documento de convenio ratificado"
                    name="archivo_convenio"
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                  >
                    <Upload maxCount={1} beforeUpload={() => false}>
                      <Button icon={<UploadOutlined />}>
                        Adjuntar documento
                      </Button>
                    </Upload>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {resultadoValue === "no_conciliacion" && (
            <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Documento de constancia de no conciliación"
                  name="archivo_no_conciliacion"
                  valuePropName="fileList"
                  getValueFromEvent={normFile}
                >
                  <Upload maxCount={1} beforeUpload={() => false}>
                    <Button icon={<UploadOutlined />}>
                      Adjuntar documento
                    </Button>
                  </Upload>
                </Form.Item>
              </Col>
            </Row>
          )}

          {resultadoValue === "diferimiento" && (
            <>
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Motivo del diferimiento"
                    name="motivo_diferimiento"
                    rules={[
                      {
                        required: true,
                        message: "Describe brevemente el motivo.",
                      },
                    ]}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder="Ej. Ambas partes solicitaron tiempo para consultar autorización de monto..."
                    />
                  </Form.Item>
                </Col>
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
                    <DatePicker
                      showTime
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY HH:mm"
                      placeholder="Selecciona fecha y hora"
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Solo documento de diferimiento, sin prestaciones reclamadas */}
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Documento de diferimiento (si existe)"
                    name="archivo_diferimiento"
                    valuePropName="fileList"
                    getValueFromEvent={normFile}
                  >
                    <Upload maxCount={1} beforeUpload={() => false}>
                      <Button icon={<UploadOutlined />}>
                        Adjuntar documento
                      </Button>
                    </Upload>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {(resultadoValue === "archivo_solicitante" ||
            resultadoValue === "archivo_patron") && (
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
          )}

          {/* Motivo y fundamento para cualquier resultado */}
          {resultadoValue && (
            <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Motivo del resultado"
                  name="motivo_resultado"
                  rules={[
                    {
                      required: true,
                      message: "Indica el motivo del resultado.",
                    },
                  ]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Ej. No hubo posibilidad de acuerdo por la diferencia entre las posturas de las partes..."
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Fundamento (artículos, criterios, etc.)"
                  name="fundamento_resultado"
                  rules={[
                    {
                      required: true,
                      message: "Indica el fundamento jurídico o criterio.",
                    },
                  ]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Ej. Art. 33, 47, 48 LFT; criterios internos del despacho..."
                  />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Card>
      );
    }

    // 5) RIESGOS Y ACCIONES
    return (
      <Card size="small" className="audiencia-inner-card">
        <Title level={5} style={{ marginBottom: 8 }}>
          5. Riesgos y acciones inmediatas
        </Title>

        <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
          <Col xs={24} md={12}>
            <Form.Item label="Riesgos detectados" name="riesgos_detectados">
              <Input.TextArea
                rows={4}
                placeholder="Ej. El trabajador se mostró inflexible; mencionó tener testigos; el conciliador advirtió sobre salarios caídos..."
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Acciones inmediatas recomendadas"
              name="acciones_recomendadas"
            >
              <Input.TextArea
                rows={4}
                placeholder="Ej. Informar al cliente el riesgo procesal; recabar controles de asistencia; preparar contestación de demanda..."
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    );
  };

  /* ===================== RENDER PRINCIPAL ===================== */

  return (
    <>
      <div className="audiencia-form-wrapper">
        {/* Header */}
        <div className="audiencia-form-header">
          <div className="audiencia-form-header-left">
            <div className="audiencia-form-title">
              PRIMERA AUDIENCIA PREJUDICIAL · MINUTA INTERNA
            </div>
            <div className="audiencia-form-subtitle">
              Expediente {resumenHeader.expediente} · Centro de Conciliación
              Laboral
            </div>
          </div>

          <div className="audiencia-form-header-right">
            <Button
  icon={<ArrowLeftOutlined />}
  onClick={() => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  }}
  className="audiencia-btn-cancel"
>
  Volver
</Button>

            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
            >
              Guardar minuta
            </Button>
          </div>
        </div>

        {/* Card principal */}
        <div className="audiencia-form-card">
          <Steps
            current={currentStep}
            items={steps}
            className="audiencia-steps"
          />

          <Form
            form={form}
            layout="vertical"
            className="audiencia-ant-form"
            initialValues={{
              resumen_pretensiones_html: "",
              postura_patron_detalle: "",
            }}
          >
            <div className="audiencia-step-content">{renderStepContent()}</div>

            <div className="audiencia-step-actions">
              <div>
                {currentStep > 0 && (
                  <Button onClick={handlePrev}>Anterior</Button>
                )}
              </div>
              <div>
                {currentStep < steps.length - 1 && (
                  <Button type="primary" onClick={handleNext}>
                    Siguiente
                  </Button>
                )}
                {currentStep === steps.length - 1 && (
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    style={{ marginLeft: 8 }}
                  >
                    Guardar minuta
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </div>
      </div>

      {/* Estilos embebidos para mantener consistencia visual */}
      <style>
        {`
.audiencia-form-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px 40px;
}

.audiencia-form-header {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.audiencia-form-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.audiencia-form-title {
  font-size: 18px;
  font-weight: 600;
  color: #0b1324;
}

.audiencia-form-subtitle {
  font-size: 13px;
  color: #8c8c8c;
}

.audiencia-form-header-right {
  display: flex;
  gap: 8px;
}

.audiencia-btn-cancel {
  background: #ffffff;
}

.audiencia-form-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px 24px 28px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.audiencia-steps {
  margin-bottom: 20px;
}

.audiencia-ant-form .ant-form-item {
  margin-bottom: 12px;
}

.audiencia-ant-form .ant-form-item-label > label {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
}

/* Card interna tipo ficha blanca */
.audiencia-inner-card {
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}

/* Separador sutil entre cabecera y cuerpo en paso 1 */
.audiencia-section-divider {
  border-top: 1px solid #e5e7eb;
  margin: 12px 0 16px;
}

/* Contenedor del editor */
.audiencia-quill-wrapper .ql-toolbar {
  border-radius: 6px 6px 0 0;
  border-color: #e5e7eb;
}

.audiencia-quill-wrapper .ql-container {
  border-radius: 0 0 6px 6px;
  border-color: #e5e7eb;
  min-height: 180px;
  font-size: 13px;
  background: #ffffff;
}

.audiencia-quill-wrapper .ql-editor {
  min-height: 150px;
}

/* Checkbox columns */
.audiencia-checkbox-column {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Layout pasos */
.audiencia-step-content {
  margin-top: 8px;
}

.audiencia-step-actions {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Responsivo */
@media (max-width: 992px) {
  .audiencia-form-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .audiencia-form-header-right {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .audiencia-form-card {
    padding: 20px 16px 24px;
  }
}
        `}
      </style>
    </>
  );
}
