import React, { useState, useMemo, useEffect } from 'react';
// FIX: Updated imports to remove file extensions
import Card, { CardContent, CardHeader } from '../components/Card';
import { ArrowUpRightIcon, UsersIcon, CurrencyDollarIcon, CalendarDaysIcon, Cog6ToothIcon, CheckCircleIcon, ExclamationCircleIcon } from '../components/icons/HeroIcons';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import type { View, Workshop, Parent, Payment, Registration, Location, CompanyProfile } from '../types';

type ModalType = 'none' | 'newClient' | 'newWorkshop' | 'newPayment' | 'newCost' | 'settings';

const parentStatusOptions = [
    { value: 'attivo', label: 'Attivo' },
    { value: 'sospeso', label: 'Sospeso' },
    { value: 'cessato', label: 'Cessato' },
    { value: 'prospect', label: 'Prospect' }
];

interface DashboardViewProps {
  firestoreStatus: 'connecting' | 'connected' | 'error';
  companyProfile: CompanyProfile;
  setCompanyProfile: (profile: CompanyProfile) => void;
  workshops: Workshop[];
  parents: Parent[];
  payments: Payment[];
  registrations: Registration[];
  locations: Location[];
  addParent: (parent: Parent) => Promise<void>;
  setCurrentView: (view: View) => void;
}

