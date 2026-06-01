import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    port=3306,
    database="ecosound",
    user="root",
    password="",
)

try:
    with conn.cursor() as cur:
        cur.execute("SET sql_mode = ''")

    with conn.cursor() as cur:

        # --- SONIDO (id_servicio=1): todos los contratos ---
        cur.execute(
            """
            INSERT INTO eventos_servicios
                (id_evento, fecha_evento, hora_inicio, hora_final,
                 lugar, id_paquete, datetime, id_user, id_cliente,
                 id_ciudad, id_servicio)
            SELECT
                c.id_contrato,
                c.fecha_evento,
                c.hora_inicio,
                c.hora_final,
                c.lugar_evento,
                c.id_paquete_sonido,
                NOW(),
                c.id_user,
                c.id_cliente,
                c.id_ciudad,
                1
            FROM contratos c
            WHERE NOT EXISTS (
                SELECT 1 FROM eventos_servicios es
                WHERE es.id_evento = c.id_contrato AND es.id_servicio = 1
            )
            """
        )
        sonido = cur.rowcount

        # --- FOTOGRAFIA (id_servicio=2): solo los que tienen paquete foto ---
        cur.execute(
            """
            INSERT INTO eventos_servicios
                (id_evento, fecha_evento, hora_inicio, hora_final,
                 lugar, id_paquete, datetime, id_user, id_cliente,
                 id_ciudad, id_servicio)
            SELECT
                c.id_contrato,
                c.fecha_evento,
                c.hora_inicio,
                c.hora_final,
                c.lugar_evento,
                c.id_paquete_fotografia,
                NOW(),
                c.id_user,
                c.id_cliente,
                c.id_ciudad,
                2
            FROM contratos c
            WHERE c.id_paquete_fotografia IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM eventos_servicios es
                WHERE es.id_evento = c.id_contrato AND es.id_servicio = 2
              )
            """
        )
        foto = cur.rowcount

    conn.commit()
    print(f"Sonido insertados : {sonido}")
    print(f"Foto insertados   : {foto}")
    print(f"Total             : {sonido + foto}")

finally:
    conn.close()
