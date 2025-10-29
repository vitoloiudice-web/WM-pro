import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card.tsx';
import { ArrowUpRightIcon, UsersIcon, CurrencyDollarIcon, CalendarDaysIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, Cog6ToothIcon } from '../components/icons/HeroIcons.tsx';
import Modal from '../components/Modal.tsx';
import ConfirmModal from '../components/ConfirmModal.tsx';
import Input from '../components/Input.tsx';
import Select from '../components/Select.tsx';
import type { Workshop, Parent, Payment, Registration, Location, DatabaseBackup, Child, OperationalCost, Quote, Invoice, Supplier, CompanyProfile } from '../types.ts';

type ModalType = 'none' | 'newClient' | 'newWorkshop' | 'newPayment' | 'newCost' | 'settings';

// These are configured in the environment variables.
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

interface DashboardViewProps {
  companyProfile: CompanyProfile;
  setCompanyProfile: (profile: CompanyProfile) => void;
  workshops: Workshop[];
  parents: Parent[];
  children: Child[];
  payments: Payment[];
  registrations: Registration[];
  locations: Location[];
  costs: OperationalCost[];
  quotes: Quote[];
  invoices: Invoice[];
  suppliers: Supplier[];
  onExport: () => void;
  onImport: (data: DatabaseBackup) => void;
  // Google Drive props
  userEmail: string | null;
  isSignedIn: boolean;
  isApiReady: boolean;
  clientId: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    companyProfile, setCompanyProfile,
    workshops, parents, children, payments, registrations, locations, costs, quotes, invoices, suppliers,
    onExport, onImport,
    userEmail, isSignedIn, isApiReady, clientId, onSignIn, onSignOut
}) => {
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [settingsFormData, setSettingsFormData] = useState<CompanyProfile>(companyProfile);

  useEffect(() => {
    if (companyProfile) {
        setSettingsFormData(companyProfile);
    }
  }, [companyProfile, activeModal]);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<DatabaseBackup | null>(null);
  const [driveStatus, setDriveStatus] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // --- Dynamic Data Calculation ---
  const currentYear = new Date().getFullYear();
  const totalIncome = payments
    .filter(p => new Date(p.paymentDate).getFullYear() === currentYear)
    .reduce((sum, p) => sum + p.amount, 0);

  const activeClients = parents.length;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingWorkshops = workshops
    .filter(w => new Date(w.startDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const upcomingWorkshopsCount = upcomingWorkshops.length;
  const nextWorkshop = upcomingWorkshops[0];

  const locationMap = useMemo(() => 
    locations.reduce((acc, loc) => ({ ...acc, [loc.id]: loc }), {} as Record<string, Location>),
    [locations]
  );
  
  const registrationsByWorkshop = useMemo(() => {
    return registrations.reduce((acc, reg) => {
        acc[reg.workshopId] = (acc[reg.workshopId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
  }, [registrations]);
  
  // --- Data Import/Export ---
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const data = JSON.parse(text);
            if (data.workshops && data.parents) {
              setImportData(data);
            } else {
              alert('File non valido. Assicurati che sia un file di backup corretto.');
            }
          }
        } catch (error) {
          alert('Errore durante la lettura del file. È un file JSON valido?');
          console.error("Failed to parse JSON", error);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }
  };

  const confirmImport = () => {
    if (importData) {
      onImport(importData);
      setImportData(null);
    }
  };
  
   // --- Google Drive Handlers ---
  const handleExportToDrive = async () => {
    if (!isSignedIn) {
        alert("Devi accedere con Google per esportare su Drive.");
        return;
    }
    setDriveStatus('Esportazione in corso...');
    
    const backupData: DatabaseBackup = {
      companyProfile, workshops, parents, children, registrations, payments, costs, quotes, invoices, suppliers, locations,
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const fileName = `wmp-backup-${new Date().toISOString().split('T')[0]}.json`;

    try {
        const fileMetadata = { 'name': fileName, 'mimeType': 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
        form.append('file', new Blob([dataStr], { type: 'application/json' }));

        const res = await gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            body: form
        });
        
        if (res.status === 200) {
            alert('Database esportato con successo su Google Drive!');
        } else {
            throw new Error(`Error uploading file: ${res.body}`);
        }
    } catch (error) {
        console.error("Error exporting to Drive:", error);
        alert("Errore durante l'esportazione su Google Drive.");
    } finally {
        setDriveStatus('');
    }
  };

  const handleImportFromDrive = () => {
     if (!isSignedIn) {
        alert("Devi accedere con Google per importare da Drive.");
        return;
    }
    setDriveStatus('Apertura selettore file...');

    if (!clientId) {
        const errorMsg = "ERRORE: Client ID di Google non configurato. Impossibile importare da Drive.";
        console.error(errorMsg);
        alert(errorMsg);
        setDriveStatus('');
        return;
    }

    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("application/json");

    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setClientId(clientId)
        .addView(view)
        .setOAuthToken(gapi.client.getToken().access_token)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback((data: google.picker.ResponseObject) => {
            if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
                const doc = data[google.picker.Response.DOCUMENTS][0];
                const fileId = doc[google.picker.Document.ID];
                setDriveStatus('Download del file in corso...');

                gapi.client.drive.files.get({ fileId: fileId, alt: 'media' })
                  .then(res => {
                    if (typeof res.body === 'string') {
                        try {
                            const parsedData = JSON.parse(res.body);
                            onImport(parsedData);
                        } catch (e) {
                            alert("Errore nel parsing del file JSON da Google Drive.");
                        }
                    } else { // It can be an object on error
                         alert("Il contenuto del file non è valido.");
                    }
                  })
                  .catch(err => {
                    console.error("Error downloading file:", err);
                    alert("Errore durante il download del file da Google Drive.");
                  })
                  .finally(() => setDriveStatus(''));
            } else if (data[google.picker.Response.ACTION] === google.picker.Action.CANCEL) {
                setDriveStatus('');
            }
        })
        .build();
    picker.setVisible(true);
  };

  // --- Modal Logic ---
  const openModal = (type: ModalType) => {
    setActiveModal(type);
    setFormData({});
    setErrors({});
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    switch (activeModal) {
      case 'newClient':
        const clientType = formData.clientType || 'persona fisica';
        if (clientType === 'persona giuridica') {
            if (!formData.companyName?.trim()) newErrors.companyName = 'La ragione sociale è obbligatoria.';
            if (!formData.vatNumber?.trim()) newErrors.vatNumber = 'La Partita IVA è obbligatoria.';
        } else {
            if (!formData.name?.trim()) newErrors.name = 'Il nome è obbligatorio.';
            if (!formData.surname?.trim()) newErrors.surname = 'Il cognome è obbligatorio.';
            if (!formData.taxCode?.trim()) newErrors.taxCode = 'Il codice fiscale è obbligatorio.';
        }
        if (!formData.email?.trim()) {
          newErrors.email = "L'email è obbligatoria.";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Formato email non valido.';
        }
        break;
      case 'newWorkshop':
        if (!formData['ws-name']?.trim()) newErrors['ws-name'] = 'Il nome del workshop è obbligatorio.';
        if (!formData['ws-date']) newErrors['ws-date'] = 'La data di inizio è obbligatoria.';
        if (!formData['ws-price'] || parseFloat(formData['ws-price']) <= 0) newErrors['ws-price'] = 'Il prezzo deve essere un numero positivo.';
        break;
      case 'newPayment':
        if (!formData['pay-amount'] || parseFloat(formData['pay-amount']) <= 0) newErrors['pay-amount'] = "L'importo deve essere un numero positivo.";
        if (!formData['pay-date']) newErrors['pay-date'] = 'La data di pagamento è obbligatoria.';
        break;
      case 'newCost':
        if (!formData['cost-desc']?.trim()) newErrors['cost-desc'] = 'La descrizione è obbligatoria.';
        if (!formData['cost-amount'] || parseFloat(formData['cost-amount']) <= 0) newErrors['cost-amount'] = "L'importo deve essere un numero positivo.";
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log(`Saving from dashboard modal: ${activeModal}`, formData);
      alert('Elemento salvato! (Simulazione - i dati reali si aggiornano nelle rispettive sezioni)');
      setActiveModal('none');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyProfile(settingsFormData);
    setActiveModal('none');
    alert('Profilo azienda salvato!');
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  }
  
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettingsFormData({ ...settingsFormData, [e.target.id]: e.target.value });
  }

  const renderModal = () => {
    if (activeModal === 'none') return null;

    let title = '';
    let content: React.ReactNode = null;
    const formId = `form-${activeModal}`;
    
    const commonButtons = (
       <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={() => setActiveModal('none')} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button>
          <button type="submit" form={formId} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva</button>
        </div>
    );

    switch (activeModal) {
      case 'settings':
        title = 'Profilo Azienda';
        content = (
          <form id={formId} onSubmit={handleSaveSettings} className="space-y-4" noValidate>
            <p className="text-sm text-slate-600">
              Queste informazioni verranno utilizzate per generare preventivi e fatture.
            </p>
            <Input id="companyName" label="Nome Attività" type="text" value={settingsFormData.companyName || ''} onChange={handleSettingsChange} required />
            <Input id="vatNumber" label="Partita IVA / C.F." type="text" value={settingsFormData.vatNumber || ''} onChange={handleSettingsChange} required />
            <Input id="address" label="Indirizzo Completo" type="text" value={settingsFormData.address || ''} onChange={handleSettingsChange} required />
            <Input id="email" label="Email" type="email" value={settingsFormData.email || ''} onChange={handleSettingsChange} required />
            <Input id="phone" label="Telefono" type="tel" value={settingsFormData.phone || ''} onChange={handleSettingsChange} />
            <div>
                <label htmlFor="taxRegime" className="block text-sm font-medium text-slate-700 mb-1">
                    Note Fiscali / Regime
                </label>
                <textarea
                    id="taxRegime"
                    value={settingsFormData.taxRegime || ''}
                    onChange={handleSettingsChange}
                    rows={4}
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Es: Operazione in regime forfettario..."
                />
            </div>
            {commonButtons}
          </form>
        );
        break;

      case 'newClient':
        title = 'Nuovo Cliente';
        const clientType = formData.clientType || 'persona fisica';
        content = (
          <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
            <Select
              id="clientType"
              label="Tipo Cliente"
              options={[
                { value: 'persona fisica', label: 'Persona Fisica' },
                { value: 'persona giuridica', label: 'Persona Giuridica' }
              ]}
              value={clientType}
              onChange={(e) => {
                const newType = e.target.value;
                setFormData({ clientType: newType }); // Reset form, keep only new type
                setErrors({});
              }}
              required
            />
            {clientType === 'persona giuridica' ? (
              <>
                <Input id="companyName" label="Ragione Sociale" type="text" value={formData.companyName || ''} onChange={handleChange} error={errors.companyName} required />
                <Input id="vatNumber" label="Partita IVA" type="text" value={formData.vatNumber || ''} onChange={handleChange} error={errors.vatNumber} required />
              </>
            ) : (
              <>
                <Input id="name" label="Nome" type="text" value={formData.name || ''} onChange={handleChange} error={errors.name} required />
                <Input id="surname" label="Cognome" type="text" value={formData.surname || ''} onChange={handleChange} error={errors.surname} required />
                <Input id="taxCode" label="Codice Fiscale" type="text" value={formData.taxCode || ''} onChange={handleChange} error={errors.taxCode} required />
              </>
            )}
            <Input id="email" label="Email" type="email" value={formData.email || ''} onChange={handleChange} error={errors.email} required />
            <Input id="phone" label="Telefono" type="tel" value={formData.phone || ''} onChange={handleChange} error={errors.phone} />
            
            <Input id="address" label="Indirizzo" type="text" value={formData.address || ''} onChange={handleChange} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input id="zipCode" label="CAP" type="text" value={formData.zipCode || ''} onChange={handleChange} />
                <Input id="city" label="Città" type="text" value={formData.city || ''} onChange={handleChange} />
                <Input id="province" label="Provincia" type="text" value={formData.province || ''} onChange={handleChange} />
            </div>

            {commonButtons}
          </form>
        );
        break;
      case 'newWorkshop':
        title = 'Nuovo Workshop';
        content = (
           <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
            <Input id="ws-name" label="Nome Workshop" type="text" value={formData['ws-name'] || ''} onChange={handleChange} error={errors['ws-name']} required />
            <Input id="ws-date" label="Data Inizio" type="date" value={formData['ws-date'] || ''} onChange={handleChange} error={errors['ws-date']} required />
            <Input id="ws-price" label="Prezzo" type="number" step="0.01" value={formData['ws-price'] || ''} onChange={handleChange} error={errors['ws-price']} required />
            {commonButtons}
          </form>
        );
        break;
      case 'newPayment':
        title = 'Registra Pagamento';
        content = (
           <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
            <Input id="pay-amount" label="Importo" type="number" step="0.01" value={formData['pay-amount'] || ''} onChange={handleChange} error={errors['pay-amount']} required />
            <Input id="pay-date" label="Data Pagamento" type="date" value={formData['pay-date'] || ''} onChange={handleChange} error={errors['pay-date']} required />
             {commonButtons}
          </form>
        );
        break;
      case 'newCost':
        title = 'Aggiungi Costo';
        content = (
           <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
            <Input id="cost-desc" label="Descrizione" type="text" value={formData['cost-desc'] || ''} onChange={handleChange} error={errors['cost-desc']} required />
            <Input id="cost-amount" label="Importo" type="number" step="0.01" value={formData['cost-amount'] || ''} onChange={handleChange} error={errors['cost-amount']} required />
            {commonButtons}
          </form>
        );
        break;
    }
    
    return (
      <Modal isOpen={activeModal !== 'none'} onClose={() => setActiveModal('none')} title={title}>
        {content}
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-700">Panoramica</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Entrate Totali (Anno)" 
          value={`€${totalIncome.toFixed(2)}`} 
          icon={<CurrencyDollarIcon />} 
        />
        <StatCard 
          title="Clienti Attivi" 
          value={activeClients} 
          icon={<UsersIcon />} 
        />
        <StatCard 
          title="Workshop Futuri" 
          value={upcomingWorkshopsCount} 
          icon={<CalendarDaysIcon />} 
        />
      </div>

      <Card>
        <CardHeader>Accesso Rapido</CardHeader>
        <CardContent>
            {driveStatus && <p className="text-center text-indigo-600 mb-4 animate-pulse">{driveStatus}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <QuickLinkButton label="Nuovo Cliente" onClick={() => openModal('newClient')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Nuovo Workshop" onClick={() => openModal('newWorkshop')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Registra Pagamento" onClick={() => openModal('newPayment')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Aggiungi Costo" onClick={() => openModal('newCost')} icon={<ArrowUpRightIcon />} />
                
                <QuickLinkButton label="Importa Dati" onClick={handleImportClick} icon={<ArrowDownTrayIcon />} />
                <QuickLinkButton label="Esporta Database" onClick={() => setIsExportModalOpen(true)} icon={<ArrowUpTrayIcon />} />
                
                <div className="col-span-2 sm:col-span-3">
                    <button
                        onClick={() => openModal('settings')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-indigo-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                    >
                        <div>
                            <span className="font-semibold text-slate-700">Configura Profilo Azienda</span>
                            {isSignedIn && userEmail && (
                                <span className="text-xs text-slate-500 block mt-1">{userEmail}</span>
                            )}
                        </div>
                        <div className="text-slate-500 flex-shrink-0">
                            <Cog6ToothIcon />
                        </div>
                    </button>
                </div>
                
                {!isSignedIn ? (
                    <div className="col-span-2 sm:col-span-3">
                        <button onClick={onSignIn} disabled={!isApiReady} className="w-full flex items-center justify-center p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait">
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.49,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                            <span>{!isApiReady ? 'Inizializzazione...' : 'Accedi con Google'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="col-span-2 sm:col-span-3 grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                           <button onClick={handleImportFromDrive} className="w-full h-full flex items-center justify-center p-4 bg-slate-100 hover:bg-indigo-100 text-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm font-semibold">
                                Importa da Drive
                            </button>
                        </div>
                        <div className="col-span-2">
                           <button onClick={onSignOut} className="w-full h-full flex items-center justify-center p-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm font-semibold">
                                Esci da Google
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      
      <Card>
        {nextWorkshop ? (
          <>
            <CardHeader>Prossimo Workshop: "{nextWorkshop.name}"</CardHeader>
            <CardContent>
              <p className="text-slate-600"><span className="font-medium">Data:</span> {new Date(nextWorkshop.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-slate-600"><span className="font-medium">Luogo:</span> {locationMap[nextWorkshop.locationId]?.name || 'N/D'}</p>
              <p className="text-slate-600"><span className="font-medium">Iscritti:</span> {registrationsByWorkshop[nextWorkshop.id] || 0} / {locationMap[nextWorkshop.locationId]?.capacity || 'N/A'}</p>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>Nessun Workshop in Programma</CardHeader>
            <CardContent>
              <p className="text-slate-500">Non ci sono workshop futuri al momento. Creane uno dalla sezione Workshop!</p>
            </CardContent>
          </>
        )}
      </Card>
      {renderModal()}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />
      <ConfirmModal
        isOpen={!!importData}
        onClose={() => setImportData(null)}
        onConfirm={confirmImport}
        title="Conferma Importazione Database"
      >
        <p>Stai per sovrascrivere tutti i dati attuali con il contenuto del file di backup. Questa azione è irreversibile. Sei sicuro di voler continuare?</p>
      </ConfirmModal>

      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Esporta Database">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Scegli dove salvare il file di backup del database.</p>
          <button
            onClick={() => {
              onExport();
              setIsExportModalOpen(false);
            }}
            className="w-full flex items-center justify-center p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Scarica File (.json)
          </button>
          <button
            onClick={() => {
              handleExportToDrive();
              setIsExportModalOpen(false);
            }}
            disabled={!isSignedIn || !isApiReady}
            className="w-full flex items-center justify-center p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed font-semibold"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"></path>
            </svg>
            Salva su Google Drive
          </button>
          {!isSignedIn && (
            <p className="text-xs text-center text-slate-500">Accedi con Google per abilitare il salvataggio su Drive.</p>
          )}
        </div>
      </Modal>

    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card>
    <CardContent>
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-full text-indigo-600">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const QuickLinkButton: React.FC<{ label: string; onClick: () => void; icon: React.ReactNode }> = ({ label, onClick, icon }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-indigo-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
  >
    <span className="font-semibold text-slate-700 text-left">{label}</span>
    <div className="text-slate-500 flex-shrink-0">{icon}</div>
  </button>
);

export default DashboardView;