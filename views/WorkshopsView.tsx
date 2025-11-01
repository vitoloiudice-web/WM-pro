import React, { useState, useMemo, useEffect } from 'react';
// FIX: Updated imports to remove file extensions
import Card, { CardContent } from '../components/Card';
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
    PlusIcon,
    ClockIcon
} from '../components/icons/HeroIcons';
import type { Workshop, Location, Registration, Child, Parent, WorkshopType } from '../types';
import Modal from '../components/Modal';
// FIX: Changed import to be a named import as ConfirmModal does not have a default export.
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import Select from '../components/Select';

type ModalState = 
    | { mode: 'view'; workshop: Workshop }
    | { mode: 'edit'; workshop: Workshop }
    | { mode: 'new'; date?: string }
    | null;

const workshopTypeOptions: { value: WorkshopType; label: string }[] = [
    { value: 'OpenDay', label: 'OpenDay' },
    { value: 'Evento', label: 'Evento' },
    { value: '1 Mese', label: '1 Mese' },
    { value: '2 Mesi', label: '2 Mesi' },
    { value: '3 Mesi', label: '3 Mesi' },
    { value: 'Scolastico', label: 'Scolastico' },
    { value: 'Campus', label: 'Campus' },
];

const TYPES_WITH_MANUAL_DURATION: WorkshopType[] = ['Scolastico', 'Campus'];

interface WorkshopsViewProps {
    workshops: Workshop[];
    addWorkshop: (workshop: Omit<Workshop, 'id'>) => Promise<void>;
    updateWorkshop: (id: string, updates: Partial<Workshop>) => Promise<void>;
    removeWorkshop: (id: string) => Promise<void>;
    locations: Location[];
    registrations: Registration[];
    children: Child[];
    parents: Parent[];
}

interface DetailItemProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
}

const daysOfWeekOptions = [
    { value: 'Lunedì', label: 'Lunedì' },
    { value: 'Martedì', label: 'Martedì' },
    { value: 'Mercoledì', label: 'Mercoledì' },
    { value: 'Giovedì', label: 'Giovedì' },
    { value: 'Venerdì', label: 'Venerdì' },
    { value: 'Sabato', label: 'Sabato' },
    { value: 'Domenica', label: 'Domenica' },
];

const DetailItem = ({icon, label, value}: DetailItemProps) => (
    <div className="flex items-start space-x-3 text-testo-input">
        <span className="text-bottone-navbar mt-1 h-5 w-5">{icon}</span>
        <div>
            <p className="text-xs font-medium text-testo-input/80">{label}</p>
            <p className="font-semibold text-testo-input">{value}</p>
        </div>
    </div>
);


