import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { verifyJWT } from './auth.js';



 
const app = express();
app.use(cors());
app.use(express.json());
 
const PORT = process.env.PORT || 4001;
 

// Mejora opcional para tu backend
app.post("/register", async (req, res) => {
  const { full_name, email, phone_number, role, company, password } = req.body ?? {};
  
  // Validaciones más específicas
  if (!full_name?.trim()) {
    return res.status(400).json({ error: "Nombre completo requerido" });
  }
  if (!email?.trim() || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: "Email válido requerido" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Contraseña debe tener al menos 6 caracteres" });
  }
  if (!role?.trim()) {
    return res.status(400).json({ error: "Rol requerido" });
  }

  try {
    const r = await pool.query(
      `INSERT INTO users_schema.users(full_name, email, phone_number, role, company, password) 
       VALUES($1, $2, $3, $4, $5, $6) 
       RETURNING id, full_name, email, phone_number, role, company, status, created_at`,
      [full_name.trim(), email.trim(), phone_number?.trim(), role.trim(), company?.trim(), password]
    );
    
    res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: r.rows[0]
    });
    
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: "El email ya está registrado" });
    }
    console.error('Error en registro:', e);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.use(verifyJWT);


app.post("/users/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    // Buscar usuario por email y verificar contraseña
    const result = await pool.query(
      "SELECT id, full_name, email, role, company, status FROM users_schema.users WHERE email = $1 AND password = $2 AND status = 'active'",
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    
    // Login exitoso
    res.json({
      success: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        company: user.company,
        status: user.status
      },
      message: "Login successful"
    });

  } catch (e) {
    console.error("Login error:", e);
    res.status(500).json({ error: "Login failed", detail: String(e) });
  }
});

// Health DB
app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});
 
// Crear usuario (INSERT real)
app.post("/users", async (req, res) => {
  const { full_name, email, phone_number, role, company, password } = req.body ?? {};
  
  if (!full_name || !email || !role || !password) {
    return res.status(400).json({ 
      error: "full_name, email, role and password required" 
    });
  }

  try {
    const r = await pool.query(
      `INSERT INTO users_schema.users(full_name, email, phone_number, role, company, password) 
       VALUES($1, $2, $3, $4, $5, $6) 
       RETURNING id, full_name, email, phone_number, role, company, status`,
      [full_name, email, phone_number, role, company, password]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') { // Unique violation
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});
 
// Listar usuarios (SELECT real)
app.get("/users", async (_req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, full_name, email, phone_number, role, company, status FROM users_schema.users ORDER BY id ASC"
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Obtener un usuario por ID (SELECT individual)
app.get("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query(
      "SELECT id, full_name, email, phone_number, role, company, status FROM users_schema.users WHERE id = $1",
      [id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// 🔄 Actualizar usuario (UPDATE)
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { full_name, email, phone_number, role, company, status } = req.body ?? {};

  if (!full_name || !email || !role) {
    return res.status(400).json({ error: "full_name, email and role required" });
  }

  // Validar que el status sea válido si se proporciona
  if (status && !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: "status must be 'active' or 'inactive'" });
  }

  try {
    const r = await pool.query(
      `UPDATE users_schema.users 
       SET full_name = $1, email = $2, phone_number = $3, role = $4, company = $5, status = $6 
       WHERE id = $7 
       RETURNING id, full_name, email, phone_number, role, company, status`,
      [full_name, email, phone_number, role, company, status, id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "user not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    if (e.code === '23505') { // Unique violation
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});

// Actualizar contraseña (endpoint separado)
app.put("/users/:id/password", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body ?? {};

  if (!password) {
    return res.status(400).json({ error: "password required" });
  }

  try {
    const r = await pool.query(
      "UPDATE users_schema.users SET password = $1 WHERE id = $2 RETURNING id, full_name, email",
      [password, id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "user not found" });
    }

    res.json({ message: "password updated successfully", user: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "password update failed", detail: String(e) });
  }
});

// Eliminar usuario (DELETE)
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query(
      "DELETE FROM users_schema.users WHERE id = $1 RETURNING id, full_name, email",
      [id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "user not found" });
    }

    res.json({ message: "user deleted", user: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

// Mantén /health si ya lo tenías
app.get("/health", (_req, res) => res.json({ status: "ok", service: "users-api" }));

app.listen(PORT, () => console.log(`✅ users-api on http://localhost:${PORT}`));