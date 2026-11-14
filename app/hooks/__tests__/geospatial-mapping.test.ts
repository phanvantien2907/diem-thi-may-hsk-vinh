import test from "node:test";
import assert from "node:assert/strict";
import {
  matchProvinceByName,
  matchWardByName,
  sanitizeOCRPayload,
} from "../useOCRScanner.ts";

test("sanitizeOCRPayload preserves backend province_id, ward_id, and legacy metadata", () => {
  const sanitized = sanitizeOCRPayload({
    id_number: "187583952",
    full_name: "NGUYỄN THỊ HUYỀN TRANG",
    dob: "10/04/1997",
    gender: null,
    address: "Xã Nam Lộc, Huyện Nam Đàn, Nghệ An",
    address_province: "Tỉnh Nghệ An",
    address_district: "Huyện Nam Đàn",
    address_ward: "Xã Nam Đàn",
    address_detail: "Xã Nam Lộc, Huyện Nam Đàn, Nghệ An",
    province_id: 6,
    ward_id: 17935,
    is_legacy_address: true,
    legacy_ward_name: "Xã Nam Lộc",
  });

  assert.ok(sanitized);
  assert.equal(sanitized.gender, null);
  assert.equal(sanitized.province_id, 6);
  assert.equal(sanitized.ward_id, 17935);
  assert.equal(sanitized.is_legacy_address, true);
  assert.equal(sanitized.legacy_ward_name, "Xã Nam Lộc");
});

test("matchProvinceByName maps pre-merger provinces (v1) to post-merger provinces (v2)", () => {
  const provinces = [
    { id: 1, name: "Thành phố Hà Nội" },
    { id: 6, name: "Tỉnh Nghệ An" },
    { id: 20, name: "Thành phố Đà Nẵng" },
    { id: 31, name: "Tỉnh An Giang" },
    { id: 19, name: "Thành phố Huế" },
  ];

  assert.equal(matchProvinceByName(provinces, "Tỉnh Kiên Giang")?.id, 31);
  assert.equal(matchProvinceByName(provinces, "Quảng Nam")?.id, 20);
  assert.equal(matchProvinceByName(provinces, "Thừa Thiên Huế")?.id, 19);
  assert.equal(matchProvinceByName(provinces, "Nghệ An")?.id, 6);
});

test("matchWardByName resolves legacy CMND wards, Vinh active wards, and minor OCR typos", () => {
  const ngheAnWards = [
    { id: 33, name: "Phường Hà Huy Tập" },
    { id: 16681, name: "Phường Thành Vinh" },
    { id: 17935, name: "Xã Nam Đàn" },
    { id: 16732, name: "Phường Cửa Lò" },
  ];

  // Pre-merger commune on 9-digit CMND
  assert.equal(
    matchWardByName(ngheAnWards, "Xã Nam Lộc", "Xã Nam Lộc, Huyện Nam Đàn, Nghệ An")?.id,
    17935
  );

  // Vinh ward abbreviation
  assert.equal(
    matchWardByName(ngheAnWards, "P. Hà Huy Tập", "P. Hà Huy Tập, TP. Vinh, Nghệ An")?.id,
    33
  );

  // Fuzzy typo (missing letter 'i')
  assert.equal(
    matchWardByName(ngheAnWards, "Phuong Thanh Vnh", "Phuong Thanh Vnh, Nghe An")?.id,
    16681
  );
});
