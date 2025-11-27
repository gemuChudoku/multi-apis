import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function resetProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Eliminar la colección
    await mongoose.connection.db.dropCollection("products");
    console.log("✅ Colección 'products' eliminada");
    
    await mongoose.disconnect();
    console.log("🎉 Ahora usa tu modelo Product con el nuevo schema");
    
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

resetProducts();