const express = require("express");
const fetch = require("node-fetch");
const Product = require("./models/Product");
const connectDB = require("./db");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4002;
const USERS_API_URL = process.env.USERS_API_URL || "http://localhost:4001";
const DATABASE_URL = process.env.DATABASE_URL;
const SERVICE = process.env.SERVICE || "products-api";

// Conexión a MongoDB
connectDB(DATABASE_URL);

// Health DB
app.get("/db/health", async (_req, res) => {
  try {
    await Product.findOne(); // simple query
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// GET /products/with-users
app.get("/products/with-users", async (_req, res) => {
  try {
    const [usersRes, products] = await Promise.all([
      fetch(`${USERS_API_URL}/users`),
      Product.find()
    ]);

    const users = await usersRes.json();
    res.json({
      products,
      usersCount: Array.isArray(users) ? users.length : 0
    });
  } catch (e) {
    res.status(502).json({ error: "No se pudo consultar users-api o DB", detail: String(e) });
  }
});

// GET /products
app.get("/products", async (_req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// GET /products/:id
app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// POST /products
app.post("/products", async (req, res) => {
  const { name, price, stock } = req.body ?? {};
  if (!name || !price) return res.status(400).json({ error: "name & price required" });

  try {
    const newProduct = await Product.create({ name, price, stock: stock ?? 0 });
    res.status(201).json(newProduct);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});

// PUT /products/:id
app.put("/products/:id", async (req, res) => {
  const { name, price, stock } = req.body ?? {};
  if (!name || !price) return res.status(400).json({ error: "name & price required" });

  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { name, price, stock: stock ?? 0 },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});

// DELETE /products/:id
app.delete("/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted", product: deleted });
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

// Servidor
app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
  console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
  console.log(`🗄️  MONGODB_URL=${DATABASE_URL}`);
});