const WorkshopsView = ({ workshops, addWorkshop, updateWorkshop, removeWorkshop, locations, registrations, children, parents }: WorkshopsViewProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedLocation, setSelectedLocation] = useState<string>('all');
    
    const [modalState, setModalState] = useState<ModalState>(null);
    const [deletingWorkshopId, setDeletingWorkshopId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Workshop>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [repetitionCount, setRepetitionCount] = useState<number>(0);
    const [filters, setFilters] = useState({ name: '', dayOfWeek: '', startTime: ''});

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
                type: '1 Mese',
                locationId: locations[0]?.id || '',
                startDate: modalState.date || new Date().toISOString().split('T')[0],
                dayOfWeek: 'Lunedì',
                startTime: '17:00',
                durationInMonths: 1, // default for manual types
            });
        } else {
            setFormData({});
        }
        setErrors({});
    }, [modalState, locations]);
    
    // Automatic calculation for EndTime (1 hour after StartTime)
    useEffect(() => {
        if (formData.startTime) {
            const [hours, minutes] = formData.startTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            date.setHours(date.getHours() + 1);
            const newEndTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            setFormData(prev => ({ ...prev, endTime: newEndTime }));
        }
    }, [formData.startTime]);

    // Automatic calculation for Repetitions and EndDate
    useEffect(() => {
        const { type, startDate, durationInMonths } = formData;
        if (!type || !startDate) {
            setRepetitionCount(0);
            setFormData(p => ({...p, endDate: ''}));
            return;
        }

        let reps = 0;
        const start = new Date(startDate);
        if (isNaN(start.getTime())) return;

        switch (type) {
            case 'OpenDay':
            case 'Evento':
                reps = 1;
                break;
            case '1 Mese':
                reps = 4;
                break;
            case '2 Mesi':
                reps = 8;
                break;
            case '3 Mesi':
                reps = 12;
                break;
            case 'Scolastico':
            case 'Campus':
                reps = (durationInMonths || 0) * 4;
                break;
        }

        setRepetitionCount(reps);

        if (reps > 0) {
            const endDate = new Date(start);
            endDate.setDate(endDate.getDate() + (reps - 1) * 7);
            setFormData(p => ({ ...p, endDate: endDate.toISOString().split('T')[0] }));
        } else {
            setFormData(p => ({ ...p, endDate: startDate }));
        }

    }, [formData.type, formData.startDate, formData.durationInMonths]);

    const getConsonants = (str: string): string => {
        if (!str) return '';
        return (str.match(/[bcdfghjklmnpqrstvwxyz]/ig) || []).join('');
    };

    // Automatic Code Generation
    useEffect(() => {
        const { locationId, dayOfWeek, startTime } = formData;
        if (!locationId || !dayOfWeek || !startTime) {
            setFormData(p => ({ ...p, code: ''}));
            return;
        }
    
        const location = locationMap[locationId];
        if (!location) {
            setFormData(p => ({ ...p, code: ''}));
            return;
        }
    
        const locCodePart = getConsonants(location.name).substring(0, 4).toUpperCase();
        const dayCodePart = dayOfWeek.substring(0, 3).toUpperCase();
        const timeCodePart = startTime;
    
        const code = `${locCodePart}-${dayCodePart}-${timeCodePart}`;
        setFormData(p => ({...p, code: code}));
    
    }, [formData.locationId, formData.dayOfWeek, formData.startTime, locationMap]);


    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.currentTarget.id]: e.currentTarget.value }));
    };
    
    const resetFilters = () => {
        setFilters({ name: '', dayOfWeek: '', startTime: '' });
    };

    const filteredWorkshops = useMemo(() => {
        return workshops.filter(w => {
            if (!w) return false;
            if (selectedLocation !== 'all' && w.locationId !== selectedLocation) return false;
            if (filters.name && !w.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
            if (filters.dayOfWeek && w.dayOfWeek !== filters.dayOfWeek) return false;
            if (filters.startTime && w.startTime < filters.startTime) return false;
            return true;
        });
    }, [selectedLocation, workshops, filters]);
    
    const workshopsByDate = useMemo(() => {
        const map = new Map<string, Workshop[]>();
        filteredWorkshops.forEach(ws => {
            if (ws && ws.startDate) {
                const dateKey = ws.startDate;
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(ws);
            }
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
            alert(`Workshop eliminato!`);
            setDeletingWorkshopId(null);
            closeModal();
        }
    };
    
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Il titolo è obbligatorio.';
        if (!formData.type) newErrors.type = 'Il tipo è obbligatorio.';
        if (!formData.locationId) newErrors.locationId = 'La sede è obbligatoria.';
        if (!formData.startDate) newErrors.startDate = 'La data di inizio è obbligatoria.';
        if (!formData.dayOfWeek) newErrors.dayOfWeek = 'Il giorno è obbligatorio.';
        if (!formData.startTime) newErrors.startTime = "L'orario di inizio è obbligatorio.";
        
        const type = formData.type as WorkshopType;
        if (TYPES_WITH_MANUAL_DURATION.includes(type) && (!formData.durationInMonths || formData.durationInMonths <= 0)) {
            newErrors.durationInMonths = "La durata in mesi è obbligatoria e deve essere positiva.";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const dataToSave: Omit<Workshop, 'id'> = {
                code: formData.code || '',
                name: formData.name!,
                type: formData.type! as WorkshopType,
                locationId: formData.locationId!,
                startDate: formData.startDate!,
                endDate: formData.endDate!,
                dayOfWeek: formData.dayOfWeek!,
                startTime: formData.startTime!,
                endTime: formData.endTime!,
                durationInMonths: TYPES_WITH_MANUAL_DURATION.includes(formData.type! as WorkshopType) ? Number(formData.durationInMonths) : undefined,
            };
            
            if (modalState?.mode === 'edit') {
                await updateWorkshop(modalState.workshop.id, dataToSave);
                alert('Workshop aggiornato!');
            } else if (modalState?.mode === 'new') {
                await addWorkshop(dataToSave);
                alert('Nuovo workshop salvato!');
            }
            closeModal();
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const getModalTitle = () => {
        if (!modalState) return '';
        switch (modalState.mode) {
            case 'view': return modalState.workshop.name;
            case 'edit': return `Modifica Workshop`;
            case 'new': return `Nuovo Workshop`;
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
                        <div className="p-2 bg-navbar-blu text-white rounded-md text-center font-mono tracking-wider">
                           Codice: {workshop.code}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2 p-4 bg-white/30 rounded-lg">
                            <DetailItem icon={<CalendarDaysIcon />} label="Tipo" value={workshop.type} />
                            <DetailItem icon={<CalendarDaysIcon />} label="Date" value={`${new Date(workshop.startDate).toLocaleDateString('it-IT')} - ${new Date(workshop.endDate).toLocaleDateString('it-IT')}`} />
                            <DetailItem icon={<ClockIcon />} label="Orario" value={`${workshop.dayOfWeek}, ${workshop.startTime} - ${workshop.endTime}`} />
                            <DetailItem icon={<LocationMarkerIcon />} label="Luogo" value={location?.name ?? 'N/A'} />
                            {/* FIX: Replaced missing ArrowPathIcon with ClockIcon for duration. */}
                            {workshop.durationInMonths && <DetailItem icon={<ClockIcon />} label="Durata" value={`${workshop.durationInMonths} mesi`} />}
                        </div>
                        
                        <div className="pt-2">
                            <h4 className="font-semibold text-testo-input mb-2">
                                Iscritti ({currentRegistrations.length} / {location?.capacity ?? 'N/A'})
                            </h4>
                            {registeredChildren.length > 0 ? (
                                <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {registeredChildren.map(child => {
                                        if (!child) return null;
                                        const parent = parentMap[child.parentId];
                                        return (
                                            <li key={child.id} className="flex items-center space-x-3 p-2 bg-white/40 rounded-md">
                                                <UserCircleIcon className="h-8 w-8 text-testo-input/70 flex-shrink-0" />
                                                <div>
                                                    <p className="font-medium text-testo-input">{child.name}</p>
                                                    <p className="text-xs text-testo-input/80">Genitore: {parent?.name} {parent?.surname}</p>
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            ) : (
                                <p className="text-testo-input/80 italic px-2">Nessun iscritto al momento.</p>
                            )}
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-black/10 flex justify-end items-center space-x-3">
                        <button type="button" onClick={() => setModalState({ mode: 'edit', workshop })} className="px-4 py-2 bg-bottone-azione text-white rounded-md hover:opacity-90 flex items-center space-x-2"><PencilIcon className="h-4 w-4" /><span>Modifica</span></button>
                        <button type="button" onClick={() => setDeletingWorkshopId(workshop.id)} className="px-4 py-2 bg-bottone-eliminazione text-white rounded-md hover:opacity-90 flex items-center space-x-2"><TrashIcon className="h-4 w-4"/><span>Elimina</span></button>
                    </div>
                 </>
            );
        }
        
        if (modalState.mode === 'edit' || modalState.mode === 'new') {
            const locationOptions = locations.map(l => ({ value: l.id, label: `${l.name} (${l.shortName || 'N/A'})` }));
            const type = formData.type as WorkshopType;
            
            const handleCancel = () => {
                if (modalState.mode === 'edit') {
                    setModalState({ mode: 'view', workshop: modalState.workshop });
                } else {
                    closeModal();
                }
            };

            return (
                 <form onSubmit={handleSave} className="space-y-4" noValidate>
                    {formData.code && (
                         <div className="p-2 bg-navbar-blu text-white rounded-md text-center font-mono tracking-wider">
                           {formData.code}
                        </div>
                    )}
                    <Input id="name" label="Titolo Workshop" type="text" value={formData.name || ''} onChange={handleChange} error={errors.name} required autoComplete="off" />
                    <Select id="type" label="Tipo" options={workshopTypeOptions} value={type || ''} onChange={handleChange} error={errors.type} required />
                    <Select id="locationId" label="Sede" options={locationOptions} value={formData.locationId || ''} onChange={handleChange} error={errors.locationId} required placeholder="Seleziona una sede"/>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select id="dayOfWeek" label="Giorno Settimana" options={daysOfWeekOptions} value={formData.dayOfWeek || ''} onChange={handleChange} error={errors.dayOfWeek} required/>
                        <Input id="startTime" label="Orario Inizio (1h)" type="time" value={formData.startTime || ''} onChange={handleChange} error={errors.startTime} required autoComplete="off"/>
                    </div>
                    
                    <Input id="startDate" label="Data Inizio" type="date" value={formData.startDate || ''} onChange={handleChange} error={errors.startDate} required autoComplete="off" />
                    
                    {TYPES_WITH_MANUAL_DURATION.includes(type) && (
                         <Input id="durationInMonths" label="Durata in Mesi" type="number" value={formData.durationInMonths || ''} onChange={handleChange} error={errors.durationInMonths} required autoComplete="off" />
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white/40 rounded-md">
                        <div>
                            <label className="block text-xs font-medium text-testo-input/80">Ripetizioni calcolate</label>
                            <p className="font-semibold text-testo-input">{repetitionCount}</p>
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-testo-input/80">Data fine calcolata</label>
                            <p className="font-semibold text-testo-input">{formData.endDate ? new Date(formData.endDate).toLocaleDateString('it-IT') : 'N/D'}</p>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-black/10">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva</button>
                    </div>
                </form>
            );
        }
        return null;
    }


    return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center space-y-2 sm:space-y-0">
            <h2 className="text-xl font-semibold text-testo-input">Calendario Workshop</h2>
            <button onClick={() => setModalState({ mode: 'new' })} className="bg-bottone-azione text-white px-4 py-2 rounded-full shadow hover:opacity-90 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottone-azione">
              <PlusIcon /><span>Nuovo Workshop</span>
            </button>
        </div>
        
        <Card>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input id="name" label="Cerca per nome" value={filters.name} onChange={handleFilterChange} placeholder="Nome workshop..." autoComplete="off"/>
                    <Select id="dayOfWeek" label="Giorno della settimana" options={daysOfWeekOptions} value={filters.dayOfWeek} onChange={handleFilterChange} placeholder="Qualsiasi giorno" />
                    <Input id="startTime" label="Orario di inizio (dalle)" type="time" value={filters.startTime} onChange={handleFilterChange} autoComplete="off"/>
                </div>
                <div className="flex justify-end">
                    <button onClick={resetFilters} className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400">Resetta Filtri</button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <div className="p-4 flex items-center justify-between border-b border-black/10">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-white/30"><ChevronLeftIcon/></button>
                <h3 className="text-lg font-semibold text-testo-input capitalize">
                    {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-white/30"><ChevronRightIcon/></button>
            </div>
             <div className="px-4 py-2 border-b border-black/10 flex items-center space-x-2">
                <label htmlFor="location-filter" className="text-sm font-medium text-testo-input/90">Filtra per Luogo:</label>
                <select 
                    id="location-filter"
                    className="block w-full sm:w-auto rounded-md border-black/20 bg-white text-testo-input shadow-sm focus:border-bottone-azione focus:ring-bottone-azione text-sm"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                >
                    <option value="all">Tutti i luoghi</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-300 border-t border-gray-300">
                {weekDays.map((day, i) => (
                    <div key={i} className="text-center py-2 text-xs font-semibold text-testo-input/80 bg-white/20">{day}</div>
                ))}
            </div>
            {/* --- BUG FIX: The logic inside this map was causing a hook violation. It has been corrected. --- */}
            <div className="grid grid-cols-7 gap-px bg-gray-300">
                {days.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const dateKey = day.toISOString().split('T')[0];
                    const dailyWorkshops = workshopsByDate.get(dateKey) || [];

                    return (
                        <div 
                            key={index} 
                            className={`relative min-h-[100px] p-2 group ${isCurrentMonth ? 'bg-white cursor-pointer hover:bg-gray-100' : 'bg-gray-50'}`}
                            onClick={() => isCurrentMonth && handleDayClick(dateKey)}
                        >
                            <span className={`font-medium ${isCurrentMonth ? 'text-testo-input' : 'text-testo-input/60'}`}>{day.getDate()}</span>
                            {isCurrentMonth && (
                                <div className="absolute top-1 right-1 p-1 rounded-full text-testo-input/70 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
                                    <PlusIcon className="h-4 w-4" />
                                </div>
                            )}
                            <div className="mt-1 space-y-1">
                                {dailyWorkshops.map(ws => {
                                    // This is just a map lookup, it is safe and does not violate hook rules.
                                    const location = locationMap[ws.locationId];
                                    return (
                                        <div 
                                          key={ws.id} 
                                          className="p-1.5 rounded-md bg-bottone-azione/20 text-testo-input text-xs cursor-pointer transition-all duration-200 hover:bg-bottone-azione/40 hover:scale-105 hover:shadow-sm" 
                                          onClick={(e) => { e.stopPropagation(); setModalState({ mode: 'view', workshop: ws }); }}
                                        >
                                            <p className="font-bold truncate">{ws.name}</p>
                                             <div className="flex items-center space-x-1 mt-0.5 opacity-80">
                                              <ClockIcon className="h-3 w-3" />
                                              <span>{ws.startTime}</span>
                                            </div>
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