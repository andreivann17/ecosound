-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 17-04-2026 a las 02:45:39
-- Versión del servidor: 8.0.40
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `ecosound`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `agenda`
--

CREATE TABLE `agenda` (
  `id_agenda` int NOT NULL,
  `id_agenda_evento` int NOT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime NOT NULL,
  `id_user` int NOT NULL,
  `title` varchar(125) NOT NULL,
  `source_table` varchar(55) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `all_day` int NOT NULL,
  `status` enum('active','canceled','completed') NOT NULL,
  `location` text NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `source_id` int DEFAULT NULL,
  `active` int NOT NULL,
  `id_ciudad` int NOT NULL,
  `reminder` varchar(10) NOT NULL,
  `in_person` int NOT NULL,
  `is_recurring` int NOT NULL,
  `datetime` datetime DEFAULT NULL,
  `url` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `agenda`
--

INSERT INTO `agenda` (`id_agenda`, `id_agenda_evento`, `start_at`, `end_at`, `id_user`, `title`, `source_table`, `all_day`, `status`, `location`, `description`, `source_id`, `active`, `id_ciudad`, `reminder`, `in_person`, `is_recurring`, `datetime`, `url`) VALUES
(554, 1, '2026-04-07 20:00:00', '2026-04-08 02:16:00', 2, 'Contrato ARACELY AYALA', 'contratos', 0, 'active', 'CHIHUAHUA Y 6 #600 - CASA PARTICULAR', 'Contrato 6HEVC23MOTYM para ARACELY AYALA. Evento el 2026-04-07 de 20:00 a 02:16. Lugar: CHIHUAHUA Y 6 #600 - CASA PARTICULAR.', 6, 1, 1, '15m', 1, 0, '2026-04-12 21:10:24', '/contratos/6'),
(555, 1, '2026-04-07 20:00:00', '2026-04-08 02:16:00', 2, 'Contrato ARACELY AYALA', 'contratos', 0, 'active', 'CHIHUAHUA Y 6 #600 - CASA PARTICULAR', 'Contrato 6HEVC23MOTYM para ARACELY AYALA. Evento el 2026-04-07 de 20:00 a 02:16. Lugar: CHIHUAHUA Y 6 #600 - CASA PARTICULAR.', 6, 1, 1, '15m', 1, 0, '2026-04-12 21:10:57', '/contratos/6');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `agenda_documentos`
--

CREATE TABLE `agenda_documentos` (
  `id_agenda_documento` int NOT NULL,
  `filename` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL,
  `id_agenda` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `agenda_evento`
--

CREATE TABLE `agenda_evento` (
  `id_agenda_evento` int NOT NULL,
  `nombre` varchar(35) NOT NULL,
  `active` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `agenda_evento`
--

INSERT INTO `agenda_evento` (`id_agenda_evento`, `nombre`, `active`) VALUES
(1, 'Bodas', 1),
(2, 'XV', 1),
(3, 'Graduacion', 1),
(4, 'Coporativo', 1),
(5, 'Cumpleaños', 1),
(6, 'Citas', 1),
(7, 'Reunion Zoom', 1),
(8, 'Pendiente', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `agenda_recurrence`
--

CREATE TABLE `agenda_recurrence` (
  `id_recurrence` int NOT NULL,
  `id_agenda` int NOT NULL,
  `rule_json` json NOT NULL,
  `until` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `audit_log`
--

CREATE TABLE `audit_log` (
  `id_audit_log` int NOT NULL,
  `action` enum('CREATE','UPDATE','DELETE','UPLOAD_FILE','DELETE_FILE','DOWNLOAD_FILE','GENERATE_PDF','LOGIN','LOGOUT') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `changes` json DEFAULT NULL,
  `extra` json DEFAULT NULL,
  `ip_address` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_agent` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_user` int NOT NULL,
  `datetime` datetime NOT NULL,
  `id_modulo` int NOT NULL,
  `id_key` int NOT NULL,
  `message` varchar(125) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `audit_log`
--

INSERT INTO `audit_log` (`id_audit_log`, `action`, `changes`, `extra`, `ip_address`, `user_agent`, `id_user`, `datetime`, `id_modulo`, `id_key`, `message`) VALUES
(903, 'UPDATE', '{\"celular\": \"6531018255\", \"importe\": \"23000.00\", \"domicilio\": null, \"id_ciudad\": 1, \"comentarios\": \"notas\", \"fecha_evento\": \"2026-04-07T00:00:00\", \"lugar_evento\": \"CHIHUAHUA Y 6 #600 - CASA PARTICULAR\", \"cliente_nombre\": \"ARACELY AYALA\", \"id_tipo_evento\": 6}', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', 2, '2026-04-10 22:26:09', 2, 6, 'Contrato actualizado'),
(904, 'CREATE', NULL, '{\"codigo\": \"CP8KI5ISLOKV\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', 2, '2026-04-12 20:55:22', 2, 7, 'Contrato creado para Marisol Medina'),
(905, 'CREATE', NULL, '{\"codigo\": \"94SHIC656RLZ\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', 2, '2026-04-12 21:01:34', 2, 8, 'Contrato creado para Ivon Flores'),
(906, 'UPDATE', '{\"celular\": \"6531018255\", \"importe\": \"23000.00\", \"domicilio\": null, \"id_ciudad\": 1, \"comentarios\": \"notas\", \"fecha_evento\": \"2026-04-07T00:00:00\", \"lugar_evento\": \"CHIHUAHUA Y 6 #600 - CASA PARTICULAR\", \"cliente_nombre\": \"ARACELY AYALA\", \"fecha_anticipo\": \"2026-01-02T00:00:00\", \"id_tipo_evento\": 6, \"importe_anticipo\": \"5000.00\"}', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', 2, '2026-04-12 21:10:24', 2, 6, 'Contrato actualizado'),
(907, 'UPDATE', '{\"celular\": \"6531018255\", \"importe\": \"23000.00\", \"domicilio\": null, \"id_ciudad\": 1, \"comentarios\": \"notas\", \"fecha_evento\": \"2026-04-07T00:00:00\", \"lugar_evento\": \"CHIHUAHUA Y 6 #600 - CASA PARTICULAR\", \"cliente_nombre\": \"ARACELY AYALA\", \"fecha_anticipo\": \"2026-01-02T00:00:00\", \"id_tipo_evento\": 2, \"importe_anticipo\": \"5000.00\"}', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', 2, '2026-04-12 21:10:57', 2, 6, 'Contrato actualizado'),
(908, 'UPDATE', '{\"celular\": \"6531018255\", \"importe\": \"23000.00\", \"domicilio\": null, \"id_ciudad\": 1, \"comentarios\": \"notas\", \"fecha_evento\": \"2026-04-07T00:00:00\", \"lugar_evento\": \"CHIHUAHUA Y 6 #600 - CASA PARTICULAR\", \"cliente_nombre\": \"ARACELY AYALA\", \"fecha_anticipo\": \"2026-01-02T00:00:00\", \"id_tipo_evento\": 2, \"importe_anticipo\": \"5000.00\"}', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', 2, '2026-04-12 21:15:48', 2, 6, 'Contrato actualizado');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ciudades`
--

CREATE TABLE `ciudades` (
  `id_ciudad` int NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `active` tinyint(1) NOT NULL,
  `color_hex` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `ciudades`
--

INSERT INTO `ciudades` (`id_ciudad`, `nombre`, `active`, `color_hex`) VALUES
(1, 'San Luis Rio Colorado', 1, '#1677FF'),
(2, 'Mexicali', 1, '#111827'),
(3, 'Puerto Peñasco', 1, '#7B1E3A');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contratos`
--

CREATE TABLE `contratos` (
  `id_contrato` int NOT NULL,
  `id_user` int NOT NULL,
  `cliente_nombre` varchar(120) NOT NULL,
  `fecha_evento` datetime DEFAULT NULL,
  `lugar_evento` varchar(100) NOT NULL,
  `hora_inicio` timestamp NULL DEFAULT NULL,
  `hora_final` timestamp NULL DEFAULT NULL,
  `importe` varchar(12) NOT NULL,
  `fecha_anticipo` datetime DEFAULT NULL,
  `importe_anticipo` varchar(12) NOT NULL,
  `datetime` datetime NOT NULL,
  `code` varchar(12) NOT NULL,
  `active` tinyint(1) NOT NULL,
  `id_tipo_evento` int NOT NULL,
  `celular` varchar(15) NOT NULL,
  `domicilio` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `id_ciudad` int NOT NULL,
  `comentarios` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `contratos`
--

INSERT INTO `contratos` (`id_contrato`, `id_user`, `cliente_nombre`, `fecha_evento`, `lugar_evento`, `hora_inicio`, `hora_final`, `importe`, `fecha_anticipo`, `importe_anticipo`, `datetime`, `code`, `active`, `id_tipo_evento`, `celular`, `domicilio`, `id_ciudad`, `comentarios`) VALUES
(6, 2, 'ARACELY AYALA', '2026-04-07 00:00:00', 'CHIHUAHUA Y 6 #600 - CASA PARTICULAR', '2026-04-08 03:00:00', '2026-04-08 09:16:00', '23000.00', '2026-01-02 00:00:00', '5000.00', '2026-04-06 14:09:43', '6HEVC23MOTYM', 1, 2, '6531018255', '', 1, 'notas'),
(7, 2, 'Marisol Medina', '2026-03-28 00:00:00', 'Salon Sindetel', '2026-03-29 03:00:00', '2026-03-29 09:00:00', '16000.00', '2025-12-17 00:00:00', '2000.00', '2026-04-12 20:55:22', 'CP8KI5ISLOKV', 1, 6, '6531209041', NULL, 1, NULL),
(8, 2, 'Ivon Flores', '2026-10-23 00:00:00', 'SNTE - Carranza y 18', '2026-10-24 03:00:00', '2026-10-24 09:00:00', '29000.00', '2025-12-08 00:00:00', '3000.00', '2026-04-12 21:01:35', '94SHIC656RLZ', 1, 2, '6531087054', 'Cjon. Madero 47 y 48', 1, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contratos_abonos`
--

CREATE TABLE `contratos_abonos` (
  `id_contrato_abono` int NOT NULL,
  `importe` varchar(8) NOT NULL,
  `fecha` datetime NOT NULL,
  `active` tinyint(1) NOT NULL,
  `id_user` int NOT NULL,
  `id_contrato` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `contratos_abonos`
--

INSERT INTO `contratos_abonos` (`id_contrato_abono`, `importe`, `fecha`, `active`, `id_user`, `id_contrato`) VALUES
(1, '599', '2026-04-29 00:00:00', 1, 2, 6),
(2, '500', '2026-04-23 00:00:00', 1, 2, 8);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contratos_documentos`
--

CREATE TABLE `contratos_documentos` (
  `id_contacto_documento` int NOT NULL,
  `id_contrato` int NOT NULL,
  `active` tinyint(1) NOT NULL,
  `filename` varchar(135) NOT NULL,
  `path` varchar(135) NOT NULL,
  `id_user` int NOT NULL,
  `id_tipo_documento` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `contratos_documentos`
--

INSERT INTO `contratos_documentos` (`id_contacto_documento`, `id_contrato`, `active`, `filename`, `path`, `id_user`, `id_tipo_documento`) VALUES
(1, 6, 0, 'contrato_6HEVC23MOTYM.pdf', 'uploads/contratos/6/20260409_110507_contrato_6HEVC23MOTYM.pdf', 2, 1),
(2, 6, 0, 'contrato_6HEVC23MOTYM.pdf', 'uploads/contratos/6/20260409_110744_contrato_6HEVC23MOTYM.pdf', 2, 1),
(3, 6, 0, 'contrato_6HEVC23MOTYM.pdf', 'uploads/contratos/6/20260409_113559_contrato_6HEVC23MOTYM.pdf', 2, 1),
(4, 6, 0, 'contrato_6HEVC23MOTYM.pdf', 'uploads/contratos/6/20260409_114036_contrato_6HEVC23MOTYM.pdf', 2, 1),
(5, 6, 0, 'Convocatoria_BEXT_CyH_2025-20251120T204825.pdf', 'uploads/contratos/6/20260409_114100_Convocatoria_BEXT_CyH_2025-20251120T204825.pdf', 2, 1),
(6, 6, 0, 'Agenda Semanal.pdf', 'uploads/contratos/6/20260409_175609_Agenda_Semanal.pdf', 2, 2),
(7, 6, 0, 'contrato_6HEVC23MOTYM.pdf', 'uploads/contratos/6/20260409_175624_contrato_6HEVC23MOTYM.pdf', 2, 2),
(8, 7, 1, 'MARISOL MEDINA 28 DE MARZO 2026.pdf', 'uploads/contratos/7/20260412_205522_MARISOL_MEDINA_28_DE_MARZO_2026.pdf', 2, 1),
(9, 8, 1, 'IVON FLORES.pdf', 'uploads/contratos/8/20260412_210134_IVON_FLORES.pdf', 2, 1),
(10, 6, 1, '07 - ARACELY AYALA.pdf', 'uploads/contratos/6/20260412_211548_07_-_ARACELY_AYALA.pdf', 2, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipo_eventos`
--

CREATE TABLE `tipo_eventos` (
  `id_tipo_evento` int NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `tipo_eventos`
--

INSERT INTO `tipo_eventos` (`id_tipo_evento`, `nombre`, `active`) VALUES
(1, 'Bodas', 1),
(2, 'XV', 1),
(3, 'Graduacion', 1),
(4, 'Coporativo', 1),
(5, 'Cumpleaños', 1),
(6, 'Otro', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id_user` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `password` varbinary(255) DEFAULT NULL,
  `token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  `id_user_creation` int DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `code` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id_user`, `name`, `password`, `token`, `email`, `datetime`, `id_user_creation`, `active`, `code`) VALUES
(2, 'andre Ivann Herrera', 0x243262243130246a4647695471382f547530356a616c4b346e567231655059365475635a516746554f773664563471736e4753336b6c39716751336d, 'cc4aa3e86d', 'andreivann17@gmail.com', NULL, NULL, 1, 'uhte422v5hy6'),
(12, 'Daniel Herrera', 0x243262243130244f4851374a74367771506849367039756164694251656c4a6a383378434e654d617474616877667653336d4a706472706958754657, NULL, 'daniel@gmail.com', '2026-04-12 12:24:59', 2, 0, '714de9bf5d61');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users_reset_tokens`
--

CREATE TABLE `users_reset_tokens` (
  `id` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `code` varchar(64) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `used` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Volcado de datos para la tabla `users_reset_tokens`
--

INSERT INTO `users_reset_tokens` (`id`, `email`, `code`, `created_at`, `used`) VALUES
(1, 'andreivann17@gmail.com', 'fe0ba0a14f', '2025-12-11 12:35:57', 0),
(2, 'andreivann17@gmail.com', 'fb772f321f', '2025-12-11 12:40:13', 0),
(3, 'andreivann17@gmail.com', '18e1a59730', '2025-12-11 12:40:35', 0),
(4, 'andreivann17@gmail.com', 'ae6709c33b', '2025-12-11 12:41:45', 0),
(5, 'andreivann17@gmail.com', 'd02bd0521c', '2025-12-11 12:46:57', 0),
(6, 'andreivann17@gmail.com', 'c3bf29c405', '2025-12-11 12:55:06', 0),
(7, 'andreivann17@gmail.com', '7d07775d5b', '2025-12-11 12:58:05', 0),
(8, 'andreivann17@gmail.com', '1af19602c7', '2025-12-11 12:59:29', 0),
(9, 'andreivann17@gmail.com', '352d4097ff', '2025-12-11 16:08:41', 0),
(10, 'andreivann17@gmail.com', '8c9c4e9315', '2025-12-11 16:09:13', 0),
(11, 'andreivann17@gmail.com', 'a2e1521ed5', '2025-12-11 16:29:22', 0),
(12, 'andreivann17@gmail.com', 'e8ae691545', '2025-12-11 16:32:43', 0),
(13, 'andreivann17@gmail.com', '1341ec905a', '2025-12-11 16:42:26', 0),
(14, 'andreivann17@gmail.com', '2a983e76f2', '2025-12-11 20:25:23', 0),
(15, 'andreivann17@gmail.com', '20320e45c4', '2025-12-11 20:26:08', 0),
(16, 'andreivann17@gmail.com', 'c81d2ff8ce', '2025-12-11 20:31:09', 0),
(17, 'andreivann17@gmail.com', 'a923310b19', '2025-12-11 20:31:28', 0),
(18, 'andreivann17@gmail.com', '8d1862f667', '2025-12-11 20:33:53', 0),
(19, 'braulio@ontiverosyasociados.com.mx', '9b6534b05b', '2025-12-13 11:47:38', 0),
(20, 'vmog@hotmail.com', '0070bd14c2', '2025-12-13 14:09:17', 0),
(21, 'braulio@ontiverosyasociados.com.mx', '93e5f28403', '2025-12-18 10:35:57', 0),
(22, 'andreivann17@gmail.com', 'e08cfe7b92', '2025-12-18 11:07:48', 0),
(23, 'andreivann17@gmail.com', 'f0df4faee5', '2025-12-18 12:41:33', 0),
(24, 'andreivann17@gmail.com', 'e0354d04b7', '2025-12-18 12:54:08', 1),
(25, 'braulio@ontiverosyasociados.com.mx', 'd99d4db933', '2025-12-18 12:55:08', 1),
(26, 'administracion@ontiverosyasociados.com.mx', 'a429dbf61a', '2025-12-31 18:33:50', 0),
(27, 'administracion@ontiverosyasociados.com.mx', '7b8dc2c2fd', '2025-12-31 18:37:17', 1),
(28, 'recepcion@ontiverosyasociados.com.mx', '4fcdf965d2', '2025-12-31 18:40:43', 1),
(29, 'recepcionmxl@ontiverosyasociados.com.mx', 'bad403dc0f', '2026-01-02 18:34:42', 1),
(30, 'livier@ontiverosyasociados.com.mx', '606334a927', '2026-01-05 21:03:53', 1),
(31, 'michell@ontiverosyasociados.com.mx', 'be8440294c', '2026-01-06 20:08:58', 1),
(32, 'vmog@hotmail.com', '90b255bc75', '2026-01-06 20:31:46', 1),
(33, 'ricardo@ontiverosyasociados.com.mx', '10d524eb7b', '2026-01-06 22:42:40', 1),
(34, 'abogadosmxl@ontiverosyasociados.com.mx', '3a82bce641', '2026-01-07 22:23:51', 1),
(35, 'livier@ontiverosyasociados.com.mx', 'dc34409512', '2026-01-13 22:15:31', 1),
(36, 'andreivann17@gmail.com', 'ea50cfba67', '2026-04-08 22:09:57', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_privileges`
--

CREATE TABLE `user_privileges` (
  `id_user` int NOT NULL,
  `name` varchar(155) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `resource` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `consulta` tinyint(1) NOT NULL,
  `insertar` tinyint(1) NOT NULL,
  `editar` tinyint(1) NOT NULL,
  `eliminar` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `user_privileges`
--

INSERT INTO `user_privileges` (`id_user`, `name`, `resource`, `consulta`, `insertar`, `editar`, `eliminar`) VALUES
(2, 'Centro de Conciliacion', 'conciliacion', 0, 0, 0, 0),
(2, 'usuarios', 'users', 0, 0, 0, 0);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `agenda`
--
ALTER TABLE `agenda`
  ADD PRIMARY KEY (`id_agenda`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_agenda_evento` (`id_agenda_evento`),
  ADD KEY ` source_id` (`source_id`),
  ADD KEY `id_ciudad` (`id_ciudad`);

--
-- Indices de la tabla `agenda_documentos`
--
ALTER TABLE `agenda_documentos`
  ADD PRIMARY KEY (`id_agenda_documento`),
  ADD KEY `id_agenda` (`id_agenda`);

--
-- Indices de la tabla `agenda_evento`
--
ALTER TABLE `agenda_evento`
  ADD PRIMARY KEY (`id_agenda_evento`);

--
-- Indices de la tabla `agenda_recurrence`
--
ALTER TABLE `agenda_recurrence`
  ADD PRIMARY KEY (`id_recurrence`),
  ADD KEY `id_agenda` (`id_agenda`);

--
-- Indices de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id_audit_log`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_modulo` (`id_modulo`),
  ADD KEY `id_key` (`id_key`);

--
-- Indices de la tabla `ciudades`
--
ALTER TABLE `ciudades`
  ADD PRIMARY KEY (`id_ciudad`);

--
-- Indices de la tabla `contratos`
--
ALTER TABLE `contratos`
  ADD PRIMARY KEY (`id_contrato`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_tipo_evento` (`id_tipo_evento`),
  ADD KEY `id_ciudad` (`id_ciudad`);

--
-- Indices de la tabla `contratos_abonos`
--
ALTER TABLE `contratos_abonos`
  ADD PRIMARY KEY (`id_contrato_abono`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_contrato` (`id_contrato`);

--
-- Indices de la tabla `contratos_documentos`
--
ALTER TABLE `contratos_documentos`
  ADD PRIMARY KEY (`id_contacto_documento`),
  ADD KEY `id_contrato` (`id_contrato`),
  ADD KEY `id_user` (`id_user`),
  ADD KEY `id_tipo_documento` (`id_tipo_documento`);

--
-- Indices de la tabla `tipo_eventos`
--
ALTER TABLE `tipo_eventos`
  ADD PRIMARY KEY (`id_tipo_evento`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id_user`),
  ADD KEY `idUserCreation` (`id_user_creation`);

--
-- Indices de la tabla `users_reset_tokens`
--
ALTER TABLE `users_reset_tokens`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `user_privileges`
--
ALTER TABLE `user_privileges`
  ADD PRIMARY KEY (`id_user`,`resource`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `agenda`
--
ALTER TABLE `agenda`
  MODIFY `id_agenda` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=556;

--
-- AUTO_INCREMENT de la tabla `agenda_documentos`
--
ALTER TABLE `agenda_documentos`
  MODIFY `id_agenda_documento` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `agenda_evento`
--
ALTER TABLE `agenda_evento`
  MODIFY `id_agenda_evento` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `agenda_recurrence`
--
ALTER TABLE `agenda_recurrence`
  MODIFY `id_recurrence` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id_audit_log` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=909;

--
-- AUTO_INCREMENT de la tabla `ciudades`
--
ALTER TABLE `ciudades`
  MODIFY `id_ciudad` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `contratos`
--
ALTER TABLE `contratos`
  MODIFY `id_contrato` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `contratos_abonos`
--
ALTER TABLE `contratos_abonos`
  MODIFY `id_contrato_abono` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `contratos_documentos`
--
ALTER TABLE `contratos_documentos`
  MODIFY `id_contacto_documento` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT de la tabla `tipo_eventos`
--
ALTER TABLE `tipo_eventos`
  MODIFY `id_tipo_evento` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id_user` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT de la tabla `users_reset_tokens`
--
ALTER TABLE `users_reset_tokens`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`id_user_creation`) REFERENCES `users` (`id_user`);

--
-- Filtros para la tabla `user_privileges`
--
ALTER TABLE `user_privileges`
  ADD CONSTRAINT `fk_up_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
