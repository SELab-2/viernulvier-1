export const MOCK_IMAGE_1 = {
  id: 1,
  old_id: 101,
  production: 1,
  res: "1920x1080",
};

export const MOCK_IMAGE_2 = {
  id: 2,
  old_id: 102,
  production: 1,
  res: "800x600",
};

export const MOCK_CROP_1 = {
  id: 1,
  old_id: 201,
  image: 1,
  url: "/media/crops/abc-111.jpg",
  type: "general",
};

export const MOCK_CROP_2 = {
  id: 2,
  old_id: 202,
  image: 1,
  url: "/media/crops/def-222.jpg",
  type: "thumbnail",
};

export const MOCK_CROP_3 = {
  id: 3,
  old_id: 203,
  image: 2,
  url: "/media/crops/ghi-333.jpg",
  type: "general",
};

export const MOCK_META = {
  created_at: new Date("2026-01-01T12:00:00.000Z"),
  updated_at: new Date("2026-01-02T12:00:00.000Z"),
  created_by: 1,
  updated_by: 1,
};

export function imageWithCrops<I extends object, C extends object>(image: I, crops: C[]) {
  return { ...image, crops };
}