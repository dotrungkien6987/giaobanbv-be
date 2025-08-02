const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = Schema(
  {
    commentableType: {
      type: String,
      enum: ["TASK", "TICKET"],
      required: true,
    },
    commentableId: {
      type: Schema.ObjectId,
      required: true,
    },
    authorId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Employee",
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    parentId: {
      type: Schema.ObjectId,
      ref: "Comment",
      default: null,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "comments",
  }
);

// Indexes
commentSchema.index({ commentableType: 1, commentableId: 1 });
commentSchema.index({ authorId: 1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ createdAt: -1 });
commentSchema.index({ isDeleted: 1 });
commentSchema.index({ commentableType: 1, commentableId: 1, createdAt: -1 });
commentSchema.index({ commentableType: 1, commentableId: 1, isDeleted: 1 });

// Virtual for replies
commentSchema.virtual("replies", {
  ref: "Comment",
  localField: "_id",
  foreignField: "parentId",
  options: { sort: { createdAt: 1 } },
});

// Virtual for files
commentSchema.virtual("files", {
  ref: "FileAttachment",
  localField: "_id",
  foreignField: "attachableId",
  match: { attachableType: "COMMENT" },
});

// Methods
commentSchema.methods.toJSON = function () {
  const comment = this._doc;
  delete comment.__v;
  return comment;
};

commentSchema.methods.isReply = function () {
  return this.parentId !== null;
};

commentSchema.methods.canEdit = function (userId) {
  return this.authorId.toString() === userId.toString();
};

commentSchema.methods.canDelete = function (userId) {
  return this.authorId.toString() === userId.toString();
};

commentSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

// Static methods
commentSchema.statics.findByCommentable = function (
  commentableType,
  commentableId
) {
  return this.find({
    commentableType,
    commentableId,
    parentId: null, // Only root comments
    isDeleted: false,
  })
    .populate("authorId", "fullName employeeCode avatarUrl")
    .populate({
      path: "replies",
      match: { isDeleted: false },
      populate: {
        path: "authorId",
        select: "fullName employeeCode avatarUrl",
      },
    })
    .sort({ createdAt: -1 });
};

commentSchema.statics.findByAuthor = function (authorId) {
  return this.find({ authorId, isDeleted: false })
    .populate("authorId", "fullName employeeCode")
    .sort({ createdAt: -1 });
};

commentSchema.statics.findReplies = function (parentId) {
  return this.find({ parentId, isDeleted: false })
    .populate("authorId", "fullName employeeCode avatarUrl")
    .sort({ createdAt: 1 });
};

commentSchema.statics.getCommentStats = function (
  commentableType,
  commentableId
) {
  return this.aggregate([
    {
      $match: {
        commentableType,
        commentableId: new mongoose.Types.ObjectId(commentableId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        rootComments: {
          $sum: { $cond: [{ $eq: ["$parentId", null] }, 1, 0] },
        },
        replies: {
          $sum: { $cond: [{ $ne: ["$parentId", null] }, 1, 0] },
        },
      },
    },
  ]);
};

commentSchema.statics.findDeleted = function () {
  return this.find({ isDeleted: true })
    .populate("authorId", "fullName employeeCode")
    .sort({ updatedAt: -1 });
};

// Validation
commentSchema.pre("save", async function (next) {
  // Validate that parent comment exists and belongs to same commentable
  if (this.parentId) {
    const parentComment = await this.constructor.findById(this.parentId);
    if (!parentComment) {
      const error = new Error("Parent comment không tồn tại");
      error.name = "ValidationError";
      return next(error);
    }

    if (
      parentComment.commentableId.toString() !==
        this.commentableId.toString() ||
      parentComment.commentableType !== this.commentableType
    ) {
      const error = new Error("Parent comment phải thuộc cùng đối tượng");
      error.name = "ValidationError";
      return next(error);
    }
  }
  next();
});

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
