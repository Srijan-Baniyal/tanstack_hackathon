"use node";

import argon2 from "argon2";

export const hashPassword = async (password: string) => {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 3,
    parallelism: 1,
  });
};

export const verifyPassword = async (password: string, hashed: string) => {
  return argon2.verify(hashed, password);
};
