import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "organizer", "admin"],
      default: "user",
    },

    organizerEnabled: {
      type: Boolean,
      default: false,
    },

    organizerVerified: {
      type: Boolean,
      default: false,
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    interests: {
      type: [String],
      default: [],
    },

    city: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;