import React from "react";
import {
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileUnknownOutlined,
} from "@ant-design/icons";
import { getFileType } from "./helpers";

export const FileIcon = ({ filename, size = 24 }) => {
  const type = getFileType(filename);
  const style = { fontSize: size };
  if (type === "pdf") return <FilePdfOutlined style={{ ...style, color: "#e53e3e" }} />;
  if (type === "image") return <FileImageOutlined style={{ ...style, color: "#3182ce" }} />;
  if (type === "word") return <FileWordOutlined style={{ ...style, color: "#2b6cb0" }} />;
  if (type === "excel") return <FileExcelOutlined style={{ ...style, color: "#276749" }} />;
  return <FileUnknownOutlined style={{ ...style, color: "#718096" }} />;
};
