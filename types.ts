// Fix: Wrapped Google API type declarations in `declare global` to make them globally accessible
// from this module, resolving TypeScript errors about missing types.
declare global {
    namespace google {
        namespace accounts {
            namespace oauth2 {
                interface TokenClient {
                    requestAccessToken: (options?: { prompt?: string }) => void;
                }
                function initTokenClient(config: {
                    client_id: string;
                    scope: string;
                    callback: (tokenResponse: { access_token: string }) => void;
                    error_callback?: (error: any) => void;
                }): TokenClient;
                function revoke(token: string, done: () => void): void;
            }
        }
        namespace picker {
            const ViewId: {
                DOCS: string;
            };
            const Feature: {
                NAV_HIDDEN: string;
            };
            const Action: {
                PICKED: string;
                CANCEL: string;
            };
            const Response: {
                ACTION: string;
                DOCUMENTS: string;
            };
            const Document: {
                ID: string;
            };
            class View {
                constructor(viewId: string);
                setMimeTypes(mimeTypes: string): void;
            }
            class PickerBuilder {
                enableFeature(feature: string): PickerBuilder;
                setAppId(appId: string): PickerBuilder;
                setClientId(clientId: string): PickerBuilder;
                addView(view: View): PickerBuilder;
                setOAuthToken(token: string): PickerBuilder;
                setDeveloperKey(key: string): PickerBuilder;
                setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
                build(): {
                    setVisible(visible: boolean): void;
                };
            }
            interface ResponseObject {
                [key: string]: any;
            }
        }
    }

    namespace gapi {
        function load(features: string, callback: () => void): void;
        namespace client {
            function init(args: { apiKey: string, discoveryDocs: string[] }): Promise<void>;
            function setToken(token: { access_token: string } | null): void;
            function getToken(): { access_token: string } | null;
            function request(args: {
                path: string;
                method: string;
                params?: any;
                body: FormData;
            }): Promise<{ status: number, body: string }>;
            const drive: {
                files: {
                    get(args: { fileId: string, alt: 'media' }): Promise<{ body: string | object }>;
                };
            };
        }
    }
}

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
  birthDate: string; // YYYY-MM-DD
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

export interface DatabaseBackup {
  companyProfile: CompanyProfile;
  workshops: Workshop[];
  parents: Parent[];
  children: Child[];
  registrations: Registration[];
  payments: Payment[];
  costs: OperationalCost[];
  quotes: Quote[];
  invoices: Invoice[];
  suppliers: Supplier[];
  locations: Location[];
}