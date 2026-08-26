// redux/actions/informes/informes.js
import axios from "axios";
import { PATH } from "../../utils";

export const apiInformesInstance = axios.create({
  baseURL: PATH,
  headers: { "Content-Type": "application/json" },
});

export const authHeaderInformes = () => {
  const token = localStorage.getItem("tokenadmin") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
