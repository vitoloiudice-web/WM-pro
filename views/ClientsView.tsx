import React, { useState, useEffect, useMemo } from 'react';
import Card, { CardContent } from '../components/Card.tsx';
import { PlusIcon, UserCircleIcon, PencilIcon, TrashIcon, CreditCardIcon } from '../components/icons/HeroIcons.tsx';
import type { Parent, Child, Workshop, Registration, Payment, Location, PaymentMethod } from '../types.ts';
import Modal from '../components/Modal.tsx';
// FIX: Changed import to be a named import as ConfirmModal does not have a default export.
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import Input from '../components/Input.tsx';
import Select from '../components/Select.tsx';

const parentStatusOptions = [
    { value: 'attivo', label: 'Attivo' },
    { value: 'sospeso', label: 'Sospeso' },
    { value: 'cessato', label: 'Cessato' },
    { value: 'prospect', label: 'Prospect' }
];

const emptyParentForm: Partial<Parent> = { clientType: 'persona fisica', status: 'attivo', name: '', surname: '', email: '', phone: '', taxCode: '', companyName: '', vatNumber: '', address: '', zipCode: '', city: '', province: '' };
const emptyChildForm: { name: string; ageYears: string; ageMonths: string } = { name: '', ageYears: '', ageMonths: '' };

const calculateAge = (birthDateString: string): string => {
  if (!birthDateString) return 'N/D';
  const birthDate = new Date(birthDateString);
  const today = new Date();

  let totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
  if (today.getDate() < birthDate.getDate()) {
    totalMonths--;
  }
  totalMonths = Math.max(0, totalMonths);

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  
  if (years > 0) {
      return `${years} ${years === 1 ? 'anno' : 'anni'}`;
  }
  return `${months} ${months === 1 ? 'mese' : 'mesi'}`;
};

const getParentDisplayName = (parent: Parent): string => {
    if (parent.clientType === 'persona giuridica') {
        return parent.companyName || 'Cliente Giuridico';
    }
    return `${parent.surname || ''} ${parent.name || ''}`.trim();
};

