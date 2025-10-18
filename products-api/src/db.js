
import mongoose from "mongoose";

const mongoUrl = process.env.MONGO_URI;

export async function connectDB() {
  try {
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true, // obligatorio para Cosmos DB
    });
    console.log("✅ Conectado correctamente a MongoDB (Cosmos DB)");
  } catch (error) {
    console.error("❌ Error al conectar a MongoDB:", error);
    process.exit(1);
  }
}
