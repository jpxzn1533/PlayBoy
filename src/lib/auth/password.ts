import bcrypt from "bcryptjs";

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Usado para equalizar o tempo de resposta quando o e-mail não existe (evita enumeração de contas).
let dummyHash: Promise<string> | null = null;
export function getDummyHash() {
  dummyHash ??= bcrypt.hash("playboy-store-dummy-password", COST);
  return dummyHash;
}
