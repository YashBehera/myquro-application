export type DietaryType = 'veg' | 'non-veg' | 'egg' | 'vegan';

export interface Variant {
  id: string;
  name: string; // e.g. "Small", "Regular", "Large", "Half", "Full"
  price: number;
  portion?: string; // e.g. "1 Scoop", "2 Scoops", "Serves 1-2"
  description?: string;
  isAvailable: boolean;
  displayOrder: number;
}

export interface AddOn {
  id: string;
  name: string; // e.g. "Chocolate Syrup", "Extra Cheese", "Choco Chips"
  price: number;
  isAvailable: boolean;
  image?: string;
  displayOrder: number;
}

export interface CustomizationGroup {
  id: string;
  name: string; // e.g. "Choose Your Size", "Add Extras / Toppings", "Crust Choice"
  isRequired: boolean;
  minSelections: number; // 0 if optional, 1 if required
  maxSelections: number; // 1 for single-select, >1 for multi-select
  type: 'single' | 'multi';
  addOns: AddOn[];
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  dietaryType: DietaryType;
  image?: string;
  basePrice: number;
  hasVariants: boolean;
  variants: Variant[];
  customizationGroups: CustomizationGroup[];
  isAvailable: boolean;
  hasSchedule?: boolean;
  scheduleStartTime?: string; // e.g. "07:00"
  scheduleEndTime?: string; // e.g. "11:00"
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface MenuStats {
  totalCategories: number;
  totalDishes: number;
  activeDishes: number;
  inactiveDishes: number;
  unavailableToday: number;
}

export interface SelectedCustomization {
  groupId: string;
  groupName: string;
  selectedAddOns: {
    id: string;
    name: string;
    price: number;
  }[];
}

export interface CartCustomizationSnapshot {
  dishId: string;
  dishName: string;
  dietaryType: DietaryType;
  selectedVariant?: {
    id: string;
    name: string;
    price: number;
    portion?: string;
  };
  customizations: SelectedCustomization[];
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  instructions?: string;
}
