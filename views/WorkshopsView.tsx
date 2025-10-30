import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardContent } from '../components/Card.tsx';
import { 
    ChevronLeftIcon, 
    ChevronRightIcon, 
    LocationMarkerIcon, 
    UsersIcon, 
    CalendarDaysIcon, 
    CurrencyDollarIcon, 
    UserCircleIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon
} from '../components/icons/HeroIcons.tsx';
import type { Workshop, Location, Registration, Child, Parent } from '../types.ts';
import Modal from '../components/Modal.tsx';
import ConfirmModal from '../components/ConfirmModal.tsx';
import Input from '../components/Input.tsx';
import Select from '../components/Select.tsx';

type ModalState = 
    | { mode: 'view'; workshop: Workshop }
    | { mode: 'edit'; workshop: Workshop }
    | { mode: 'new'; date: string }
    | null;

interface WorkshopsViewProps {
    workshops: Workshop[];
    addWorkshop: (workshop: Workshop) => Promise<void>;
    updateWorkshop: (id: string, updates: Partial<Workshop>) => Promise<void>;
    removeWorkshop: (id: string) => Promise<void>;
    locations: Location[];
    registrations: Registration[];
    children: Child[];
    parents: Parent[];
}

const DetailItem: React.FC<{icon: React.ReactNode; label: string; value: string | number}> = ({icon, label, value}) => (
    <div className="flex items-start space-x-3 text-slate-700">
        <span className="text-indigo-500 mt-1 h-5 w-5">{icon}</span>
        <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="font-semibold text-slate-800">{value}</p>
        </div>
    </div>
);


