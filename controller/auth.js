import prisma from "../config/prismaClient.js";
import bcrypt from "bcryptjs";
import { signupSchema, loginSchema } from "../validator/auth.js";
import generateToken, { clearAuthCookie } from "../lib/utils/generatetoken.js";

const formatZodError = (error) => {
  const { fieldErrors } = error.flatten();

  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0] || "Invalid input"
    ])
  );
};
const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  createdAt: true
};

export const signup = async (req, res) => {
  try {
    const parsed = signupSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodError(parsed.error)
      });
    }

    const { email, password, fullName } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName
      },
      select: publicUserSelect
    });

    generateToken(user.id, res);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
      error : error.message
    });
  }
};


export const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodError(parsed.error)
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        isActive: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive"
      });
    }

    generateToken(user.id, res);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to login",
      error : error.message
    });
  }
};


export const logout = async (req, res) => {
  try {
    clearAuthCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
      error : error.message
    });
  }
};
