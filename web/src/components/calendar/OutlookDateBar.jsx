import React, { useEffect, useState } from "react";
import { Button, Space, Typography, DatePicker } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Text } = Typography;

export default function OutlookDateBar({
  view,
  rangeLabel,
  cursorDate,
  onPickMonthYear,
  onToday,
  onPrev,
  onNext,
}) {
  const [editingMonth, setEditingMonth] = useState(false);

  useEffect(() => {
    setEditingMonth(false);
  }, [view, cursorDate]);

  const monthValue = dayjs(cursorDate);

  return (
    <div className="ol-datebar">
      <Space size={10} wrap={false}>
        <Button onClick={onToday}>Hoy</Button>
        <Button icon={<LeftOutlined />} onClick={onPrev} />
        <Button icon={<RightOutlined />} onClick={onNext} />

        <div className="ol-rangeArea">
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
              className="ol-monthPickerWide"
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
  );
}
