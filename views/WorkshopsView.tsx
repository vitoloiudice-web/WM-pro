import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import Select from '../components/Select';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, UsersIcon, ClockIcon, TrashIcon } from '../components/icons/HeroIcons';
import type { Workshop, Location, Registration, Child, Parent } from '../types';

interface WorkshopsViewProps {
  workshops: Workshop[];
  addWorkshop: (item: Omit<Workshop, 'id' | 'code'>) => Promise<any>;
  updateWorkshop: (id: string, updates: Partial<Workshop>) => Promise<void>;
  removeWorkshop: (id: string) => Promise<void>;
  locations: Location[];
  registrations: Registration[];
  children: Child[];
  parents: Parent[];
}

type ModalState = 
    | { mode: 'new' }
    | { mode: 'edit', workshop: Workshop }
    | null;

const WEEK_DAYS: Workshop['dayOfWeek'][] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

const WorkshopsView = ({ 
    workshops, addWorkshop, updateWorkshop, removeWorkshop,
    locations, registrations
}: WorkshopsViewProps) => {
    const [modalState, setModalState] = useState<ModalState>(null);
    const [formData, setFormData] = useState<Partial<Workshop>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentDate, setCurrentDate] = useState(new Date());
    const [deletingWorkshop, setDeletingWorkshop] = useState<Workshop | null>(null);

    const locationMap = useMemo(() => new Map(locations.map(loc => [loc.id, loc])), [locations]);

    useEffect(() => {
        if (modalState?.mode === 'edit') {
            setFormData(modalState.workshop);
        } else {
            setFormData({});
        }
        setErrors({});
    }, [modalState]);

    const handleMonthChange = (offset: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.locationId) newErrors.locationId = 'La sede è obbligatoria.';
        if (!formData.dayOfWeek) newErrors.dayOfWeek = 'Il giorno è obbligatorio.';
        if (!formData.time) newErrors.time = "L'orario è obbligatorio.";
        if (!formData.maxParticipants || formData.maxParticipants <= 0) newErrors.maxParticipants = 'La capienza deve essere un numero positivo.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        const location = locationMap.get(formData.locationId!);
        const code = `${location?.shortName || 'SEDE'}-${formData.dayOfWeek?.substring(0,3).toUpperCase()}-${formData.time}`;
        
        const dataToSave = {
            locationId: formData.locationId!,
            dayOfWeek: formData.dayOfWeek!,
            time: formData.time!,
            maxParticipants: Number(formData.maxParticipants!),
            code: code,
        };

        if (modalState?.mode === 'edit') {
            await updateWorkshop(modalState.workshop.id, dataToSave);
        } else {
            await addWorkshop(dataToSave as any);
        }
        setModalState(null);
    };

    const handleConfirmDelete = async () => {
        if (deletingWorkshop) {
            await removeWorkshop(deletingWorkshop.id);
            setDeletingWorkshop(null);
            setModalState(null);
        }
    };

    const { monthName, year, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthName = currentDate.toLocaleString('it-IT', { month: 'long' });
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7; // 0=Lunedì, 6=Domenica
        return { monthName, year, daysInMonth, firstDayOfMonth };
    }, [currentDate]);

    const calendarCells = useMemo(() => {
        const cells = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            cells.push({ key: `empty-${i}`, isEmpty: true });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, currentDate.getMonth(), day);
            const dayOfWeekJS = date.getDay(); // 0=Domenica, 1=Lunedì
            const dayOfWeekName = WEEK_DAYS[(dayOfWeekJS + 6) % 7];

            const workshopsOnThisDay = workshops.filter(w => w.dayOfWeek === dayOfWeekName);

            cells.push({
                key: `day-${day}`,
                isEmpty: false,
                day,
                isToday: new Date().toDateString() === date.toDateString(),
                workshops: workshopsOnThisDay,
            });
        }
        return cells;
    }, [workshops, currentDate, firstDayOfMonth, daysInMonth, year]);

    const renderModal = () => {
        if (!modalState) return null;
        const title = modalState.mode === 'new' ? 'Nuovo Workshop' : 'Modifica Workshop';
        
        return (
            <Modal isOpen={!!modalState} onClose={() => setModalState(null)} title={title}>
                <form onSubmit={handleSave} className="space-y-4" noValidate>
                    <Select id="locationId" label="Sede" value={formData.locationId || ''} onChange={e => setFormData({...formData, locationId: e.target.value})} options={locations.map(l => ({value: l.id, label: l.name}))} error={errors.locationId} required placeholder="Seleziona una sede"/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select id="dayOfWeek" label="Giorno" value={formData.dayOfWeek || ''} onChange={e => setFormData({...formData, dayOfWeek: e.target.value as Workshop['dayOfWeek']})} options={WEEK_DAYS.map(d => ({value: d, label: d}))} error={errors.dayOfWeek} required />
                        <Input id="time" label="Orario" type="time" value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} error={errors.time} required />
                    </div>
                    <Input id="maxParticipants" label="Max Iscritti" type="number" value={formData.maxParticipants || ''} onChange={e => setFormData({...formData, maxParticipants: Number(e.target.value)})} error={errors.maxParticipants} required />
                    
                    <div className="flex justify-between items-center pt-4 border-t border-black/10">
                        <div>
                            {modalState.mode === 'edit' && (
                                <button
                                    type="button"
                                    onClick={() => setDeletingWorkshop(modalState.workshop)}
                                    className="px-4 py-2 bg-bottone-eliminazione text-white rounded-md hover:opacity-90 flex items-center space-x-2 text-sm"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                    <span>Elimina</span>
                                </button>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button type="button" onClick={() => setModalState(null)} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
                            <button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva Workshop</button>
                        </div>
                    </div>
                </form>
            </Modal>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-testo-input">Calendario Workshop</h2>
                <button onClick={() => setModalState({ mode: 'new' })} className="bg-bottone-azione text-white px-4 py-2 rounded-full shadow hover:opacity-90 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottone-azione">
                    <PlusIcon /><span>Nuovo Workshop</span>
                </button>
            </div>
            
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center w-full">
                        <button onClick={() => handleMonthChange(-1)} className="p-2 rounded-full hover:bg-black/10"><ChevronLeftIcon /></button>
                        <h3 className="text-lg font-semibold text-testo-input capitalize">{monthName} {year}</h3>
                        <button onClick={() => handleMonthChange(1)} className="p-2 rounded-full hover:bg-black/10"><ChevronRightIcon /></button>
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-0">
                    <div className="grid grid-cols-7">
                        {WEEK_DAYS.map(day => (
                             <div key={day} className="py-2 text-center text-xs font-bold text-testo-input/80 border-b border-r border-black/10">{day.substring(0,3)}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 h-[60vh]">
                        {calendarCells.map(cell => (
                            <div key={cell.key} className={`border-b border-r border-black/10 p-1.5 overflow-y-auto ${cell.isEmpty ? 'bg-gray-50/70' : ''}`}>
                                {!cell.isEmpty && (
                                    <>
                                        <span className={`text-xs font-semibold ${cell.isToday ? 'bg-bottone-azione text-white rounded-full flex items-center justify-center h-5 w-5' : ''}`}>{cell.day}</span>
                                        <div className="space-y-1.5 mt-1">
                                            {cell.workshops?.map(w => {
                                                const location = locationMap.get(w.locationId);
                                                const inscriptionsCount = registrations.filter(r => r.workshopId === w.id && r.status === 'confermata').length;
                                                return (
                                                <div 
                                                    key={w.id} 
                                                    className="p-1.5 rounded-md text-xs bg-white shadow cursor-pointer hover:ring-2 hover:ring-bottone-azione/80" 
                                                    title={`Modifica: ${w.code}`}
                                                    onClick={() => setModalState({ mode: 'edit', workshop: w })}
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: location?.color || '#ccc' }}></span>
                                                        <span className="font-bold text-testo-input">{location?.shortName}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center space-x-2 text-testo-input/90">
                                                        <ClockIcon className="h-3 w-3 flex-shrink-0"/>
                                                        <span>{w.time}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center space-x-2 text-testo-input/90">
                                                        <UsersIcon className="h-3 w-3 flex-shrink-0"/>
                                                        <span>{inscriptionsCount} / {w.maxParticipants}</span>
                                                    </div>
                                                </div>
                                            )})}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {renderModal()}

            <ConfirmModal
                isOpen={!!deletingWorkshop}
                onClose={() => setDeletingWorkshop(null)}
                onConfirm={handleConfirmDelete}
                title="Conferma Eliminazione Workshop"
            >
                <p>
                    Sei sicuro di voler eliminare il workshop "{deletingWorkshop?.code}"?
                    <br />
                    Tutte le iscrizioni associate a questo timeslot verranno mantenute ma dovranno essere riassociate manualmente. L'azione è irreversibile.
                </p>
            </ConfirmModal>

        </div>
    );
};

export default WorkshopsView;