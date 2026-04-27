import { createRef, useEffect } from "react";
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
import SesionesPage from "./containers/pages/SesionesPage.jsx"
import CrearSesionPage from "./containers/pages/CrearSesionPage.jsx"
import SesionDetallePage from "./containers/pages/SesionDetallePage.jsx"
import UsuariosPage from "./containers/pages/UsuariosPage.jsx"
import CrearUsuarioPage from "./containers/pages/crearUsuarioPage.jsx"
import UsuarioDetallePage from "./containers/pages/UsuarioDetallePage.jsx"
import EstadisticasPage from "./containers/pages/EstadisticasPage.jsx"
import { actionUserMeGet } from "./redux/actions/login/login";
import Login from "./containers/pages/login";
import Materias from "./containers/pages/materias";
import CrearEmpresas from "./containers/pages/crearEmpresasPage.jsx";
import MateriaLaboral from "./containers/pages/materiaLaboral";
import LaboralConciliacionesPage from "./containers/pages/laboralConciliacionPage.jsx";
import LaboralDesvinculacionesPage from "./containers/pages/laboralDesvinculacionesPage.jsx";
import LaboralTribunalPage from "./containers/pages/laboralTribunalPage.jsx";
import LaboralTribunalDetallePage from "./containers/pages/LaboralTribunalDetallePage.jsx";
import CrearTribunalPage from "./containers/pages/crearTribunalPage.jsx";
import Signup from "./containers/pages/signup";
import CrearExpedientePage from "./containers/pages/crearCentroConciliacionPage.jsx";
import CrearDesvinculacionPage from "./containers/pages/crearDesvinculacionPage.jsx";
import Crear from "./containers/pages/crear.jsx";
import Home from "./containers/pages/home";
import Notificaciones from "./containers/pages/notificaciones"
import NotificacionesDetalles from "./containers/pages/notificaciones_detalles.jsx"
import Empresas from "./containers/pages/empresas.jsx";
import Agenda from "./containers/pages/agenda.jsx";
import EmpresasDetallePage from "./containers/pages/LaboralEmpresasDetallePage.jsx";
import LaboralDesvinculacionesDetallePage from "./containers/pages/LaboralDesvinculacionesDetallePage.jsx";
import LaboralConciliacionDetallePage from "./containers/pages/LaboralConciliacionDetallePage.jsx";
import NotFound from "./containers/errors/error404";
import HeaderNavbar from "./components/navigation/header_navbar.jsx";
import "./assets/css/bootstrap.css";
import "./assets/css/administrador.css";
import "./styles.css";
import "./assets/css/styles.css";
import "./assets/css/utils.css";
import "../src/assets/css/header.css";

import store from "./store";
import { Provider, useDispatch } from "react-redux";
import ElectronView from "./electron_view";

