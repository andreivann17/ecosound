#!/bin/bash
# Zero-downtime-ish deploy para EcoSound
# Downtime real: ~3-5 seg (tiempo de start del contenedor nuevo)
# Para downtime = 0 necesitas Docker Swarm o Kubernetes

set -e

COMPOSE="docker compose -f docker-compose.yml"

echo "[1/5] Construyendo nuevas imágenes sin detener nada..."
$COMPOSE build backend web

echo "[2/5] Reiniciando backend (gap ~3-5s)..."
$COMPOSE up -d --no-deps --no-build backend

echo "[3/5] Esperando que backend pase healthcheck..."
until docker inspect --format='{{.State.Health.Status}}' fastapi_app 2>/dev/null | grep -q "healthy"; do
  echo "  ...esperando healthcheck..."
  sleep 3
done
echo "  Backend saludable."

echo "[4/5] Reiniciando servicio Evaluation (reusa imagen del backend)..."
$COMPOSE up -d --no-deps --no-build evaluation

echo "[5/5] Actualizando frontend (Nginx reload, sin downtime)..."
$COMPOSE up -d --no-deps --no-build web
# Nginx recarga config sin soltar conexiones activas
docker exec react_app nginx -s reload 2>/dev/null || true

echo "Deploy completado."
