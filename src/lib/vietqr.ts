/**
 * Sinh chuỗi payload VietQR (chuẩn EMVCo / Napas) cho chuyển khoản tới tài khoản.
 * Dùng với thư viện qrcode để render QR. Không phụ thuộc dịch vụ ngoài.
 *
 * LƯU Ý: nên quét thử bằng app ngân hàng trước khi lên production.
 */

/** TLV: id(2) + length(2, zero-pad) + value */
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) → 4 hex hoa. */
function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Chỉ giữ ký tự an toàn cho nội dung chuyển khoản (ngân hàng thường strip dấu/ký tự lạ). */
function sanitizeInfo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, 25);
}

export function buildVietQrPayload(opts: {
  bin: string;
  accountNumber: string;
  amount: number;
  addInfo: string;
}): string {
  const { bin, accountNumber, amount, addInfo } = opts;

  // Field 38 — Merchant Account Information (VietQR)
  const beneficiary =
    tlv("00", bin) + tlv("01", accountNumber); // acquirer BIN + account
  const merchantAccount =
    tlv("00", "A000000727") + // GUID Napas
    tlv("01", beneficiary) +
    tlv("02", "QRIBFTTA"); // service: chuyển tới tài khoản

  // Field 62 — Additional data (08 = nội dung/mã đơn)
  const additional = tlv("08", sanitizeInfo(addInfo));

  const body =
    tlv("00", "01") + // Payload Format Indicator
    tlv("01", "12") + // Point of Initiation: dynamic (một lần, có số tiền)
    tlv("38", merchantAccount) +
    tlv("53", "704") + // currency VND
    tlv("54", String(Math.round(amount))) + // amount
    tlv("58", "VN") + // country
    tlv("62", additional);

  const toCrc = body + "6304";
  return toCrc + crc16(toCrc);
}
