import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  stock: { type: Number, default: 0 }
}, {
  timestamps: true,
  versionKey: false, // elimina __v
  toJSON: {
    transform: (doc, ret) => {
      delete ret.createdAt; // opcional
      delete ret.updatedAt; // opcional
      return ret;
    }
  }
});

export default mongoose.model("Product", productSchema);
