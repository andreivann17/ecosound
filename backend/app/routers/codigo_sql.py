import mysql.connector
import datetime as dt

conn = mysql.connector.connect(
    host="localhost",
    port=3306,
    database="ecosound",
    user="root",
    password="",
)

try:
    # Leer todos los contratos
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT id_contrato, fecha_evento, hora_inicio, hora_final,
                   lugar_evento, id_paquete_sonido, id_paquete_fotografia,
                   id_user, id_cliente, id_ciudad
            FROM contratos
            """
        )
        contratos = cur.fetchall()

    # Ver qué combinaciones (id_evento, id_servicio) ya existen para no duplicar
    with conn.cursor() as cur:
        cur.execute("SELECT id_evento, id_servicio FROM eventos_servicios")
        ya_existen = set(cur.fetchall())

    filas = []
    now = dt.datetime.now()

    for c in contratos:
        id_ev = c["id_contrato"]

        if c["id_paquete_sonido"] and (id_ev, 1) not in ya_existen:
            filas.append((
                id_ev,
                c["fecha_evento"],
                c["hora_inicio"],
                c["hora_final"],
                c["lugar_evento"],
                c["id_paquete_sonido"],
                now,
                c["id_user"],
                c["id_cliente"],
                c["id_ciudad"],
                None,
                1,          # sonido
            ))

        if c["id_paquete_fotografia"] and (id_ev, 2) not in ya_existen:
            filas.append((
                id_ev,
                c["fecha_evento"],
                c["hora_inicio"],
                c["hora_final"],
                c["lugar_evento"],
                c["id_paquete_fotografia"],
                now,
                c["id_user"],
                c["id_cliente"],
                c["id_ciudad"],
                None,
                2,          # fotografia
            ))

    if not filas:
        print("Nada nuevo que insertar (ya existen o no tienen paquete).")
    else:
        with conn.cursor() as cur:
            cur.executemany(
                """
                INSERT INTO eventos_servicios
                    (id_evento, fecha_evento, hora_inicio, hora_final,
                     lugar, id_paquete, datetime, id_user, id_cliente,
                     id_ciudad, comentarios, id_servicio)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                filas,
            )
        conn.commit()
        print(f"Listo: {len(filas)} filas insertadas en eventos_servicios.")

finally:
    conn.close()
