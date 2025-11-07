"use node";

import jwt from "jsonwebtoken";

export type TokenPayload = {
  userId: string;
  uuid: string;
  email: string;
};

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TOKEN_TTL || "7d";

const getEnvOrDevDefault = (name: string, devDefault: string) => {
  const value = process.env[name as keyof typeof process.env] as
    | string
    | undefined;
  if (value) return value;
  if (process.env.NODE_ENV !== "production") {
    globalThis.console?.warn?.(
      `Using insecure dev default for ${name}. Set ${name} in your environment for production.`
    );
    return devDefault;
  }
  throw new Error(`Missing required environment variable: ${name}`);
};

export const createAccessToken = (payload: TokenPayload) => {
  const secret = getEnvOrDevDefault("JWT_SECRET", "dev_jwt_secret_change_me");
  return jwt.sign(payload, secret, {
    expiresIn: ACCESS_TOKEN_TTL,
  } as jwt.SignOptions);
};

export const createRefreshToken = (payload: TokenPayload) => {
  const secret = getEnvOrDevDefault(
    "JWT_REFRESH_SECRET",
    "dev_jwt_refresh_secret_change_me"
  );
  return jwt.sign(payload, secret, {
    expiresIn: REFRESH_TOKEN_TTL,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const secret = getEnvOrDevDefault("JWT_SECRET", "dev_jwt_secret_change_me");
  return jwt.verify(token, secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const secret = getEnvOrDevDefault(
    "JWT_REFRESH_SECRET",
    "dev_jwt_refresh_secret_change_me"
  );
  return jwt.verify(token, secret) as TokenPayload;
};
