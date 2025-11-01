import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/HeroIcons';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import type { Supplier, Location } from '../types';

interface LogisticsViewProps {
    suppliers: Supplier[];
    addSupplier: (item: Omit<Supplier, 'id'>) => Promise<void>;
    updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
    removeSupplier: (id: string) => Promise<void>;
    locations: Location[];
    addLocation: (item: Omit<Location, 'id'>) => Promise<void>;
    updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
    removeLocation: (id: string) => Promise<void>;
}

type ModalState =
    | { mode: 'new-supplier' }
    | { mode: 'edit-supplier', item: Supplier }
    | { mode: 'new-location' }
    | { mode: 'edit-location', item: Location }
    | null;

const LogisticsView = ({
    suppliers, addSupplier, updateSupplier, removeSupplier,
    locations, addLocation, updateLocation, removeLocation
}: LogisticsViewProps) => {

    const [modalState, setModalState] = useState<ModalState>(null);
    const [deletingItem, setDeletingItem] = useState<{ type: 'supplier' | 'location', id: string } | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (modalState?.mode === 'edit-supplier' || modalState?.mode === 'edit-location') {
            setFormData(modalState.item);
        } else {
            setFormData({});
        }
        setErrors({});
    }, [modalState]);

    const closeModal = () => {
        setModalState(null);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (modalState?.mode.includes('supplier')) {
            if (!formData.name?.trim()) newErrors.name = 'Il nome è obbligatorio.';
        }
        if (modalState?.mode.includes('location')) {
            if (!formData.name?.trim()) newErrors.name = 'Il nome è obbligatorio.';
            if (!formData.address?.trim()) newErrors.address = "L'indirizzo è obbligatorio.";
            if (formData.capacity === undefined || Number(formData.capacity) <= 0) newErrors.capacity = 'La capienza deve essere un numero positivo.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            if (modalState?.mode === 'new-supplier') {
                await addSupplier({ ...formData });
                alert('Nuovo fornitore salvato!');
            } else if (modalState?.mode === 'edit-supplier') {
                await updateSupplier(modalState.item.id, formData);
                alert('Fornitore aggiornato!');
            } else if (modalState?.mode === 'new-location') {
                await addLocation({ ...formData, capacity: Number(formData.capacity) });
                alert('Nuovo luogo salvato!');
            } else if (modalState?.mode === 'edit-location') {
                await updateLocation(modalState.item.id, { ...formData, capacity: Number(formData.capacity) });
                alert('Luogo aggiornato!');
            }
            closeModal();
        }
    };

    const handleConfirmDelete = async () => {
        if (deletingItem) {
            if (deletingItem.type === 'supplier') {
                await removeSupplier(deletingItem.id);
            } else {
                await removeLocation(deletingItem.id);
            }
            alert('Elemento eliminato!');
            setDeletingItem(null);
        }
    };

    const renderModal = () => {
        if (!modalState) return null;
        const isSupplier = modalState.mode.includes('supplier');
        const title = modalState.mode.startsWith('new')
            ? (isSupplier ? 'Nuovo Fornitore' : 'Nuovo Luogo')
            : (isSupplier ? 'Modifica Fornitore' : 'Modifica Luogo');

        return (
            <Modal isOpen={!!modalState} onClose={closeModal} title={title}>
                <form id="logistics-form" onSubmit={handleSave} className="space-y-4" noValidate>
                    {isSupplier ? (
                        <>
                            <Input id="name" label="Nome Fornitore" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} error={errors.name} required />
                            <Input id="vatNumber" label="P.IVA / C.F." value={formData.vatNumber || ''} onChange={e => setFormData({ ...formData, vatNumber: e.target.value })} />
                            <Input id="email" label="Email" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            <Input id="phone" label="Telefono" type="tel" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            <Input id="contact" label="Referente" value={formData.contact || ''} onChange={e => setFormData({ ...formData, contact: e.target.value })} />
                        </>
                    ) : (
                        <>
                            <Input id="name" label="Nome Luogo" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} error={errors.name} required />
                            <Input id="address" label="Indirizzo" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} error={errors.address} required />
                            <Input id="capacity" label="Capienza" type="number" value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: e.target.value })} error={errors.capacity} required />
                        </>
                    )}
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
                        <button type="submit" form="logistics-form" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva</button>
                    </div>
                </form>
            </Modal>
        )
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-testo-input">Logistica e Fornitori</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader actions={
                        <button onClick={() => setModalState({ mode: 'new-supplier' })} className="flex items-center space-x-1 text-sm text-bottone-azione hover:opacity-80 font-medium">
                            <PlusIcon className="h-4 w-4" /><span>Aggiungi</span>
                        </button>
                    }>
                        Fornitori
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {suppliers.map(supplier => (
                                <li key={supplier.id} className="p-3 bg-white/30 rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-testo-input">{supplier.name}</p>
                                        <p className="text-xs text-testo-input/80">{supplier.email || supplier.phone}</p>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button onClick={() => setModalState({ mode: 'edit-supplier', item: supplier })} className="p-1.5 text-testo-input/80 hover:text-bottone-azione"><PencilIcon className="h-4 w-4" /></button>
                                        <button onClick={() => setDeletingItem({ type: 'supplier', id: supplier.id })} className="p-1.5 text-testo-input/80 hover:text-bottone-eliminazione"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                </li>
                            ))}
                             {suppliers.length === 0 && <p className="text-center text-testo-input/80 py-4">Nessun fornitore aggiunto.</p>}
                        </ul>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader actions={
                        <button onClick={() => setModalState({ mode: 'new-location' })} className="flex items-center space-x-1 text-sm text-bottone-azione hover:opacity-80 font-medium">
                            <PlusIcon className="h-4 w-4" /><span>Aggiungi</span>
                        </button>
                    }>
                        Luoghi
                    </CardHeader>
                    <CardContent>
                         <ul className="space-y-2">
                            {locations.map(location => (
                                <li key={location.id} className="p-3 bg-white/30 rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-testo-input">{location.name} (Capienza: {location.capacity})</p>
                                        <p className="text-xs text-testo-input/80">{location.address}</p>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button onClick={() => setModalState({ mode: 'edit-location', item: location })} className="p-1.5 text-testo-input/80 hover:text-bottone-azione"><PencilIcon className="h-4 w-4" /></button>
                                        <button onClick={() => setDeletingItem({ type: 'location', id: location.id })} className="p-1.5 text-testo-input/80 hover:text-bottone-eliminazione"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                </li>
                            ))}
                            {locations.length === 0 && <p className="text-center text-testo-input/80 py-4">Nessun luogo aggiunto.</p>}
                        </ul>
                    </CardContent>
                </Card>
            </div>
            {renderModal()}
            <ConfirmModal
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleConfirmDelete}
                title="Conferma Eliminazione"
            >
                <p>Sei sicuro di voler eliminare questo elemento? L'azione è irreversibile.</p>
            </ConfirmModal>
        </div>
    );
};

export default LogisticsView;