const routes = [
  {
    path: "/login",
    value: "login",
    name: "Login",
    element: <Login />,
    nodeRef: createRef(),
    className: "Login",
  },
  {
    path: "/agenda",
    value: "agenda",
    name: "Agenda",
    element: <Agenda />,
    nodeRef: createRef(),
    className: "Agenda",
  },
  {
    path: "/eventos",
    value: "eventos",
    name: "Eventos",
    element: <Eventos />,
    nodeRef: createRef(),
    className: "Eventos",
  },
  {
    path: "/eventos/:idEvento",
    value: "eventos-detalle",
    name: "Eventos-Detalle",
    element: <EventoDetallePage />,
    nodeRef: createRef(),
    className: "EventosDetalle",
  },
  {
    path: "/estadisticas",
    value: "estadisticas",
    name: "Estadisticas",
    element: <EstadisticasPage />,
    nodeRef: createRef(),
    className: "Estadisticas",
  },
  {
    path: "/eventos/crear",
    value: "eventos-crear",
    name: "Eventos-Crear",
    element: <CrearEventoPage />,
    nodeRef: createRef(),
    className: "EventosCrear",
  },
  {
    path: "/eventos/:idEvento/editar",
    value: "eventos-editar",
    name: "Eventos-Editar",
    element: <CrearEventoPage />,
    nodeRef: createRef(),
    className: "EventosEditar",
  },
  {
    path: "/sesiones",
    value: "sesiones",
    name: "Sesiones",
    element: <SesionesPage />,
    nodeRef: createRef(),
    className: "Sesiones",
  },
  {
    path: "/sesiones/crear",
    value: "sesiones-crear",
    name: "Sesiones-Crear",
    element: <CrearSesionPage />,
    nodeRef: createRef(),
    className: "SesionesCrear",
  },
  {
    path: "/sesiones/:idSesion",
    value: "sesiones-detalle",
    name: "Sesiones-Detalle",
    element: <SesionDetallePage />,
    nodeRef: createRef(),
    className: "SesionesDetalle",
  },
  {
    path: "/sesiones/:idSesion/editar",
    value: "sesiones-editar",
    name: "Sesiones-Editar",
    element: <CrearSesionPage />,
    nodeRef: createRef(),
    className: "SesionesEditar",
  },
   {
    path: "/notificaciones",
    value: "notificaciones",
    name: "Notificaciones",
    element: <Notificaciones />,
    nodeRef: createRef(),
    className: "Notificaciones",
  },
   {
    path: "/notificaciones/:idNotificacion",
    value: "NotificacionesDetalles",
    name: "NotificacionesDetalles",
    element: <NotificacionesDetalles />,
    nodeRef: createRef(),
    className: "NotificacionesDetalles",
  },
  {
    path: "/empresas",
    value: "empresas",
    name: "Empresas",
    element: <Empresas />,
    nodeRef: createRef(),
    className: "Empresas",
  },
  {
    path: "/crear",
    value: "crear",
    name: "Crear",
    element: <Crear />,
    nodeRef: createRef(),
    className: "Crear",
  },
  {
    path: "/materias/laboral",
    value: "materia-laboral-0",
    name: "Materia-Laboral",
    element: <MateriaLaboral />,
    nodeRef: createRef(),
    className: "MateriaLaboral",
  },
  {
    path: "/materias/laboral/centro-conciliacion",
    value: "materia-laboral-conciliaciones",
    name: "Materia-Laboral-Conciliaciones",
    element: <LaboralConciliacionesPage />,
    nodeRef: createRef(),
    className: "MateriaConciliacionesTipo",
  },

  {
    path: "/materias/laboral/:tipo/crear",
    value: "materia-laboral-tipo-crear",
    name: "Materia-Laboral-Tipo-Crear",
    element: <CrearExpedientePage />,
    nodeRef: createRef(),
    className: "MateriaLaboralTipoCrear",
  },
  {
    path: "/materias/laboral/centro-conciliacion/:idExpediente",
    value: "materia-laboral-centro-conciliacion",
    name: "Materia-Laboral-Centro-Conciliacion",
    element: <LaboralConciliacionDetallePage />,
    nodeRef: createRef(),
    className: "MateriaLaboralConciliacion",
  },
  {
    path: "/empresas/:idEmpresa",
    value: "empresas-detalle",
    name: "Empresas-Detalle",
    element: <EmpresasDetallePage />,
    nodeRef: createRef(),
    className: "EmpresasDetallePage",
  },
  {
    path: "/empresas/crear",
    value: "empresas-crear",
    name: "Empresas-Crear",
    element: <CrearEmpresas />,
    nodeRef: createRef(),
    className: "EmpresasCrear",
  },
  {
    path: "/empresas/:idEmpresa/editar",
    value: "empresas-editar",
    name: "Empresas-Editar",
    element: <CrearEmpresas />,
    nodeRef: createRef(),
    className: "EmpresasEditar",
  },
   {
    path: "/materias/laboral/desvinculaciones",
    value: "materia-laboral-desvinculaciones",
    name: "Materia-Laboral-Desvinculaciones",
    element: <LaboralDesvinculacionesPage />,
    nodeRef: createRef(),
    className: "MateriaDesvinculacionesTipo",
  },
  {
    path: "/materias/laboral/desvinculaciones/crear",
    value: "materia-laboral-desvinculaciones-crear",
    name: "Materia-Laboral-Desvinculaciones-crear",
    element: <CrearDesvinculacionPage />,
    nodeRef: createRef(),
    className: "MateriaLaboralDesvinculacionesCrear",
  },
  {
    path: "/materias/laboral/desvinculaciones/:idExpediente",
    value: "materia-laboral-desvinculaciones",
    name: "Materia-Laboral-Desvinculaciones",
    element: <LaboralDesvinculacionesDetallePage />,
    nodeRef: createRef(),
    className: "MateriaLaboralDesvinculaciones",
  },
  {
    path: "/materias/laboral/desvinculaciones/:idExpediente/editar",
    value: "materia-laboral-desvinculaciones-editar",
    name: "Materia-Laboral-Desvinculaciones-Editar",
    element: <CrearDesvinculacionPage />,
    nodeRef: createRef(),
    className: "MateriaLaboralDesvinculacionesEditar",
  },
  {
    path: "/materias/laboral/tribunal",
    value: "materia-laboral-tribunal",
    name: "Materia-Laboral-Tribunal",
    element: <LaboralTribunalPage />,
    nodeRef: createRef(),
    className: "MateriaLaboralTribunal",
  },
  {
    path: "/materias/laboral/tribunal/crear",
    value: "materia-laboral-tribunal-crear",
    name: "Materia-Laboral-Tribunal-Crear",
    element: <CrearTribunalPage />,
    nodeRef: createRef(),
    className: "MateriaLaboralTribunalCrear",
  },
  {
    path: "/materias/laboral/tribunal/:idExpediente",
    value: "materia-laboral-tribunal",
    name: "Materia-Laboral-Tribunal",
    element: <LaboralTribunalDetallePage />,
    nodeRef: createRef(),
    className: "MateriaLaboralTribunal",
  },
  {
    path: "/materias/laboral/tribunal/:idExpediente/editar",
    value: "materia-laboral-tribunal-editar",
    name: "Materia-Laboral-Tribunal-Editar",
    element: <CrearTribunalPage />,
    nodeRef: createRef(),
    className: "MateriaLaboralTribunalEditar",
  },
  
  {
    path: "/materias/laboral/centro-conciliacion/:idExpediente/editar",
    value: "materia-laboral-centro-conciliacion-editar",
    name: "Materia-Laboral-Centro-Conciliacion-Editar",
    element: <CrearExpedientePage />,
    nodeRef: createRef(),
    className: "MateriaLaboralConciliacionEditar",
  },
  {
    path: "/materias",
    value: "materias-0",
    name: "Materias",
    element: <Materias />,
    nodeRef: createRef(),
    className: "Materias",
  },
  {
    path: "/signup",
    value: "signup-0",
    name: "Signup",
    element: <Signup />,
    nodeRef: createRef(),
    className: "Signup",
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
    path: "/home",
    value: "0-0",
    name: "Home",
    element: <Home />,
    nodeRef: createRef(),
    className: "Home",
  },
  {
    path: "/usuarios",
    value: "usuarios",
    name: "Usuarios",
    element: <UsuariosPage />,
    nodeRef: createRef(),
    className: "Usuarios",
  },
  {
    path: "/usuarios/crear",
    value: "usuarios-crear",
    name: "Usuarios-Crear",
    element: <CrearUsuarioPage />,
    nodeRef: createRef(),
    className: "UsuariosCrear",
  },
  {
    path: "/usuarios/:code/editar",
    value: "usuarios-editar",
    name: "Usuarios-Editar",
    element: <CrearUsuarioPage />,
    nodeRef: createRef(),
    className: "UsuariosEditar",
  },
  {
    path: "/usuarios/:code",
    value: "usuarios-detalle",
    name: "Usuarios-Detalle",
    element: <UsuarioDetallePage />,
    nodeRef: createRef(),
    className: "UsuariosDetalle",
  },
  {
    path: "*",
    value: "NotFound",
    name: "NotFound",
    element: <NotFound />,
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

  const token = localStorage.getItem("token");

  const publicRoutes = ["/login", "/signup", "/prelogin", "/web"];
  const isPublic = publicRoutes.includes(path);

  if (!token && !isPublic) {
    throw redirect("/login");
  }

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
      element: route.element,
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

  const hideUserPopover = ["/login", "/prelogin", "/signup"].includes(normalpath);

  const handleRightClick = (event) => {
    if (event.target.classList.contains("cardcatalogo")) {
      event.preventDefault();
    }
  };

  const onScroll = (event) => {
    dispatch(actionScroll(event.currentTarget.scrollTop));
  };

  const canShowUser = token != null && !hideUserPopover;
  const topOffset = canShowUser ? 55 : 45;

  return (
    <>
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
        }}
      >
   
        <div onScroll={onScroll} onContextMenu={handleRightClick}>
          <div>
            <SwitchTransition>
              <CSSTransition
                key={location.pathname}
                nodeRef={nodeRef}
                timeout={200}
                classNames="page"
                unmountOnExit
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

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <Provider store={store}>
    <RouterProvider router={router} />
  </Provider>
);
