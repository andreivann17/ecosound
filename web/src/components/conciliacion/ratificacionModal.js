// src/components/expedientes/modals/RatificacionModal.jsx
import React, { useMemo, useEffect, useState } from "react";
import {
  Modal,
  Tabs,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Upload,
  Row,
  Col,
  Divider,
  Typography,
  Space,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";

const { TextArea } = Input;
const { Text, Title } = Typography;
const { Option } = Select;

export default function RatificacionModal({ open, onCancel, onSubmit, initialValues = {} }) {
  const [form] = Form.useForm();
  const [activeKey, setActiveKey] = useState("I");

  const normFile = (e) => (Array.isArray(e) ? e : e?.fileList);
  const init = useMemo(() => initialValues, [initialValues]);
const perc_vacaciones       = Form.useWatch("perc_vacaciones", form) || 0;
const perc_prima_vacacional = Form.useWatch("perc_prima_vacacional", form) || 0;
const perc_aguinaldo        = Form.useWatch("perc_aguinaldo", form) || 0;
const perc_salarios_dev     = Form.useWatch("perc_salarios_dev", form) || 0;
const perc_otro_monto       = Form.useWatch("perc_otro_monto", form) || 0;

const ded_vacaciones        = Form.useWatch("ded_vacaciones", form) || 0;
const ded_prima_vacacional  = Form.useWatch("ded_prima_vacacional", form) || 0;
const ded_aguinaldo         = Form.useWatch("ded_aguinaldo", form) || 0;
const ded_salarios_dev      = Form.useWatch("ded_salarios_dev", form) || 0;
const ded_otro_monto        = Form.useWatch("ded_otro_monto", form) || 0;



useEffect(() => {
  const toNum = (v) => Number(v) || 0;

  const totalPerc =
    toNum(perc_vacaciones) +
    toNum(perc_prima_vacacional) +
    toNum(perc_aguinaldo) +
    toNum(perc_salarios_dev) +
    toNum(perc_otro_monto);

  const totalDed =
    toNum(ded_vacaciones) +
    toNum(ded_prima_vacacional) +
    toNum(ded_aguinaldo) +
    toNum(ded_salarios_dev) +
    toNum(ded_otro_monto);

  form.setFieldsValue({
    total_percepciones: Number(totalPerc.toFixed(2)),
    total_deducciones : Number(totalDed.toFixed(2)),
  });
}, [
  perc_vacaciones,
  perc_prima_vacacional,
  perc_aguinaldo,
  perc_salarios_dev,
  perc_otro_monto,
  ded_vacaciones,
  ded_prima_vacacional,
  ded_aguinaldo,
  ded_salarios_dev,
  ded_otro_monto,
  form,
]);

  // ===== submit (OK del modal)
  const handleOk = async () => {
    const v = await form.validateFields();
    const payload = {
      trabajador: {
        nombre: v.trabajador_nombre?.trim(),
        identificacion: v.trabajador_identificacion?.trim(),
        puesto: v.trabajador_puesto?.trim(),
        fecha_ingreso: v.trabajador_fecha_ingreso?.toISOString?.(),
        fecha_terminacion: v.trabajador_fecha_terminacion?.toISOString?.(),
        salario_diario: v.trabajador_salario_diario,
        jornada_dias: v.trabajador_jornada_dias?.trim(),
        horario_trabajo: v.trabajador_horario?.trim(),
        horario_comida: v.trabajador_horario_comida?.trim(),
        dias_descanso: v.trabajador_dias_descanso?.trim(),
      },
      patron: {
        razon_social: v.patron_razon_social?.trim(),
        rfc: v.patron_rfc?.trim(),
        domicilio_centro_trabajo: v.patron_domicilio?.trim(),
        representante_legal: v.patron_representante?.trim(),
        representante_identificacion: v.patron_rep_identificacion?.trim(),
        id_representante_files: (v.doc_identificacion_rep || []).map((f) => f.originFileObj || f),
        poder_representacion_files: (v.doc_poder_rep || []).map((f) => f.originFileObj || f),
      },
      acuerdo: {
        monto_total_num: v.acuerdo_monto_total_num,
        monto_total_letra: v.acuerdo_monto_total_letra?.trim(),
        forma_pago: v.acuerdo_forma_pago,
        fecha_pago: v.acuerdo_fecha_pago?.toISOString?.(),
        desglose_texto: v.acuerdo_desglose?.trim(),
        percepciones: {
          vacaciones: v.perc_vacaciones,
          prima_vacacional: v.perc_prima_vacacional,
          aguinaldo: v.perc_aguinaldo,
          salarios_devengados: v.perc_salarios_dev,
          otro_concepto: v.perc_otro_motivo?.trim(),
          otro_monto: v.perc_otro_monto,
          total: v.total_percepciones,
        },
        deducciones: {
          vacaciones: v.ded_vacaciones,
          prima_vacacional: v.ded_prima_vacacional,
          aguinaldo: v.ded_aguinaldo,
          salarios_devengados: v.ded_salarios_dev,
          otro_concepto: v.ded_otro_motivo?.trim(),
          otro_monto: v.ded_otro_monto,
          total: v.total_deducciones,
        },
      },
      conclusion: {
        poder_notarial_files: (v.doc_poder_notarial || []).map((f) => f.originFileObj || f),
      },
      quien_elabora: {
        nombre: v.qe_nombre?.trim(),
        puesto: v.qe_puesto?.trim(),
        contacto: v.qe_contacto?.trim(),
        fecha_elaboracion: v.qe_fecha?.toISOString?.(),
      },
    };
    onSubmit?.(payload);
    form.resetFields();
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel?.();
  };

  const DocBlock = ({ label, name, required = true }) => (
    <Form.Item
      name={name}
      label={label}
      valuePropName="fileList"
      getValueFromEvent={normFile}
      rules={required ? [{ required: true, message: "Documento requerido" }] : []}
    >
      <Upload.Dragger beforeUpload={() => false} multiple={false} accept=".pdf,.jpg,.jpeg,.png" maxCount={1}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Arrastra o haz clic para subir</p>
        <p className="ant-upload-hint">PDF / JPG / PNG (máx. 25 MB)</p>
      </Upload.Dragger>
    </Form.Item>
  );

  // ===== Tabs
  const tabTrabajador = (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Row gutter={12}>
        <Col span={16}>
          <Form.Item name="trabajador_nombre" label="Nombre completo" rules={[{ required: true }]}>
            <Input placeholder="Nombre(s) Apellidos" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="trabajador_identificacion"
            label="Identificación oficial (tipo y número)"
            rules={[{ required: true }]}
          >
            <Input placeholder="INE / Pasaporte / Licencia — Nº" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={10}>
          <Form.Item name="trabajador_puesto" label="Puesto desempeñado" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={7}>
          <Form.Item name="trabajador_fecha_ingreso" label="Fecha de ingreso" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={7}>
          <Form.Item
            name="trabajador_fecha_terminacion"
            label="Fecha de terminación de la relación laboral"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={6}>
          <Form.Item name="trabajador_salario_diario" label="Salario diario" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="trabajador_jornada_dias" label="Jornada laboral (días)" rules={[{ required: true }]}>
            <Input placeholder="Lunes a sábado / Lunes a viernes" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="trabajador_horario" label="Horario de trabajo" rules={[{ required: true }]}>
            <Input placeholder="08:00 - 17:00" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="trabajador_horario_comida" label="Horario de comida (opcional)">
            <Input placeholder="13:00 - 14:00" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="trabajador_dias_descanso" label="Días de descanso" rules={[{ required: true }]}>
            <Input placeholder="Domingo / Sábado y Domingo" />
          </Form.Item>
        </Col>
      </Row>
    </Space>
  );

  const tabPatron = (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item name="patron_razon_social" label="Razón social" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="patron_rfc" label="RFC" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="patron_representante" label="Representante legal" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={16}>
          <Form.Item name="patron_domicilio" label="Domicilio del centro de trabajo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="patron_rep_identificacion"
            label="Identificación del representante (tipo y número)"
            rules={[{ required: true }]}
          >
            <Input placeholder="INE / Pasaporte — Nº" />
          </Form.Item>
        </Col>
      </Row>

      <Divider plain>Documentos obligatorios</Divider>
      <Text type="secondary">
        Formatos permitidos: <b>PDF/JPG/PNG</b> (máx. 25 MB).
      </Text>

      <DocBlock label="Identificación oficial del representante legal (adjuntar)" name="doc_identificacion_rep" />
      <DocBlock label="Documento que acredita la representación legal (poder notarial, adjuntar)" name="doc_poder_rep" />
    </Space>
  );

  const tabAcuerdo = (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="acuerdo_monto_total_num" label="Monto total del finiquito (número)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={16}>
          <Form.Item name="acuerdo_monto_total_letra" label="Monto total del finiquito (letra)" rules={[{ required: true }]}>
            <Input placeholder="Veinte mil pesos 00/100 M.N." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="acuerdo_forma_pago" label="Forma de pago" rules={[{ required: true }]}>
            <Select placeholder="Selecciona">
              <Option value="CHEQUE">Cheque</Option>
              <Option value="TRANSFERENCIA">Transferencia</Option>
              <Option value="EFECTIVO">Efectivo</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="acuerdo_fecha_pago" label="Fecha y momento del pago" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="acuerdo_desglose" label="Desglose del finiquito (texto libre)">
            <TextArea rows={1} placeholder="Parte proporcional, gratificación, etc." />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Title level={5} style={{ marginTop: 4 }}>PERCEPCIONES</Title>
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <Form.Item name="perc_vacaciones" label="Vacaciones"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="perc_prima_vacacional" label="Prima vacacional"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="perc_aguinaldo" label="Aguinaldo"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="perc_salarios_dev" label="Salarios devengados no pagados"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Row gutter={8}>
              <Col span={14}><Form.Item name="perc_otro_motivo" label="Otro concepto"><Input placeholder="Gratificación / Prima antigüedad" /></Form.Item></Col>
              <Col span={10}><Form.Item name="perc_otro_monto" label="Monto"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
            </Row>
            <Divider style={{ margin: "8px 0" }} />
            <Form.Item name="total_percepciones" label="Total"><InputNumber min={0} precision={2} style={{ width: "100%" }} readOnly /></Form.Item>
          </div>
        </Col>

        <Col span={12}>
          <Title level={5} style={{ marginTop: 4 }}>DEDUCCIONES</Title>
          <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <Form.Item name="ded_vacaciones" label="Vacaciones"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="ded_prima_vacacional" label="Prima vacacional"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="ded_aguinaldo" label="Aguinaldo"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="ded_salarios_dev" label="Salarios devengados no pagados"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item>
            <Row gutter={8}>
              <Col span={14}><Form.Item name="ded_otro_motivo" label="Otro concepto"><Input placeholder="Descuentos / adeudos" /></Form.Item></Col>
              <Col span={10}><Form.Item name="ded_otro_monto" label="Monto"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
            </Row>
            <Divider style={{ margin: "8px 0" }} />
            <Form.Item name="total_deducciones" label="Total"><InputNumber min={0} precision={2} style={{ width: "100%" }} readOnly /></Form.Item>
          </div>
        </Col>
      </Row>
    </Space>
  );

  const tabConclusion = (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Text>
        Para celebrar la ratificación del convenio ante la autoridad laboral, es indispensable
        adjuntar copia simple del <b>poder notarial</b> donde conste que el apoderado cuenta con
        facultades suficientes para pleitos y cobranzas y/o actos de administración, autorizándolo
        para suscribir convenios laborales a nombre de la empresa.
      </Text>

      <Divider plain>Adjuntar documento</Divider>
      <DocBlock label="Poder notarial" name="doc_poder_notarial" />
    </Space>
  );

  const tabQuienElaboro = (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Row gutter={12}>
        <Col span={10}>
          <Form.Item name="qe_nombre" label="Nombre completo" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="qe_puesto" label="Puesto" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="qe_contacto" label="Datos de contacto" rules={[{ required: true }]}>
            <Input placeholder="Teléfono y/o correo" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item name="qe_fecha" label="Fecha de elaboración" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
    </Space>
  );

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      okText="Guardar"
      cancelText="Cerrar"
      title="Ratificación de Convenio"
      destroyOnClose
      width={980}
      bodyStyle={{ maxHeight: "72vh", overflow: "auto", paddingBottom: 8 }}
    >
      <Form form={form} layout="vertical" requiredMark="optional" initialValues={init}>
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={[
            { key: "I", label: "I. Trabajador", children: tabTrabajador },
            { key: "II", label: "II. Patrón y Documentos", children: tabPatron },
            { key: "III", label: "III. Acuerdo / Finiquito", children: tabAcuerdo },
            { key: "IV", label: "IV. Conclusión", children: tabConclusion },
            { key: "V", label: "V. Quién elaboró", children: tabQuienElaboro },
          ]}
        />
        {/* Sin botones dentro: solo los del footer del Modal */}
      </Form>
    </Modal>
  );
}
