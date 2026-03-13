import jwt from "jsonwebtoken";
import prisma from "../config/prismaClient.js";

const getTokenFromRequest = (req) => {
  const cookieToken = req.cookies?.jwt;

  if (cookieToken) {
    return cookieToken;
  }

  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim() || null;
};

export const protectedRoute = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured"
      });
    }

    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId =
      typeof decoded === "object" && decoded !== null
        ? decoded.sub || decoded.id
        : undefined;

    if (typeof userId !== "string") {
      return res.status(401).json({
        success: false,
        message: "Invalid token"
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};
