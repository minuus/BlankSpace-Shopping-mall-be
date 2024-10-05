const mongoose = require("mongoose");
const User = require("./User");
const Product = require("./Product");
const Schema = mongoose.Schema;

const QnASchema = Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    category: { type: String, required: true },
    isSecret: { type: Boolean, required: true },
    password: { type: String, required: function() { return this.isSecret; } },
    QueryTitle: { type: String, required: true },
    QueryContent: { type: String, required: true },
    AnswerTitle: { type: String, default: "" },
    AnswerContent: { type: String, default: "" },
    isAnswered: { type: Boolean, required: true, default: false },
    isDeleted: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

QnASchema.methods.toJSON = function () {
  const obj = this._doc;
  return obj;
};

const QnA = mongoose.model("QnA", QnASchema);
module.exports = QnA;