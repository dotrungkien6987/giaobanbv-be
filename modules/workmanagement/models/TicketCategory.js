const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ticketCategorySchema = Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    handlingDepartmentId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Department",
    },
    defaultSlaHours: {
      type: Number,
      min: 1,
      default: 24,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "ticket_categories",
  }
);

// Indexes
ticketCategorySchema.index({ name: 1 });
ticketCategorySchema.index({ handlingDepartmentId: 1 });
ticketCategorySchema.index({ isActive: 1 });

// Virtual for tickets in this category
ticketCategorySchema.virtual("tickets", {
  ref: "Ticket",
  localField: "_id",
  foreignField: "categoryId",
});

// Methods
ticketCategorySchema.methods.toJSON = function () {
  const category = this._doc;
  delete category.__v;
  return category;
};

// Static methods
ticketCategorySchema.statics.findActive = function () {
  return this.find({ isActive: true })
    .populate("handlingDepartmentId", "name code")
    .sort({ name: 1 });
};

ticketCategorySchema.statics.findByDepartment = function (departmentId) {
  return this.find({ handlingDepartmentId: departmentId, isActive: true }).sort(
    { name: 1 }
  );
};

const TicketCategory = mongoose.model("TicketCategory", ticketCategorySchema);
module.exports = TicketCategory;
