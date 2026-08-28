import "./redux/axiosSetup";
import { createRef, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useOutlet,
  useNavigate,
  redirect,
} from "react-router-dom";

import { CSSTransition, SwitchTransition } from "react-transition-group";
import { actionScroll } from "./redux/actions/utils/utils";
import Eventos from "./containers/pages/EventosPage.jsx"
import CrearEventoPage from "./containers/pages/crearEventoPage.jsx"
import EventoDetallePage from "./containers/pages/EventoDetallePage.jsx"
import Cotizaciones from "./containers/pages/CotizacionesPage.jsx"
import CrearCotizacionPage from "./containers/pages/crearCotizacionPage.jsx"
import CotizacionDetallePage from "./containers/pages/CotizacionDetallePage.jsx"
import InventarioPage from "./containers/pages/InventarioPage.jsx"
import CrearEquipoPage from "./containers/pages/crearEquipoPage.jsx"
import EquipoDetallePage from "./containers/pages/EquipoDetallePage.jsx"
import NuevoConteoPage from "./containers/pages/NuevoConteoPage.jsx"
import ConteosPage from "./containers/pages/ConteosPage.jsx"
import ConteoDetallePage from "./containers/pages/ConteoDetallePage.jsx"

import SesionesPage from "./containers/pages/SesionesPage.jsx"
import CrearSesionPage from "./containers/pages/CrearSesionPage.jsx"
import SesionDetallePage from "./containers/pages/SesionDetallePage.jsx"
import UsuariosPage from "./containers/pages/UsuariosPage.jsx"
import CrearUsuarioPage from "./containers/pages/crearUsuarioPage.jsx"
import UsuarioDetallePage from "./containers/pages/UsuarioDetallePage.jsx"
import EstadisticasPage from "./containers/pages/EstadisticasPage.jsx"
import InformesPage from "./containers/pages/InformesPage.jsx"
import TrabajadoresPage from "./containers/pages/TrabajadoresPage.jsx"
import CrearTrabajadorPage from "./containers/pages/crearTrabajadorPage.jsx"
import TrabajadorDetallePage from "./containers/pages/TrabajadorDetallePage.jsx"
import ConfiguracionPage from "./containers/pages/ConfiguracionPage.jsx"
import PerfilPage from "./containers/pages/PerfilPage.jsx"
import MiCuentaPage from "./containers/pages/MiCuentaPage.jsx"
import PaquetesPage from "./containers/pages/PaquetesPage.jsx"
import CrearPaquetePage from "./containers/pages/crearPaquetePage.jsx"
import PaqueteDetallePage from "./containers/pages/PaqueteDetallePage.jsx"
import GastosPage from "./containers/pages/GastosPage.jsx"
import CrearGastoPage from "./containers/pages/crearGastoPage.jsx"
import GastoDetallePage from "./containers/pages/GastoDetallePage.jsx"
import LandingPage from "./containers/pages/LandingPage.jsx"
import LandingLayout from "./components/landing/LandingLayout"
import ErrorDispatcher from "./containers/pages/ErrorDispatcher.jsx"
import NotFoundDispatcher from "./containers/pages/NotFoundDispatcher.jsx"
import ContactoPage from "./containers/pages/ContactoPage.jsx"
import ProductosPage from "./containers/pages/ProductosPage.jsx"
import EventsPage from "./containers/pages/EventsPage.jsx"
import NosotrosPage from "./containers/pages/NosotrosPage.jsx"
import ContratarPage from "./containers/pages/ContratarPage.jsx"
import PrivacidadPage from "./containers/pages/PrivacidadPage.jsx"
import TerminosPage from "./containers/pages/TerminosPage.jsx"
import EvaluationLayout from "./components/evaluation/EvaluationLayout.jsx"
import EvaluationHomePage from "./containers/pages/evaluation/EvaluationHomePage.jsx"
import EvaluationLabelPage from "./containers/pages/evaluation/EvaluationLabelPage.jsx"
import EvaluationEvaluationPage from "./containers/pages/evaluation/EvaluationEvaluationPage.jsx"
import EvaluationLoginPage from "./containers/pages/evaluation/EvaluationLoginPage.jsx"
import EvaluationSignupPage from "./containers/pages/evaluation/EvaluationSignupPage.jsx"
import AdminHomePage from "./containers/pages/admin/AdminHomePage.jsx"
import AdminAppsPage from "./containers/pages/admin/AdminAppsPage.jsx"
import AdminClientesPage from "./containers/pages/admin/AdminClientesPage.jsx"
import AdminAppsEventPage from "./containers/pages/admin/AdminAppsEventPage.jsx"
import CrearClienteEventPage from "./containers/pages/admin/events/CrearClienteEventPage.jsx"
import ClienteEventDetallePage from "./containers/pages/admin/events/ClienteEventDetallePage.jsx"
import { actionUserMeGet } from "./redux/actions/login/login";
import Login from "./containers/pages/login";
import LoginAdmin from "./containers/pages/loginAdmin.jsx";
import Home from "./containers/pages/home";
import Notificaciones from "./containers/pages/notificaciones"
import NotificacionesDetalles from "./containers/pages/notificaciones_detalles.jsx"
import Agenda from "./containers/pages/agenda.jsx";
import NotFound from "./containers/errors/error404";
import Error401 from "./containers/errors/error401";
import Error403 from "./containers/errors/error403";
import Error500 from "./containers/errors/error500";
import Error503 from "./containers/errors/error503";
import HeaderNavbar from "./components/navigation/header_navbar.jsx";
import "./assets/css/bootstrap.css";
import "./assets/css/administrador.css";
import "./styles.css";
import "./assets/css/styles.css";
import "./assets/css/utils.css";
import "../src/assets/css/header.css";

