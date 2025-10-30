export type View = 'dashboard' | 'workshops' | 'clients' | 'finance' | 'logistics' | 'reports';

export type PaymentMethod = 'cash' | 'transfer' | 'card';

export interface CompanyProfile {
  companyName: string;
  vatNumber: string;
  address: string;
  email: string;
  phone: string;
  taxRegime: string; // For legal notes on invoices/quotes
}

export interface Parent {
  id: string;
  clientType: 'persona fisica' | 'persona giuridica';
  
  // For 'persona fisica'
  name?: string;
  surname?: string;
  taxCode?: string; // Codice Fiscale
  
  // For 'persona giuridica'
  companyName?: string;
  vatNumber?: string; // Partita IVA

  // Common fields
  email: string;
  phone: string;
  address?: string;
  zipCode?: string; // CAP
  city?: string;
  province?: string;
}

export interface Child {
  id: string;
  parentId: string;
  name:string;
  birthDate: string; // YYY-MM-DD
}

export interface Supplier {
  id: string;
  name: string;
  vatNumber: string; // Partita IVA
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  zipCode?: string; // CAP
  city?: string;
  province?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  capacity: number;
  supplierId?: string;
}

export interface Workshop {
  id: string;
  name: string;
  locationId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  pricePerChild: number;
}

export interface Registration {
  id: string;
  workshopId: string;
  childId: string;
  registrationDate: string; // YYYY-MM-DD
}

export interface Payment {
  id: string;
  parentId: string;
  workshopId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  method: PaymentMethod;
}

export interface OperationalCost {
  id: string;
  supplierId?: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  workshopId?: string; // Optional link to a workshop
  costType?: 'general' | 'fuel';
  locationId?: string;
  distanceKm?: number;
  fuelCostPerKm?: number;
  method?: PaymentMethod;
}

export interface ClientDetails {
  clientType: 'persona fisica' | 'persona giuridica';
  name?: string;
  surname?: string;
  taxCode?: string;
  companyName?: string;
  vatNumber?: string;
  email: string;
  phone?: string;
  address?: string;
  zipCode?: string;
  city?: string;
  province?: string;
}

export interface Quote {
  id: string;
  parentId?: string;
  potentialClient?: ClientDetails;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status: 'sent' | 'approved' | 'rejected';
  method?: PaymentMethod;
}

export interface Invoice {
  id: string;
  parentId: string;
  workshopId: string;
  amount: number;
  issueDate: string; // YYYY-MM-DD
  sdiNumber: string; // Numero SDI
  method: PaymentMethod;
}
