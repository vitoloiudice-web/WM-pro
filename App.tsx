import React, { useState, useEffect, useRef } from 'react';
import BottomNav from './components/BottomNav.tsx';
import Sidebar from './components/Sidebar.tsx';
import DashboardView from './views/DashboardView.tsx';
import WorkshopsView from './views/WorkshopsView.tsx';
import ClientsView from './views/ClientsView.tsx';
import FinanceView from './views/FinanceView.tsx';
import LogisticsView from './views/LogisticsView.tsx';
import ReportsView from './views/ReportsView.tsx';
import type { View, Workshop, Parent, Child, Payment, OperationalCost, Quote, Invoice, Supplier, Location, Registration, DatabaseBackup, CompanyProfile } from './types.ts';
import {
  MOCK_WORKSHOPS,
  MOCK_PARENTS,
  MOCK_CHILDREN,
  MOCK_PAYMENTS,
  MOCK_COSTS,
  MOCK_QUOTES,
  MOCK_INVOICES,
  MOCK_SUPPLIERS,
  MOCK_LOCATIONS,
  MOCK_REGISTRATIONS,
  MOCK_COMPANY_PROFILE
} from './data.ts';
import Modal from './components/Modal.tsx';
import Input from './components/Input.tsx';

// --- Google Drive API Configuration ---
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';

const LOCAL_STORAGE_KEY = 'wmp-app-data';
const GOOGLE_CLIENT_ID_KEY = 'wmp-google-client-id';

