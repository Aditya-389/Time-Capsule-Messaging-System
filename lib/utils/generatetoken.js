import jwt from "jsonwebtoken";

const AUTH_COOKIE_NAME = "jwt";
const AUTH_COOKIE_MAX_AGE = 15 * 24 * 60 * 60 * 1000;

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE
});

const generateToken = (userId, res) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    { sub: userId },
    process.env.JWT_SECRET,
    { expiresIn: "15d" }
  );

  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());

  return token;
};

export const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });
};

export default generateToken;
