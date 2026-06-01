import {combineReducers} from "redux"
import { USER_LOGOUT } from "../../utils/logout"
import utils from "./utils"
import ciudades from "./ciudades"
import estados from "./estados"
import notificaciones from "./notificaciones"
import login from "./login"
import agenda from "./agenda"
import eventos from "./eventos"
import cotizaciones from "./cotizaciones"
import sesiones_fotos from "./sesiones_fotos"
import inventario from "./inventario"
import usuarios from "./usuarios"
import trabajadores from "./trabajadores"
import paquetes from "./paquetes"
import gastos from "./gastos"
import clientes_events from "./clientes_events"
const appReducer = combineReducers({
    notificaciones,
    utils,
    ciudades,
    estados,
    agenda,
    eventos,
    cotizaciones,
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