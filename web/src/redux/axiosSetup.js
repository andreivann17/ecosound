import axios from "axios";
import { sessionManager } from "./sessionManager";
import { isTokenExpired } from "../utils/tokenUtils";

const AUTH_PATHS = ["/auth/login", "/auth/logout", "/auth/register", "/auth/refresh"];

function isAuthUrl(url) {
  if (!url) return false;
  return AUTH_PATHS.some((p) => url.includes(p));
}

function addSessionInterceptors(instance) {
  // Request interceptor: si el token ya expiró, encola la petición antes de enviarla
  instance.interceptors.request.use((config) => {
    if (config._retryAuth || isAuthUrl(config.url)) return config;

    const token = localStorage.getItem("token");
    if (token && isTokenExpired(token)) {
      return new Promise((resolve, reject) => {
        if (!sessionManager.isRefreshing) {
          sessionManager.setRefreshing(true);
          window.dispatchEvent(new Event("session-expired"));
        }
        sessionManager.subscribe((err, newToken) => {
          if (err) return reject(err);
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${newToken}`;
          resolve(config);
        });
      });
    }

    return config;
  });

  // Response interceptor: si el backend devuelve 401, encola el reintento
  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      const original = error.config;


      if (
        !error.response ||
        error.response.status !== 401 ||
        original?._retryAuth ||
        isAuthUrl(original?.url)
      ) {
        return Promise.reject(error);
      }

      original._retryAuth = true;

      if (sessionManager.isRefreshing) {
        return new Promise((resolve, reject) => {
          sessionManager.subscribe((err, newToken) => {
            if (err) return reject(error);
            original.headers = original.headers || {};
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(instance(original));
          });
        });
      }

      sessionManager.setRefreshing(true);
      window.dispatchEvent(new Event("session-expired"));

      return new Promise((resolve, reject) => {
        sessionManager.subscribe((err, newToken) => {
          if (err) return reject(error);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(instance(original));
        });
      });
    }
  );
}

// Parchamos axios.create para que cada instancia creada reciba los interceptores
const _originalCreate = axios.create.bind(axios);
axios.create = function (...args) {
  const instance = _originalCreate(...args);
  addSessionInterceptors(instance);
  return instance;
};

// También aplicamos al axios global (para llamadas directas con axios.post, etc.)
addSessionInterceptors(axios);
