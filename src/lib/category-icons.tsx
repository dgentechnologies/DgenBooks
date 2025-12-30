import { 
  UtensilsCrossed, 
  Code, 
  Briefcase, 
  Plane, 
  PackageOpen,
  type LucideIcon 
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  Food: UtensilsCrossed,
  Software: Code,
  Business: Briefcase,
  Travel: Plane,
  Other: PackageOpen,
};

export function getCategoryIcon(category: string): LucideIcon {
  return categoryIcons[category] || PackageOpen;
}
