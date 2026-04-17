import React from "react";
import { Button, Space, Typography, Input } from "antd";
import {
  MenuOutlined,
  PlusOutlined,
  SearchOutlined,
  VideoCameraOutlined,
  SettingOutlined,
  BellOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

export default function OutlookTopBar({ onNewEvent }) {
  return (
    <div className="ol-topbar">
      <div className="ol-topbarLeft">
        <Button type="text" className="ol-topbarIcon" icon={<MenuOutlined />} />
        <Text className="ol-topbarBrand">Outlook</Text>
      </div>

      <div className="ol-topbarCenter">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Buscar"
          className="ol-topbarSearch"
        />
      </div>

      <div className="ol-topbarRight">
        <Space size={10}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="ol-newBtn"
            onClick={onNewEvent}
          >
            Nuevo evento
          </Button>
          <Button type="text" className="ol-topbarIcon" icon={<VideoCameraOutlined />} />
          <Button type="text" className="ol-topbarIcon" icon={<BellOutlined />} />
          <Button type="text" className="ol-topbarIcon" icon={<SettingOutlined />} />
          <div className="ol-avatar">AH</div>
        </Space>
      </div>
    </div>
  );
}
