import express from "express";
import cors from "cors";
import client from "prom-client";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ─── Prometheus: métricas ─────────────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register }); // CPU, memoria, etc.

// 1. Contador de requests totales por endpoint y método
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total de requests HTTP recibidos",
  labelNames: ["method", "endpoint", "status_code"],
  registers: [register],
});

// 2. Histograma de latencia (tiempo de respuesta)
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de requests HTTP en segundos",
  labelNames: ["method", "endpoint"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 3, 5],
  registers: [register],
});

// 3. Gauge de requests activos
const httpRequestsActive = new client.Gauge({
  name: "http_requests_active",
  help: "Requests HTTP activos en este momento",
  registers: [register],
});

// Middleware que instrumenta automáticamente todos los endpoints
app.use((req, res, next) => {
  // Ignorar el propio /metrics para no contaminarlo
  if (req.path === "/metrics") return next();

  httpRequestsActive.inc();
  const end = httpRequestDuration.startTimer({ method: req.method, endpoint: req.path });

  res.on("finish", () => {
    httpRequestsActive.dec();
    end();
    httpRequestsTotal.inc({ method: req.method, endpoint: req.path, status_code: res.statusCode });
  });

  next();
});

// Endpoint /metrics para Prometheus
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

// ─── Datos mock en memoria ────────────────────────────────────────────────────
let users = [
  { id: 1, full_name: "Ana García",    email: "ana@example.com",    phone_number: "3001234567", role: "admin",   company: "TechCo",   status: "active" },
  { id: 2, full_name: "Luis Pérez",    email: "luis@example.com",   phone_number: "3109876543", role: "seller",  company: "VentasCo", status: "active" },
  { id: 3, full_name: "María Torres",  email: "maria@example.com",  phone_number: "3205556789", role: "buyer",   company: "ComprasCo",status: "inactive"},
  { id: 4, full_name: "Carlos Ruiz",   email: "carlos@example.com", phone_number: "3154443210", role: "seller",  company: "VentasCo", status: "active" },
  { id: 5, full_name: "Sofía Mora",    email: "sofia@example.com",  phone_number: "3001112233", role: "buyer",   company: "ComprasCo",status: "active" },
];

let products = [
  { id: 1, name: "Laptop Pro",     category: "electronics", price: 2500000, stock: 10, status: "active" },
  { id: 2, name: "Mouse Inalámbrico", category: "electronics", price: 85000, stock: 50, status: "active" },
  { id: 3, name: "Teclado Mecánico",  category: "electronics", price: 320000, stock: 25, status: "active" },
  { id: 4, name: "Monitor 24\"",      category: "electronics", price: 980000, stock: 8,  status: "active" },
  { id: 5, name: "Silla Ergonómica",  category: "furniture",   price: 1200000,stock: 5,  status: "inactive"},
];

let sales = [
  { id: 1, user_id: 2, product_id: 1, quantity: 1, total: 2500000, date: "2026-05-01", status: "completed" },
  { id: 2, user_id: 4, product_id: 2, quantity: 3, total: 255000,  date: "2026-05-05", status: "completed" },
  { id: 3, user_id: 2, product_id: 3, quantity: 2, total: 640000,  date: "2026-05-10", status: "pending"   },
  { id: 4, user_id: 4, product_id: 4, quantity: 1, total: 980000,  date: "2026-05-15", status: "completed" },
];

let returns = [
  { id: 1, sale_id: 1, user_id: 2, product_id: 1, reason: "Defecto de fábrica", date: "2026-05-03", status: "approved" },
  { id: 2, sale_id: 2, user_id: 4, product_id: 2, reason: "No era lo esperado",  date: "2026-05-08", status: "pending"  },
];

let nextId = { users: 6, products: 6, sales: 5, returns: 3 };

// ─── Endpoints principales ────────────────────────────────────────────────────

// Endpoint principal
app.get("/", (_req, res) => {
  res.json({
    service: "users-api",
    version: "1.0.0",
    description: "API REST para gestión de usuarios, productos, ventas y devoluciones",
    endpoints: ["/users", "/products", "/sales", "/returns", "/api/lento", "/health", "/metrics"]
  });
});

