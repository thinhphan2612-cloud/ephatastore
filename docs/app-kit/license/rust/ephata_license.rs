//! Ephata License — client cho app Rust / Tauri.
//! Chép file này vào `src-tauri/src/ephata_license.rs`, thêm `mod ephata_license;` vào lib.rs/main.rs.
//! Sửa 3 hằng ở mục CẤU HÌNH. Không phụ thuộc Tauri — gọi từ command Tauri nào cũng được.
//!
//! Cargo.toml [dependencies]:
//!   ed25519-dalek = "2"
//!   base64 = "0.22"
//!   serde = { version = "1", features = ["derive"] }
//!   serde_json = "1"
//!   reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
//!   keyring = { version = "3", features = ["apple-native", "windows-native"] }
//!   uuid = { version = "1", features = ["v4"] }
//!   dirs = "6"

use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use base64::Engine;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

// ===================== CẤU HÌNH (sửa cho từng app) =====================
/// Slug sản phẩm trên Ephata — PHẢI trùng slug khi tạo sản phẩm ở admin.
pub const PRODUCT: &str = "your-app-slug";
/// Tên thư mục dữ liệu của app (lưu device id). Đặt riêng cho từng app.
const APP_DIR_NAME: &str = "your-app";
/// Tên dịch vụ trong kho bí mật hệ điều hành (Windows Credential Manager / macOS Keychain).
const KEYRING_SERVICE: &str = "com.yourcompany.your-app";
// ======================================================================

/// Khóa công khai Ephata (dùng chung mọi app). Khóa bí mật chỉ nằm ở server Ephata.
pub const PUBLIC_KEY_B64: &str = "7kpLmSeqXEisVs9aJ5x797uIfg1t6nHeVi6FTsuXCQU=";
pub const API_BASE: &str = "https://www.ephatastore.com/api/software/v1";
const KEYRING_ACCOUNT: &str = "license-token";

/// Trang mua key / tải bản mới — mở bằng trình duyệt.
pub fn store_page_url() -> String {
    format!("https://www.ephatastore.com/product/{PRODUCT}")
}

pub fn platform() -> &'static str {
    if cfg!(target_os = "windows") { "windows" } else if cfg!(target_os = "macos") { "macos" } else { "linux" }
}

/// Trạng thái hiển thị cho UI. `Active` = Pro.
#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Inactive,
    Active,
    /// Token hợp lệ nhưng quá hạn offline — cần mạng để refresh. Coi như CHƯA Pro.
    NeedsVerify,
    /// Server báo key bị thu hồi (LICENSE_REVOKED).
    Revoked,
    /// Máy này đã bị gỡ khỏi key (khách tự gỡ ở Thư viện Ephata / hủy kích hoạt ở máy khác) — nhập lại key để dùng tiếp.
    Removed,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseView {
    pub status: Status,
    pub key_masked: Option<String>,
    pub offline_until: Option<i64>,
}

impl LicenseView {
    fn inactive() -> Self { Self { status: Status::Inactive, key_masked: None, offline_until: None } }
    pub fn is_pro(&self) -> bool { self.status == Status::Active }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Payload {
    #[serde(default)]
    product: String,
    key: String,
    device_id: String,
    plan: String,
    offline_expires_at: i64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TokenResponse {
    #[serde(default)]
    ok: bool,
    #[serde(default)]
    license_token: Option<String>,
    #[serde(default)]
    error: Option<String>,
}

fn now_ms() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

// ---------- Device id: ngẫu nhiên, tạo 1 lần, KHÔNG dùng thông tin phần cứng ----------
pub fn device_id() -> Result<String, String> {
    let dir = dirs::data_dir().ok_or("NO_DATA_DIR")?.join(APP_DIR_NAME);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join("device.id");
    if let Ok(s) = fs::read_to_string(&file) {
        if !s.trim().is_empty() { return Ok(s.trim().to_string()); }
    }
    let id = uuid::Uuid::new_v4().simple().to_string();
    fs::write(&file, &id).map_err(|e| e.to_string())?;
    Ok(id)
}

// ---------- Token lưu trong kho bí mật của hệ điều hành ----------
fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).map_err(|e| e.to_string())
}
fn load_token() -> Option<String> { entry().ok()?.get_password().ok() }
fn save_token(t: &str) -> Result<(), String> { entry()?.set_password(t).map_err(|e| e.to_string()) }
fn clear_token() { if let Ok(e) = entry() { let _ = e.delete_credential(); } }

