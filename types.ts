import { DocumentReference } from 'firebase/firestore';

export type View = 'dashboard' | 'workshops' | 'clients' | 'finance' | 'reports' | 'logistics' | 'campagne' | 'impostazioni';

export interface CompanyProfile {
    companyName: string;
    vatNumber: string;
    address: string;
    email: string;
    phone: string;
    taxRegime: string;
}

// Inscription types define the duration and nature of a child's registration
export const INSCRIPTION_TYPES = {
    'Open Day': { durationMonths: 0, price: 15 },
    '1 Mese': { durationMonths: 1, price: 60 },
    '3 Mesi': { durationMonths: 3, price: 165 },
    '6 Mesi': { durationMonths: 6, price: 300 },
    'Annuale': { durationMonths: 12, price: 540 },
    'Campus': { durationMonths: 0, price: 150 }, // Duration is fixed, not monthly
    'Pacchetto Ore': { durationMonths: 0, price: 100 },
};
export type InscriptionType = keyof typeof INSCRIPTION_TYPES;


// A Workshop is now a reusable "timeslot" at a specific location
export interface Workshop {
    id: string;
    locationId: string;
    dayOfWeek: 'Lunedì' | 'Martedì' | 'Mercoledì' | 'Giovedì' | 'Venerdì' | 'Sabato' | 'Domenica';
    time: string; // "HH:mm" format
    maxParticipants: number;
    code: string; // Auto-generated e.g., SEDEA-LUN-17:00
}

export interface Parent {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
    address: string;
    zipCode?: string;
    city?: string;
    province?: string;
    clientType: 'persona fisica' | 'persona giuridica';
    companyName?: string;
    vatNumber?: string;
    sdiCode?: string;
    pec?: string;
    status: 'attivo' | 'sospeso' | 'prospect' | 'archiviato';
}

export interface Child {
    id: string;
    parentId: string;
    name: string;
    surname: string;
    birthDate: string; // ISO string
    notes?: string;
}

export interface Registration {
    id: string;
    childId: string;
    workshopId: string;
    registrationDate: string; // ISO string for when the registration was made
    inscriptionType: InscriptionType;
    inscriptionEndDate?: string; // ISO string, calculated based on type and date
    durationInMonths?: number; // Only for specific types like 'X Mesi'
    status: 'confermata' | 'in attesa' | 'annullata';
}


export interface Payment {
    id:string;
    parentId: string;
    amount: number;
    paymentDate: string; // ISO string
    method: 'bonifico' | 'contanti' | 'carta';
    relatedInvoiceId?: string;
    description: string;
}

export interface OperationalCost {
    id: string;
    description: string;
    amount: number;
    date: string; // ISO string
    supplierId?: string;
    category: 'materiali' | 'affitto' | 'stipendi' | 'marketing' | 'altro';
}

export interface Quote {
    id: string;
    parentId: string;
    quoteNumber: string;
    quoteDate: string; // ISO string
    items: { description: string; quantity: number; unitPrice: number }[];
    total: number;
    status: 'inviato' | 'accettato' | 'rifiutato';
}

export interface Invoice {
    id: string;
    parentId: string;
    invoiceNumber: string;
    invoiceDate: string; // ISO string
    dueDate: string; // ISO string
    items: { description: string; quantity: number; unitPrice: number }[];
    total: number;
    status: 'emessa' | 'pagata' | 'scaduta';
}

export interface Supplier {
    id: string;
    name: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
    contact?: string;
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
    color?: string;
    rentalCost?: number;
    distanceKm?: number;
}

export interface Campaign {
    id: string;
    name: string;
    type: 'sollecito' | 'sviluppo';
    subject: string;
    body: string;
    targetStatus?: Array<'prospect' | 'sospeso'>;
}

export interface ReminderSetting {
    id: string;
    name: string;
    preWarningDays: number;
    cadence: number;
    enabled: boolean;
}

export interface ErrorLog {
    timestamp: string; // ISO string
    error: string;
    componentStack: string | null;
}