// Endpoint lento (simula procesamiento pesado de 2-3 segundos)
app.get("/api/lento", (_req, res) => {
  const delay = Math.floor(Math.random() * 1000) + 2000; // entre 2000ms y 3000ms
  setTimeout(() => {
    res.json({
      message: "Procesamiento lento completado",
      delay_ms: delay,
      data: { result: "ok", processed_at: new Date().toISOString() }
    });
  }, delay);
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", service: "users-api" }));

// ─── USERS ────────────────────────────────────────────────────────────────────

// Listar usuarios
app.get("/users", (_req, res) => {
  res.json(users);
});

// Obtener usuario por ID
app.get("/users/:id", (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Crear usuario
app.post("/users", (req, res) => {
  const { full_name, email, phone_number, role, company, password } = req.body ?? {};

  if (!full_name || !email || !role || !password)
    return res.status(400).json({ error: "full_name, email, role and password required" });

  if (users.find(u => u.email === email))
    return res.status(409).json({ error: "Email already exists" });

  const newUser = {
    id: nextId.users++,
    full_name, email,
    phone_number: phone_number ?? null,
    role, company: company ?? null,
    status: "active"
  };
  users.push(newUser);
  const { password: _p, ...safeUser } = { ...newUser, password };
  res.status(201).json(safeUser);
});

// Actualizar usuario
app.put("/users/:id", (req, res) => {
  const idx = users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "User not found" });

  const { full_name, email, phone_number, role, company, status } = req.body ?? {};
  if (!full_name || !email || !role)
    return res.status(400).json({ error: "full_name, email and role required" });

  if (status && !["active", "inactive"].includes(status))
    return res.status(400).json({ error: "status must be 'active' or 'inactive'" });

  users[idx] = { ...users[idx], full_name, email, phone_number, role, company, status: status ?? users[idx].status };
  res.json(users[idx]);
});

// Eliminar usuario
app.delete("/users/:id", (req, res) => {
  const idx = users.findIndex(u => u.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "User not found" });
  const [deleted] = users.splice(idx, 1);
  res.json({ message: "user deleted", user: deleted });
});

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

// Listar productos
app.get("/products", (_req, res) => {
  res.json(products);
});

// Obtener producto por ID
app.get("/products/:id", (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// Crear producto
app.post("/products", (req, res) => {
  const { name, category, price, stock } = req.body ?? {};
  if (!name || !category || price === undefined)
    return res.status(400).json({ error: "name, category and price required" });

  const newProduct = {
    id: nextId.products++,
    name, category,
    price: parseFloat(price),
    stock: stock ?? 0,
    status: "active"
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// ─── SALES ────────────────────────────────────────────────────────────────────

// Listar ventas
app.get("/sales", (_req, res) => {
  res.json(sales);
});

// Obtener venta por ID
app.get("/sales/:id", (req, res) => {
  const sale = sales.find(s => s.id === parseInt(req.params.id));
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  res.json(sale);
});

// Crear venta
app.post("/sales", (req, res) => {
  const { user_id, product_id, quantity } = req.body ?? {};
  if (!user_id || !product_id || !quantity)
    return res.status(400).json({ error: "user_id, product_id and quantity required" });

  const product = products.find(p => p.id === parseInt(product_id));
  if (!product) return res.status(404).json({ error: "Product not found" });

  const newSale = {
    id: nextId.sales++,
    user_id: parseInt(user_id),
    product_id: parseInt(product_id),
    quantity: parseInt(quantity),
    total: product.price * parseInt(quantity),
    date: new Date().toISOString().split("T")[0],
    status: "pending"
  };
  sales.push(newSale);
  res.status(201).json(newSale);
});

// ─── RETURNS ──────────────────────────────────────────────────────────────────

// Listar devoluciones
app.get("/returns", (_req, res) => {
  res.json(returns);
});

// Obtener devolución por ID
app.get("/returns/:id", (req, res) => {
  const ret = returns.find(r => r.id === parseInt(req.params.id));
  if (!ret) return res.status(404).json({ error: "Return not found" });
  res.json(ret);
});

// Crear devolución
app.post("/returns", (req, res) => {
  const { sale_id, user_id, product_id, reason } = req.body ?? {};
  if (!sale_id || !user_id || !product_id || !reason)
    return res.status(400).json({ error: "sale_id, user_id, product_id and reason required" });

  const newReturn = {
    id: nextId.returns++,
    sale_id: parseInt(sale_id),
    user_id: parseInt(user_id),
    product_id: parseInt(product_id),
    reason,
    date: new Date().toISOString().split("T")[0],
    status: "pending"
  };
  returns.push(newReturn);
  res.status(201).json(newReturn);
});

// ─── Inicio ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`✅ API corriendo en http://localhost:${PORT}`));