const DashboardView = ({ 
    firestoreStatus,
    companyProfile, setCompanyProfile,
    workshops, parents, payments, registrations, locations,
    addParent,
    setCurrentView
}: DashboardViewProps) => {
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [formData, setFormData] = useState<Partial<Parent>>({ clientType: 'persona fisica', status: 'attivo' });
  const [genericFormData, setGenericFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [settingsFormData, setSettingsFormData] = useState<CompanyProfile>(companyProfile);

  useEffect(() => {
    if (companyProfile) {
        setSettingsFormData(companyProfile);
    }
  }, [companyProfile, activeModal]);

  // --- Dynamic Data Calculation ---
  const currentYear = new Date().getFullYear();
  const totalIncome = payments
    .filter(p => new Date(p.paymentDate).getFullYear() === currentYear)
    .reduce((sum, p) => sum + p.amount, 0);

  const activeClients = parents.filter(p => p.status === 'attivo').length;
  
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
  
  // --- Modal Logic ---
  const openModal = (type: ModalType) => {
    setActiveModal(type);
    if (type === 'newClient') {
      setFormData({ clientType: 'persona fisica', status: 'attivo' });
    } else {
      setGenericFormData({});
    }
    setErrors({});
  };

  const validate = (modalType: ModalType) => {
    const newErrors: Record<string, string> = {};
    if (modalType === 'newClient') {
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
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeModal === 'newClient') {
      if (validate(activeModal)) {
        // --- FIX START: Build a clean object for Firestore ---
        const dataToSave: any = {
          clientType: formData.clientType || 'persona fisica',
          status: formData.status || 'attivo',
          email: formData.email,
          phone: formData.phone || '',
          address: formData.address || '',
          zipCode: formData.zipCode || '',
          city: formData.city || '',
          province: formData.province || '',
        };

        if (dataToSave.clientType === 'persona fisica') {
          dataToSave.name = formData.name;
          dataToSave.surname = formData.surname;
          dataToSave.taxCode = formData.taxCode;
        } else {
          dataToSave.companyName = formData.companyName;
          dataToSave.vatNumber = formData.vatNumber;
        }
        // --- FIX END ---

        const newParent = { 
            id: `p_${Date.now()}`, 
            ...dataToSave
        } as Parent;

        try {
          await addParent(newParent);
          alert('Nuovo cliente salvato con successo!');
          setActiveModal('none');
        } catch (error) {
          console.error("Errore nel salvataggio del cliente:", error);
          alert("Si è verificato un errore durante il salvataggio. Controlla la console per i dettagli.");
        }
      }
    } else {
        // Handle other modals (simulation)
        console.log(`Saving from dashboard modal: ${activeModal}`, genericFormData);
        alert('Azione completata! (Simulazione per workshop, pagamenti, etc.)');
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
    const { id, value } = e.target;
    
    setFormData((prev: Partial<Parent>) => {
        const newState: Partial<Parent> = { ...prev, [id]: value };
        
        if (id === 'clientType') {
            // When client type changes, preserve common fields but clear specific ones
            if (value === 'persona fisica') {
                newState.companyName = '';
                newState.vatNumber = '';
            } else {
                newState.name = '';
                newState.surname = '';
                newState.taxCode = '';
            }
            // Reset errors to avoid showing irrelevant validation messages
            setErrors({});
        }
        
        return newState;
    });
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
          <button type="button" onClick={() => setActiveModal('none')} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
          <button type="submit" form={formId} className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva</button>
        </div>
    );

    switch (activeModal) {
      case 'settings':
        title = 'Profilo Azienda';
        content = (
          <form id={formId} onSubmit={handleSaveSettings} className="space-y-4" noValidate>
            <p className="text-sm text-testo-input/90">
              Queste informazioni verranno utilizzate per generare preventivi e fatture.
            </p>
            <Input id="companyName" label="Nome Attività" type="text" value={settingsFormData.companyName || ''} onChange={handleSettingsChange} required />
            <Input id="vatNumber" label="Partita IVA / C.F." type="text" value={settingsFormData.vatNumber || ''} onChange={handleSettingsChange} required />
            <Input id="address" label="Indirizzo Completo" type="text" value={settingsFormData.address || ''} onChange={handleSettingsChange} required />
            <Input id="email" label="Email" type="email" value={settingsFormData.email || ''} onChange={handleSettingsChange} required />
            <Input id="phone" label="Telefono" type="tel" value={settingsFormData.phone || ''} onChange={handleSettingsChange} />
            <div>
                <label htmlFor="taxRegime" className="block text-sm font-medium text-testo-input mb-1">
                    Note Fiscali / Regime
                </label>
                <textarea
                    id="taxRegime"
                    value={settingsFormData.taxRegime || ''}
                    onChange={handleSettingsChange}
                    rows={4}
                    className="block w-full rounded-md border-black/20 bg-white text-testo-input shadow-sm focus:border-bottone-azione focus:ring-bottone-azione sm:text-sm"
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
              onChange={handleChange}
              required
            />
            <Select
              id="status"
              label="Stato Cliente"
              options={parentStatusOptions}
              value={formData.status || 'attivo'}
              onChange={handleChange}
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
      // Other cases remain simulation for now
      case 'newWorkshop':
        title = 'Nuovo Workshop';
        content = (
           <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
            <Input id="ws-name" label="Nome Workshop" type="text" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenericFormData(p => ({...p, 'ws-name': e.target.value}))} />
            <Input id="ws-date" label="Data Inizio" type="date" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenericFormData(p => ({...p, 'ws-date': e.target.value}))} />
            <Input id="ws-price" label="Prezzo" type="number" step="0.01" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenericFormData(p => ({...p, 'ws-price': e.target.value}))} />
            {commonButtons}
          </form>
        );
        break;
      case 'newPayment':
        title = 'Registra Pagamento';
        content = (
           <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
            <Input id="pay-amount" label="Importo" type="number" step="0.01" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenericFormData(p => ({...p, 'pay-amount': e.target.value}))} />
            <Input id="pay-date" label="Data Pagamento" type="date" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenericFormData(p => ({...p, 'pay-date': e.target.value}))} />
             {commonButtons}
          </form>
        );
        break;
      case 'newCost':
        title = 'Aggiungi Costo';
        content = (
           <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
            <Input id="cost-desc" label="Descrizione" type="text" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenericFormData(p => ({...p, 'cost-desc': e.target.value}))} />
            <Input id="cost-amount" label="Importo" type="number" step="0.01" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenericFormData(p => ({...p, 'cost-amount': e.target.value}))} />
            {commonButtons}
          </form>
        );
        break;
    }
    
    return (
      <Modal isOpen={true} onClose={() => setActiveModal('none')} title={title}>
        {content}
      </Modal>
    );
  };

  const StatusIndicator = () => {
    switch (firestoreStatus) {
        case 'connected':
            return (
                <div className="flex items-center space-x-2 text-green-600 animate-fade-in">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Connesso a database Firestore</span>
                </div>
            );
        case 'error':
            return (
                <div className="flex items-center space-x-2 text-red-600 animate-fade-in">
                    <ExclamationCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Errore di connessione a Firestore</span>
                </div>
            );
        case 'connecting':
        default:
            return (
                <div className="flex items-center space-x-2 text-testo-input/80 animate-pulse">
                     <svg className="animate-spin h-5 w-5 text-testo-input/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium">Connessione...</span>
                </div>
            );
    }
  };


  return (
    <div className="space-y-6">
       <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-in-out forwards;
        }
      `}</style>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
        <h2 className="text-xl font-semibold text-testo-input">Panoramica</h2>
        <StatusIndicator />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Entrate Totali (Anno)" 
          value={`€${totalIncome.toFixed(2)}`} 
          icon={<CurrencyDollarIcon />} 
          onClick={() => setCurrentView('finance')}
        />
        <StatCard 
          title="Clienti Attivi" 
          value={activeClients} 
          icon={<UsersIcon />} 
          onClick={() => setCurrentView('clients')}
        />
        <StatCard 
          title="Workshop Futuri" 
          value={upcomingWorkshopsCount} 
          icon={<CalendarDaysIcon />} 
          onClick={() => setCurrentView('workshops')}
        />
      </div>

      <Card>
        <CardHeader>Accesso Rapido</CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <QuickLinkButton label="Nuovo Cliente" onClick={() => openModal('newClient')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Nuovo Workshop" onClick={() => openModal('newWorkshop')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Registra Pagamento" onClick={() => openModal('newPayment')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Aggiungi Costo" onClick={() => openModal('newCost')} icon={<ArrowUpRightIcon />} />
                
                <div className="col-span-2 sm:col-span-3">
                    <button
                        onClick={() => openModal('settings')}
                        className="w-full flex items-center justify-between p-4 bg-white/40 hover:bg-white/60 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-bottone-azione text-left"
                    >
                        <div>
                            <span className="font-semibold text-testo-input">Configura Profilo Azienda</span>
                        </div>
                        <div className="text-testo-input/80 flex-shrink-0">
                            <Cog6ToothIcon />
                        </div>
                    </button>
                </div>
            </div>
        </CardContent>
      </Card>
      
      <Card>
        {nextWorkshop ? (
          <>
            <CardHeader>Prossimo Workshop: "{nextWorkshop.name}"</CardHeader>
            <CardContent>
              <p className="text-testo-input/90"><span className="font-medium">Data:</span> {new Date(nextWorkshop.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="text-testo-input/90"><span className="font-medium">Luogo:</span> {locationMap[nextWorkshop.locationId]?.name || 'N/D'}</p>
              <p className="text-testo-input/90"><span className="font-medium">Iscritti:</span> {registrationsByWorkshop[nextWorkshop.id] || 0} / {locationMap[nextWorkshop.locationId]?.capacity || 'N/A'}</p>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>Nessun Workshop in Programma</CardHeader>
            <CardContent>
              <p className="text-testo-input/80">Non ci sono workshop futuri al momento. Creane uno dalla sezione Workshop!</p>
            </CardContent>
          </>
        )}
      </Card>
      {renderModal()}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; onClick?: () => void; }> = ({ title, value, icon, onClick }) => (
  <Card onClick={onClick}>
    <CardContent>
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 bg-bottone-azione/20 p-3 rounded-full text-testo-input">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-testo-input/80 truncate">{title}</p>
          <p className="text-2xl font-bold text-testo-input">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const QuickLinkButton: React.FC<{ label: string; onClick: () => void; icon: React.ReactNode }> = ({ label, onClick, icon }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-white/40 hover:bg-white/60 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-bottone-azione"
  >
    <span className="font-semibold text-testo-input text-left">{label}</span>
    <div className="text-testo-input/80 flex-shrink-0">{icon}</div>
  </button>
);

export default DashboardView;