import store from "./store";
import { isTokenExpired, tokenExpiresInMs } from "./utils/tokenUtils";
import { sessionManager } from "./redux/sessionManager";
import ModalReautenticar from "./components/modals/ModalReautenticar";
import { Provider, useDispatch } from "react-redux";
import { ConfigProvider } from "antd";
import ElectronView from "./electron_view";
import { PermisosProvider } from "./context/PermisosContext";
import { TemaProvider, useTema } from "./context/TemaContext";
import RequireModulo from "./components/guards/RequireModulo";

const NOTO_SANS_FONT_STACK = '"Noto Sans", sans-serif';

const routes = [
  {
    path: "/",
    value: "landing",
    name: "Landing",
    element: <LandingPage />,
    nodeRef: createRef(),
    className: "Landing",
  },
  {
    path: "/nosotros",
    value: "nosotros",
    name: "Nosotros",
    element: <NosotrosPage />,
    nodeRef: createRef(),
    className: "Nosotros",
  },
  {
    path: "/events",
    value: "events",
    name: "Events",
    element: <EventsPage />,
    nodeRef: createRef(),
    className: "Events",
  },
  {
    path: "/productos",
    value: "productos",
    name: "Productos",
    element: <ProductosPage />,
    nodeRef: createRef(),
    className: "Productos",
  },
  {
    path: "/contacto",
    value: "contacto",
    name: "Contacto",
    element: <ContactoPage />,
    nodeRef: createRef(),
    className: "Contacto",
  },
  {
    path: "/contratar",
    value: "contratar",
    name: "Contratar",
    element: <ContratarPage />,
    nodeRef: createRef(),
    className: "Contratar",
  },
  {
    path: "/privacidad",
    value: "privacidad",
    name: "Privacidad",
    element: <PrivacidadPage />,
    nodeRef: createRef(),
    className: "Privacidad",
  },
  {
    path: "/terminos",
    value: "terminos",
    name: "Terminos",
    element: <TerminosPage />,
    nodeRef: createRef(),
    className: "Terminos",
  },
  {
    path: "/login",
    value: "login",
    name: "Login",
    element: <Login />,
    nodeRef: createRef(),
    className: "Login",
  },
  {
    path: "/:clave/login",
    value: "login-clave",
    name: "LoginClave",
    element: <Login />,
    nodeRef: createRef(),
    className: "Login",
  },
  {
    path: "/admin-login",
    value: "admin-login",
    name: "AdminLogin",
    element: <LoginAdmin />,
    nodeRef: createRef(),
    className: "AdminLogin",
  },
  {
    path: "/app/agenda",
    value: "agenda",
    name: "Agenda",
    element: <Agenda />,
    nodeRef: createRef(),
    className: "Agenda",
    modulo: "agenda",
  },
  {
    path: "/app/eventos",
    value: "eventos",
    name: "Eventos",
    element: <Eventos />,
    nodeRef: createRef(),
    className: "Eventos",
    modulo: "eventos",
  },
  {
    path: "/app/eventos/:idEvento",
    value: "eventos-detalle",
    name: "Eventos-Detalle",
    element: <EventoDetallePage />,
    nodeRef: createRef(),
    className: "EventosDetalle",
    modulo: "eventos",
  },
  {
    path: "/app/sesiones",
    value: "sesiones",
    name: "Sesiones",
    element: <SesionesPage />,
    nodeRef: createRef(),
    className: "Sesiones",
  },
  {
    path: "/app/sesiones/crear",
    value: "sesiones-crear",
    name: "Sesiones-Crear",
    element: <CrearSesionPage />,
    nodeRef: createRef(),
    className: "SesionesCrear",
  },
  {
    path: "/app/sesiones/:idSesion",
    value: "sesiones-detalle",
    name: "Sesiones-Detalle",
    element: <SesionDetallePage />,
    nodeRef: createRef(),
    className: "SesionesDetalle",
  },
  {
    path: "/app/sesiones/:idSesion/editar",
    value: "sesiones-editar",
    name: "Sesiones-Editar",
    element: <CrearSesionPage />,
    nodeRef: createRef(),
    className: "SesionesEditar",
  },
  {
    path: "/app/estadisticas",
    value: "estadisticas",
    name: "Estadisticas",
    element: <EstadisticasPage />,
    nodeRef: createRef(),
    className: "Estadisticas",
    modulo: "estadisticas",
  },
  {
    path: "/app/informes",
    value: "informes",
    name: "Informes",
    element: <InformesPage />,
    nodeRef: createRef(),
    className: "Informes",
    modulo: "informes",
  },
  {
    path: "/app/eventos/crear",
    value: "eventos-crear",
    name: "Eventos-Crear",
    element: <CrearEventoPage />,
    nodeRef: createRef(),
    className: "EventosCrear",
    modulo: "eventos",
  },
  {
    path: "/app/eventos/:idEvento/editar",
    value: "eventos-editar",
    name: "Eventos-Editar",
    element: <CrearEventoPage />,
    nodeRef: createRef(),
    className: "EventosEditar",
    modulo: "eventos",
  },
  {
    path: "/app/cotizaciones",
    value: "cotizaciones",
    name: "Cotizaciones",
    element: <Cotizaciones />,
    nodeRef: createRef(),
    className: "Cotizaciones",
  },
  {
    path: "/app/cotizaciones/crear",
    value: "cotizaciones-crear",
    name: "Cotizaciones-Crear",
    element: <CrearCotizacionPage />,
    nodeRef: createRef(),
    className: "CotizacionesCrear",
  },
  {
    path: "/app/cotizaciones/:idCotizacion",
    value: "cotizaciones-detalle",
    name: "Cotizaciones-Detalle",
    element: <CotizacionDetallePage />,
    nodeRef: createRef(),
    className: "CotizacionesDetalle",
  },
  {
    path: "/app/cotizaciones/:idCotizacion/editar",
    value: "cotizaciones-editar",
    name: "Cotizaciones-Editar",
    element: <CrearCotizacionPage />,
    nodeRef: createRef(),
    className: "CotizacionesEditar",
  },
  {
    path: "/app/inventario",
    value: "inventario",
    name: "Inventario",
    element: <InventarioPage />,
    nodeRef: createRef(),
    className: "Inventario",
    modulo: "inventario",
  },
  {
    path: "/app/inventario/equipo/crear",
    value: "inventario-equipo-crear",
    name: "Inventario-Equipo-Crear",
    element: <CrearEquipoPage />,
    nodeRef: createRef(),
    className: "InventarioEquipoCrear",
    modulo: "inventario",
  },
  {
    path: "/app/inventario/equipo/:idEquipo",
    value: "inventario-equipo-detalle",
    name: "Inventario-Equipo-Detalle",
    element: <EquipoDetallePage />,
    nodeRef: createRef(),
    className: "InventarioEquipoDetalle",
    modulo: "inventario",
  },
  {
    path: "/app/inventario/equipo/:idEquipo/editar",
    value: "inventario-equipo-editar",
    name: "Inventario-Equipo-Editar",
    element: <CrearEquipoPage />,
    nodeRef: createRef(),
    className: "InventarioEquipoEditar",
    modulo: "inventario",
  },
  {
    path: "/app/inventario/conteos",
    value: "inventario-conteos",
    name: "Inventario-Conteos",
    element: <ConteosPage />,
    nodeRef: createRef(),
    className: "InventarioConteos",
    modulo: "inventario",
  },
  {
    path: "/app/inventario/conteos/nuevo",
    value: "inventario-conteos-nuevo",
    name: "Inventario-Conteos-Nuevo",
    element: <NuevoConteoPage />,
    nodeRef: createRef(),
    className: "InventarioConteosNuevo",
    modulo: "inventario",
  },
  {
    path: "/app/inventario/conteos/:idConteo",
    value: "inventario-conteo-detalle",
    name: "Inventario-Conteo-Detalle",
    element: <ConteoDetallePage />,
    nodeRef: createRef(),
    className: "InventarioConteoDetalle",
    modulo: "inventario",
  },

  {
    path: "/app/notificaciones",
    value: "notificaciones",
    name: "Notificaciones",
    element: <Notificaciones />,
    nodeRef: createRef(),
    className: "Notificaciones",
    modulo: "notificaciones",
  },
  {
    path: "/app/notificaciones/:idNotificacion",
    value: "NotificacionesDetalles",
    name: "NotificacionesDetalles",
    element: <NotificacionesDetalles />,
    nodeRef: createRef(),
    className: "NotificacionesDetalles",
    modulo: "notificaciones",
  },
  {
    path: "/web",
    value: "web",
    name: "WebBlock",
    element: (
      <div style={{ padding: 24 }}>
        <h6>Esta aplicación solo está disponible en escritorio.</h6>
      </div>
    ),
    nodeRef: createRef(),
    className: "WebBlock",
  },
  {
    path: "/app/home",
    value: "0-0",
    name: "Home",
    element: <Home />,
    nodeRef: createRef(),
    className: "Home",
  },
  {
    path: "/app/usuarios",
    value: "usuarios",
    name: "Usuarios",
    element: <UsuariosPage />,
    nodeRef: createRef(),
    className: "Usuarios",
    modulo: "usuarios",
  },
  {
    path: "/app/usuarios/crear",
    value: "usuarios-crear",
    name: "Usuarios-Crear",
    element: <CrearUsuarioPage />,
    nodeRef: createRef(),
    className: "UsuariosCrear",
    modulo: "usuarios",
  },
  {
    path: "/app/usuarios/:code/editar",
    value: "usuarios-editar",
    name: "Usuarios-Editar",
    element: <CrearUsuarioPage />,
    nodeRef: createRef(),
    className: "UsuariosEditar",
    modulo: "usuarios",
  },
  {
    path: "/app/usuarios/:code",
    value: "usuarios-detalle",
    name: "Usuarios-Detalle",
    element: <UsuarioDetallePage />,
    nodeRef: createRef(),
    className: "UsuariosDetalle",
    modulo: "usuarios",
  },
  {
    path: "/app/trabajadores",
    value: "trabajadores",
    name: "Trabajadores",
    element: <TrabajadoresPage />,
    nodeRef: createRef(),
    className: "Trabajadores",
    modulo: "trabajadores",
  },
  {
    path: "/app/trabajadores/crear",
    value: "trabajadores-crear",
    name: "Trabajadores-Crear",
    element: <CrearTrabajadorPage />,
    nodeRef: createRef(),
    className: "TrabajadoresCrear",
    modulo: "trabajadores",
  },
  {
    path: "/app/trabajadores/:idTrabajador",
    value: "trabajadores-detalle",
    name: "Trabajadores-Detalle",
    element: <TrabajadorDetallePage />,
    nodeRef: createRef(),
    className: "TrabajadoresDetalle",
    modulo: "trabajadores",
  },
  {
    path: "/app/trabajadores/:idTrabajador/editar",
    value: "trabajadores-editar",
    name: "Trabajadores-Editar",
    element: <CrearTrabajadorPage />,
    nodeRef: createRef(),
    className: "TrabajadoresEditar",
    modulo: "trabajadores",
  },
  {
    path: "/app/configuracion",
    value: "configuracion",
    name: "Configuracion",
    element: <ConfiguracionPage />,
    nodeRef: createRef(),
    className: "Configuracion",
    modulo: "configuracion",
  },
  {
    path: "/app/perfil",
    value: "perfil",
    name: "Perfil",
    element: <PerfilPage />,
    nodeRef: createRef(),
    className: "Perfil",
  },
  {
    path: "/app/mi-cuenta",
    value: "mi-cuenta",
    name: "MiCuenta",
    element: <MiCuentaPage />,
    nodeRef: createRef(),
    className: "MiCuenta",
  },
  {
    path: "/app/paquetes",
    value: "paquetes",
    name: "Paquetes",
    element: <PaquetesPage />,
    nodeRef: createRef(),
    className: "Paquetes",
    modulo: "paquetes",
  },
  {
    path: "/app/paquetes/crear",
    value: "paquetes-crear",
    name: "Paquetes-Crear",
    element: <CrearPaquetePage />,
    nodeRef: createRef(),
    className: "PaquetesCrear",
    modulo: "paquetes",
  },
  {
    path: "/app/paquetes/:idPaquete",
    value: "paquetes-detalle",
    name: "Paquetes-Detalle",
    element: <PaqueteDetallePage />,
    nodeRef: createRef(),
    className: "PaquetesDetalle",
    modulo: "paquetes",
  },
  {
    path: "/app/paquetes/:idPaquete/editar",
    value: "paquetes-editar",
    name: "Paquetes-Editar",
    element: <CrearPaquetePage />,
    nodeRef: createRef(),
    className: "PaquetesEditar",
    modulo: "paquetes",
  },
  {
    path: "/app/gastos",
    value: "gastos",
    name: "Gastos",
    element: <GastosPage />,
    nodeRef: createRef(),
    className: "Gastos",
    modulo: "gastos",
  },
  {
    path: "/app/gastos/crear",
    value: "gastos-crear",
    name: "Gastos-Crear",
    element: <CrearGastoPage />,
    nodeRef: createRef(),
    className: "GastosCrear",
    modulo: "gastos",
  },
  {
    path: "/app/gastos/:idGasto",
    value: "gastos-detalle",
    name: "Gastos-Detalle",
    element: <GastoDetallePage />,
    nodeRef: createRef(),
    className: "GastosDetalle",
    modulo: "gastos",
  },
  {
    path: "/app/gastos/:idGasto/editar",
    value: "gastos-editar",
    name: "Gastos-Editar",
    element: <CrearGastoPage />,
    nodeRef: createRef(),
    className: "GastosEditar",
    modulo: "gastos",
  },
  {
    path: "/evaluation",
    value: "evaluation-home",
    name: "EvaluationHome",
    element: <EvaluationHomePage />,
    nodeRef: createRef(),
    className: "EvaluationHome",
  },
  {
    path: "/evaluation/label",
    value: "evaluation-label",
    name: "EvaluationLabel",
    element: <EvaluationLabelPage />,
    nodeRef: createRef(),
    className: "EvaluationLabel",
  },
  {
    path: "/evaluation/evaluation",
    value: "evaluation-evaluation",
    name: "EvaluationEvaluation",
    element: <EvaluationEvaluationPage />,
    nodeRef: createRef(),
    className: "EvaluationEvaluation",
  },
  {
    path: "/evaluation/login",
    value: "evaluation-login",
    name: "EvaluationLogin",
    element: <EvaluationLoginPage />,
    nodeRef: createRef(),
    className: "EvaluationLogin",
  },
  {
    path: "/evaluation/signup",
    value: "evaluation-signup",
    name: "EvaluationSignup",
    element: <EvaluationSignupPage />,
    nodeRef: createRef(),
    className: "EvaluationSignup",
  },
  {
    path: "/admin",
    value: "admin",
    name: "Admin",
    element: <AdminHomePage />,
    nodeRef: createRef(),
    className: "Admin",
  },
  {
    path: "/admin/apps",
    value: "admin-apps",
    name: "Admin-Apps",
    element: <AdminAppsPage />,
    nodeRef: createRef(),
    className: "AdminApps",
  },
  {
    path: "/admin/apps/event",
    value: "admin-apps-event",
    name: "Admin-Apps-Event",
    element: <AdminAppsEventPage />,
    nodeRef: createRef(),
    className: "AdminAppsEvent",
  },
  {
    path: "/admin/apps/event/clientes/crear",
    value: "admin-apps-event-cliente-crear",
    name: "Admin-Apps-Event-Cliente-Crear",
    element: <CrearClienteEventPage />,
    nodeRef: createRef(),
    className: "AdminAppsEventClienteCrear",
  },
  {
    path: "/admin/apps/event/clientes/:idCliente",
    value: "admin-apps-event-cliente-detalle",
    name: "Admin-Apps-Event-Cliente-Detalle",
    element: <ClienteEventDetallePage />,
    nodeRef: createRef(),
    className: "AdminAppsEventClienteDetalle",
  },
  {
    path: "/admin/apps/event/clientes/:idCliente/editar",
    value: "admin-apps-event-cliente-editar",
    name: "Admin-Apps-Event-Cliente-Editar",
    element: <CrearClienteEventPage />,
    nodeRef: createRef(),
    className: "AdminAppsEventClienteEditar",
  },
  {
    path: "/admin/clientes",
    value: "admin-clientes",
    name: "Admin-Clientes",
    element: <AdminClientesPage />,
    nodeRef: createRef(),
    className: "AdminClientes",
  },
  {
    path: "/401",
    value: "Error401",
    name: "Error401",
    element: <ErrorDispatcher code={401} />,
    nodeRef: createRef(),
    className: "Error401",
  },
  {
    path: "/403",
    value: "Error403",
    name: "Error403",
    element: <ErrorDispatcher code={403} />,
    nodeRef: createRef(),
    className: "Error403",
  },
  {
    path: "/500",
    value: "Error500",
    name: "Error500",
    element: <ErrorDispatcher code={500} />,
    nodeRef: createRef(),
    className: "Error500",
  },
  {
    path: "/503",
    value: "Error503",
    name: "Error503",
    element: <ErrorDispatcher code={503} />,
    nodeRef: createRef(),
    className: "Error503",
  },
  {
    path: "*",
    value: "NotFound",
    name: "NotFound",
    element: <NotFoundDispatcher />,
    nodeRef: createRef(),
    className: "NotFound",
  },
];

