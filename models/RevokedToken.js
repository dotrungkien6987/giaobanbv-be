const mongoose = require("mongoose");

const { Schema } = mongoose;

const revokedTokenSchema = new Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: {
      type: String,
      default: "logout",
      trim: true,
    },
    revokedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: false,
  },
);

module.exports = mongoose.model("RevokedToken", revokedTokenSchema);
