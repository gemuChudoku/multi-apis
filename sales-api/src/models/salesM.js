import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true, // evita duplicados como 'VNT001'
  },
  fecha: {
    type: Date,
    required: true,
  },
  producto: {
    type: String,
    required: true,
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1,
  },
  precioUnitario: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
    min: 0,
  },
  cliente: {
    type: String,
    required: true,
  },
  vendedor: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,
  versionKey: false, // elimina el campo __v
  toJSON: {
    transform: (doc, ret) => {
      // elimina campos automáticos si no los necesitas
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

export default mongoose.model("Sale", saleSchema);