// ---------- Kiểm token: chữ ký + product + deviceId + plan + hạn offline ----------
fn verify(token: &str) -> Result<Payload, String> {
    let (p64, s64) = token.split_once('.').ok_or("TOKEN_MALFORMED")?;
    let sig: [u8; 64] = URL_SAFE_NO_PAD.decode(s64).map_err(|_| "TOKEN_MALFORMED")?
        .try_into().map_err(|_| "TOKEN_MALFORMED")?;
    let pk: [u8; 32] = STANDARD.decode(PUBLIC_KEY_B64).map_err(|_| "BAD_PUBLIC_KEY")?
        .try_into().map_err(|_| "BAD_PUBLIC_KEY")?;
    VerifyingKey::from_bytes(&pk).map_err(|_| "BAD_PUBLIC_KEY")?
        .verify_strict(p64.as_bytes(), &Signature::from_bytes(&sig))   // ký trên CHUỖI payload base64
        .map_err(|_| "TOKEN_INVALID_SIGNATURE")?;
    let bytes = URL_SAFE_NO_PAD.decode(p64).map_err(|_| "TOKEN_MALFORMED")?;
    serde_json::from_slice(&bytes).map_err(|_| "TOKEN_MALFORMED".into())
}

fn mask(key: &str) -> String {
    key.rsplit_once('-').map(|(_, l)| format!("••••-{l}")).unwrap_or_else(|| "••••".into())
}

fn view_from(token: &str) -> LicenseView {
    let (Ok(device), Ok(p)) = (device_id(), verify(token)) else { return LicenseView::inactive() };
    if p.product != PRODUCT || p.device_id != device || p.plan != "pro" {
        return LicenseView::inactive();
    }
    LicenseView {
        status: if now_ms() <= p.offline_expires_at { Status::Active } else { Status::NeedsVerify },
        key_masked: Some(mask(&p.key)),
        offline_until: Some(p.offline_expires_at),
    }
}

/// Trạng thái hiện tại từ token đã lưu (chạy offline). Gọi lúc mở app và trước mỗi chức năng Pro.
pub fn current() -> LicenseView {
    load_token().map(|t| view_from(&t)).unwrap_or_else(LicenseView::inactive)
}

/// Dùng ở lớp lõi để chặn chức năng Pro (đừng chỉ ẩn nút ở UI).
pub fn require_pro() -> Result<(), String> {
    if current().is_pro() { Ok(()) } else { Err("PRO_REQUIRED".into()) }
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder().timeout(Duration::from_secs(12)).build().map_err(|_| "NETWORK_ERROR".into())
}

async fn post(path: &str, body: serde_json::Value) -> Result<TokenResponse, String> {
    let resp = client()?.post(format!("{API_BASE}{path}")).json(&body).send().await
        .map_err(|_| "NETWORK_ERROR".to_string())?;
    resp.json::<TokenResponse>().await.map_err(|_| "SERVER_ERROR".to_string())
}

/// Nhập key → kích hoạt thiết bị này. Err(mã lỗi) để UI dịch: LICENSE_NOT_FOUND, LICENSE_REVOKED,
/// DEVICE_LIMIT, PRODUCT_MISMATCH, NETWORK_ERROR, SERVER_ERROR, TOKEN_INVALID…
pub async fn activate(key: &str, app_version: &str) -> Result<LicenseView, String> {
    let key = key.trim();
    if key.is_empty() { return Err("KEY_EMPTY".into()); }
    let r = post("/licenses/activate", json!({
        "product": PRODUCT, "key": key, "deviceId": device_id()?,
        "platform": platform(), "appVersion": app_version,
    })).await?;
    if !r.ok { return Err(r.error.unwrap_or_else(|| "SERVER_ERROR".into())); }
    let token = r.license_token.ok_or("SERVER_ERROR")?;
    let view = view_from(&token);
    if !view.is_pro() { return Err("TOKEN_INVALID".into()); }   // kiểm xong mới lưu
    save_token(&token)?;
    Ok(view)
}