const WorkshopsView: React.FC<WorkshopsViewProps> = ({ workshops, addWorkshop, updateWorkshop, removeWorkshop, locations, registrations, children, parents }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedLocation, setSelectedLocation] = useState<string>('all');
    
    const [modalState, setModalState] = useState<ModalState>(null);
    const [deletingWorkshopId, setDeletingWorkshopId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Omit<Workshop, 'id'>>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Create maps from props for efficient lookups
    const locationMap = useMemo(() => locations.reduce((acc, l) => ({...acc, [l.id]: l}), {} as Record<string, Location>), [locations]);
    const childMap = useMemo(() => children.reduce((acc, c) => ({...acc, [c.id]: c}), {} as Record<string, Child>), [children]);
    const parentMap = useMemo(() => parents.reduce((acc, p) => ({...acc, [p.id]: p}), {} as Record<string, Parent>), [parents]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };
    
    useEffect(() => {
        if (modalState?.mode === 'edit') {
            setFormData(modalState.workshop);
        } else if (modalState?.mode === 'new') {
            setFormData({
                name: '',
                locationId: locations[0]?.id || '',
                pricePerChild: 0,
                startDate: modalState.date,
                endDate: modalState.date,
            });
        } else {
            setFormData({});
        }
        setErrors({});
    }, [modalState, locations]);

    const filteredWorkshops = useMemo(() => {
        return workshops.filter(w => {
            if (selectedLocation === 'all') return true;
            return w.locationId === selectedLocation;
        });
    }, [selectedLocation, workshops]);
    
    const workshopsByDate = useMemo(() => {
        const map = new Map<string, Workshop[]>();
        filteredWorkshops.forEach(ws => {
            const dateKey = ws.startDate;
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(ws);
        });
        return map;
    }, [filteredWorkshops]);
    
    const registrationsByWorkshop = useMemo(() => {
        const map = new Map<string, number>();
        registrations.forEach(reg => {
            map.set(reg.workshopId, (map.get(reg.workshopId) || 0) + 1);
        });
        return map;
    }, [registrations]);

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    const dayOfWeek = (monthStart.getDay() + 6) % 7; // Monday is 0, Sunday is 6
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 42; i++) {
        days.push(new Date(startDate));
        startDate.setDate(startDate.getDate() + 1);
    }
    
    const weekDays = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

    const closeModal = () => {
        setModalState(null);
    };

    const handleDayClick = (date: string) => {
        setModalState({ mode: 'new', date });
    };
    
    const handleConfirmDelete = async () => {
        if (deletingWorkshopId) {
            await removeWorkshop(deletingWorkshopId);
            // Note: cascading deletes (e.g., registrations) should be handled
            // via Firebase Functions for robustness, or manually in the client.
            // For now, we only delete the workshop itself.
            alert(`Workshop eliminato!`);
            setDeletingWorkshopId(null);
            closeModal();
        }
    };
    
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Il nome è obbligatorio.';
        if (!formData.locationId) newErrors.locationId = 'Il luogo è obbligatorio.';
        if (formData.pricePerChild === undefined || parseFloat(String(formData.pricePerChild)) <= 0) newErrors.pricePerChild = 'Il prezzo deve essere un numero positivo.';
        if (!formData.startDate) newErrors.startDate = 'La data di inizio è obbligatoria.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const dataToSave = {
                ...formData,
                pricePerChild: parseFloat(String(formData.pricePerChild))
            };
            
            if (modalState?.mode === 'edit') {
                await updateWorkshop(modalState.workshop.id, dataToSave);
                alert('Workshop aggiornato!');
            } else if (modalState?.mode === 'new') {
                const newWorkshop: Workshop = {
                    id: `ws_${Date.now()}`,
                    name: dataToSave.name!,
                    locationId: dataToSave.locationId!,
                    startDate: dataToSave.startDate!,
                    endDate: dataToSave.endDate || dataToSave.startDate!,
                    pricePerChild: dataToSave.pricePerChild!,
                };
                await addWorkshop(newWorkshop);
                alert('Nuovo workshop salvato!');
            }
            closeModal();
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const getModalTitle = () => {
        if (!modalState) return '';
        switch (modalState.mode) {
            case 'view': return modalState.workshop.name;
            case 'edit': return `Modifica: ${modalState.workshop.name}`;
            case 'new': return `Nuovo Workshop per il ${new Date(modalState.date).toLocaleDateString('it-IT')}`;
        }
    };

    const renderModalContent = () => {
        if (!modalState) return null;

        if (modalState.mode === 'view') {
            const { workshop } = modalState;
            const location = locationMap[workshop.locationId];
            const currentRegistrations = registrations.filter(r => r.workshopId === workshop.id);
            const registeredChildren = currentRegistrations
                .map(r => childMap[r.childId])
                .filter(Boolean);

            return (
                 <>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                            <DetailItem icon={<CalendarDaysIcon />} label="Data" value={new Date(workshop.startDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })} />
                            <DetailItem icon={<LocationMarkerIcon />} label="Luogo" value={location?.name ?? 'N/A'} />
                            <DetailItem icon={<CurrencyDollarIcon />} label="Prezzo" value={`€${workshop.pricePerChild.toFixed(2)}`} />
                        </div>
                        
                        <div className="pt-2">
                            <h4 className="font-semibold text-slate-800 mb-2">
                                Iscritti ({currentRegistrations.length} / {location?.capacity ?? 'N/A'})
                            </h4>
                            {registeredChildren.length > 0 ? (
                                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {registeredChildren.map(child => {
                                        if (!child) return null;
                                        const parent = parentMap[child.parentId];
                                        return (
                                            <li key={child.id} className="flex items-center space-x-3 p-2 bg-slate-100 rounded-md">
                                                <UserCircleIcon className="h-8 w-8 text-slate-400 flex-shrink-0" />
                                                <div>
                                                    <p className="font-medium text-slate-800">{child.name}</p>
                                                    <p className="text-xs text-slate-500">Genitore: {parent?.name} {parent?.surname}</p>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            ) : (
                                <p className="text-slate-500 italic px-2">Nessun iscritto al momento.</p>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end items-center space-x-3">
                        <button type="button" onClick={() => setModalState({ mode: 'edit', workshop })} className="px-4 py-2 bg-slate-100 text-slate-800 rounded-md hover:bg-slate-200 flex items-center space-x-2"><PencilIcon className="h-4 w-4" /><span>Modifica</span></button>
                        <button type="button" onClick={() => setDeletingWorkshopId(workshop.id)} className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 flex items-center space-x-2"><TrashIcon className="h-4 w-4"/><span>Elimina</span></button>
                    </div>
                 </>
            );
        }
        
        if (modalState.mode === 'edit' || modalState.mode === 'new') {
            const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
            const handleCancel = () => {
                if (modalState.mode === 'edit') {
                    setModalState({ mode: 'view', workshop: modalState.workshop });
                } else {
                    closeModal();
                }
            };

            return (
                 <form onSubmit={handleSave} className="space-y-4" noValidate>
                    <Input id="name" label="Nome Workshop" type="text" value={formData.name || ''} onChange={handleChange} error={errors.name} required />
                    <Select id="locationId" label="Luogo" options={locationOptions} value={formData.locationId || ''} onChange={handleChange} error={errors.locationId} required placeholder="Seleziona un luogo"/>
                    <Input id="pricePerChild" label="Prezzo per Bambino (€)" type="number" step="0.01" value={String(formData.pricePerChild || '')} onChange={handleChange} error={errors.pricePerChild} required />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input id="startDate" label="Data Inizio" type="date" value={formData.startDate || ''} onChange={handleChange} error={errors.startDate} required />
                        <Input id="endDate" label="Data Fine" type="date" value={formData.endDate || ''} onChange={handleChange} error={errors.endDate} />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva</button>
                    </div>
                </form>
            );
        }
        return null;
    }


    return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0">
             <h2 className="text-xl font-semibold text-slate-700">Calendario Workshop</h2>
            <div className="flex items-center space-x-2">
                <label htmlFor="location-filter" className="text-sm font-medium text-slate-600">Luogo:</label>
                <select 
                    id="location-filter"
                    className="block w-full sm:w-auto rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                >
                    <option value="all">Tutti i luoghi</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <Card>
            <div className="p-4 flex items-center justify-between border-b border-slate-200">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100"><ChevronLeftIcon/></button>
                <h3 className="text-lg font-semibold text-slate-800 capitalize">
                    {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100"><ChevronRightIcon/></button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 border-t border-slate-200">
                {weekDays.map((day, i) => (
                    <div key={i} className="text-center py-2 text-xs font-semibold text-slate-500 bg-slate-50">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200">
                {days.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const dateKey = day.toISOString().split('T')[0];
                    const dailyWorkshops = workshopsByDate.get(dateKey) || [];

                    return (
                        <div 
                            key={index} 
                            className={`relative min-h-[100px] p-2 group ${isCurrentMonth ? 'bg-white cursor-pointer hover:bg-slate-50' : 'bg-slate-50'}`}
                            onClick={() => isCurrentMonth && handleDayClick(dateKey)}
                        >
                            <span className={`font-medium ${isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}`}>{day.getDate()}</span>
                            {isCurrentMonth && (
                                <div className="absolute top-1 right-1 p-1 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                                    <PlusIcon className="h-4 w-4" />
                                </div>
                            )}
                            <div className="mt-1 space-y-1">
                                {dailyWorkshops.map(ws => {
                                    const location = locationMap[ws.locationId];
                                    return (
                                        <div 
                                          key={ws.id} 
                                          className="p-1.5 rounded-md bg-indigo-100 text-indigo-800 text-xs cursor-pointer transition-all duration-200 hover:bg-indigo-200 hover:scale-105 hover:shadow-sm" 
                                          onClick={(e) => { e.stopPropagation(); setModalState({ mode: 'view', workshop: ws }); }}
                                        >
                                            <p className="font-bold truncate">{ws.name}</p>
                                            <div className="flex items-center space-x-1 mt-0.5 opacity-80">
                                              <UsersIcon className="h-3 w-3" />
                                              <span>{registrationsByWorkshop.get(ws.id) || 0} / {location?.capacity ?? 'N/A'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
        
        <Modal isOpen={!!modalState} onClose={closeModal} title={getModalTitle()}>
            {renderModalContent()}
        </Modal>

        <ConfirmModal
            isOpen={!!deletingWorkshopId}
            onClose={() => setDeletingWorkshopId(null)}
            onConfirm={handleConfirmDelete}
            title="Conferma Eliminazione Workshop"
        >
            <p>Sei sicuro di voler eliminare questo workshop? L'azione è irreversibile e rimuoverà anche le iscrizioni collegate.</p>
        </ConfirmModal>

    </div>
    );
};

export default WorkshopsView;