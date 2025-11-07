import express from "express";
import fetch from "node-fetch";
import Sale from "./models/salesM.js"; // modelo de ventas
import { connectDB } from "./db.js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("../.env") });

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4003;
const USERS_API_URL = process.env.USERS_API_URL || "http://localhost:4001";
const PRODUCTS_API_URL = process.env.PRODUCTS_API_URL || "http://localhost:4002";
const DATABASE_URL = process.env.MONGO_URI;
const SERVICE = process.env.SERVICE || "sales-api";

// 🔹 Conexión a CosmosDB / MongoDB
await connectDB(DATABASE_URL);

// ========================
// 🔸 Health Checks
// ========================
app.get("/db/health", async (_req, res) => {
  try {
    await Sale.findOne(); // simple query
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// ========================
// 🔸 Endpoints
// ========================

// GET /sales/with-external
app.get("/sales/with-external", async (_req, res) => {
  try {
    const [usersRes, productsRes, sales] = await Promise.all([
      fetch(`${USERS_API_URL}/users`),
      fetch(`${PRODUCTS_API_URL}/products`),
      Sale.find()
    ]);

    const users = await usersRes.json();
    const products = await productsRes.json();

    res.json({
      sales,
      usersCount: Array.isArray(users) ? users.length : 0,
      productsCount: Array.isArray(products) ? products.length : 0
    });
  } catch (e) {
    res.status(502).json({ error: "No se pudo consultar users/products o DB", detail: String(e) });
  }
});

// GET /sales
app.get("/sales", async (_req, res) => {
  try {
    const sales = await Sale.find();
    res.json(sales);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// GET /sales/:id
app.get("/sales/:id", async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    res.json(sale);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// POST /sales
app.post("/sales", async (req, res) => {
  const { id, fecha, producto, cantidad, precioUnitario, cliente, vendedor } = req.body ?? {};
  if (!id || !producto || !cantidad || !precioUnitario || !cliente || !vendedor)
    return res.status(400).json({ error: "Campos obligatorios faltantes" });

  try {
    const total = cantidad * precioUnitario;
    const newSale = await Sale.create({
      id,
      fecha: fecha ? new Date(fecha) : new Date(),
      producto,
      cantidad,
      precioUnitario,
      total,
      cliente,
      vendedor
    });
    res.status(201).json(newSale);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});

// PUT /sales/:id
app.put("/sales/:id", async (req, res) => {
  const { fecha, producto, cantidad, precioUnitario, cliente, vendedor } = req.body ?? {};

  try {
    const total = cantidad && precioUnitario ? cantidad * precioUnitario : undefined;

    const updated = await Sale.findByIdAndUpdate(
      req.params.id,
      {
        fecha,
        producto,
        cantidad,
        precioUnitario,
        total,
        cliente,
        vendedor
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Sale not found" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});

// DELETE /sales/:id
app.delete("/sales/:id", async (req, res) => {
  try {
    const deleted = await Sale.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Sale not found" });
    res.json({ message: "Sale deleted", sale: deleted });
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

// ========================
// 🔸 Servidor uwu
// ========================
app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
  console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
  console.log(`↔️  PRODUCTS_API_URL=${PRODUCTS_API_URL}`);
  console.log(`🗄️  MONGODB_URL=${DATABASE_URL}`);
});
