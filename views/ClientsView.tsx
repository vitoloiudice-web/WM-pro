import React, { useState, useEffect, useMemo } from 'react';
import Card, { CardContent } from '../components/Card.tsx';
import { PlusIcon, UserCircleIcon, PencilIcon, TrashIcon, CreditCardIcon } from '../components/icons/HeroIcons.tsx';
import type { Parent, Child, Workshop, Registration, Payment, Location, PaymentMethod } from '../types.ts';
import Modal from '../components/Modal.tsx';
import ConfirmModal from '../components/ConfirmModal.tsx';
import Input from '../components/Input.tsx';
import Select from '../components/Select.tsx';

const emptyParentForm: Partial<Parent> = { clientType: 'persona fisica', name: '', surname: '', email: '', phone: '', taxCode: '', companyName: '', vatNumber: '', address: '', zipCode: '', city: '', province: '' };
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
    return `${parent.name || ''} ${parent.surname || ''}`.trim();
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

const ClientsView: React.FC<ClientsViewProps> = ({ 
    parents, addParent, updateParent, removeParent,
    children, addChild, updateChild, removeChild,
    workshops, 
    registrations, addRegistration, removeRegistration,
    payments, addPayment, 
    locations 
}) => {
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
  const [registrationFormData, setRegistrationFormData] = useState<{childId?: string; workshopId?: string}>({});
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
      const dataToSave: Partial<Parent> = { ...parentFormData };
      // Clear unused fields based on type
      if (dataToSave.clientType === 'persona fisica') {
          dataToSave.companyName = undefined;
          dataToSave.vatNumber = undefined;
      } else {
          dataToSave.name = undefined;
          dataToSave.surname = undefined;
          dataToSave.taxCode = undefined;
      }

      if (editingClient) {
        await updateParent(editingClient.id, dataToSave);
        alert('Cliente aggiornato!');
      } else {
        const newParent = { 
            id: `p_${Date.now()}`, 
            ...dataToSave,
            clientType: dataToSave.clientType || 'persona fisica',
            email: dataToSave.email || '',
            phone: dataToSave.phone || ''
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
    if (!registrationFormData.childId) newErrors.childId = 'Selezionare un figlio è obbligatorio.';
    if (!registrationFormData.workshopId) newErrors.workshopId = 'Selezionare un workshop è obbligatorio.';
    
    if (registrationFormData.childId && registrationFormData.workshopId) {
        if(registrations.some(r => r.childId === registrationFormData.childId && r.workshopId === registrationFormData.workshopId)){
            newErrors.workshopId = 'Questo bambino è già iscritto a questo workshop.';
        }
        const workshop = workshopMap[registrationFormData.workshopId];
        const location = locationMap[workshop.locationId];
        const currentRegistrations = registrations.filter(r => r.workshopId === registrationFormData.workshopId).length;
        if(location && currentRegistrations >= location.capacity){
             newErrors.workshopId = 'Il workshop ha raggiunto la capienza massima.';
        }
    }
    
    setRegistrationErrors(newErrors);
    if(Object.keys(newErrors).length === 0){
        const newRegistration: Registration = {
            id: `r_${Date.now()}`,
            childId: registrationFormData.childId!,
            workshopId: registrationFormData.workshopId!,
            registrationDate: new Date().toISOString().split('T')[0]
        };
        await addRegistration(newRegistration);
        alert('Nuova iscrizione salvata!');
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
        <h2 className="text-xl font-semibold text-slate-700">Anagrafica Clienti</h2>
        <button onClick={() => setIsNewClientModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <PlusIcon /><span>Nuovo Cliente</span>
        </button>
      </div>

      <div className="space-y-4">
        {parents.map(parent => {
          const parentChildren = children.filter(c => c.parentId === parent.id);
          const parentRegistrations = registrations.filter(r => parentChildren.some(c => c.id === r.childId));
          
          return (
            <Card key={parent.id}>
              <CardContent>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="bg-slate-200 p-3 rounded-full"><UserCircleIcon className="text-slate-500 h-8 w-8"/></div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-800">{getParentDisplayName(parent)}</h4>
                      <p className="text-sm text-slate-500">{parent.email}</p>
                      {parent.address && (
                        <p className="text-sm text-slate-500 mt-1">{`${parent.address}, ${parent.zipCode} ${parent.city} (${parent.province})`}</p>
                      )}
                    </div>
                  </div>
                   <div className="flex items-center space-x-2">
                      <button onClick={() => setEditingClient(parent)} className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Modifica cliente"><PencilIcon className="h-5 w-5"/></button>
                      <button onClick={() => setDeletingClientId(parent.id)} className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Elimina cliente"><TrashIcon className="h-5 w-5"/></button>
                  </div>
                </div>
                
                {parent.clientType === 'persona fisica' && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <h5 className="font-semibold text-sm text-slate-600 mb-2">Figli/e:</h5>
                    <div className="space-y-2">
                        {parentChildren.map(child => (
                            <div key={child.id} className="flex items-center justify-between p-2 -m-2 rounded-md hover:bg-slate-100">
                              <div className="flex items-center space-x-3 text-slate-700"><UserCircleIcon className="h-5 w-5 text-slate-400 flex-shrink-0"/><span>{child.name} ({calculateAge(child.birthDate)})</span></div>
                              <div className="flex items-center space-x-1 transition-opacity">
                                <button onClick={() => setChildModalState({mode: 'edit', child})} className="p-1 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-200" aria-label="Modifica figlio"><PencilIcon className="h-4 w-4"/></button>
                                <button onClick={() => setDeletingChildId(child.id)} className="p-1 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-200" aria-label="Elimina figlio"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2"><button onClick={() => setChildModalState({mode:'new', parentId: parent.id})} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center space-x-1"><PlusIcon className="h-4 w-4" /><span>Aggiungi Figlio/a</span></button></div>
                  </div>
                )}
                
                <div className="mt-4 border-t border-slate-200 pt-4">
                   <h5 className="font-semibold text-sm text-slate-600 mb-2">Iscrizioni & Pagamenti:</h5>
                   <div className="space-y-2">
                     {parentRegistrations.map(reg => {
                        const child = childMap[reg.childId];
                        const workshop = workshopMap[reg.workshopId];
                        const isPaid = paymentMap.has(`${parent.id}_${reg.workshopId}`);
                        if(!child || !workshop) return null;

                        return (
                            <div key={reg.id} className="flex items-center justify-between p-2 -m-2 rounded-md hover:bg-slate-100">
                               <div className="flex-grow">
                                  <div className="flex items-center space-x-2">
                                      <p className="font-medium text-slate-800">{child.name} - <span className="font-normal">{workshop.name}</span></p>
                                      {isPaid 
                                        ? <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded-full">Pagato</span>
                                        : <span className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Da Pagare</span>
                                      }
                                  </div>
                                 <p className="text-xs text-slate-500">Data: {new Date(workshop.startDate).toLocaleDateString('it-IT', { timeZone: 'UTC' })}</p>
                               </div>
                               <div className="flex-shrink-0 flex items-center space-x-2">
                                  <div className="flex items-center transition-opacity">
                                    {!isPaid && <button onClick={() => setPaymentModalState({registration: reg, workshop, child, parent})} className="p-1 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-200" aria-label="Registra Pagamento"><CreditCardIcon className="h-4 w-4"/></button>}
                                    <button onClick={() => setDeletingRegistrationId(reg.id)} className="p-1 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-200" aria-label="Elimina Iscrizione"><TrashIcon className="h-4 w-4"/></button>
                                  </div>
                               </div>
                            </div>
                        )
                     })}
                   </div>
                   <div className="mt-2"><button onClick={() => setRegistrationModalState({ parent })} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold flex items-center space-x-1"><PlusIcon className="h-4 w-4" /><span>Aggiungi Iscrizione</span></button></div>
                </div>

              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* --- MODALS --- */}

      {/* Parent Modal */}
      <Modal isOpen={isParentModalOpen} onClose={closeParentModal} title={editingClient ? 'Modifica Cliente' : 'Aggiungi Nuovo Cliente'}>
        <form onSubmit={handleSaveParent} className="space-y-4" noValidate>
           <Select 
            id="clientType"
            label="Tipo Cliente"
            options={[
                { value: 'persona fisica', label: 'Persona Fisica' },
                { value: 'persona giuridica', label: 'Persona Giuridica' }
            ]}
            value={parentFormData.clientType || 'persona fisica'}
            onChange={e => {
                const newType = e.target.value as 'persona fisica' | 'persona giuridica';
                setParentFormData(prev => ({...prev, clientType: newType}));
                setParentErrors({});
            }}
            required
          />

          {parentFormData.clientType === 'persona giuridica' ? (
              <>
                  <Input id="companyName" label="Ragione Sociale" type="text" value={parentFormData.companyName || ''} onChange={e => setParentFormData({...parentFormData, companyName: e.target.value})} error={parentErrors.companyName} required />
                  <Input id="vatNumber" label="Partita IVA" type="text" value={parentFormData.vatNumber || ''} onChange={e => setParentFormData({...parentFormData, vatNumber: e.target.value})} error={parentErrors.vatNumber} required />
              </>
          ) : (
              <>
                  <Input id="name" label="Nome" type="text" value={parentFormData.name || ''} onChange={e => setParentFormData({...parentFormData, name: e.target.value})} error={parentErrors.name} required />
                  <Input id="surname" label="Cognome" type="text" value={parentFormData.surname || ''} onChange={e => setParentFormData({...parentFormData, surname: e.target.value})} error={parentErrors.surname} required />
                  <Input id="taxCode" label="Codice Fiscale" type="text" value={parentFormData.taxCode || ''} onChange={e => setParentFormData({...parentFormData, taxCode: e.target.value})} error={parentErrors.taxCode} required />
              </>
          )}

          <Input id="email" label="Email" type="email" value={parentFormData.email || ''} onChange={e => setParentFormData({...parentFormData, email: e.target.value})} error={parentErrors.email} required />
          <Input id="phone" label="Telefono" type="tel" value={parentFormData.phone || ''} onChange={e => setParentFormData({...parentFormData, phone: e.target.value})} error={parentErrors.phone} />
          
          <Input id="address" label="Indirizzo" type="text" value={parentFormData.address || ''} onChange={e => setParentFormData({...parentFormData, address: e.target.value})} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input id="zipCode" label="CAP" type="text" value={parentFormData.zipCode || ''} onChange={e => setParentFormData({...parentFormData, zipCode: e.target.value})} />
                <Input id="city" label="Città" type="text" value={parentFormData.city || ''} onChange={e => setParentFormData({...parentFormData, city: e.target.value})} />
                <Input id="province" label="Provincia" type="text" value={parentFormData.province || ''} onChange={e => setParentFormData({...parentFormData, province: e.target.value})} />
            </div>

          <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={closeParentModal} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva</button></div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deletingClientId} onClose={() => setDeletingClientId(null)} onConfirm={handleConfirmDeleteClient} title="Conferma Eliminazione"><p>Sei sicuro di voler eliminare questo cliente? Saranno rimossi anche tutti i figli, le iscrizioni e i pagamenti collegati. L'azione è irreversibile.</p></ConfirmModal>

      {/* Child Modal */}
      <Modal isOpen={isChildModalOpen} onClose={closeChildModal} title={childModalState?.mode === 'edit' ? 'Modifica Dati Figlio' : 'Aggiungi Nuovo Figlio'}>
        <form onSubmit={handleSaveChild} className="space-y-4" noValidate>
            <Input id="name" label="Nome" type="text" value={childFormData.name} onChange={e => setChildFormData({...childFormData, name: e.target.value})} error={childErrors.name} required />
            <div className="grid grid-cols-2 gap-4">
                <Input id="ageYears" label="Età (Anni)" type="number" min="0" value={childFormData.ageYears} onChange={e => setChildFormData({...childFormData, ageYears: e.target.value})} error={childErrors.ageYears} />
                <Input id="ageMonths" label="Età (Mesi)" type="number" min="0" max="11" value={childFormData.ageMonths} onChange={e => setChildFormData({...childFormData, ageMonths: e.target.value})} error={childErrors.ageMonths} />
            </div>
          <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={closeChildModal} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva</button></div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!deletingChildId} onClose={() => setDeletingChildId(null)} onConfirm={handleConfirmChildDelete} title="Conferma Eliminazione Figlio"><p>Sei sicuro di voler eliminare i dati di questo figlio? Saranno rimosse anche le eventuali iscrizioni ai workshop. L'azione è irreversibile.</p></ConfirmModal>

      {/* Registration Modal */}
      <Modal isOpen={!!registrationModalState} onClose={closeRegistrationModal} title={`Nuova Iscrizione per ${registrationModalState?.parent ? getParentDisplayName(registrationModalState.parent) : ''}`}>
        {registrationModalState && (
            <form onSubmit={handleSaveRegistration} className="space-y-4" noValidate>
                <Select id="childId" label="Figlio/a" options={children.filter(c => c.parentId === registrationModalState.parent.id).map(c => ({value: c.id, label: `${c.name} (${getParentDisplayName(registrationModalState.parent)})`}))} placeholder="Seleziona un figlio" value={registrationFormData.childId || ''} onChange={e => setRegistrationFormData(prev => ({...prev, childId: e.target.value}))} error={registrationErrors.childId} required />
                <Select id="workshopId" label="Workshop" options={workshops.filter(w => w.startDate >= todayStr).map(w => ({value: w.id, label: `${w.name} - ${new Date(w.startDate).toLocaleDateString('it-IT', { timeZone: 'UTC' })}`}))} placeholder="Seleziona un workshop" value={registrationFormData.workshopId || ''} onChange={e => setRegistrationFormData(prev => ({...prev, workshopId: e.target.value}))} error={registrationErrors.workshopId} required />
                <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={closeRegistrationModal} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva Iscrizione</button></div>
            </form>
        )}
      </Modal>
       <ConfirmModal isOpen={!!deletingRegistrationId} onClose={() => setDeletingRegistrationId(null)} onConfirm={handleConfirmRegistrationDelete} title="Conferma Eliminazione Iscrizione"><p>Sei sicuro di voler eliminare questa iscrizione? Il pagamento associato (se presente) non sarà eliminato. L'azione è irreversibile.</p></ConfirmModal>
       
      {/* Payment Modal */}
      <Modal isOpen={!!paymentModalState} onClose={closePaymentModal} title={`Registra Pagamento`}>
          {paymentModalState && (
             <form onSubmit={handleSavePayment} className="space-y-4" noValidate>
                <div>
                  <p className="text-sm text-slate-600">Stai registrando un pagamento per:</p>
                  <p className="font-semibold text-slate-800">{paymentModalState.child.name} - {paymentModalState.workshop.name}</p>
                </div>
                 <Input id="amount" label="Importo" type="number" step="0.01" value={paymentFormData.amount || ''} onChange={e => setPaymentFormData({...paymentFormData, amount: parseFloat(e.target.value)})} error={paymentErrors.amount} required />
                 <Select id="method" label="Metodo di Pagamento" options={[{value:'cash', label: 'Contanti'}, {value:'transfer', label:'Bonifico'}, {value:'card', label:'Carta'}]} value={paymentFormData.method || ''} onChange={e => setPaymentFormData({...paymentFormData, method: e.target.value as PaymentMethod})} error={paymentErrors.method} required />
                 <Input id="paymentDate" label="Data Pagamento" type="date" value={paymentFormData.paymentDate || ''} onChange={e => setPaymentFormData({...paymentFormData, paymentDate: e.target.value})} error={paymentErrors.paymentDate} required />
                 <div className="flex justify-end space-x-3 pt-4"><button type="button" onClick={closePaymentModal} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva Pagamento</button></div>
             </form>
          )}
      </Modal>

    </div>
  );
};

export default ClientsView;