import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card.tsx';
import { ArrowUpRightIcon, UsersIcon, CurrencyDollarIcon, CalendarDaysIcon, Cog6ToothIcon, CheckCircleIcon, ExclamationCircleIcon } from '../components/icons/HeroIcons.tsx';
import Modal from '../components/Modal.tsx';
import Input from '../components/Input.tsx';
import Select from '../components/Select.tsx';
import type { Workshop, Parent, Payment, Registration, Location, CompanyProfile } from '../types.ts';

type ModalType = 'none' | 'newClient' | 'newWorkshop' | 'newPayment' | 'newCost' | 'settings';

interface DashboardViewProps {
  firestoreStatus: 'connecting' | 'connected' | 'error';
  companyProfile: CompanyProfile;
  setCompanyProfile: (profile: CompanyProfile) => void;
  workshops: Workshop[];
  parents: Parent[];
  payments: Payment[];
  registrations: Registration[];
  locations: Location[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    firestoreStatus,
    companyProfile, setCompanyProfile,
    workshops, parents, payments, registrations, locations
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
      // FIX: The expression `activeModal !== 'none'` is always true here due to the guard clause at the start of the function.
      // Changed to `true` to resolve the TypeScript error.
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
                <div className="flex items-center space-x-2 text-slate-500 animate-pulse">
                     <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
        <h2 className="text-xl font-semibold text-slate-700">Panoramica</h2>
        <StatusIndicator />
      </div>
      
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <QuickLinkButton label="Nuovo Cliente" onClick={() => openModal('newClient')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Nuovo Workshop" onClick={() => openModal('newWorkshop')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Registra Pagamento" onClick={() => openModal('newPayment')} icon={<ArrowUpRightIcon />} />
                <QuickLinkButton label="Aggiungi Costo" onClick={() => openModal('newCost')} icon={<ArrowUpRightIcon />} />
                
                <div className="col-span-2 sm:col-span-3">
                    <button
                        onClick={() => openModal('settings')}
                        className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-indigo-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                    >
                        <div>
                            <span className="font-semibold text-slate-700">Configura Profilo Azienda</span>
                        </div>
                        <div className="text-slate-500 flex-shrink-0">
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