const isElectron = () => {
  if (typeof window === "undefined") return false;
  return navigator.userAgent.toLowerCase().includes("electron");
};


const requireAuth = ({ request }) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (!isElectron() && path !== "/web") {
  //  throw redirect("/web");
  }

  // Solo /admin/* requiere token de admin (excepto /admin-login)
  if (path.startsWith("/admin") && path !== "/admin-login") {
    const tokenadmin = localStorage.getItem("tokenadmin");
    if (!tokenadmin || isTokenExpired(tokenadmin)) {
      if (tokenadmin) localStorage.removeItem("tokenadmin");
      throw redirect("/admin-login");
    }
    return null;
  }

  // Solo /app/* requiere token de usuario
  if (path.startsWith("/app")) {
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      if (token) {
        localStorage.removeItem("token");
        localStorage.removeItem("tokenadmin");
      }
      throw redirect("/login");
    }
    return null;
  }

  // /evaluation/* requiere sesión de evaluador (excepto login/signup)
  if (
    path.startsWith("/evaluation") &&
    path !== "/evaluation/login" &&
    path !== "/evaluation/signup"
  ) {
    const evaluationToken = localStorage.getItem("evaluation_token");
    if (!evaluationToken || isTokenExpired(evaluationToken)) {
      if (evaluationToken) {
        localStorage.removeItem("evaluation_token");
        localStorage.removeItem("evaluation_evaluator");
      }
      throw redirect("/evaluation/login");
    }
    return null;
  }

  // Todo lo demás (/, /login, /signup, /nosotros, etc.) es público sin restricción
  return null;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Example />,
    loader: requireAuth,
    children: routes.map((route) => ({
      index: route.path === "/",
      path: route.path === "/" ? undefined : route.path,
      element: route.modulo
        ? <RequireModulo modulo={route.modulo}>{route.element}</RequireModulo>
        : route.element,
    })),
  },
]);

