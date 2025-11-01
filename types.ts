
// This file defines all the shared data structures for the application.

export type View = 'dashboard' | 'workshops' | 'clients' | 'finance' | 'reports' | 'logistics' | 'campagne' | 'impostazioni';

export type WorkshopType = 'OpenDay' | 'Evento' | '1 Mese' | '2 Mesi' | '3 Mesi' | 'Scolastico' | 'Campus';

export type ParentStatus = 'attivo' | 'sospeso' | 'cessato' | 'prospect';

export type ClientType = 'persona fisica' | 'persona giuridica';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'unspecified';

export type QuoteStatus = 'sent' | 'approved' | 'rejected';

export interface CompanyProfile {
    companyName: string;
    vatNumber: string;
    address: string;
    email: string;
    phone: string;
    taxRegime: string;
}

export interface Workshop {
    id: string;
    code: string;
    name: string;
    type: WorkshopType;
    locationId: string;
    startDate: string; // ISO date string e.g., '2024-01-01'
    endDate: string;   // ISO date string
    dayOfWeek: 'Lunedì' | 'Martedì' | 'Mercoledì' | 'Giovedì' | 'Venerdì' | 'Sabato' | 'Domenica';
    startTime: string; // e.g., '10:00'
    endTime: string;   // e.g., '12:00'
    durationInMonths?: number;
}

export interface Parent {
    id: string;
    clientType: ClientType;
    status: ParentStatus;
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

export interface Child {
    id: string;
    parentId: string;
    name: string;
    birthDate: string; // ISO date string
}

export interface Registration {
    id: string;
    childId: string;
    workshopId: string;
    registrationDate: string; // ISO date string
}

export interface Payment {
    id: string;
    parentId: string;
    workshopId: string;
    amount: number;
    paymentDate: string; // ISO date string
    method: PaymentMethod;
}

export interface OperationalCost {
    id:string;
    description?: string;
    amount: number;
    date: string; // ISO date string
    supplierId?: string;
    workshopIds?: string[];
    method: PaymentMethod;
    category: string;
    subCategory: string;
    locationId?: string;
}

export interface ClientDetails {
    clientType: ClientType;
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
    date: string; // ISO date string
    status: QuoteStatus;
    method?: PaymentMethod;
}

export interface Invoice {
    id: string;
    parentId: string;
    amount: number;
    sdiNumber: string;
    issueDate: string; // ISO date string
    method: PaymentMethod;
}

export interface Supplier {
    id: string;
    name: string;
    vatNumber?: string;
    contact?: string;
    email?: string;
    phone?: string;
}

export interface Location {
    id: string;
    supplierId: string;
    name: string;
    shortName?: string;
    address: string;
    zipCode?: string;
    city?: string;
    province?: string;
    capacity: number;
    rentalCost?: number;
    distanceKm?: number;
    color?: string;
}

// New types for Campaigns, Settings, and Debugging
export interface Campaign {
    id: string;
    name: string;
    type: 'sollecito' | 'sviluppo';
    subject: string;
    body: string; // Template with placeholders like {NOME_CLIENTE}
    targetStatus?: ParentStatus[];
}

export interface ReminderSetting {
    id: string;
    name: string;
    preWarningDays: number; // e.g., 7 days before
    cadence: number; // e.g., repeat every 3 days
    enabled: boolean;
}

export interface ErrorLog {
    timestamp: string;
    error: string;
    componentStack: string | null;
}