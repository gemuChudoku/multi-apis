import crypto from "crypto";

// JWT SECRET: el mismo que pusiste en Azure APIM
const JWT_SECRET = process.env.JWT_SECRET || "F82kD93jf02nslS9sJ3hs8Js92hfS8df";

// Función para decodificar Base64URL
function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = 4 - (str.length % 4);
  if (pad !== 4) str += "=".repeat(pad);
  return Buffer.from(str, "base64").toString();
}

export function verifyJWT(req, res, next) {
  const auth = req.headers["authorization"];

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = auth.substring(7); // remove Bearer 
  const parts = token.split(".");

  if (parts.length !== 3) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const header = JSON.parse(base64UrlDecode(headerB64));
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    // 1. Validar expiración
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return res.status(401).json({ error: "Token expired" });
    }

    // 2. Validar firma
    const data = `${headerB64}.${payloadB64}`;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(data)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    if (expectedSignature !== signatureB64) {
      return res.status(401).json({ error: "Invalid token signature" });
    }

    // 3. Guardar payload para otros endpoints
    req.user = payload;

    next();
  } catch (e) {
    console.error("JWT ERROR:", e);
    return res.status(401).json({ error: "Invalid token", detail: String(e) });
  }
}
