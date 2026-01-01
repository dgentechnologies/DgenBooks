import type { Category } from './types';

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: "Food", icon: "UtensilsCrossed", isDefault: true },
  { name: "Travel", icon: "Plane", isDefault: true },
  { name: "Electronics & PCBs", icon: "Cpu", isDefault: true },
  { name: "Hardware & Materials", icon: "Hammer", isDefault: true },
  { name: "3D Printing", icon: "Printer", isDefault: true },
  { name: "Lab Operations", icon: "Building2", isDefault: true },
  { name: "Tools & Equipment", icon: "Wrench", isDefault: true },
  { name: "Software & Subscriptions", icon: "Code", isDefault: true },
  { name: "Logistics", icon: "Truck", isDefault: true },
  { name: "Other", icon: "PackageOpen", isDefault: true },
];
