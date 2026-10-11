"""Ephata License — client cho app Python (Python 3.9+).

Phụ thuộc:  pip install cryptography keyring
(keyring lưu token vào kho bí mật hệ điều hành; thiếu keyring thì rơi về file — kém an toàn hơn.)
HTTP dùng urllib có sẵn, không cần requests.

Dùng:
    from ephata_license import EphataLicense
    lic = EphataLicense(product="your-app-slug",   # PHẢI trùng slug trên Ephata
                        app_name="your-app",        # tên thư mục dữ liệu
                        app_version="1.0.0")
    lic.current()            -> {"status": "inactive|active|needs_verify|revoked|removed", "key_masked", "offline_until"}
    lic.activate(key)        -> view, hoặc raise LicenseError(code)
    lic.refresh()            # gọi ngầm 1 lần khi mở app (thread riêng để không chặn UI)
    lic.deactivate()
    lic.check_update()       -> {"version", "notes"} | None   (bản Microsoft Store: đừng gọi)
    webbrowser.open(lic.store_page_url)

Build bằng Nuitka để khó dịch ngược hơn PyInstaller.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

try:
    import keyring  # type: ignore
except ImportError:  # pragma: no cover
    keyring = None

# Khóa công khai Ephata (dùng chung mọi app).
PUBLIC_KEY_B64 = "7kpLmSeqXEisVs9aJ5x797uIfg1t6nHeVi6FTsuXCQU="
API_BASE = "https://www.ephatastore.com/api/software/v1"
_KEYRING_ACCOUNT = "license-token"


class LicenseError(Exception):
    """code: LICENSE_NOT_FOUND, LICENSE_REVOKED, DEVICE_LIMIT, PRODUCT_MISMATCH,
    NETWORK_ERROR, SERVER_ERROR, TOKEN_INVALID, KEY_EMPTY, NO_LICENSE…"""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def platform() -> str:
    if sys.platform.startswith("win"):
        return "windows"
    if sys.platform == "darwin":
        return "macos"
    return "linux"


def _b64url(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _parse_version(v: str) -> list[int]:
    core = str(v).strip().lstrip("v").split("-")[0].split("+")[0]
    return [int(p) if p.isdigit() else 0 for p in core.split(".")]


def is_newer(latest: str, current: str) -> bool:
    """"1.2.10" > "1.2.9" (so từng phần theo số)."""
    a, b = _parse_version(latest), _parse_version(current)
    n = max(len(a), len(b))
    a += [0] * (n - len(a))
    b += [0] * (n - len(b))
    return a > b


def _data_dir(app_name: str) -> Path:
    if sys.platform.startswith("win"):
        base = Path(os.environ.get("APPDATA", Path.home()))
    elif sys.platform == "darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    d = base / app_name
    d.mkdir(parents=True, exist_ok=True)
    return d


class EphataLicense:
    def __init__(self, product: str, app_name: str, app_version: str):
        self.product = product
        self.app_version = app_version
        self.store_page_url = f"https://www.ephatastore.com/product/{product}"
        self._dir = _data_dir(app_name)
        self._keyring_service = f"ephata.{product}"
        self._pub = Ed25519PublicKey.from_public_bytes(base64.b64decode(PUBLIC_KEY_B64))

    # ---- Device id: ngẫu nhiên, tạo 1 lần ----
    def device_id(self) -> str:
        f = self._dir / "device.id"
        if f.exists() and f.read_text().strip():
            return f.read_text().strip()
        did = uuid.uuid4().hex
        f.write_text(did)
        return did

    # ---- Token ----
    def _load(self) -> str | None:
        if keyring:
            try:
                return keyring.get_password(self._keyring_service, _KEYRING_ACCOUNT)
            except Exception:
                return None
        f = self._dir / "license.token"
        return f.read_text() if f.exists() else None

    def _save(self, token: str) -> None:
        if keyring:
            keyring.set_password(self._keyring_service, _KEYRING_ACCOUNT, token)
        else:
            (self._dir / "license.token").write_text(token)

    def _clear(self) -> None:
        if keyring:
            try:
                keyring.delete_password(self._keyring_service, _KEYRING_ACCOUNT)
            except Exception:
                pass
        (self._dir / "license.token").unlink(missing_ok=True)

    # ---- Kiểm token: chữ ký + product + deviceId + plan + hạn offline ----
    def _verify(self, token: str) -> dict:
        try:
            p, s = token.split(".")
            self._pub.verify(_b64url(s), p.encode())  # ký trên CHUỖI payload base64
            return json.loads(_b64url(p))
        except (ValueError, InvalidSignature):
            raise LicenseError("TOKEN_INVALID")

    @staticmethod
    def _inactive() -> dict:
        return {"status": "inactive", "key_masked": None, "offline_until": None}

    def _view(self, token: str | None) -> dict:
        if not token:
            return self._inactive()
        try:
            p = self._verify(token)
        except LicenseError:
            return self._inactive()
        if p.get("product") != self.product or p.get("deviceId") != self.device_id() or p.get("plan") != "pro":
            return self._inactive()
        key = p.get("key", "")
        return {
            "status": "active" if time.time() * 1000 <= p["offlineExpiresAt"] else "needs_verify",
            "key_masked": f"••••-{key.rsplit('-', 1)[-1]}" if "-" in key else "••••",
            "offline_until": p["offlineExpiresAt"],
        }

    def current(self) -> dict:
        """Trạng thái từ token đã lưu (chạy offline)."""
        return self._view(self._load())

    def is_pro(self) -> bool:
        """Dùng ở lớp logic để chặn chức năng Pro (đừng chỉ ẩn nút)."""
        return self.current()["status"] == "active"

    def _request(self, url: str, body: dict | None = None) -> dict:
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, headers={"content-type": "application/json"},
                                     method="POST" if body is not None else "GET")
        try:
            with urllib.request.urlopen(req, timeout=12) as r:
                raw = r.read()
        except urllib.error.HTTPError as e:  # 400 BAD_REQUEST vẫn có body JSON
            raw = e.read()
        except (urllib.error.URLError, TimeoutError):
            raise LicenseError("NETWORK_ERROR")
        try:
            return json.loads(raw)
        except ValueError:
            raise LicenseError("SERVER_ERROR")

    def activate(self, key: str) -> dict:
        key = (key or "").strip()
        if not key:
            raise LicenseError("KEY_EMPTY")
        r = self._request(f"{API_BASE}/licenses/activate", {
            "product": self.product, "key": key, "deviceId": self.device_id(),
            "platform": platform(), "appVersion": self.app_version,
        })
        if not r.get("ok"):
            raise LicenseError(r.get("error") or "SERVER_ERROR")
        view = self._view(r.get("licenseToken"))
        if view["status"] != "active":
            raise LicenseError("TOKEN_INVALID")  # kiểm xong mới lưu
        self._save(r["licenseToken"])
        return view

    def refresh(self) -> dict:
        """Gia hạn offline + phát hiện thu hồi. Gọi ngầm 1 lần mỗi lần mở app."""
        token = self._load()
        if not token:
            raise LicenseError("NO_LICENSE")
        r = self._request(f"{API_BASE}/licenses/refresh", {
            "product": self.product, "licenseToken": token,
            "deviceId": self.device_id(), "appVersion": self.app_version,
        })
        if not r.get("ok"):
            # LICENSE_REVOKED = key bị thu hồi; LICENSE_NOT_FOUND khi refresh = máy này đã bị gỡ khỏi key
            # (khách tự gỡ ở Thư viện Ephata / hủy kích hoạt ở máy khác) — KHÔNG báo "thu hồi" cho trường hợp này.
            if r.get("error") in ("LICENSE_REVOKED", "LICENSE_NOT_FOUND"):
                self._clear()
                status = "revoked" if r.get("error") == "LICENSE_REVOKED" else "removed"
                return {"status": status, "key_masked": None, "offline_until": None}
            raise LicenseError(r.get("error") or "SERVER_ERROR")  # lỗi khác: giữ token cũ
        view = self._view(r.get("licenseToken"))
        if view["status"] != "active":
            raise LicenseError("TOKEN_INVALID")
        self._save(r["licenseToken"])
        return view

    def deactivate(self) -> dict:
        """Hủy kích hoạt thiết bị này. Luôn xóa token local kể cả khi mất mạng."""
        token = self._load()
        if token:
            try:
                self._request(f"{API_BASE}/licenses/deactivate", {
                    "product": self.product, "licenseToken": token, "deviceId": self.device_id(),
                })
            except LicenseError:
                pass
        self._clear()
        return self._inactive()

    def check_update(self) -> dict | None:
        """Bản mới trên Ephata? Bản Microsoft Store: đừng gọi."""
        d = self._request(f"{API_BASE}/products/{self.product}/latest?platform={platform()}")
        if d.get("ok") and is_newer(d.get("version", ""), self.app_version):
            return {"version": d["version"], "notes": d.get("notes", "")}
        return None
