import React, { useMemo } from "react";
import {
  Modal,
  Tabs,
  Form,
  Input,
  DatePicker,
  Row,
  Col,
  Radio,
  InputNumber,
  Upload,
  Typography,
  Space,
  Divider,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text } = Typography;

/* ---- Helpers reutilizables ---- */
const YesNo = ({ name, label, required = true, extra }) => (
  <Form.Item
    name={name}
    label={label}
    rules={required ? [{ required: true, message: "Requerido" }] : []}
    extra={extra}
  >
    <Radio.Group>
      <Radio value="SI">Sí</Radio>
      <Radio value="NO">No</Radio>
    </Radio.Group>
  </Form.Item>
);

const Money = ({ name, label, required = false }) => (
  <Form.Item
    name={name}
    label={label}
    rules={required ? [{ required: true, message: "Requerido" }] : []}
  >
    <InputNumber min={0} precision={2} style={{ width: "100%" }} />
  </Form.Item>
);

const UploadOnce = ({ name, label, required = false }) => (
  <Form.Item
    name={name}
    label={label}
    valuePropName="fileList"
    getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
    rules={required ? [{ required: true, message: "Adjunto requerido" }] : []}
  >
    <Upload.Dragger beforeUpload={() => false} accept=".pdf,.jpg,.jpeg,.png" maxCount={1}>
      <p className="ant-upload-drag-icon"><InboxOutlined /></p>
      <p className="ant-upload-text">Arrastra o haz clic para subir</p>
      <p className="ant-upload-hint">PDF / JPG / PNG (máx. 25 MB)</p>
    </Upload.Dragger>
  </Form.Item>
);

