import { 
  Cpu,
  Hammer,
  Printer,
  Wrench,
  Building2,
  FileText,
  Code,
  Truck,
  PackageOpen,
  UtensilsCrossed,
  Plane,
  type LucideIcon 
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  "Food": UtensilsCrossed,
  "Travel": Plane,
  "Electronics & PCBs": Cpu,
  "Hardware & Materials": Hammer,
  "3D Printing": Printer,
  "Tools & Equipment": Wrench,
  "Lab Operations": Building2,
  "Office Supplies": FileText,
  "Software & Subscriptions": Code,
  "Logistics & Travel": Truck,
  "Logistics": Truck,
  "Other": PackageOpen,
};

export function getCategoryIcon(category: string): LucideIcon {
  return categoryIcons[category] || PackageOpen;
}

export function getIconByName(iconName: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    Cpu,
    Hammer,
    Printer,
    Wrench,
    Building2,
    FileText,
    Code,
    Truck,
    PackageOpen,
    UtensilsCrossed,
    Plane,
  };
  return icons[iconName] || PackageOpen;
}
