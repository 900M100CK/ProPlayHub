import mongoose from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new mongoose.Schema(
  {
    // === 4 TRƯỜNG BẮT BUỘC (đăng ký nhanh) ===
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
    },
    password: {
      type: String,
      required: true,
      select: false, // Không trả về khi query
    },
    name: { type: String, required: true, trim: true },

    // === 5 TRƯỜNG KHÔNG BẮT BUỘC (sẽ hoàn tất sau khi đăng nhập) ===
    displayName: {
      type: String,
      trim: true,
      // Không required → mặc định sẽ tạo từ username trong controller
      default: function () {
        return this.username;
      },
    },
    age: {
      type: Number,
      min: [13, "Must be at least 13 years old"],
      max: [120, "Age cannot exceed 120"],
    },
    location: { type: String, trim: true },
    address: { type: String, trim: true },
    gamingPlatformPreferences: {
      type: [String],
      enum: {
        values: ["PC", "PlayStation", "Xbox"],
        message: "Invalid gaming platform",
      },
      default: [], // Mặc định rỗng
    },

    // === CÁC TRƯỜNG KHÁC ===
    avatarUrl: { type: String, default: "/default-avatar.png" },
    avatarId: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    achievements: { type: [String], default: [] },
    paymentProcessorId: { type: String, trim: true, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// === Indexes ===
UserSchema.index({ location: 1 });

// === Virtuals ===
UserSchema.virtual("fullName").get(function () {
  return `${this.name} (@${this.displayName || this.username})`;
});

// === Pre-save: Hash password (chỉ khi password thay đổi) ===
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});

// === Instance Method: So sánh mật khẩu ===
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// === Tương thích ngược (nếu code cũ dùng `hashedPassword`) ===
UserSchema.virtual("hashedPassword")
  .get(function () {
    return this.password;
  })
  .set(function (v) {
    this.password = v;
  });

UserSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.paymentProcessorId;
    delete ret.__v;
    return ret;
  },
});



const User = mongoose.model("User", UserSchema);
export default User;