/* ---- Componente principal ---- */
export default function NoConciliacionModal({
  open,
  onCancel,
  onSubmit,
  initialValues = {},
  title = "No Conciliación • Check-list de Demanda",
}) {
  const [form] = Form.useForm();
  const init = useMemo(() => initialValues, [initialValues]);

  const pickFiles = (arr) => (arr || []).map((f) => f.originFileObj || f);

  const handleOk = async () => {
    const v = await form.validateFields();

    const payload = {
      generales_y_laborales: {
        citatorio_por: v.citatorio_por?.trim(),
        num_expediente: v.num_expediente?.trim(),
        fecha_notificacion: v.fecha_notificacion?.toISOString?.(),
        patron_nombre: v.patron_nombre?.trim(),
        fecha_ingreso: v.fecha_ingreso?.toISOString?.(),
        ultimo_dia_laborado: v.ultimo_dia_laborado?.toISOString?.(),
        baja_imss: v.baja_imss,
        baja_imss_fecha: v.baja_imss_fecha?.toISOString?.(),
        motivo_baja: v.motivo_baja?.trim(),
        puesto: v.puesto?.trim(),
        ultimo_puesto: v.ultimo_puesto?.trim(),
        salario_diario: v.salario_diario,
        salario_integrado: v.salario_integrado,
        salario_conceptos: v.salario_conceptos?.trim(),
        domicilio_ultimo_ct: v.domicilio_ultimo_ct?.trim(),
        tipo_nomina: v.tipo_nomina,
        ultima_nomina_firmada: v.ultima_nomina_firmada?.trim(),
      },
      pagos: {
        forma_pago: v.forma_pago,
        pension_alimenticia: v.pension_alimenticia,
        pension_porcentaje: v.pension_porcentaje,
        fondo_ahorro: v.fondo_ahorro,
        fondo_ahorro_cantidad: v.fondo_ahorro_cantidad,
        infonavit: v.infonavit,
        infonavit_cantidad: v.infonavit_cantidad,
        dias_labor: v.dias_labor?.trim(),
        dia_descanso: v.dia_descanso?.trim(),
        horario: v.horario?.trim(),
        horas_comida: v.horas_comida,
        disfruto_vacaciones: v.disfruto_vacaciones,
        prima_vacacional_pagada: v.prima_vacacional_pagada,
        prima_vacacional_fecha: v.prima_vacacional_fecha?.toISOString?.(),
        prima_vacacional_monto: v.prima_vacacional_monto,
        prima_vacacional_comprobante: pickFiles(v.prima_vacacional_comprobante),
        aguinaldo_pagado: v.aguinaldo_pagado,
        aguinaldo_monto: v.aguinaldo_monto,
        aguinaldo_comprobante: pickFiles(v.aguinaldo_comprobante),
        utilidades_adeudo: v.utilidades_adeudo,
        utilidades_monto: v.utilidades_monto,
        fondo_ahorro_pagado: v.fondo_ahorro_pagado,
        fondo_ahorro_monto: v.fondo_ahorro_monto,
        fondo_ahorro_comprobante: pickFiles(v.fondo_ahorro_comprobante),
        finiquito_firmo_recibo: v.finiquito_firmo_recibo,
        finiquito_monto_recibo: v.finiquito_monto_recibo,
        finiquito_firmado_escrito: v.finiquito_firmado_escrito,
        finiquito_firmado_escrito_tipo: v.finiquito_firmado_escrito_tipo,
        dias_pendientes_cobro: v.dias_pendientes_cobro,
        dias_pendientes_monto: v.dias_pendientes_monto,
      },
      adeudos_renuncias: {
        pagare: v.pagare,
        pagare_monto: v.pagare_monto,
        cargos_pendientes: v.cargos_pendientes,
        cargos_pendientes_monto: v.cargos_pendientes_monto,
        firmo_carta_renuncia: v.firmo_carta_renuncia,
        renuncia_escrita: v.renuncia_escrita,
        renuncia_escrita_tipo: v.renuncia_escrita_tipo,
      },
      especiales: {
        embarazo: v.embarazo,
        embarazo_meses: v.embarazo_meses,
        incapacidad: v.incapacidad,
        incapacidad_desde: v.incapacidad_desde?.toISOString?.(),
        abandono_trabajo: v.abandono_trabajo,
        ultimo_dia_por_abandono: v.ultimo_dia_por_abandono?.toISOString?.(),
        motivo_real_termino: v.motivo_real_termino?.trim(),
      },
      testigos_contacto: {
        testigos: v.testigos?.trim(),
        comentario: v.comentario?.trim(),
        contacto_nombre: v.contacto_nombre?.trim(),
        contacto_telefono: v.contacto_telefono?.trim(),
        contacto_correo: v.contacto_correo?.trim(),
      },
    };

    onSubmit?.(payload);
    form.resetFields();
  };

  /* ---------- Tabs ---------- */

  // TAB 1 combinado: Generales + Datos Laborales
  const TabGeneralesLaborales = (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      <Divider plain>Datos Generales del Asunto</Divider>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="citatorio_por"
            label="Citatorio o demanda interpuesta por"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="num_expediente"
            label="Número de expediente"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="fecha_notificacion"
            label="Fecha de notificación"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Divider plain>Datos Laborales</Divider>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            name="patron_nombre"
            label="Nombre del patrón del trabajador"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="fecha_ingreso" label="Fecha de ingreso" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item
            name="ultimo_dia_laborado"
            label="Último día laborado"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <YesNo name="baja_imss" label="¿Fue dado de baja en IMSS?" />
        </Col>
        <Col span={8}>
          <Form.Item name="baja_imss_fecha" label="¿En qué fecha?">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="motivo_baja" label="Motivo de baja">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="puesto" label="Puesto desempeñado" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="ultimo_puesto" label="Último puesto desempeñado">
            <Input />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Money name="salario_diario" label="Salario diario" required />
        </Col>
        <Col span={4}>
          <Money name="salario_integrado" label="Salario integrado" />
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={24}>
          <Form.Item
            name="salario_conceptos"
            label="Conceptos que integran el salario (bonos, premios, etc.)"
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={24}>
          <Form.Item
            name="domicilio_ultimo_ct"
            label="Domicilio del último centro de trabajo"
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={10}>
          <Form.Item name="tipo_nomina" label="Tipo de nómina" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="SEMANAL">Empleado Semanal</Radio>
              <Radio value="QUINCENAL">Quincenal</Radio>
              <Radio value="MENSUAL">Mensual</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={14}>
          <Form.Item name="ultima_nomina_firmada" label="Última nómina firmada">
            <Input />
          </Form.Item>
        </Col>
      </Row>
    </Space>
  );

  // TAB 2 (antes 3): Pagos / Beneficios
  const TabPagos = (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="forma_pago" label="Forma de pago" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="EFECTIVO">Efectivo</Radio>
              <Radio value="DEPOSITO">Depósito bancario</Radio>
              <Radio value="CHEQUE">Cheque</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="pension_alimenticia" label="¿Tiene descuento por pensión alimenticia?">
            <Radio.Group>
              <Radio value="SI">Sí</Radio>
              <Radio value="NO">No</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="pension_porcentaje" label="Porcentaje (si aplica)">
            <InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="fondo_ahorro" label="¿Cuenta con fondo de ahorro?">
            <Radio.Group>
              <Radio value="SI">Sí</Radio>
              <Radio value="NO">No</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Money name="fondo_ahorro_cantidad" label="Fondo de ahorro (cantidad)" /></Col>
        <Col span={8}>
          <Form.Item name="infonavit" label="¿Tiene crédito INFONAVIT?">
            <Radio.Group>
              <Radio value="SI">Sí</Radio>
              <Radio value="NO">No</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}><Money name="infonavit_cantidad" label="INFONAVIT (cantidad)" /></Col>
        <Col span={8}><Form.Item name="dias_labor" label="Días de labores por semana"><Input placeholder="Lunes a Sábado" /></Form.Item></Col>
        <Col span={8}><Form.Item name="dia_descanso" label="Día de descanso"><Input placeholder="Domingo" /></Form.Item></Col>
      </Row>

      <Row gutter={12}>
        <Col span={12}><Form.Item name="horario" label="Horario de trabajo"><Input placeholder="08:00 - 17:00" /></Form.Item></Col>
        <Col span={12}><Form.Item name="horas_comida" label="Horas para comer"><InputNumber min={0} precision={1} style={{ width: "100%" }} /></Form.Item></Col>
      </Row>

      <Divider />

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="disfruto_vacaciones" label="¿Disfrutó vacaciones (último año)?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="prima_vacacional_pagada" label="¿Se pagó prima vacacional?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="prima_vacacional_fecha" label="Fecha de pago (si aplica)">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}><Money name="prima_vacacional_monto" label="Monto prima vacacional" /></Col>
        <Col span={16}><UploadOnce name="prima_vacacional_comprobante" label="Comprobante firmado (prima vacacional)" /></Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="aguinaldo_pagado" label="¿Se pagó aguinaldo?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Money name="aguinaldo_monto" label="Monto aguinaldo" /></Col>
        <Col span={8}><UploadOnce name="aguinaldo_comprobante" label="Comprobante firmado (aguinaldo)" /></Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="utilidades_adeudo" label="¿Se adeudan utilidades del año anterior?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Money name="utilidades_monto" label="Monto utilidades (si aplica)" /></Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="fondo_ahorro_pagado" label="¿Se pagó fondo de ahorro?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Money name="fondo_ahorro_monto" label="Monto fondo de ahorro" /></Col>
        <Col span={8}><UploadOnce name="fondo_ahorro_comprobante" label="Comprobante firmado (fondo de ahorro)" /></Col>
      </Row>

      <Divider />

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="finiquito_firmo_recibo" label="¿Firmó recibo de finiquito?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Money name="finiquito_monto_recibo" label="Monto (recibo de finiquito)" /></Col>
        <Col span={8}>
          <Form.Item name="finiquito_firmado_escrito" label="¿Finiquito firmado por escrito?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}><Form.Item name="finiquito_firmado_escrito_tipo" label="Original/Copia"><Input /></Form.Item></Col>
        <Col span={8}><Form.Item name="dias_pendientes_cobro" label="¿Días pendientes por cobrar?">
          <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
        </Form.Item></Col>
        <Col span={8}><Money name="dias_pendientes_monto" label="Monto (días pendientes)" /></Col>
      </Row>
    </Space>
  );

  // TAB 3 (antes 4): Adeudos y Renuncias
  const TabAdeudosRenuncias = (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="pagare" label="¿Tiene pagaré firmado?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Money name="pagare_monto" label="Monto pagaré" /></Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="cargos_pendientes" label="¿Cargos pendientes por pagar?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Money name="cargos_pendientes_monto" label="Monto cargos" /></Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="firmo_carta_renuncia" label="¿Firmó carta de renuncia?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="renuncia_escrita" label="¿Renuncia por escrito firmada?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Form.Item name="renuncia_escrita_tipo" label="Original/Copia"><Input /></Form.Item></Col>
      </Row>
    </Space>
  );

  // TAB 4 (antes 5): Situaciones especiales
  const TabEspeciales = (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="embarazo" label="¿La empleada está embarazada?">
            <Radio.Group>
              <Radio value="SI">Sí</Radio>
              <Radio value="NO">No</Radio>
              <Radio value="NA">N/A</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Form.Item name="embarazo_meses" label="Meses (si aplica)"><InputNumber min={0} max={10} style={{ width: "100%" }} /></Form.Item></Col>
        <Col span={8}>
          <Form.Item name="incapacidad" label="¿Tiene incapacidad?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}><Form.Item name="incapacidad_desde" label="Desde qué fecha"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
        <Col span={8}>
          <Form.Item name="abandono_trabajo" label="¿Abandonó el trabajo?">
            <Radio.Group><Radio value="SI">Sí</Radio><Radio value="NO">No</Radio></Radio.Group>
          </Form.Item>
        </Col>
        <Col span={8}><Form.Item name="ultimo_dia_por_abandono" label="Último día (abandono)"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
      </Row>

      <Form.Item
        name="motivo_real_termino"
        label="Motivo real por el que ya no labora"
        rules={[{ required: true }]}
      >
        <TextArea rows={3} />
      </Form.Item>
    </Space>
  );

  // TAB 5 (antes 6): Testigos y contacto
  const TabTestigosContacto = (
    <Space direction="vertical" style={{ width: "100%" }} size={8}>
      <Form.Item
        name="testigos"
        label="Nombre y domicilio de tres testigos (No jefes, dueños o gerentes)"
        extra="Un testigo por línea."
      >
        <TextArea rows={4} />
      </Form.Item>

      <Form.Item name="comentario" label="Comentario adicional">
        <TextArea rows={3} />
      </Form.Item>

      <Divider plain>Persona de contacto para más información / documentos</Divider>
      <Row gutter={12}>
        <Col span={8}><Form.Item name="contacto_nombre" label="Nombre" rules={[{ required: true }]}><Input /></Form.Item></Col>
        <Col span={8}><Form.Item name="contacto_telefono" label="Teléfono" rules={[{ required: true }]}><Input /></Form.Item></Col>
        <Col span={8}><Form.Item name="contacto_correo" label="Correo electrónico" rules={[{ type: "email", required: true }]}><Input /></Form.Item></Col>
      </Row>

      <Text type="secondary">
        Para casos de demanda, los documentos que se mencionan como disponibles en físico deberán ser entregados al despacho.
      </Text>
    </Space>
  );

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); onCancel?.(); }}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cerrar"
      title={title}
      destroyOnClose
      width={1000}
      bodyStyle={{ maxHeight: "75vh", overflow: "auto", paddingBottom: 8 }}
    >
      <Form form={form} layout="vertical" initialValues={init} requiredMark="optional">
        <Tabs
          defaultActiveKey="genlab"
          items={[
            { key: "genlab", label: "1) Generales y Datos laborales", children: TabGeneralesLaborales },
            { key: "pagos", label: "2) Pagos / Beneficios", children: TabPagos },
            { key: "adeudos", label: "3) Adeudos y renuncias", children: TabAdeudosRenuncias },
            { key: "especiales", label: "4) Situaciones especiales", children: TabEspeciales },
            { key: "testigos", label: "5) Testigos y contacto", children: TabTestigosContacto },
          ]}
        />
      </Form>
    </Modal>
  );
}
