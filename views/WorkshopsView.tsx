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
    | { mode: 'new'; date: string }
    | null;

const workshopTypeOptions: { value: WorkshopType; label: string }[] = [
    { value: 'OpenDay', label: 'OpenDay' },
    { value: 'Evento', label: 'Evento' },
    { value: '1 Mese', label: '1 Mese (tot. 4 Lab)' },
    { value: '2 Mesi', label: '2 Mesi (tot. 8 Labs)' },
    { value: '3 Mesi', label: '3 Mesi (tot. 12 Labs)' },
    { value: 'Scolastico', label: 'Scolastico' },
    { value: 'Campus', label: 'Campus' },
];

const WORKSHOP_STANDARD_PRICES: Partial<Record<WorkshopType, number>> = {
    '1 Mese': 65,
    '2 Mesi': 120,
    '3 Mesi': 165,
};

const WORKSHOP_TYPES_WITH_PRESET_PRICE: WorkshopType[] = ['1 Mese', '2 Mesi', '3 Mesi'];
const TYPES_WITH_MANUAL_END_DATE: WorkshopType[] = ['Scolastico', 'Campus'];

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
    const [priceConfig, setPriceConfig] = useState<{ isManual: boolean }>({ isManual: false });

    const [filters, setFilters] = useState({ name: '', dayOfWeek: '', startTime: '', minPrice: '', maxPrice: ''});

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
            const { type, pricePerChild } = modalState.workshop;
            const standardPrice = WORKSHOP_STANDARD_PRICES[type];
            if (standardPrice !== undefined && pricePerChild !== standardPrice) {
                setPriceConfig({ isManual: true });
            } else {
                setPriceConfig({ isManual: false });
            }
        } else if (modalState?.mode === 'new') {
            const defaultType: WorkshopType = '1 Mese';
            setFormData({
                name: '',
                type: defaultType,
                locationId: locations[0]?.id || '',
                pricePerChild: WORKSHOP_STANDARD_PRICES[defaultType],
                startDate: modalState.date,
                endDate: '', // Will be calculated
                dayOfWeek: 'Lunedì',
                startTime: '10:00',
                endTime: '12:00',
            });
            setPriceConfig({ isManual: false });
        } else {
            setFormData({});
        }
        setErrors({});
    }, [modalState, locations]);

    useEffect(() => {
        const { type, startDate } = formData;
        if (!type || !startDate) return;

        if (TYPES_WITH_MANUAL_END_DATE.includes(type as WorkshopType)) {
            return;
        }

        const start = new Date(startDate);
        let newEndDate = startDate;

        switch (type) {
            case '1 Mese':
                start.setDate(start.getDate() + 21);
                newEndDate = start.toISOString().split('T')[0];
                break;
            case '2 Mesi':
                start.setDate(start.getDate() + 49);
                newEndDate = start.toISOString().split('T')[0];
                break;
            case '3 Mesi':
                start.setDate(start.getDate() + 77);
                newEndDate = start.toISOString().split('T')[0];
                break;
        }
        setFormData(prev => ({...prev, endDate: newEndDate}));
    }, [formData.type, formData.startDate]);

    useEffect(() => {
        const { type } = formData;
        if (!type) return;

        if (type === 'OpenDay') {
            setFormData(prev => ({...prev, pricePerChild: 0}));
            setPriceConfig({ isManual: false });
            return;
        }

        const standardPrice = WORKSHOP_STANDARD_PRICES[type as WorkshopType];
        if (standardPrice !== undefined) {
            if (!priceConfig.isManual) {
                setFormData(prev => ({...prev, pricePerChild: standardPrice}));
            }
        } else {
            setPriceConfig({ isManual: true });
        }
    }, [formData.type, priceConfig.isManual]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };
    
    const resetFilters = () => {
        setFilters({ name: '', dayOfWeek: '', startTime: '', minPrice: '', maxPrice: '' });
    };

    const filteredWorkshops = useMemo(() => {
        return workshops.filter(w => {
            if (selectedLocation !== 'all' && w.locationId !== selectedLocation) return false;
            if (filters.name && !w.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
            if (filters.dayOfWeek && w.dayOfWeek !== filters.dayOfWeek) return false;
            if (filters.startTime && w.startTime < filters.startTime) return false;
            if (filters.minPrice && w.pricePerChild < parseFloat(filters.minPrice)) return false;
            if (filters.maxPrice && w.pricePerChild > parseFloat(filters.maxPrice)) return false;
            return true;
        });
    }, [selectedLocation, workshops, filters]);
    
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
            alert(`Workshop eliminato!`);
            setDeletingWorkshopId(null);
            closeModal();
        }
    };
    
    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Il nome è obbligatorio.';
        if (!formData.type) newErrors.type = 'Il tipo è obbligatorio.';
        if (!formData.locationId) newErrors.locationId = 'Il luogo è obbligatorio.';
        if (formData.pricePerChild === undefined || parseFloat(String(formData.pricePerChild)) < 0) newErrors.pricePerChild = 'Il prezzo non può essere negativo.';
        if (formData.type === 'OpenDay' && parseFloat(String(formData.pricePerChild)) !== 0) newErrors.pricePerChild = 'Il prezzo per OpenDay deve essere 0.';
        if (!formData.startDate) newErrors.startDate = 'La data di inizio è obbligatoria.';
        if (!formData.endDate) newErrors.endDate = 'La data di fine è obbligatoria.';
        if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) newErrors.endDate = 'Data di fine deve essere dopo quella di inizio.';
        if (!formData.dayOfWeek) newErrors.dayOfWeek = 'Il giorno è obbligatorio.';
        if (!formData.startTime) newErrors.startTime = "L'orario di inizio è obbligatorio.";
        if (!formData.endTime) newErrors.endTime = "L'orario di fine è obbligatorio.";
        if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
            newErrors.endTime = 'Orario di fine deve essere dopo quello di inizio.';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const dataToSave = {
                ...formData,
                pricePerChild: parseFloat(String(formData.pricePerChild || '0'))
            };
            
            if (modalState?.mode === 'edit') {
                await updateWorkshop(modalState.workshop.id, dataToSave);
                alert('Workshop aggiornato!');
            } else if (modalState?.mode === 'new') {
                const newWorkshop: Omit<Workshop, 'id'> = {
                    name: dataToSave.name!,
                    type: dataToSave.type! as WorkshopType,
                    locationId: dataToSave.locationId!,
                    startDate: dataToSave.startDate!,
                    endDate: dataToSave.endDate || dataToSave.startDate!,
                    pricePerChild: dataToSave.pricePerChild!,
                    dayOfWeek: dataToSave.dayOfWeek!,
                    startTime: dataToSave.startTime!,
                    endTime: dataToSave.endTime!,
                };
                await addWorkshop(newWorkshop);
                alert('Nuovo workshop salvato!');
            }
            closeModal();
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        if (id === 'type') {
            setPriceConfig({ isManual: false });
        }
        setFormData(prev => ({ ...prev, [id]: value }));
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-2 p-4 bg-white/30 rounded-lg">
                            <DetailItem icon={<CalendarDaysIcon />} label="Tipo" value={workshop.type} />
                            <DetailItem icon={<CalendarDaysIcon />} label="Date" value={`${new Date(workshop.startDate).toLocaleDateString('it-IT')} - ${new Date(workshop.endDate).toLocaleDateString('it-IT')}`} />
                            <DetailItem icon={<ClockIcon />} label="Orario" value={`${workshop.dayOfWeek}, ${workshop.startTime} - ${workshop.endTime}`} />
                            <DetailItem icon={<LocationMarkerIcon />} label="Luogo" value={location?.name ?? 'N/A'} />
                            <DetailItem icon={<CurrencyDollarIcon />} label="Prezzo" value={`€${workshop.pricePerChild.toFixed(2)}`} />
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
            const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
            const type = formData.type as WorkshopType;
            const isEndDateDisabled = type && !TYPES_WITH_MANUAL_END_DATE.includes(type);

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
                    <Select id="type" label="Tipo" options={workshopTypeOptions} value={type || ''} onChange={handleChange} error={errors.type} required />
                    <Select id="locationId" label="Luogo" options={locationOptions} value={formData.locationId || ''} onChange={handleChange} error={errors.locationId} required placeholder="Seleziona un luogo"/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input id="startDate" label="Data Inizio" type="date" value={formData.startDate || ''} onChange={handleChange} error={errors.startDate} required />
                        <Input id="endDate" label="Data Fine" type="date" value={formData.endDate || ''} onChange={handleChange} error={errors.endDate} disabled={isEndDateDisabled}/>
                    </div>
                    <Select id="dayOfWeek" label="Giorno della Settimana" options={daysOfWeekOptions} value={formData.dayOfWeek || ''} onChange={handleChange} error={errors.dayOfWeek} required/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <Input id="startTime" label="Orario Inizio" type="time" value={formData.startTime || ''} onChange={handleChange} error={errors.startTime} required/>
                       <Input id="endTime" label="Orario Fine" type="time" value={formData.endTime || ''} onChange={handleChange} error={errors.endTime} required/>
                    </div>
                    
                    {type === 'OpenDay' && (
                        <Input id="pricePerChild" label="Prezzo per Bambino (€)" type="number" value="0.00" disabled />
                    )}

                    {type && WORKSHOP_TYPES_WITH_PRESET_PRICE.includes(type) && (
                        <div>
                            <label className="block text-sm font-medium text-testo-input mb-2">Prezzo</label>
                            <div className="flex space-x-4">
                                <label className="flex items-center">
                                    <input type="radio" name="priceOption" checked={!priceConfig.isManual} onChange={() => setPriceConfig({ isManual: false })} className="h-4 w-4 text-bottone-azione border-gray-500 focus:ring-bottone-azione" />
                                    <span className="ml-2 text-sm text-testo-input">Standard (€{(WORKSHOP_STANDARD_PRICES[type] || 0).toFixed(2)})</span>
                                </label>
                                <label className="flex items-center">
                                    <input type="radio" name="priceOption" checked={priceConfig.isManual} onChange={() => setPriceConfig({ isManual: true })} className="h-4 w-4 text-bottone-azione border-gray-500 focus:ring-bottone-azione" />
                                    <span className="ml-2 text-sm text-testo-input">Personalizzato</span>
                                </label>
                            </div>
                            {priceConfig.isManual && (
                                <div className="mt-2">
                                    <Input id="pricePerChild" label="" type="number" step="0.01" value={String(formData.pricePerChild || '0')} onChange={handleChange} error={errors.pricePerChild} required />
                                </div>
                            )}
                        </div>
                    )}

                    {type && ['Evento', 'Scolastico', 'Campus'].includes(type) && (
                        <Input id="pricePerChild" label="Prezzo per Bambino (€)" type="number" step="0.01" value={String(formData.pricePerChild || '0')} onChange={handleChange} error={errors.pricePerChild} required />
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
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
        <h2 className="text-xl font-semibold text-testo-input">Calendario Workshop</h2>
        
        <Card>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input id="name" label="Cerca per nome" value={filters.name} onChange={handleFilterChange} placeholder="Nome workshop..."/>
                    <Select id="dayOfWeek" label="Giorno della settimana" options={daysOfWeekOptions} value={filters.dayOfWeek} onChange={handleFilterChange} placeholder="Qualsiasi giorno" />
                    <Input id="startTime" label="Orario di inizio (dalle)" type="time" value={filters.startTime} onChange={handleFilterChange}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="col-span-1 md:col-span-1">
                        <label className="block text-sm font-medium text-testo-input mb-1">Prezzo</label>
                        <div className="flex items-center space-x-2">
                           <Input id="minPrice" label="" type="number" value={filters.minPrice} onChange={handleFilterChange} placeholder="Min €"/>
                           <Input id="maxPrice" label="" type="number" value={filters.maxPrice} onChange={handleFilterChange} placeholder="Max €"/>
                        </div>
                    </div>
                    <div className="col-span-1 md:col-span-2 flex items-end space-x-2">
                        <button onClick={resetFilters} className="w-full md:w-auto px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400">Resetta Filtri</button>
                    </div>
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