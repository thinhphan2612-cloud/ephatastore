// Sinh cặp khóa Ed25519 ký license phần mềm (spec: docs/software-licensing.md).
// - Private key (JWK) → ghi thẳng SOFTWARE_LICENSE_SIGNING_JWK vào .env.local, KHÔNG in ra màn hình.
// - In public key base64 (32 byte) để dán vào app (vd LICENSE_PUBLIC_KEY_B64 trong license.rs của Gelo).
// Đã có khóa → chỉ in lại public key. --force để thay khóa (MỌI token đã cấp sẽ mất hiệu lực).
// Chạy: node scripts/gen-license-keys.mjs [--force]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NAME = "SOFTWARE_LICENSE_SIGNING_JWK";
const envFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
const force = process.argv.includes("--force");

const lines = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8").split(/\r?\n/) : [];
const idx = lines.findIndex((l) => l.startsWith(`${NAME}=`));

let privateKey;
if (idx >= 0 && !force) {
  const raw = lines[idx].slice(NAME.length + 1).replace(/^'|'$/g, "");
  privateKey = crypto.createPrivateKey({ key: JSON.parse(raw), format: "jwk" });
  console.log(`${NAME} đã có trong .env.local — giữ nguyên (dùng --force để thay).`);
} else {
  ({ privateKey } = crypto.generateKeyPairSync("ed25519"));
  const line = `${NAME}='${JSON.stringify(privateKey.export({ format: "jwk" }))}'`;
  if (idx >= 0) lines[idx] = line;
  else {
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push(line, "");
  }
  fs.writeFileSync(envFile, lines.join("\n"));
  console.log(`Đã ghi ${NAME} vào .env.local.`);
}

const x = crypto.createPublicKey(privateKey).export({ format: "jwk" }).x;
console.log(`Public key (base64): ${Buffer.from(x, "base64url").toString("base64")}`);