const getInitialState = (): DatabaseBackup => {
  try {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData) as DatabaseBackup;
      if (parsedData.workshops && parsedData.parents && parsedData.children && parsedData.companyProfile) {
        return parsedData;
      }
    }
  } catch (error) {
    console.error("Failed to load or parse state from localStorage", error);
  }
  return {
    companyProfile: MOCK_COMPANY_PROFILE,
    workshops: MOCK_WORKSHOPS,
    parents: MOCK_PARENTS,
    children: MOCK_CHILDREN,
    registrations: MOCK_REGISTRATIONS,
    payments: MOCK_PAYMENTS,
    costs: MOCK_COSTS,
    quotes: MOCK_QUOTES,
    invoices: MOCK_INVOICES,
    suppliers: MOCK_SUPPLIERS,
    locations: MOCK_LOCATIONS,
  };
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Google Drive State
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const tokenClient = useRef<google.accounts.oauth2.TokenClient | null>(null);

  // New state for robust Client ID management
  const [clientId, setClientId] = useState<string | null>(null);
  const [isClientIdModalOpen, setIsClientIdModalOpen] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');

  // Centralized state management
  const initialState = getInitialState();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(initialState.companyProfile);
  const [workshops, setWorkshops] = useState<Workshop[]>(initialState.workshops);
  const [parents, setParents] = useState<Parent[]>(initialState.parents);
  const [children, setChildren] = useState<Child[]>(initialState.children);
  const [registrations, setRegistrations] = useState<Registration[]>(initialState.registrations);
  const [payments, setPayments] = useState<Payment[]>(initialState.payments);
  const [costs, setCosts] = useState<OperationalCost[]>(initialState.costs);
  const [quotes, setQuotes] = useState<Quote[]>(initialState.quotes);
  const [invoices, setInvoices] = useState<Invoice[]>(initialState.invoices);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialState.suppliers);
  const [locations, setLocations] = useState<Location[]>(initialState.locations);
  
  useEffect(() => {
    try {
      const stateToSave: DatabaseBackup = {
        companyProfile, workshops, parents, children, registrations, payments, costs, quotes, invoices, suppliers, locations,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [companyProfile, workshops, parents, children, registrations, payments, costs, quotes, invoices, suppliers, locations]);

  // Effect to load Client ID on startup (from env, then localStorage, then prompt user)
  useEffect(() => {
    const envClientId = process.env.CLIENT_ID;
    if (envClientId) {
        setClientId(envClientId);
    } else {
        const storedClientId = localStorage.getItem(GOOGLE_CLIENT_ID_KEY);
        if (storedClientId) {
            setClientId(storedClientId);
        } else {
            setIsClientIdModalOpen(true);
        }
    }
  }, []);
  
  // Google API Initialization Effect, now depends on `clientId`
  useEffect(() => {
    const handleGapiLoad = () => {
        gapi.load('client:picker', () => {
            gapi.client.init({
                apiKey: GOOGLE_API_KEY,
                discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            }).then(() => {
                setGapiReady(true);
            }).catch((err: any) => {
                console.error("Errore durante l'inizializzazione del client Google API:", err);
            });
        });
    };

    const handleGisLoad = () => {
        if (!clientId) {
            return; // Wait for clientId to be set
        }

        try {
            if (!window.google?.accounts?.oauth2) {
                console.error("Google Identity Services library non è completamente carica.");
                return;
            }
            tokenClient.current = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: SCOPES,
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        gapi.client.setToken({ access_token: tokenResponse.access_token });
                        setIsSignedIn(true);
                        try {
                            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                            });
                            if (res.ok) {
                                const userInfo = await res.json();
                                setUserEmail(userInfo.email);
                            } else {
                                console.error("Failed to fetch user info", await res.text());
                            }
                        } catch (error) {
                            console.error("Error fetching user info:", error);
                        }
                    } else {
                        console.error("Errore di autenticazione Google:", tokenResponse);
                    }
                },
                error_callback: (error) => {
                    console.error("Errore GSI Google:", error);
                    if (error && ['popup_closed', 'missing_client_id', 'invalid_client'].includes(error.type)) {
                        alert("Il Client ID di Google non è valido o la configurazione è errata. Per favore, inseriscilo di nuovo.");
                        localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
                        setClientId(null);
                        setGisReady(false);
                        setIsClientIdModalOpen(true);
                    }
                }
            });
            setGisReady(true);
        } catch (error) {
            console.error("Errore durante l'inizializzazione di Google Identity Services:", error);
        }
    };

    window.addEventListener('gapiLoaded', handleGapiLoad);
    window.addEventListener('gisLoaded', handleGisLoad);
    
    if (window.gapi && window.gapi.client) handleGapiLoad();
    if (window.google && window.google.accounts) handleGisLoad();

    return () => {
        window.removeEventListener('gapiLoaded', handleGapiLoad);
        window.removeEventListener('gisLoaded', handleGisLoad);
    };
  }, [clientId]);

  const handleSignIn = () => {
    if (tokenClient.current) {
        tokenClient.current.requestAccessToken({prompt: 'consent'});
    }
  };

  const handleSignOut = () => {
      const token = gapi.client.getToken();
      if (token) {
          google.accounts.oauth2.revoke(token.access_token, () => {
              gapi.client.setToken(null);
              setIsSignedIn(false);
              setUserEmail(null);
          });
      }
  };

  const handleExportData = () => {
    const backupData: DatabaseBackup = {
      companyProfile, workshops, parents, children, registrations, payments, costs, quotes, invoices, suppliers, locations,
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `wmp-backup-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    linkElement.remove();
    alert('Database esportato con successo!');
  };
  
  const handleImportData = (data: DatabaseBackup) => {
    if (!data.workshops || !data.parents || !data.children || !data.registrations || !data.payments || !data.costs || !data.quotes || !data.invoices || !data.suppliers || !data.locations || !data.companyProfile) {
      alert("File di backup non valido o corrotto.");
      return;
    }
    setCompanyProfile(data.companyProfile);
    setWorkshops(data.workshops);
    setParents(data.parents);
    setChildren(data.children);
    setRegistrations(data.registrations);
    setPayments(data.payments);
    setCosts(data.costs);
    setQuotes(data.quotes);
    setInvoices(data.invoices);
    setSuppliers(data.suppliers);
    setLocations(data.locations);
    alert('Database importato con successo!');
  };

  const handleSaveClientId = () => {
    if (clientIdInput && clientIdInput.trim().length > 0) {
        const newClientId = clientIdInput.trim();
        localStorage.setItem(GOOGLE_CLIENT_ID_KEY, newClientId);
        setClientId(newClientId);
        setIsClientIdModalOpen(false);
        setClientIdInput('');
    } else {
        alert("Per favore, inserisci un Client ID valido.");
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView 
          companyProfile={companyProfile}
          setCompanyProfile={setCompanyProfile}
          workshops={workshops} 
          parents={parents} 
          children={children}
          payments={payments} 
          registrations={registrations}
          locations={locations}
          costs={costs}
          quotes={quotes}
          invoices={invoices}
          suppliers={suppliers}
          onExport={handleExportData}
          onImport={handleImportData}
          userEmail={userEmail}
          isSignedIn={isSignedIn}
          isApiReady={gapiReady && gisReady}
          clientId={clientId}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />;
      // Other cases remain the same but need to pass down `clientId` if they use it.
      // Currently, only DashboardView uses it.
      case 'workshops':
        return <WorkshopsView 
            workshops={workshops} 
            setWorkshops={setWorkshops} 
            locations={locations}
            registrations={registrations}
            children={children}
            parents={parents}
        />;
      case 'clients':
        return <ClientsView 
            parents={parents} 
            setParents={setParents} 
            children={children} 
            setChildren={setChildren}
            workshops={workshops}
            registrations={registrations}
            setRegistrations={setRegistrations}
            payments={payments}
            setPayments={setPayments}
            locations={locations}
        />;
      case 'finance':
        return <FinanceView 
            companyProfile={companyProfile}
            payments={payments} setPayments={setPayments}
            costs={costs} setCosts={setCosts}
            quotes={quotes} setQuotes={setQuotes}
            invoices={invoices} setInvoices={setInvoices}
            parents={parents}
            workshops={workshops}
            locations={locations}
            suppliers={suppliers}
        />;
      case 'reports':
        return <ReportsView 
            payments={payments}
            costs={costs}
            workshops={workshops}
            suppliers={suppliers}
            locations={locations}
            registrations={registrations}
            quotes={quotes}
        />;
      case 'logistics':
        return <LogisticsView 
            suppliers={suppliers} setSuppliers={setSuppliers}
            locations={locations} setLocations={setLocations}
        />;
      default:
        return <DashboardView 
          companyProfile={companyProfile}
          setCompanyProfile={setCompanyProfile}
          workshops={workshops} 
          parents={parents} 
          children={children}
          payments={payments} 
          registrations={registrations}
          locations={locations}
          costs={costs}
          quotes={quotes}
          invoices={invoices}
          suppliers={suppliers}
          onExport={handleExportData}
          onImport={handleImportData}
          userEmail={userEmail}
          isSignedIn={isSignedIn}
          isApiReady={gapiReady && gisReady}
          clientId={clientId}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      <div className="md:pl-64 flex flex-col">
        <header className="hidden md:block bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workshop Manager Pro</h1>
          </div>
        </header>
        <main className="flex-grow pt-20 md:pt-0 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderView()}
          </div>
        </main>
      </div>
      
      <Modal 
          isOpen={isClientIdModalOpen} 
          onClose={() => { /* Prevent closing without providing an ID */ }} 
          title="Configurazione Google Drive"
      >
          <div className="space-y-4">
              <p className="text-sm text-slate-600">
                  Per usare l'import/export con Google Drive, serve un <strong>Client ID OAuth 2.0</strong>. Puoi ottenerlo gratuitamente dalla <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">Google Cloud Console</a>.
              </p>
              <div className="p-4 bg-slate-50 rounded-lg text-sm space-y-2">
                  <h4 className="font-semibold text-slate-800">Guida Rapida alla Configurazione:</h4>
                  <ol className="list-decimal list-inside text-slate-600 space-y-1">
                      <li>Nella Google Cloud Console, clicca su "+ CREA CREDENZIALI" e scegli "ID client OAuth".</li>
                      <li>Seleziona "Applicazione web" come tipo.</li>
                      <li>Nella sezione <strong>"Origini JavaScript autorizzate"</strong>, clicca "+ AGGIUNGI URI".</li>
                      <li>
                          Copia l'URL dalla barra degli indirizzi del browser e incolla **solo la parte principale**.
                          <ul className="list-disc list-inside pl-4 mt-1 text-xs">
                              <li>Se l'URL è <code className="bg-slate-200 p-1 rounded">https://aistudio.google.com/apps/drive/...</code></li>
                              <li>Devi inserire: <code className="bg-slate-200 p-1 rounded font-bold">https://aistudio.google.com</code></li>
                          </ul>
                      </li>
                      <li>Lascia vuoti gli "URI di reindirizzamento" e clicca "CREA".</li>
                      <li>Copia l'ID client generato e incollalo qui sotto.</li>
                  </ol>
              </div>
              <Input 
                  id="google-client-id"
                  label="Incolla il tuo Google Client ID qui"
                  type="text"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="xxxx-xxxx.apps.googleusercontent.com"
                  required
              />
              <div className="flex justify-end pt-2">
                  <button 
                      onClick={handleSaveClientId} 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                      Salva e Continua
                  </button>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default App;