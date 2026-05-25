import React, { useEffect, useRef, useState } from "react";
import { Modal, AutoComplete, Input, Typography, Tag, Spin } from "antd";
import { SearchOutlined, CalendarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axios from "axios";
import { PATH } from "../../redux/utils";

const { Text } = Typography;

const api = axios.create({ baseURL: PATH, headers: { "Content-Type": "application/json" } });
const authHeader = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function buildOptions(items) {
  if (!Array.isArray(items) || !items.length) return [];
  return items.map((item) => {
    const rawStart = item.start_at || item.start || null;
    const start = rawStart ? dayjs(rawStart) : null;
    const dateLabel = start ? start.format("ddd D MMM YYYY · HH:mm") : "";
    const city = item.nombre_ciudad || "";
    const id = item.id ?? item.id_agenda;

    return {
      value: String(id),
      label: (
        <div style={{ display: "flex", flexDirection: "column", padding: "2px 0" }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
            {item.title || "(sin título)"}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
            {city && (
              <Tag
                color={item.color_hex || "default"}
                style={{ fontSize: 11, lineHeight: "16px", padding: "0 6px", margin: 0 }}
              >
                {city}
              </Tag>
            )}
            {dateLabel && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <CalendarOutlined style={{ marginRight: 4 }} />
                {dateLabel}
              </Text>
            )}
          </div>
        </div>
      ),
      _raw: item,
    };
  });
}

export default function AgendaSearchModal({ open, onClose, onSelectEvent }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setOptions([]);
    }
  }, [open]);

  const fetchResults = async (q) => {
    const trimmed = (q || "").trim();
    if (!trimmed) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get("agenda/search", {
        params: { q: trimmed, limit: 20 },
        headers: authHeader(),
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setOptions(buildOptions(items));
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchResults(value), 350);
  };

  const handleSelect = (value, option) => {
    const raw = option?._raw;
    if (!raw) return;
    onSelectEvent?.(raw);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
      title={
        <span>
          <SearchOutlined style={{ marginRight: 8 }} />
          Buscar en agenda
        </span>
      }
    >
      <div style={{ padding: "8px 0 16px" }}>
        <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
          Escribe el nombre del cliente, empresa o título del evento.
        </Text>

        <AutoComplete
          style={{ width: "100%" }}
          value={query}
          options={options}
          onSearch={handleSearch}
          onSelect={handleSelect}
          filterOption={false}
          notFoundContent={
            loading ? (
              <div style={{ textAlign: "center", padding: 12 }}>
                <Spin size="small" />
              </div>
            ) : query.trim() ? (
              "No se encontraron resultados."
            ) : null
          }
          dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
        >
          <Input
            size="large"
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            placeholder="Ej: Juan García, Boda García-López, Sesión fotos..."
            allowClear
          />
        </AutoComplete>
      </div>
    </Modal>
  );
}
