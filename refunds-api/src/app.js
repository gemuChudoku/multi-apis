import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4004;

// Health DB
app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Crear refund (INSERT)
app.post("/refunds", async (req, res) => {
  const { sale_id, product_name, client_name, seller_id, quantity, unit_price, total_amount, reason, status } = req.body ?? {};
  
  if (!sale_id || !product_name || !client_name || !seller_id || !quantity || !unit_price || !total_amount || !reason) {
    return res.status(400).json({ error: "sale_id, product_name, client_name, seller_id, quantity, unit_price, total_amount y reason son requeridos" });
  }

  try {
    const r = await pool.query(
      `INSERT INTO refunds_schema.refunds (sale_id, product_name, client_name, seller_id, refund_date, quantity, unit_price, total_amount, reason, status) 
       VALUES($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [sale_id, product_name, client_name, seller_id, quantity, unit_price, total_amount, reason, status || 'pending']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});

// Listar todos los refunds (SELECT)
app.get("/refunds", async (_req, res) => {
  try {
    const r = await pool.query("SELECT * FROM refunds_schema.refunds ORDER BY id DESC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Obtener un refund por ID (SELECT individual)
app.get("/refunds/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query("SELECT * FROM refunds_schema.refunds WHERE id = $1", [id]);

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "Refund not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Actualizar refund (UPDATE)
app.put("/refunds/:id", async (req, res) => {
  const { id } = req.params;
  const { sale_id, product_name, client_name, seller_id, quantity, unit_price, total_amount, reason, status } = req.body ?? {};

  if (!sale_id || !product_name || !client_name || !seller_id || !quantity || !unit_price || !total_amount || !reason || !status) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  try {
    const r = await pool.query(
      `UPDATE refunds_schema.refunds 
       SET sale_id = $1, product_name = $2, client_name = $3, seller_id = $4, quantity = $5, 
           unit_price = $6, total_amount = $7, reason = $8, status = $9 
       WHERE id = $10 
       RETURNING *`,
      [sale_id, product_name, client_name, seller_id, quantity, unit_price, total_amount, reason, status, id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "refund not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});

// Eliminar refund (DELETE)
app.delete("/refunds/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query("DELETE FROM refunds_schema.refunds WHERE id = $1 RETURNING *", [id]);

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "refund not found" });
    }

    res.json({ message: "refund deleted", refund: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

// Health check de la aplicación
app.get("/health", (_req, res) => res.json({ status: "ok", service: "refunds-api" }));

app.listen(PORT, () => console.log(`✅ refunds-api on http://localhost:${PORT}`));