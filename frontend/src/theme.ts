export const COLORS = {
  surface: "#FFFFFF",
  onSurface: "#000000",
  surfaceSecondary: "#F4F4F5",
  onSurfaceSecondary: "#18181B",
  surfaceTertiary: "#E4E4E7",
  onSurfaceTertiary: "#27272A",
  surfaceInverse: "#000000",
  onSurfaceInverse: "#FFFFFF",
  brand: "#FF5500",
  brandSecondary: "#CC4400",
  brandTertiary: "#FFEFE5",
  onBrand: "#FFFFFF",
  success: "#008A00",
  warning: "#EAB308",
  error: "#E11D48",
  info: "#2563EB",
  border: "#E4E4E7",
  borderStrong: "#000000",
  muted: "#71717A",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const FONT = {
  display: "System",
  mono: "Menlo",
};

export type Trader = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  category?: string | null;
  rating?: number | null;
  website?: string | null;
  place_id?: string | null;
};

export type LeadStatus = "NEW" | "CONTACTED" | "QUOTED" | "WON";
export const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUOTED", "WON"];

export type Lead = {
  place_id: string;
  status: LeadStatus;
  shortlisted: boolean;
  updated_at: string;
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "#71717A",
  CONTACTED: "#2563EB",
  QUOTED: "#EAB308",
  WON: "#008A00",
};

export type HistoryItem = {
  id: string;
  product: string;
  location: string;
  count: number;
  timestamp: string;
  traders: Trader[];
};
