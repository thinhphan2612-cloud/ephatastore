// Ephata License — client cho Electron (MAIN process) / Node 18+.
// KHÔNG chạy trong renderer: renderer chỉ hỏi trạng thái qua IPC, mọi quyết định Pro nằm ở main.
// Không cần thư viện ngoài (dùng fetch + node:crypto có sẵn).
//
// Dùng trong Electron main:
//   const { app, safeStorage, shell } = require("electron");
//   const { createLicenseClient } = require("./ephata-license");
//   const license = createLicenseClient({
//     product: "your-app-slug",                 // PHẢI trùng slug trên Ephata
//     appVersion: app.getVersion(),
//     dataDir: app.getPath("userData"),
//     encrypt: (s) => safeStorage.encryptString(s),   // token lưu mã hóa bằng kho bí mật hệ điều hành
//     decrypt: (b) => safeStorage.decryptString(b),
//   });
//   license.current()            → { status, keyMasked, offlineUntil }   (status: inactive|active|needs_verify|revoked)
//   await license.activate(key)  → view, hoặc throw Error(code)
//   license.refresh().catch(() => {})   // gọi ngầm 1 lần khi mở app
//   await license.deactivate()
//   await license.checkUpdate()  → { version, notes } | null   (bản Microsoft Store: đừng gọi)
//   shell.openExternal(license.storePageUrl)
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// Khóa công khai Ephata (dùng chung mọi app).
const PUBLIC_KEY_B64 = "7kpLmSeqXEisVs9aJ5x797uIfg1t6nHeVi6FTsuXCQU=";
const API_BASE = "https://www.ephatastore.com/api/software/v1";
// Tiền tố DER SPKI của khóa Ed25519 — ghép với 32 byte raw để Node đọc được.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function platform() {
  return process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux";
}

function parseVersion(v) {
  return String(v).trim().replace(/^v/, "").split(/[-+]/)[0].split(".").map((p) => parseInt(p, 10) || 0);
}

/** "1.2.10" > "1.2.9" (so từng phần theo số). */
function isNewer(latest, current) {
  const a = parseVersion(latest), b = parseVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d > 0;
  }
  return false;
}

