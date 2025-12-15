import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../../models/User.js";

// REGISTER
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    // Check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashed,
      role: "user",
    });

    // Create JWT
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    // Check user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found." });

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials." });

    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      return res.status(500).json({ message: "Server configuration error. Please contact administrator." });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ 
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
