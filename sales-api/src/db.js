import mongoose from "mongoose";

const mongoUrl = process.env.MONGO_URI; // ⚠️ asegurarte que coincide con docker-compose.yml

export async function connectDB() {
  try {
    if (!mongoUrl) {
      throw new Error("La variable MONGO_URI no está definida");
    }

    await mongoose.connect(mongoUrl, { tls: true });
    console.log("✅ MongoDB conectado correctamente");
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error);
    throw error;
  }
}
