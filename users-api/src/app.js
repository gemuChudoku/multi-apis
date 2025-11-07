import express from "express";
import cors from "cors";
import { pool } from "./db.js";
 
const app = express();
app.use(cors());
app.use(express.json());
 
const PORT = process.env.PORT || 4001;
 
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
  const { name, email } = req.body ?? {};
  if (!name || !email) return res.status(400).json({ error: "name & email required" });
 
  try {
    const r = await pool.query(
      "INSERT INTO users_schema.users(name, email) VALUES($1, $2) RETURNING id, name, email",
      [name, email]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});
 
// Listar (SELECT real)
app.get("/users", async (_req, res) => {
  try {
    const r = await pool.query("SELECT id, name, email FROM users_schema.users ORDER BY id ASC");
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
      "SELECT id, name, email FROM users_schema.users WHERE id = $1",
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
  const { name, email } = req.body ?? {};

  if (!name || !email) {
    return res.status(400).json({ error: "name & email required" });
  }

  try {
    const r = await pool.query(
      "UPDATE users_schema.users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email",
      [name, email, id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ error: "user not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});


// Eliminar usuario (DELETE)
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const r = await pool.query(
      "DELETE FROM users_schema.users WHERE id = $1 RETURNING id, name, email",
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



// ========================
// 🔐 ENDPOINTS DE AUTENTICACIÓN
// ========================

// POST /auth/register - Registrar nuevo usuario
app.post("/auth/register", async (req, res) => {
  const { full_name, email, password, phone_number, role, company } = req.body ?? {};
  
  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ 
      error: "Nombre completo, email, contraseña y rol son requeridos" 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      error: "La contraseña debe tener al menos 6 caracteres" 
    });
  }

  // Validar rol
  const validRoles = ['admin', 'user', 'manager', 'seller'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      error: "Rol inválido. Debe ser: admin, user, manager o seller" 
    });
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await pool.query(
      "SELECT id FROM users_schema.users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    // Hash de la contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const result = await pool.query(
      `INSERT INTO users_schema.users(
        full_name, email, password, phone_number, role, company, status
      ) VALUES($1, $2, $3, $4, $5, $6, 'active') 
      RETURNING id, full_name, email, phone_number, role, company, status`,
      [full_name, email, hashedPassword, phone_number || null, role, company || null]
    );

    const user = result.rows[0];
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        company: user.company,
        status: user.status
      }
    });
  } catch (e) {
    console.error("Error en registro:", e);
    res.status(500).json({ error: "Error en el registro", detail: String(e) });
  }
});

// POST /auth/login - Iniciar sesión
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  try {
    // Buscar usuario
    const result = await pool.query(
      `SELECT id, full_name, email, password, phone_number, role, company, status 
       FROM users_schema.users WHERE email = $1 AND status = 'active'`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas o usuario inactivo" });
    }

    const user = result.rows[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role,
        company: user.company,
        status: user.status
      }
    });
  } catch (e) {
    console.error("Error en login:", e);
    res.status(500).json({ error: "Error en el login", detail: String(e) });
  }
});

// GET /auth/me - Obtener perfil del usuario autenticado
app.get("/auth/me", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: "Token requerido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const result = await pool.query(
      `SELECT id, full_name, email, phone_number, role, company, status 
       FROM users_schema.users WHERE id = $1 AND status = 'active'`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado o inactivo" });
    }

    res.json({ user: result.rows[0] });
  } catch (e) {
    console.error("Error en auth/me:", e);
    res.status(401).json({ error: "Token inválido", detail: String(e) });
  }
});





 
// Mantén /health si ya lo tenías
app.get("/health", (_req, res) => res.json({ status: "okkkklkk", service: "users-api" }));
 
app.listen(PORT, () => console.log(`✅ users-api on http://localhost:${PORT}`));