function Example() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const currentOutlet = useOutlet();
  const token = localStorage.getItem("token");

  const pathname = location.pathname;
  const normalpath = pathname.replace(/\/+$/, "") || "/";

  // ✅ Hooks SIEMPRE se ejecutan; adentro decides qué hacer
  useEffect(() => {
    if (!isElectron()) return;
    if (token) dispatch(actionUserMeGet());
  }, [dispatch, location.pathname]);

  // Modal de re-autenticación cuando la sesión expira
  const [showReauthModal, setShowReauthModal] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (window.location.pathname.replace(/\/+$/, "") === "/login") return;
      setShowReauthModal(true);
    };
    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, []);

  // Timer background: detecta expiración mientras el usuario está quieto
  useEffect(() => {
    const setupTimer = () => {
      const t = localStorage.getItem("token");
      if (!t || isTokenExpired(t)) return undefined;
      const ms = tokenExpiresInMs(t);
      if (ms <= 0) return undefined;
      return setTimeout(() => {
        if (!sessionManager.isRefreshing) {
          sessionManager.setRefreshing(true);
          window.dispatchEvent(new Event("session-expired"));
        }
      }, ms);
    };

    let timerId = setupTimer();

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setupTimer();
    };

    window.addEventListener("permisos-refresh", resetTimer);
    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener("permisos-refresh", resetTimer);
    };
  }, []);

  // ✅ Si estás en WEB: renderiza SOLO el mensaje
  //if (!isElectron()) {
  //  return (
   //   <div style={{ padding: 24 }}>
     //   <h6>Esta aplicación solo está disponible en escritorio.</h6>
     // </div>
   // );
 // }

  // =========================
  // Resolver routecorrect (soporta :tipo, :idExpediente, etc.)
  // =========================
  let routecorrect = routes.find((route) => {
    if (!route?.path) return false;

    if (route.path === "*") return true;
    if (route.path === normalpath) return true;

    const routeParts = route.path.split("/").filter(Boolean);
    const pathParts = normalpath.split("/").filter(Boolean);

    if (routeParts.length !== pathParts.length) return false;

    for (let i = 0; i < routeParts.length; i++) {
      const rp = routeParts[i];
      const pp = pathParts[i];
      if (rp.startsWith(":")) continue;
      if (rp !== pp) return false;
    }
    return true;
  });

  const { nodeRef } = routecorrect || {};
  const routeclass = routecorrect?.value || "unknown";

  // Landing page — usa LandingLayout (navbar fijo + footer compartido + transición de ruta)
  // Excluimos /login, /signup y /admin-login porque deben usar el shell de la app
  // La app siempre usa el layout vertical; /admin conserva su header horizontal propio.
  const isVertical = !normalpath.startsWith("/admin");

  useEffect(() => {
    const el = document.querySelector('.content-electron');
    if (el) el.scrollTop = 0;
  }, [location.pathname]);

  const isAuthPage =
    ["/login", "/signup", "/prelogin", "/admin-login"].includes(normalpath) ||
    /^\/[^/]+\/login$/.test(normalpath);
  const isEvaluation = normalpath.startsWith("/evaluation");
  const isLanding =
    !normalpath.startsWith("/app") &&
    !normalpath.startsWith("/admin") &&
    !normalpath.startsWith("/evaluation") &&
    !isAuthPage;
  if (isEvaluation) {
    return <EvaluationLayout />;
  }
  if (isLanding) {
    return <LandingLayout />;
  }

  const hideUserPopover = isAuthPage;

  const handleRightClick = (event) => {
    if (event.target.classList.contains("cardcatalogo")) {
      event.preventDefault();
    }
  };

  const onScroll = (event) => {
    dispatch(actionScroll(event.currentTarget.scrollTop));
  };

  const canShowUser = token != null && !hideUserPopover;
  const topOffset = canShowUser ? (isVertical ? 44 : 55) : 45;

  return (
    <>
      <ModalReautenticar
        open={showReauthModal}
        onClose={() => setShowReauthModal(false)}
      />

      <ElectronView
        prelogin={routeclass}
        routecorrect={routecorrect}
        hideUserPopover={hideUserPopover}
      />

      <div
        className="content-electron "
        style={{
          marginTop: topOffset,
          height: `calc(100vh - ${topOffset}px)`,
          marginLeft: isVertical && canShowUser ? 56 : 0,
        }}
      >
   
        <div onScroll={onScroll} onContextMenu={handleRightClick}>
          <div>
            <SwitchTransition>
              <CSSTransition
                key={location.pathname}
                nodeRef={nodeRef}
                timeout={280}
                classNames="page"
              >
                {(state) => (
                  <div ref={nodeRef} className="page">
                    {currentOutlet}
                  </div>
                )}
              </CSSTransition>
            </SwitchTransition>
          </div>
        </div>
      </div>
    </>
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

function ThemedApp({ children }) {
  const { tema } = useTema() || {};
  const colorPrimary =
    tema?.plan_deluxe === 1 && tema?.primary_button_color ? tema.primary_button_color : undefined;

  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: NOTO_SANS_FONT_STACK,
          ...(colorPrimary ? { colorPrimary } : {}),
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <TemaProvider>
    <ThemedApp>
      <Provider store={store}>
        <PermisosProvider>
          <RouterProvider router={router} />
        </PermisosProvider>
      </Provider>
    </ThemedApp>
  </TemaProvider>
);
