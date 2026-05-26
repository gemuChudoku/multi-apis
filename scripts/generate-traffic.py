import requests
import time
import random

BASE_URL = "http://localhost:3000"

endpoints = [
    {"method": "GET", "url": f"{BASE_URL}/"},
    {"method": "GET", "url": f"{BASE_URL}/health"},
    {"method": "GET", "url": f"{BASE_URL}/users"},
    {"method": "GET", "url": f"{BASE_URL}/users/1"},
    {"method": "GET", "url": f"{BASE_URL}/users/2"},
    {"method": "GET", "url": f"{BASE_URL}/products"},
    {"method": "GET", "url": f"{BASE_URL}/products/1"},
    {"method": "GET", "url": f"{BASE_URL}/sales"},
    {"method": "GET", "url": f"{BASE_URL}/returns"},
    {"method": "GET", "url": f"{BASE_URL}/api/lento"},  # endpoint lento
    {"method": "GET", "url": f"{BASE_URL}/users/999"},  # genera 404
]

print("🚀 Generando tráfico sintético hacia la API...")
print(f"   URL base: {BASE_URL}")
print("   Presiona Ctrl+C para detener\n")

request_count = 0

try:
    while True:
        endpoint = random.choice(endpoints)
        method = endpoint["method"]
        url = endpoint["url"]

        try:
            start = time.time()
            response = requests.request(method, url, timeout=10)
            duration = round((time.time() - start) * 1000, 2)

            print(f"[{method}] {url} → {response.status_code} ({duration}ms)")
            request_count += 1

        except requests.exceptions.ConnectionError:
            print(f"❌ No se pudo conectar a {url} — ¿está corriendo la API?")

        # Espera aleatoria entre 0.3 y 1.5 segundos entre requests
        time.sleep(random.uniform(0.3, 1.5))

except KeyboardInterrupt:
    print(f"\n✅ Tráfico detenido. Total de requests enviados: {request_count}")