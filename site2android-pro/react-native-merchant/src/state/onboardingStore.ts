import { create } from 'zustand';

interface OnboardingState {
  ownerName: string;
  restaurantName: string;
  restaurantType: string;
  cuisine: string[];
  establishmentYear: number;
  seatingCapacity: number;
  defaultGstPercentage: string;
  phoneNumber: string;
  email: string;
  description: string;
  restaurantAddress: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  fssaiLicenseNumber: string;
  gstNumber: string;

  setFields: (fields: Partial<OnboardingState>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ownerName: '',
  restaurantName: '',
  restaurantType: 'fine-dining',
  cuisine: [],
  establishmentYear: new Date().getFullYear(),
  seatingCapacity: 0,
  defaultGstPercentage: '5.00',
  phoneNumber: '',
  email: '',
  description: '',
  restaurantAddress: '',
  city: '',
  state: '',
  postalCode: '',
  latitude: 23.6693,
  longitude: 86.1511,
  fssaiLicenseNumber: '',
  gstNumber: '',

  setFields: (fields) => set((state) => ({ ...state, ...fields })),
  reset: () =>
    set({
      ownerName: '',
      restaurantName: '',
      restaurantType: 'fine-dining',
      cuisine: [],
      establishmentYear: new Date().getFullYear(),
      seatingCapacity: 0,
      defaultGstPercentage: '5.00',
      phoneNumber: '',
      email: '',
      description: '',
      restaurantAddress: '',
      city: '',
      state: '',
      postalCode: '',
      latitude: 23.6693,
      longitude: 86.1511,
      fssaiLicenseNumber: '',
      gstNumber: '',
    }),
}));