const StatusBadge = ({ status }: { status: Parent['status'] }) => {
    const statusStyles: Record<Parent['status'], string> = {
        attivo: 'bg-status-attivo-bg text-status-attivo-text',
        sospeso: 'bg-status-sospeso-bg text-status-sospeso-text',
        cessato: 'bg-status-cessato-bg text-status-cessato-text',
        prospect: 'bg-status-prospect-bg text-status-prospect-text'
    };
    const statusLabels: Record<Parent['status'], string> = {
        attivo: 'Attivo',
        sospeso: 'Sospeso',
        cessato: 'Cessato',
        prospect: 'Prospect'
    };
    return (
        <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || ''}`}>
            {statusLabels[status] || status}
        </span>
    );
};


interface ClientsViewProps {
  parents: Parent[];
  addParent: (parent: Parent) => Promise<void>;
  updateParent: (id: string, updates: Partial<Parent>) => Promise<void>;
  removeParent: (id: string) => Promise<void>;
  children: Child[];
  addChild: (child: Child) => Promise<void>;
  updateChild: (id: string, updates: Partial<Child>) => Promise<void>;
  removeChild: (id: string) => Promise<void>;
  workshops: Workshop[];
  registrations: Registration[];
  addRegistration: (registration: Registration) => Promise<void>;
  removeRegistration: (id: string) => Promise<void>;
  payments: Payment[];
  addPayment: (payment: Payment) => Promise<void>;
  locations: Location[];
}

const ClientsView = ({ 
    parents, addParent, updateParent, removeParent,
    children, addChild, updateChild, removeChild,
    workshops, 
    registrations, addRegistration, removeRegistration,
    payments, addPayment, 
    locations 
}: ClientsViewProps) => {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkshopId, setFilterWorkshopId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Parent state
  const [editingClient, setEditingClient] = useState<Parent | null>(null);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [parentFormData, setParentFormData] = useState<Partial<Parent>>(emptyParentForm);
  const [parentErrors, setParentErrors] = useState<Record<string, string>>({});

  // Child state
  const [childModalState, setChildModalState] = useState<{ mode: 'new'; parentId: string } | { mode: 'edit'; child: Child } | null>(null);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);
  const [childFormData, setChildFormData] = useState(emptyChildForm);
  const [childErrors, setChildErrors] = useState<Record<string, string>>({});
  
  // Registration state
  const [registrationModalState, setRegistrationModalState] = useState<{ parent: Parent } | null>(null);
  const [registrationFormData, setRegistrationFormData] = useState<{childId?: string; workshopIds?: string[]}>({});
  const [registrationErrors, setRegistrationErrors] = useState<Record<string, string>>({});
  const [deletingRegistrationId, setDeletingRegistrationId] = useState<string | null>(null);
  
  // Payment state
  const [paymentModalState, setPaymentModalState] = useState<{ registration: Registration, workshop: Workshop, child: Child, parent: Parent } | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<{method?: PaymentMethod; paymentDate?: string; amount?: number}>({});
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});
  
  const isParentModalOpen = isNewClientModalOpen || !!editingClient;
  const isChildModalOpen = !!childModalState;

  // Memoized maps for performance
  const workshopMap = useMemo(() => workshops.reduce((acc, ws) => ({ ...acc, [ws.id]: ws }), {} as Record<string, Workshop>), [workshops]);
  const childMap = useMemo(() => children.reduce((acc, c) => ({ ...acc, [c.id]: c }), {} as Record<string, Child>), [children]);
  const locationMap = useMemo(() => locations.reduce((acc, l) => ({ ...acc, [l.id]: l }), {} as Record<string, Location>), [locations]);
  const paymentMap = useMemo(() => {
      const map = new Map<string, Payment>();
      payments.forEach(p => map.set(`${p.parentId}_${p.workshopId}`, p));
      return map;
  }, [payments]);

  const filteredAndSortedParents = useMemo(() => {
    let filtered = [...parents];

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        filtered = filtered.filter(parent => {
            const parentChildren = children.filter(c => c.parentId === parent.id);
            const parentDisplayName = parent.clientType === 'persona giuridica' 
                ? parent.companyName || '' 
                : `${parent.name || ''} ${parent.surname || ''}`;
            const parentMatch = parentDisplayName.toLowerCase().includes(lowercasedFilter) ||
                                (parent.email && parent.email.toLowerCase().includes(lowercasedFilter));
            const childMatch = parentChildren.some(c => c.name.toLowerCase().includes(lowercasedFilter));
            return parentMatch || childMatch;
        });
    }

    if (filterWorkshopId) {
        const childrenInWorkshop = new Set(registrations.filter(r => r.workshopId === filterWorkshopId).map(r => r.childId));
        filtered = filtered.filter(parent => {
            const parentChildrenIds = children.filter(c => c.parentId === parent.id).map(c => c.id);
            return parentChildrenIds.some(childId => childrenInWorkshop.has(childId));
        });
    }
    
    if (filterStatus) {
        filtered = filtered.filter(parent => parent.status === filterStatus);
    }
    
    filtered.sort((a, b) => {
        const nameA = getParentDisplayName(a).toLowerCase();
        const nameB = getParentDisplayName(b).toLowerCase();
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    return filtered;
  }, [parents, children, registrations, searchTerm, filterWorkshopId, sortOrder, filterStatus]);


  // Effects for modals
  useEffect(() => {
    if (editingClient) setParentFormData({ ...emptyParentForm, ...editingClient });
    else setParentFormData(emptyParentForm);
  }, [editingClient, isNewClientModalOpen]);

  useEffect(() => {
    if (childModalState?.mode === 'edit') {
        const birthDate = new Date(childModalState.child.birthDate);
        const today = new Date();
        let totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
        if (today.getDate() < birthDate.getDate()) {
            totalMonths--;
        }
        totalMonths = Math.max(0, totalMonths);
        const ageYears = Math.floor(totalMonths / 12);
        const ageMonths = totalMonths % 12;
        setChildFormData({ name: childModalState.child.name, ageYears: String(ageYears), ageMonths: String(ageMonths) });
    } else {
        setChildFormData(emptyChildForm);
    }
  }, [childModalState]);
  
  useEffect(() => {
    if(paymentModalState){
        setPaymentFormData({
            amount: paymentModalState.workshop.pricePerChild,
            paymentDate: new Date().toISOString().substring(0, 10),
            method: 'cash'
        })
    }
  }, [paymentModalState])

  // --- Parent CRUD ---
  const handleParentFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setParentFormData(prev => {
        const newState = { ...prev, [id]: value };
        
        if (id === 'clientType') {
            if (value === 'persona fisica') {
                newState.companyName = '';
                newState.vatNumber = '';
            } else {
                newState.name = '';
                newState.surname = '';
                newState.taxCode = '';
            }
            setParentErrors({});
        }
        
        return newState;
    });
  };

  const closeParentModal = () => {
    setEditingClient(null);
    setIsNewClientModalOpen(false);
    setParentErrors({});
    setParentFormData(emptyParentForm);
  };
  const handleSaveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const { clientType } = parentFormData;

    if (clientType === 'persona giuridica') {
        if (!parentFormData.companyName?.trim()) newErrors.companyName = 'La ragione sociale è obbligatoria.';
        if (!parentFormData.vatNumber?.trim()) newErrors.vatNumber = 'La Partita IVA è obbligatoria.';
    } else { // persona fisica
        if (!parentFormData.name?.trim()) newErrors.name = 'Il nome è obbligatorio.';
        if (!parentFormData.surname?.trim()) newErrors.surname = 'Il cognome è obbligatorio.';
        if (!parentFormData.taxCode?.trim()) newErrors.taxCode = 'Il codice fiscale è obbligatorio.';
    }

    if (!parentFormData.email?.trim()) newErrors.email = "L'email è obbligatoria.";
    else if (!/\S+@\S+\.\S+/.test(parentFormData.email)) newErrors.email = 'Formato email non valido.';
    
    setParentErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // --- FIX START: Build a clean object for Firestore ---
      const dataToSave: any = {
        clientType: parentFormData.clientType || 'persona fisica',
        status: parentFormData.status || 'attivo',
        email: parentFormData.email,
        phone: parentFormData.phone || '',
        address: parentFormData.address || '',
        zipCode: parentFormData.zipCode || '',
        city: parentFormData.city || '',
        province: parentFormData.province || '',
      };

      if (dataToSave.clientType === 'persona fisica') {
        dataToSave.name = parentFormData.name;
        dataToSave.surname = parentFormData.surname;
        dataToSave.taxCode = parentFormData.taxCode;
      } else {
        dataToSave.companyName = parentFormData.companyName;
        dataToSave.vatNumber = parentFormData.vatNumber;
      }
      // --- FIX END ---

      if (editingClient) {
        await updateParent(editingClient.id, dataToSave);
        alert('Cliente aggiornato!');
      } else {
        const newParent = { 
            id: `p_${Date.now()}`, 
            ...dataToSave,
        } as Parent;
        await addParent(newParent);
        alert('Nuovo cliente salvato!');
      }
      closeParentModal();
    }
  };
  const handleConfirmDeleteClient = async () => {
    if (deletingClientId) {
      // This is a simplified cascade delete. For production, use Firebase Functions.
      const childrenToDelete = children.filter(c => c.parentId === deletingClientId);
      for (const child of childrenToDelete) {
          const regsToDelete = registrations.filter(r => r.childId === child.id);
          for (const reg of regsToDelete) {
              await removeRegistration(reg.id);
          }
          await removeChild(child.id);
      }
      // Note: Payments are not deleted as they are part of financial records.
      await removeParent(deletingClientId);
      
      alert(`Cliente e dati associati sono stati eliminati.`);
      setDeletingClientId(null);
    }
  };

  // --- Child CRUD ---
  const closeChildModal = () => {
    setChildModalState(null);
    setChildErrors({});
    setChildFormData(emptyChildForm);
  };
  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!childFormData.name.trim()) newErrors.name = 'Il nome è obbligatorio.';

    const years = parseInt(childFormData.ageYears, 10) || 0;
    const months = parseInt(childFormData.ageMonths, 10) || 0;

    if (years < 0 || months < 0) {
        newErrors.ageYears = "L'età non può essere negativa.";
    }
    if (years === 0 && months === 0) {
        newErrors.ageYears = "Inserire un'età valida.";
    }
    setChildErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
        const today = new Date();
        const birthDate = new Date(today.getFullYear() - years, today.getMonth() - months, today.getDate());
        const birthDateString = birthDate.toISOString().split('T')[0];
        const newChildData = { name: childFormData.name, birthDate: birthDateString };

        if (childModalState?.mode === 'edit') {
            await updateChild(childModalState.child.id, newChildData);
            alert('Dati del figlio aggiornati!');
        } else if (childModalState?.mode === 'new') {
            const newChild: Child = { id: `c_${Date.now()}`, parentId: childModalState.parentId, ...newChildData };
            await addChild(newChild);
            alert('Nuovo figlio salvato!');
        }
        closeChildModal();
    }
  };
  const handleConfirmChildDelete = async () => {
    if (deletingChildId) {
      // Also delete related registrations
      const regsToDelete = registrations.filter(r => r.childId === deletingChildId);
      for (const reg of regsToDelete) {
        await removeRegistration(reg.id);
      }
      await removeChild(deletingChildId);
      alert(`Figlio e iscrizioni associate eliminati.`);
      setDeletingChildId(null);
    }
  };
  
  // --- Registration CRUD ---
  const closeRegistrationModal = () => {
    setRegistrationModalState(null);
    setRegistrationErrors({});
    setRegistrationFormData({});
  };
  const handleSaveRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const { childId, workshopIds } = registrationFormData;
    if (!childId) newErrors.childId = 'Selezionare un figlio è obbligatorio.';
    if (!workshopIds || workshopIds.length === 0) {
      newErrors.workshopIds = 'Selezionare almeno un workshop è obbligatorio.';
    }
    
    if (childId && workshopIds && workshopIds.length > 0) {
        const errorMessages = [];
        for (const workshopId of workshopIds) {
            if (registrations.some(r => r.childId === childId && r.workshopId === workshopId)) {
                errorMessages.push(`Il bambino è già iscritto a "${workshopMap[workshopId]?.name}".`);
            }
            const workshop = workshopMap[workshopId];
            const location = locationMap[workshop.locationId];
            const currentRegistrations = registrations.filter(r => r.workshopId === workshopId).length;
            if (location && currentRegistrations >= location.capacity) {
                errorMessages.push(`"${workshopMap[workshopId]?.name}" ha raggiunto la capienza massima.`);
            }
        }
        if (errorMessages.length > 0) {
            newErrors.workshopIds = errorMessages.join(' ');
        }
    }
    
    setRegistrationErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && childId && workshopIds) {
        for (const workshopId of workshopIds) {
            const newRegistration: Registration = {
                id: `r_${Date.now()}_${workshopId}`,
                childId: childId,
                workshopId: workshopId,
                registrationDate: new Date().toISOString().split('T')[0]
            };
            await addRegistration(newRegistration);
        }
        alert('Iscrizioni salvate con successo!');
        closeRegistrationModal();
    }
  };
   const handleConfirmRegistrationDelete = async () => {
    if (deletingRegistrationId) {
      await removeRegistration(deletingRegistrationId);
      alert('Iscrizione eliminata!');
      setDeletingRegistrationId(null);
    }
  };

  // --- Payment Modal Logic ---
  const closePaymentModal = () => {
    setPaymentModalState(null);
    setPaymentErrors({});
    setPaymentFormData({});
  };
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!paymentFormData.amount || paymentFormData.amount <= 0) newErrors.amount = "L'importo deve essere positivo.";
    if (!paymentFormData.method) newErrors.method = 'Il metodo è obbligatorio.';
    if (!paymentFormData.paymentDate) newErrors.paymentDate = 'La data è obbligatoria.';
    
    setPaymentErrors(newErrors);
    if(Object.keys(newErrors).length === 0 && paymentModalState){
        const newPayment: Payment = {
            id: `pay_${Date.now()}`,
            parentId: paymentModalState.parent.id,
            workshopId: paymentModalState.workshop.id,
            amount: paymentFormData.amount!,
            paymentDate: paymentFormData.paymentDate!,
            method: paymentFormData.method!
        };
        await addPayment(newPayment);
        alert('Pagamento registrato!');
        closePaymentModal();
    }
  };
  
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-testo-input">Anagrafica Clienti</h2>
        <button onClick={() => setIsNewClientModalOpen(true)} className="bg-bottone-corpo text-white px-4 py-2 rounded-lg shadow hover:opacity-90 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottone-corpo">
          <PlusIcon /><span>Nuovo Cliente</span>
        </button>
      </div>

       <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              id="search"
              label="Cerca cliente o figlio"
              placeholder="Nome, cognome, ragione sociale..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              id="filterWorkshop"
              label="Filtra per workshop"
              value={filterWorkshopId}
              onChange={(e) => setFilterWorkshopId(e.target.value)}
              options={workshops.map(ws => ({ value: ws.id, label: ws.name }))}
              placeholder="Tutti i workshop"
            />
             <Select
              id="filterStatus"
              label="Filtra per stato"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={parentStatusOptions}
              placeholder="Tutti gli stati"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-testo-input mb-1">Ordina per</label>
            <div className="flex space-x-2">
              <button 
                onClick={() => setSortOrder('asc')} 
                className={`px-3 py-1.5 text-sm rounded-md ${sortOrder === 'asc' ? 'bg-bottone-corpo text-white' : 'bg-gray-300 text-black'}`}
              >
                A-Z
              </button>
              <button 
                onClick={() => setSortOrder('desc')}
                className={`px-3 py-1.5 text-sm rounded-md ${sortOrder === 'desc' ? 'bg-bottone-corpo text-white' : 'bg-gray-300 text-black'}`}
              >
                Z-A
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredAndSortedParents.map(parent => {
          const parentChildren = children.filter(c => c.parentId === parent.id);
          const parentRegistrations = registrations.filter(r => parentChildren.some(c => c.id === r.childId));
          
          return (
            <div key={parent.id}>
              <Card>
                <CardContent>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/40 p-3 rounded-full"><UserCircleIcon className="text-testo-input/80 h-8 w-8"/></div>
                      <div>
                        <h4 className="font-bold text-lg text-testo-input flex items-center">
                            {getParentDisplayName(parent)}
                            <StatusBadge status={parent.status} />
                        </h4>
                        <p className="text-sm text-testo-input/80">{parent.email}</p>
                        {parent.address && (
                          <p className="text-sm text-testo-input/80 mt-1">{`${parent.address}, ${parent.zipCode} ${parent.city} (${parent.province})`}</p>
                        )}
                      </div>
                    </div>
                     <div className="flex items-center space-x-2">
                        <button onClick={() => setEditingClient(parent)} className="p-2 text-testo-input/80 hover:text-bottone-corpo rounded-full hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-bottone-corpo" aria-label="Modifica cliente"><PencilIcon className="h-5 w-5"/></button>
                        <button onClick={() => setDeletingClientId(parent.id)} className="p-2 text-testo-input/80 hover:text-red-600 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Elimina cliente"><TrashIcon className="h-5 w-5"/></button>
                    </div>
                  </div>

                  {/* Children section */}
                  <div className="mt-4 pt-4 border-t border-black/10">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-semibold text-testo-input">Figli</h5>
                      <button onClick={() => setChildModalState({ mode: 'new', parentId: parent.id })} className="text-sm text-bottone-corpo hover:opacity-80 font-medium flex items-center space-x-1">
                        <PlusIcon className="h-4 w-4" /><span>Aggiungi</span>
                      </button>
                    </div>
                    {parentChildren.length > 0 ? (
                      <ul className="space-y-2">
                        {parentChildren.map(child => (
                          <li key={child.id} className="flex justify-between items-center p-2 bg-white/30 rounded-md">
                            <div>
                                <p className="font-medium text-testo-input">{child.name}</p>
                                <p className="text-xs text-testo-input/80">Età: {calculateAge(child.birthDate)}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                                <button onClick={() => setChildModalState({ mode: 'edit', child })} className="p-1 text-testo-input/80 hover:text-bottone-corpo"><PencilIcon className="h-4 w-4"/></button>
                                <button onClick={() => setDeletingChildId(child.id)} className="p-1 text-testo-input/80 hover:text-red-600"><TrashIcon className="h-4 w-4"/></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-testo-input/80 italic">Nessun figlio registrato.</p>}
                  </div>

                  {/* Registrations section */}
                  <div className="mt-4 pt-4 border-t border-black/10">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-semibold text-testo-input">Iscrizioni ai Workshop</h5>
                      <button onClick={() => setRegistrationModalState({ parent })} className="text-sm text-bottone-corpo hover:opacity-80 font-medium flex items-center space-x-1">
                        <PlusIcon className="h-4 w-4" /><span>Iscrivi</span>
                      </button>
                    </div>
                    {parentRegistrations.length > 0 ? (
                      <ul className="space-y-2">
                        {parentRegistrations.map(reg => {
                          const workshop = workshopMap[reg.workshopId];
                          const child = childMap[reg.childId];
                          const payment = paymentMap.get(`${parent.id}_${reg.workshopId}`);
                          return (
                            <li key={reg.id} className="flex justify-between items-center p-2 bg-white/30 rounded-md">
                              <div>
                                <p className="font-medium text-testo-input">{workshop?.name || 'Workshop non trovato'}</p>
                                <p className="text-xs text-testo-input/80">Bambino: {child?.name || 'N/D'}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {payment ? (
                                  <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">Pagato</span>
                                ) : (
                                  <button onClick={() => workshop && child && setPaymentModalState({ registration: reg, workshop, child, parent })} className="text-xs font-semibold text-bottone-corpo bg-bottone-corpo/10 px-2 py-1 rounded-full hover:bg-bottone-corpo/20">
                                    Registra Pagamento
                                  </button>
                                )}
                                <button onClick={() => setDeletingRegistrationId(reg.id)} className="p-1 text-testo-input/80 hover:text-red-600"><TrashIcon className="h-4 w-4"/></button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : <p className="text-sm text-testo-input/80 italic">Nessuna iscrizione attiva.</p>}
                  </div>

                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
      
      {/* --- MODALS --- */}
      <Modal isOpen={isParentModalOpen} onClose={closeParentModal} title={editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}>
        <form id="parent-form" onSubmit={handleSaveParent} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select id="clientType" label="Tipo Cliente" value={parentFormData.clientType || 'persona fisica'} onChange={handleParentFormChange} options={[{value: 'persona fisica', label: 'Persona Fisica'}, {value: 'persona giuridica', label: 'Persona Giuridica'}]} required />
                <Select id="status" label="Stato Cliente" value={parentFormData.status || 'attivo'} onChange={handleParentFormChange} options={parentStatusOptions} required />
            </div>
            {parentFormData.clientType === 'persona giuridica' ? (
              <>
                <Input id="companyName" label="Ragione Sociale" type="text" value={parentFormData.companyName || ''} onChange={handleParentFormChange} error={parentErrors.companyName} required />
                <Input id="vatNumber" label="Partita IVA" type="text" value={parentFormData.vatNumber || ''} onChange={handleParentFormChange} error={parentErrors.vatNumber} required />
              </>
            ) : (
              <>
                <Input id="name" label="Nome" type="text" value={parentFormData.name || ''} onChange={handleParentFormChange} error={parentErrors.name} required />
                <Input id="surname" label="Cognome" type="text" value={parentFormData.surname || ''} onChange={handleParentFormChange} error={parentErrors.surname} required />
                <Input id="taxCode" label="Codice Fiscale" type="text" value={parentFormData.taxCode || ''} onChange={handleParentFormChange} error={parentErrors.taxCode} required />
              </>
            )}
            <Input id="email" label="Email" type="email" value={parentFormData.email || ''} onChange={handleParentFormChange} error={parentErrors.email} required />
            <Input id="phone" label="Telefono" type="tel" value={parentFormData.phone || ''} onChange={handleParentFormChange} />
            <Input id="address" label="Indirizzo" type="text" value={parentFormData.address || ''} onChange={handleParentFormChange} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input id="zipCode" label="CAP" type="text" value={parentFormData.zipCode || ''} onChange={handleParentFormChange} />
                <Input id="city" label="Città" type="text" value={parentFormData.city || ''} onChange={handleParentFormChange} />
                <Input id="province" label="Provincia" type="text" value={parentFormData.province || ''} onChange={handleParentFormChange} />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={closeParentModal} className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400">Annulla</button>
              <button type="submit" form="parent-form" className="px-4 py-2 bg-bottone-corpo text-white rounded-md hover:opacity-90">Salva</button>
            </div>
        </form>
      </Modal>

      <Modal isOpen={isChildModalOpen} onClose={closeChildModal} title={childModalState?.mode === 'edit' ? 'Modifica Figlio' : 'Nuovo Figlio'}>
          <form id="child-form" onSubmit={handleSaveChild} className="space-y-4" noValidate>
              <Input id="name" label="Nome" type="text" value={childFormData.name} onChange={e => setChildFormData({...childFormData, name: e.target.value})} error={childErrors.name} required />
              <div className="grid grid-cols-2 gap-4">
                  <Input id="ageYears" label="Anni" type="number" value={childFormData.ageYears} onChange={e => setChildFormData({...childFormData, ageYears: e.target.value})} error={childErrors.ageYears} />
                  <Input id="ageMonths" label="Mesi" type="number" value={childFormData.ageMonths} onChange={e => setChildFormData({...childFormData, ageMonths: e.target.value})} />
              </div>
               <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={closeChildModal} className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400">Annulla</button>
                  <button type="submit" form="child-form" className="px-4 py-2 bg-bottone-corpo text-white rounded-md hover:opacity-90">Salva</button>
              </div>
          </form>
      </Modal>

      <Modal isOpen={!!registrationModalState} onClose={closeRegistrationModal} title="Nuova Iscrizione">
          <form id="registration-form" onSubmit={handleSaveRegistration} className="space-y-4" noValidate>
              <Select id="childId" label="Figlio da Iscrivere" value={registrationFormData.childId || ''} onChange={e => setRegistrationFormData({...registrationFormData, childId: e.target.value})} options={(children.filter(c => c.parentId === registrationModalState?.parent.id) || []).map(c => ({value: c.id, label: c.name}))} error={registrationErrors.childId} required placeholder="Seleziona un figlio" />
              <div>
                  <label htmlFor="workshopIds" className="block text-sm font-medium text-testo-input mb-1">
                    Workshop (seleziona uno o più)
                  </label>
                  <select 
                    id="workshopIds"
                    multiple
                    value={registrationFormData.workshopIds || []}
                    onChange={e => {
                      const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                      setRegistrationFormData({...registrationFormData, workshopIds: selectedIds});
                    }}
                    className={`block w-full rounded-md border-black/20 bg-white text-testo-input shadow-sm focus:border-bottone-corpo focus:ring-bottone-corpo sm:text-sm h-32 ${registrationErrors.workshopIds ? 'border-red-500 text-red-900 focus:border-red-500 focus:ring-red-500' : ''}`}
                  >
                     {workshops.filter(ws => new Date(ws.startDate) >= new Date(todayStr)).map(ws => (
                        <option key={ws.id} value={ws.id}>
                            {`${ws.name} (${new Date(ws.startDate).toLocaleDateString('it-IT')})`}
                        </option>
                     ))}
                  </select>
                  {registrationErrors.workshopIds && <p className="mt-1 text-sm text-red-600">{registrationErrors.workshopIds}</p>}
              </div>
               <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={closeRegistrationModal} className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400">Annulla</button>
                  <button type="submit" form="registration-form" className="px-4 py-2 bg-bottone-corpo text-white rounded-md hover:opacity-90">Salva Iscrizione</button>
              </div>
          </form>
      </Modal>
      
       <Modal isOpen={!!paymentModalState} onClose={closePaymentModal} title={`Pagamento per ${paymentModalState?.child.name}`}>
          <form id="payment-form" onSubmit={handleSavePayment} className="space-y-4" noValidate>
              <Input id="amount" label="Importo" type="number" step="0.01" value={paymentFormData.amount || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentFormData({...paymentFormData, amount: parseFloat(e.target.value)})} error={paymentErrors.amount} required />
              <Input id="paymentDate" label="Data Pagamento" type="date" value={paymentFormData.paymentDate || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentFormData({...paymentFormData, paymentDate: e.target.value})} error={paymentErrors.paymentDate} required />
              <Select id="method" label="Metodo" options={[{value: 'cash', label: 'Contanti'}, {value: 'transfer', label: 'Bonifico'}, {value: 'card', label: 'Carta'}]} value={paymentFormData.method || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentFormData({...paymentFormData, method: e.target.value as PaymentMethod})} error={paymentErrors.method} required/>
               <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={closePaymentModal} className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400">Annulla</button>
                  <button type="submit" form="payment-form" className="px-4 py-2 bg-bottone-corpo text-white rounded-md hover:opacity-90">Registra Pagamento</button>
              </div>
          </form>
      </Modal>

      <ConfirmModal isOpen={!!deletingClientId} onClose={() => setDeletingClientId(null)} onConfirm={handleConfirmDeleteClient} title="Conferma Eliminazione Cliente">
        <p>Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche tutti i figli e le iscrizioni associate. I dati di pagamento verranno conservati.</p>
      </ConfirmModal>

      <ConfirmModal isOpen={!!deletingChildId} onClose={() => setDeletingChildId(null)} onConfirm={handleConfirmChildDelete} title="Conferma Eliminazione Figlio">
        <p>Sei sicuro di voler eliminare questo figlio? Verranno rimosse anche tutte le iscrizioni associate.</p>
      </ConfirmModal>

      <ConfirmModal isOpen={!!deletingRegistrationId} onClose={() => setDeletingRegistrationId(null)} onConfirm={handleConfirmRegistrationDelete} title="Conferma Eliminazione Iscrizione">
        <p>Sei sicuro di voler eliminare questa iscrizione?</p>
      </ConfirmModal>
    </div>
  );
};

export default ClientsView;