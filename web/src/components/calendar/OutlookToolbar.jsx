import React, { useMemo, useState, useEffect } from "react";
import { Button, Dropdown, Space, Typography, Segmented, Checkbox, DatePicker } from "antd";
import { LeftOutlined, RightOutlined, FilterOutlined, DownOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

export default function OutlookToolbar({
  view,
  setView,
  rangeLabel,
  cursorDate,
  onPickMonthYear,
  onToday,
  onPrev,
  onNext,
  filters,
  setFilters,
  onCreateEvent,
}) {
  const [editingMonth, setEditingMonth] = useState(false);

  useEffect(() => {
    setEditingMonth(false);
  }, [view]);

  const filterItems = useMemo(() => {
    const mk = (key, label) => ({
      key,
      label: (
        <div className="ol-filterRow">
          <Checkbox
            checked={filters[key]}
            onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.checked }))}
          >
            {label}
          </Checkbox>
        </div>
      ),
    });

    return [
      mk("citas", "Citas"),
      mk("reuniones", "Reuniones"),
      mk("sondeos", "Sondeos en espera"),
      mk("categorias", "Categorías"),
      mk("mostrarComo", "Mostrar como"),
      mk("periodicidad", "Periodicidad"),
      mk("enPersona", "En persona"),
    ];
  }, [filters, setFilters]);

  const monthValue = dayjs(cursorDate);

  return (
    <div className="ol-toolbarShell">
      <div className="ol-toolbar ol-toolbarElevated">
        {/* IZQUIERDA: Crear + Hoy + arrows + rango */}
        <div className="ol-toolbarLeft">
          <Space size={10} wrap={false}>
            <Button
              type="primary"
         
              className="ol-createBtn"
              onClick={onCreateEvent}
            >
              <i className="fas fa-calendar marginr-1"></i>
              Nuevo Evento
            </Button>

            <Button onClick={onToday}>Hoy</Button>
            <Button icon={<LeftOutlined />} onClick={onPrev} />
            <Button icon={<RightOutlined />} onClick={onNext} />

            <div className="ol-rangeWrap ol-rangeFixed">
  {!editingMonth ? (
    <Text
      className="ol-rangeLabel ol-rangeClickable"
      onClick={() => setEditingMonth(true)}
      title="Cambiar mes/año"
    >
      {rangeLabel}
    </Text>
  ) : (
    <DatePicker
      picker="month"
      allowClear={false}
      value={monthValue}
      className="ol-monthPickerInline"
      onChange={(v) => {
        if (!v) return;
        onPickMonthYear(v);
        setEditingMonth(false);
      }}
      onOpenChange={(open) => {
        if (!open) setEditingMonth(false);
      }}
      autoFocus
    />
  )}
</div>

          </Space>
        </div>

        {/* CENTRO: Tabs + Filtrar pegado a los tabs */}
        <div className="ol-toolbarCenter">
          <Space size={10} align="center">
            <Segmented
              value={view}
              onChange={setView}
              className="ol-viewTabs"
              options={[
                { label: "Día", value: "day" },
                { label: "Semana laboral", value: "week_work" },
                { label: "Semana", value: "week" },
                { label: "Mes", value: "month" },
              ]}
            />

            <Dropdown menu={{ items: filterItems }} trigger={["click"]} placement="bottomLeft">
              <Button icon={<FilterOutlined />}>
                Filtrar <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>

        {/* DERECHA: vacío (lo dejamos para que el centro quede centrado bien) */}
     
      </div>
    </div>
  );
}