/// Gia hạn cửa sổ offline + phát hiện thu hồi. Gọi ngầm 1 lần mỗi lần mở app (khi có token).
pub async fn refresh(app_version: &str) -> Result<LicenseView, String> {
    let token = load_token().ok_or("NO_LICENSE")?;
    let r = post("/licenses/refresh", json!({
        "product": PRODUCT, "licenseToken": token, "deviceId": device_id()?, "appVersion": app_version,
    })).await?;
    if !r.ok {
        return match r.error.as_deref() {
            Some("LICENSE_REVOKED") => {
                clear_token();
                Ok(LicenseView { status: Status::Revoked, key_masked: None, offline_until: None })
            }
            // Khi refresh, LICENSE_NOT_FOUND = thiết bị không còn trong danh sách của key (đã bị gỡ) — không phải "thu hồi".
            Some("LICENSE_NOT_FOUND") => {
                clear_token();
                Ok(LicenseView { status: Status::Removed, key_masked: None, offline_until: None })
            }
            _ => Err(r.error.unwrap_or_else(|| "SERVER_ERROR".into())),   // lỗi khác: giữ token cũ
        };
    }
    let new_token = r.license_token.ok_or("SERVER_ERROR")?;
    let view = view_from(&new_token);
    if !view.is_pro() { return Err("TOKEN_INVALID".into()); }
    save_token(&new_token)?;
    Ok(view)
}

/// Hủy kích hoạt thiết bị này (giải phóng 1 suất). Luôn xóa token local kể cả khi mất mạng.
pub async fn deactivate() -> LicenseView {
    if let (Some(token), Ok(device)) = (load_token(), device_id()) {
        let _ = post("/licenses/deactivate", json!({
            "product": PRODUCT, "licenseToken": token, "deviceId": device,
        })).await;
    }
    clear_token();
    LicenseView::inactive()
}

#[derive(Clone, Debug, Serialize)]
pub struct UpdateInfo { pub version: String, pub notes: String }

/// Có bản mới trên Ephata không (so semver). Bản Microsoft Store: KHÔNG gọi (Store tự cập nhật).
pub async fn check_update(current_version: &str) -> Result<Option<UpdateInfo>, String> {
    #[derive(Deserialize)]
    struct Latest { #[serde(default)] ok: bool, #[serde(default)] version: String, #[serde(default)] notes: String }
    let url = format!("{API_BASE}/products/{PRODUCT}/latest?platform={}", platform());
    let d: Latest = client()?.get(url).send().await.map_err(|_| "NETWORK_ERROR".to_string())?
        .json().await.map_err(|_| "SERVER_ERROR".to_string())?;
    Ok((d.ok && is_newer(&d.version, current_version)).then(|| UpdateInfo { version: d.version, notes: d.notes }))
}

fn parse_version(v: &str) -> Vec<u64> {
    v.trim().trim_start_matches('v').split(['-', '+']).next().unwrap_or("")
        .split('.').map(|p| p.parse().unwrap_or(0)).collect()
}

/// "1.2.10" > "1.2.9" (so từng phần theo số).
pub fn is_newer(latest: &str, current: &str) -> bool {
    let (a, b) = (parse_version(latest), parse_version(current));
    let get = |v: &Vec<u64>, i: usize| v.get(i).copied().unwrap_or(0);
    (0..a.len().max(b.len())).map(|i| get(&a, i).cmp(&get(&b, i))).find(|o| o.is_ne())
        == Some(std::cmp::Ordering::Greater)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn semver() {
        assert!(is_newer("1.2.10", "1.2.9"));
        assert!(!is_newer("1.2.8", "1.2.8"));
        assert!(!is_newer("1.2.7", "1.2.8"));
    }
}
