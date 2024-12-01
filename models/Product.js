const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const productSchema = Schema(
  {
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    image: { type: Array, required: true },
    category: { type: Array, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Object, required: true },
    height: { type: Number, required: true },
    weight: { type: Number, required: true }, 
    status: { type: String, default: "active" },
    isDeleted: { type: Boolean, default: false },
    washMethods: [
      {
        label: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

productSchema.methods.toJSON = function () {
  const obj = this._doc;
  delete obj._v;
  delete obj.updateAt;
  delete obj.createAt;
  return obj;
};

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