function createLicenseClient({ product, appVersion, dataDir, encrypt, decrypt }) {
  if (!product || !dataDir) throw new Error("product và dataDir là bắt buộc");
  const publicKey = crypto.createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(PUBLIC_KEY_B64, "base64")]),
    format: "der",
    type: "spki",
  });
  const deviceFile = path.join(dataDir, "device.id");
  const tokenFile = path.join(dataDir, "license.bin");
  fs.mkdirSync(dataDir, { recursive: true });

  // ---- Device id: ngẫu nhiên, tạo 1 lần ----
  function deviceId() {
    try {
      const s = fs.readFileSync(deviceFile, "utf8").trim();
      if (s) return s;
    } catch {}
    const id = crypto.randomUUID().replace(/-/g, "");
    fs.writeFileSync(deviceFile, id);
    return id;
  }

  // ---- Token: mã hóa nếu có encrypt/decrypt (Electron safeStorage) ----
  function loadToken() {
    try {
      const raw = fs.readFileSync(tokenFile);
      return decrypt ? decrypt(raw) : raw.toString("utf8");
    } catch {
      return null;
    }
  }
  function saveToken(t) {
    fs.writeFileSync(tokenFile, encrypt ? encrypt(t) : Buffer.from(t, "utf8"));
  }
  function clearToken() {
    try { fs.unlinkSync(tokenFile); } catch {}
  }

  // ---- Kiểm token: chữ ký + product + deviceId + plan + hạn offline ----
  function verify(token) {
    const [p, s] = String(token).split(".");
    if (!p || !s) throw new Error("TOKEN_MALFORMED");
    // Ký trên CHUỖI payload base64 (không phải JSON đã decode).
    if (!crypto.verify(null, Buffer.from(p), publicKey, Buffer.from(s, "base64url")))
      throw new Error("TOKEN_INVALID_SIGNATURE");
    return JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  }

  const mask = (key) => (key.includes("-") ? `••••-${key.split("-").pop()}` : "••••");
  const inactive = () => ({ status: "inactive", keyMasked: null, offlineUntil: null });

  function viewFrom(token) {
    let p;
    try { p = verify(token); } catch { return inactive(); }
    if (p.product !== product || p.deviceId !== deviceId() || p.plan !== "pro") return inactive();
    return {
      status: Date.now() <= p.offlineExpiresAt ? "active" : "needs_verify",
      keyMasked: mask(p.key),
      offlineUntil: p.offlineExpiresAt,
    };
  }

  async function post(route, body) {
    let res;
    try {
      res = await fetch(`${API_BASE}${route}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new Error("NETWORK_ERROR");
    }
    try {
      return await res.json();
    } catch {
      throw new Error("SERVER_ERROR");
    }
  }

  return {
    storePageUrl: `https://www.ephatastore.com/product/${product}`,

    /** Trạng thái từ token đã lưu (chạy offline). */
    current() {
      const t = loadToken();
      return t ? viewFrom(t) : inactive();
    },

    /** Dùng ở main process để chặn chức năng Pro. */
    isPro() {
      return this.current().status === "active";
    },

    /** Nhập key → kích hoạt. throw Error(code): LICENSE_NOT_FOUND, LICENSE_REVOKED, DEVICE_LIMIT,
     *  PRODUCT_MISMATCH, NETWORK_ERROR, SERVER_ERROR, TOKEN_INVALID, KEY_EMPTY. */
    async activate(key) {
      key = String(key || "").trim();
      if (!key) throw new Error("KEY_EMPTY");
      const r = await post("/licenses/activate", {
        product, key, deviceId: deviceId(), platform: platform(), appVersion,
      });
      if (!r.ok) throw new Error(r.error || "SERVER_ERROR");
      const view = viewFrom(r.licenseToken);
      if (view.status !== "active") throw new Error("TOKEN_INVALID"); // kiểm xong mới lưu
      saveToken(r.licenseToken);
      return view;
    },

    /** Gia hạn offline + phát hiện thu hồi. Gọi ngầm 1 lần mỗi lần mở app. */
    async refresh() {
      const token = loadToken();
      if (!token) throw new Error("NO_LICENSE");
      const r = await post("/licenses/refresh", {
        product, licenseToken: token, deviceId: deviceId(), appVersion,
      });
      if (!r.ok) {
        if (r.error === "LICENSE_REVOKED" || r.error === "LICENSE_NOT_FOUND") {
          clearToken();
          return { status: "revoked", keyMasked: null, offlineUntil: null };
        }
        throw new Error(r.error || "SERVER_ERROR"); // lỗi khác: giữ token cũ
      }
      const view = viewFrom(r.licenseToken);
      if (view.status !== "active") throw new Error("TOKEN_INVALID");
      saveToken(r.licenseToken);
      return view;
    },

    /** Hủy kích hoạt thiết bị này. Luôn xóa token local kể cả khi mất mạng. */
    async deactivate() {
      const token = loadToken();
      if (token) {
        await post("/licenses/deactivate", { product, licenseToken: token, deviceId: deviceId() }).catch(() => {});
      }
      clearToken();
      return inactive();
    },

    /** Bản mới trên Ephata? Bản Microsoft Store: đừng gọi (Store tự cập nhật). */
    async checkUpdate() {
      let d;
      try {
        const res = await fetch(`${API_BASE}/products/${product}/latest?platform=${platform()}`, {
          signal: AbortSignal.timeout(12000),
        });
        d = await res.json();
      } catch {
        throw new Error("NETWORK_ERROR");
      }
      return d.ok && isNewer(d.version, appVersion) ? { version: d.version, notes: d.notes || "" } : null;
    },
  };
}

module.exports = { createLicenseClient, isNewer, platform };
