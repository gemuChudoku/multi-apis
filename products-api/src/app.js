import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;
const SERVICE = process.env.SERVICE_NAME || "products-api";
const USERS_API_URL = process.env.USERS_API_URL || "http://users-api:4001";
const DATABASE_URL = process.env.PRODUCTS_DATABASE_URL || "postgres://caldadmin:CARLOS1011083996.@pg-multi-apis-demo-cald.postgres.database.azure.com:5432/multiapisdb?sslmode=require";

// Pool de conexión a PostgreSQL
const pool = new Pool({ connectionString: DATABASE_URL });

app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// Ejemplo de comunicación entre servicios
// GET /products/with-users -> concatena productos con conteo de usuarios
app.get("/products/with-users", async (_req, res) => {
  try {
    const [usersRes, productsRes] = await Promise.all([
      fetch(`${USERS_API_URL}/users`),
      pool.query("SELECT id, name, price, stock FROM products_schema.products ORDER BY id ASC")
    ]);

    const users = await usersRes.json();
    res.json({
      products: productsRes.rows,
      usersCount: Array.isArray(users) ? users.length : 0
    });
  } catch (e) {
    res.status(502).json({ error: "No se pudo consultar users-api o DB", detail: String(e) });
  }
});

// GET /products -> listar desde la DB
app.get("/products", async (_req, res) => {
  try {
    const r = await pool.query("SELECT id, name, price, stock FROM products_schema.products ORDER BY id ASC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// GET /products/:id -> obtener producto por ID
app.get("/products/:id", async (req, res) => {
  try {
    const r = await pool.query("SELECT id, name, price, stock FROM products_schema.products WHERE id = $1", [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// POST /products -> insertar producto
app.post("/products", async (req, res) => {
  const { name, price, stock } = req.body ?? {};
  if (!name || !price) return res.status(400).json({ error: "name & price required" });

  try {
    const r = await pool.query(
      "INSERT INTO products_schema.products(name, price, stock) VALUES($1, $2, $3) RETURNING id, name, price, stock",
      [name, price, stock ?? 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});


// PUT /products/:id -> actualizar producto
app.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, stock } = req.body ?? {};

  if (!name || !price) {
    return res.status(400).json({ error: "name & price required" });
  }

  try {
    const r = await pool.query(
      "UPDATE products_schema.products SET name = $1, price = $2, stock = $3 WHERE id = $4 RETURNING id, name, price, stock",
      [name, price, stock ?? 0, id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});

// DELETE /products/:id -> eliminar producto
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query(
      "DELETE FROM products_schema.products WHERE id = $1 RETURNING id, name, price, stock",
      [id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted", product: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});




app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
  console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
  console.log(`🗄️  PRODUCTS_DATABASE_URL=${DATABASE_URL}`);
});
