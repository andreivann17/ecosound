import React, { useCallback } from "react";
import dayjs from "dayjs";
import { Button, Divider } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

function fmtRange(ev) {
  const s = dayjs(ev.start);
  const e = dayjs(ev.end);
  const sameDay = s.isSame(e, "day");
  if (!sameDay) return `${s.format("ddd D/MM/YYYY HH:mm")} – ${e.format("ddd D/MM/YYYY HH:mm")}`;
  return `${s.format("ddd D/MM/YYYY")}, de ${s.format("H:mm")} a ${e.format("H:mm")}`;
}

export default function EventPeek({ ev, onEdit, onDelete }) {
  const navigate = useNavigate();

  const fullUrl = ev?.url || null;

  const onGoDetails = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!fullUrl) return;

      if (typeof fullUrl === "string" && fullUrl.startsWith("/")) {
        navigate(fullUrl);
        return;
      }

      window.location.href = fullUrl;
    },
    [fullUrl, navigate]
  );

  if (!ev) return null;

  const accent = ev.color_hex || "#1677ff";

  return (
    <div className="ol-peek">
      <div className="ol-peekTopBar" style={{
  background:
    Number(ev.id_agenda_evento) === 3
      ? "#d32029"
      : accent
}} />
      <div className="ol-peekHeader">
        <div className="ol-peekTitle">{ev.title || "(Sin título)"}</div>

        <div className="ol-peekActions">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit?.(ev)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDelete?.(ev)}
          />
        </div>
      </div>

      <div className="ol-peekMeta">{fmtRange(ev)}</div>

      {ev.location ? (
        <>
          <Divider style={{ margin: "10px 0" }} />
          <div className="ol-peekRow">
            <div className="ol-peekLabel">Ubicación</div>
            <div className="ol-peekValue">{ev.location}</div>
          </div>
        </>
      ) : null}

      {ev.description ? (
        <>
          <Divider style={{ margin: "10px 0" }} />
          <div className="ol-peekRow">
            <div className="ol-peekLabel">Descripción</div>
            <div
              className="ol-peekValue"
              dangerouslySetInnerHTML={{ __html: ev.description }}
            />
          </div>
        </>
      ) : null}

      {fullUrl ? (
        <>
          <Divider style={{ margin: "10px 0" }} />
          <div className="ol-peekRow">
            <div className="ol-peekLabel">Detalles</div>
            <a
              className="ol-peekLink"
              href={fullUrl}
              title={fullUrl}
              onClick={onGoDetails}
            >
              Ver contrato
            </a>
          </div>
        </>
      ) : null}

      <style>
        {`
            .ol-peek {
              width: 380px;
              max-width: min(92vw, 420px);
            }

            .ol-peekTopBar {
              height: 4px;
              border-radius: 999px;
              margin-bottom: 10px;
            }

            .ol-peekHeader {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 12px;
            }

            .ol-peekTitle {
              font-size: 20px;
              font-weight: 800;
              line-height: 1.2;
            }

            .ol-peekActions {
              display: flex;
              gap: 4px;
            }

            .ol-peekMeta {
              margin-top: 8px;
              color: rgba(0,0,0,0.65);
              font-weight: 500;
            }

            .ol-peekRow {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .ol-peekLabel {
              font-size: 12px;
              font-weight: 800;
              color: rgba(0,0,0,0.55);
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }

            .ol-peekValue {
              font-size: 14px;
              color: rgba(0,0,0,0.85);
            }

            .ol-peekLink {
              display: inline-flex;
              flex-direction: column;
              gap: 4px;
              text-decoration: none;
              font-size: 14px;
              font-weight: 700;
              color: rgba(0,0,0,0.88);
              padding: 10px 12px;
              border-radius: 10px;
              border: 1px solid rgba(0,0,0,0.08);
              background: rgba(0,0,0,0.02);
              transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease, background 120ms ease;
              user-select: none;
              cursor: pointer;
            }

            .ol-peekLink:hover {
              transform: translateY(-1px);
              border-color: rgba(22, 119, 255, 0.35);
              background: rgba(22, 119, 255, 0.06);
              box-shadow: 0 6px 18px rgba(0,0,0,0.10);
            }

            .ol-peekLink:active {
              transform: translateY(0px);
              box-shadow: 0 2px 8px rgba(0,0,0,0.10);
            }

            .ol-peekLinkPath {
              font-size: 12px;
              font-weight: 600;
              color: rgba(0,0,0,0.55);
              word-break: break-all;
            }

            .ol-peekPopover .ant-popover-inner {
              border-radius: 12px;
              padding: 12px;
            }

            .ol-peekPopover .ant-popover-arrow {
              display: block;
            }
        `}
      </style>
    </div>
  );
}
