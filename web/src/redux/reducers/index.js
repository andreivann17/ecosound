import {combineReducers} from "redux"
import { USER_LOGOUT } from "../../utils/logout"
import utils from "./utils"
import conciliacion from "./conciliacion"
import empresas from "./empresas"
import ciudades from "./ciudades"
import estados from "./estados"
import abogados from "./abogados"
import materias from "./materias"
import tipo_autoridad from "./tipo_autoridades"
import autoridades from "./autoridades"
import convenios from "./convenios"
import objetos from "./objetos"
import notificaciones from "./notificaciones"
import desvinculaciones from "./desvinculaciones"
import tribunal from "./tribunal"
import conciliacion_status from "./conciliacion_status"
import login from "./login"
import agenda from "./agenda"
import eventos from "./eventos"
import sesiones_fotos from "./sesiones_fotos"
import inventario from "./inventario"
import usuarios from "./usuarios"
import trabajadores from "./trabajadores"
import paquetes from "./paquetes"
import gastos from "./gastos"
import clientes_events from "./clientes_events"
const appReducer = combineReducers({
    materias,
    convenios,
    tipo_autoridad,
    objetos,
    notificaciones,
    empresas,
    utils,
    autoridades,
    ciudades,
    estados,
    abogados,
    conciliacion_status,
    desvinculaciones,
    tribunal,
    conciliacion,
    agenda,
    eventos,
    sesiones_fotos,
    inventario,
    usuarios,
    trabajadores,
    paquetes,
    gastos,
    clientes_events,
    login
})

// Al despachar USER_LOGOUT borramos TODO el estado en memoria del store.
// Cada reducer vuelve a su estado inicial al recibir state === undefined.
const rootReducer = (state, action) => {
    if (action && action.type === USER_LOGOUT) {
        state = undefined;
    }
    return appReducer(state, action);
}

export default rootReducer