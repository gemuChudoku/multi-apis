# Users API - Monitoreo y Observabilidad

**Nombre:** [Tu nombre completo]  
**Código:** [Tu código de estudiante]  
**Video:** [URL del video]

## Descripción

API REST para gestión de usuarios, productos, ventas y devoluciones, instrumentada con métricas en formato Prometheus y visualizada con Grafana. Todo el stack corre en Docker usando docker-compose.

## Arquitectura

```

Grafana:3001 -> visualización ->  Prometheus::9090 ->  Metricas -> users-api :3000  

```

## Estructura del proyecto

```
tu-proyecto/
├── docker-compose.yml
├── README.md
├── api/
│   ├── Dockerfile
│   ├── package.json
│   └── app.js
├── prometheus/
│   └── prometheus.yml
└── scripts/
    └── generate-traffic.py
```

## Requisitos

- Docker y Docker Compose
- Python 3 (para el script de tráfico)


## Instrucciones de uso

### 1. Clonar el repositorio

```bash
git clone [URL del repositorio]
cd tu-proyecto
```

### 2. Levantar el stack

```bash
docker-compose up --build
```

### 3. Verificar que los servicios estén corriendo

```bash
docker-compose ps
```

### 4. Acceder a los servicios

| Servicio    | URL                    | Credenciales      |
|-------------|------------------------|-------------------|
| API         | http://localhost:3000  | -                 |
| Prometheus  | http://localhost:9090  | -                 |
| Grafana     | http://localhost:3001  | admin / admin     |

### 5. Generar tráfico sintético

```bash
pip install requests
python scripts/generate-traffic.py
```

## Endpoints de la API

| Método | Endpoint         | Descripción                        |
|--------|------------------|------------------------------------|
| GET    | /                | Información general de la API      |
| GET    | /health          | Health check                       |
| GET    | /metrics         | Métricas en formato Prometheus     |
| GET    | /api/lento       | Simula procesamiento lento (2-3s)  |
| GET    | /users           | Listar usuarios                    |
| GET    | /users/:id       | Obtener usuario por ID             |
| POST   | /users           | Crear usuario                      |
| PUT    | /users/:id       | Actualizar usuario                 |
| DELETE | /users/:id       | Eliminar usuario                   |
| GET    | /products        | Listar productos                   |
| GET    | /products/:id    | Obtener producto por ID            |
| POST   | /products        | Crear producto                     |
| GET    | /sales           | Listar ventas                      |
| GET    | /sales/:id       | Obtener venta por ID               |
| POST   | /sales           | Crear venta                        |
| GET    | /returns         | Listar devoluciones                |
| GET    | /returns/:id     | Obtener devolución por ID          |
| POST   | /returns         | Crear devolución                   |

## Métricas implementadas

| Métrica | Tipo | Descripción |
|---------|------|-------------|
| `http_requests_total` | Counter | Total de requests por endpoint, método y status code |
| `http_request_duration_seconds` | Histogram | Latencia de requests en segundos |
| `http_requests_active` | Gauge | Requests activos en tiempo real |
| `process_cpu_seconds_total` | Counter | Uso de CPU del proceso |
| `process_resident_memory_bytes` | Gauge | Uso de memoria RAM |

## Queries PromQL útiles

```promql
# Requests por segundo
rate(http_requests_total[1m])

# Latencia promedio
rate(http_request_duration_seconds_sum[1m]) / rate(http_request_duration_seconds_count[1m])

# Requests activos
http_requests_active

# Requests por endpoint
sum by (endpoint) (rate(http_requests_total[1m]))


```

## Dashboard de Grafana

El dashboard **Users API - Monitoreo** incluye 3 paneles:

1. **Requests por segundo** - Throughput de la API en tiempo real
2. **Latencia promedio** - Tiempo de respuesta promedio en segundos
3. **Requests activos** - Número de requests siendo procesados en este momento

## Apagar el stack

```bash
docker-compose down
```

Para eliminar también los volúmenes de datos:

```bash
docker-compose down -v
```
