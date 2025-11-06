import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: string;
  uuid: string;
  email: string;
};

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TOKEN_TTL || "7d";

const requireEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const createAccessToken = (payload: TokenPayload) => {
  const secret = requireEnv(process.env.JWT_SECRET, "JWT_SECRET");
  return jwt.sign(payload, secret, { expiresIn: ACCESS_TOKEN_TTL } as jwt.SignOptions);
};

export const createRefreshToken = (payload: TokenPayload) => {
  const secret = requireEnv(
    process.env.JWT_REFRESH_SECRET,
    "JWT_REFRESH_SECRET"
  );
  return jwt.sign(payload, secret, { expiresIn: REFRESH_TOKEN_TTL } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const secret = requireEnv(process.env.JWT_SECRET, "JWT_SECRET");
  return jwt.verify(token, secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const secret = requireEnv(
    process.env.JWT_REFRESH_SECRET,
    "JWT_REFRESH_SECRET"
  );
  return jwt.verify(token, secret) as TokenPayload;
};
