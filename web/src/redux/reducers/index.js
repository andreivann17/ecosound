import {combineReducers} from "redux"
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
import usuarios from "./usuarios"
export default combineReducers({
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
    usuarios,
    login
})