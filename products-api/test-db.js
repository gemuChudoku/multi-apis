import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

// Cargar el .env desde la raíz del proyecto
dotenv.config({ path: path.resolve("../.env") });

// Mostrar todas las variables cargadas (para depuración)
console.log("🔍 MONGO_URI =", process.env.MONGO_URI);

const mongoUrl = process.env.MONGO_URI;

async function testConnection() {
  try {
    console.log("🔄 Intentando conectar a MongoDB...");

    if (!mongoUrl) {
      throw new Error("❌ La variable MONGO_URI no está definida. Verifica tu archivo .env");
    }

    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true, // requerido para Cosmos DB
    });

    console.log("✅ Conexión exitosa a Cosmos DB (MongoDB API)");
    console.log(`📦 Base de datos conectada: ${mongoose.connection.name}`);

  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Conexión cerrada.");
  }
}

testConnection();
