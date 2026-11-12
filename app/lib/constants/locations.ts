import type { Province, Ward } from "~/types/candidate";

export interface DistrictAdminUnit {
  code: string;
  name: string;
  wards: string[];
}

export interface ProvinceAdminUnit {
  code: string;
  name: string;
  districts: DistrictAdminUnit[];
}

/**
 * Standard hierarchical administrative tree for Vietnam.
 * Guaranteed to contain full 25 wards and communes for Thành phố Vinh, Tỉnh Nghệ An.
 */
export const VIETNAM_ADMINISTRATIVE_UNITS: ProvinceAdminUnit[] = [
  {
    code: "NA",
    name: "Tỉnh Nghệ An",
    districts: [
      {
        code: "VINH",
        name: "Thành phố Vinh",
        wards: [
          "Phường Hà Huy Tập",
          "Phường Hưng Dũng",
          "Phường Bến Thủy",
          "Phường Trường Thi",
          "Phường Lê Lợi",
          "Phường Đội Cung",
          "Phường Quang Trung",
          "Phường Cửa Nam",
          "Phường Hồng Sơn",
          "Phường Trung Đô",
          "Phường Vinh Tân",
          "Phường Đông Vĩnh",
          "Phường Quán Bàu",
          "Phường Lê Mao",
          "Phường Hưng Bình",
          "Phường Hưng Phúc",
          "Xã Nghi Phú",
          "Xã Hưng Lộc",
          "Xã Nghi Kim",
          "Xã Hưng Đông",
          "Xã Nghi Ân",
          "Xã Hưng Chính",
          "Xã Hưng Hòa",
          "Xã Nghi Đức",
          "Xã Nghi Liên",
        ],
      },
      {
        code: "CUALO",
        name: "Thị xã Cửa Lò",
        wards: [
          "Phường Nghi Hương",
          "Phường Nghi Tân",
          "Phường Nghi Thủy",
          "Phường Nghi Thu",
          "Phường Nghi Hải",
          "Phường Nghi Hòa",
          "Phường Thu Thủy",
        ],
      },
    ],
  },
  {
    code: "HN",
    name: "Thành phố Hà Nội",
    districts: [
      {
        code: "HOANKIEM",
        name: "Quận Hoàn Kiếm",
        wards: ["Phường Hàng Bạc", "Phường Hàng Bài", "Phường Tràng Tiền"],
      },
      {
        code: "CAUGIAY",
        name: "Quận Cầu Giấy",
        wards: ["Phường Dịch Vọng", "Phường Yên Hòa", "Phường Mai Dịch"],
      },
    ],
  },
  {
    code: "HCM",
    name: "Thành phố Hồ Chí Minh",
    districts: [
      {
        code: "Q1",
        name: "Quận 1",
        wards: ["Phường Bến Nghé", "Phường Bến Thành", "Phường Tân Định"],
      },
    ],
  },
];

/**
 * Standard default wards for TP. Vinh (Nghệ An) to guarantee client-side resilience
 * even if the network is degraded or cache is stale.
 */
export const DEFAULT_VINH_WARDS: Ward[] = [
  { id: 1, province_id: 6, code: "NA-P01", name: "Phường Lê Mao", type: "phuong" },
  { id: 2, province_id: 6, code: "NA-P02", name: "Phường Lê Lợi", type: "phuong" },
  { id: 3, province_id: 6, code: "NA-P03", name: "Phường Trường Thi", type: "phuong" },
  { id: 4, province_id: 6, code: "NA-P04", name: "Phường Bến Thủy", type: "phuong" },
  { id: 5, province_id: 6, code: "NA-P05", name: "Phường Hưng Bình", type: "phuong" },
  { id: 6, province_id: 6, code: "NA-P06", name: "Phường Hưng Phúc", type: "phuong" },
  { id: 7, province_id: 6, code: "NA-P07", name: "Phường Quang Trung", type: "phuong" },
  { id: 8, province_id: 6, code: "NA-P08", name: "Phường Đội Cung", type: "phuong" },
  { id: 33, province_id: 6, code: "NA-P09", name: "Phường Hà Huy Tập", type: "phuong" },
  { id: 34, province_id: 6, code: "NA-P10", name: "Phường Hưng Dũng", type: "phuong" },
  { id: 35, province_id: 6, code: "NA-P11", name: "Phường Cửa Nam", type: "phuong" },
  { id: 36, province_id: 6, code: "NA-P12", name: "Phường Hồng Sơn", type: "phuong" },
  { id: 37, province_id: 6, code: "NA-P13", name: "Phường Trung Đô", type: "phuong" },
  { id: 38, province_id: 6, code: "NA-P14", name: "Phường Vinh Tân", type: "phuong" },
  { id: 39, province_id: 6, code: "NA-P15", name: "Phường Đông Vĩnh", type: "phuong" },
  { id: 40, province_id: 6, code: "NA-P16", name: "Phường Quán Bàu", type: "phuong" },
  { id: 9, province_id: 6, code: "NA-X01", name: "Xã Nghi Phú", type: "xa" },
  { id: 10, province_id: 6, code: "NA-X02", name: "Xã Hưng Lộc", type: "xa" },
  { id: 11, province_id: 6, code: "NA-X03", name: "Xã Nghi Kim", type: "xa" },
  { id: 12, province_id: 6, code: "NA-X04", name: "Xã Hưng Đông", type: "xa" },
  { id: 13, province_id: 6, code: "NA-X05", name: "Xã Nghi Ân", type: "xa" },
  { id: 41, province_id: 6, code: "NA-X06", name: "Xã Hưng Chính", type: "xa" },
  { id: 42, province_id: 6, code: "NA-X07", name: "Xã Hưng Hòa", type: "xa" },
  { id: 43, province_id: 6, code: "NA-X08", name: "Xã Nghi Đức", type: "xa" },
  { id: 44, province_id: 6, code: "NA-X09", name: "Xã Nghi Liên", type: "xa" },
];

/**
 * Merges loaded wards from API with standard fallback wards when Nghệ An is selected,
 * guaranteeing that wards like "Phường Hà Huy Tập" are always selectable.
 */
export function mergeStandardWardsFallback(
  loadedWards: Ward[],
  selectedProvinceId: string,
  provinces: Province[]
): Ward[] {
  const provinceObj = provinces.find((p) => String(p.id) === String(selectedProvinceId));
  const isNgheAn =
    provinceObj?.code === "NA" ||
    (provinceObj?.name &&
      provinceObj.name.toLowerCase().includes("nghệ an"));

  if (!isNgheAn) {
    return loadedWards;
  }

  const existingNormalizedNames = new Set(
    loadedWards.map((w) =>
      w.name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[.,\-_/()]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
  );

  const merged = [...loadedWards];
  for (const fallback of DEFAULT_VINH_WARDS) {
    const normName = fallback.name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[.,\-_/()]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!existingNormalizedNames.has(normName)) {
      merged.push({
        ...fallback,
        province_id: Number(selectedProvinceId) || fallback.province_id,
      });
      existingNormalizedNames.add(normName);
    }
  }

  return merged;
}

