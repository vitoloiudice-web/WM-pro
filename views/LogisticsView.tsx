import React, { useState, useEffect, useMemo } from 'react';
import Card, { CardContent, CardFooter } from '../components/Card.tsx';
import { PlusIcon, BuildingOffice2Icon, CreditCardIcon, UserCircleIcon, EnvelopeIcon, PhoneIcon, PencilIcon, TrashIcon, LocationMarkerIcon, UsersIcon } from '../components/icons/HeroIcons.tsx';
import Modal from '../components/Modal.tsx';
import ConfirmModal from '../components/ConfirmModal.tsx';
import Input from '../components/Input.tsx';
import Select from '../components/Select.tsx';
import type { Supplier, Location } from '../types.ts';

type LogisticsTab = 'suppliers' | 'locations';

interface LogisticsViewProps {
    suppliers: Supplier[];
    addSupplier: (supplier: Supplier) => Promise<void>;
    updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
    removeSupplier: (id: string) => Promise<void>;
    locations: Location[];
    addLocation: (location: Location) => Promise<void>;
    updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
    removeLocation: (id: string) => Promise<void>;
}

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'
        }`}
    >
        {label}
    </button>
)

const DetailRow: React.FC<{icon: React.ReactNode, label: string, value: string | number}> = ({ icon, label, value }) => (
    <div className="flex items-start space-x-3 text-slate-700 text-sm">
        <span className="text-slate-400 mt-0.5">{icon}</span>
        <div>
            <span className="font-medium">{label}:</span>{' '}
            <span>{value}</span>
        </div>
    </div>
);

const SupplierCard: React.FC<{supplier: Supplier, onEdit: () => void, onDelete: () => void}> = ({supplier, onEdit, onDelete}) => (
    <Card>
        <CardContent>
             <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-slate-200 p-3 rounded-full">
                        <BuildingOffice2Icon className="text-slate-500 h-8 w-8"/>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-slate-800">{supplier.name}</h4>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                 <DetailRow icon={<CreditCardIcon className="h-5 w-5" />} label="P.IVA" value={supplier.vatNumber} />
                 {supplier.address && <DetailRow icon={<LocationMarkerIcon className="h-5 w-5" />} label="Indirizzo" value={`${supplier.address}, ${supplier.zipCode || ''} ${supplier.city || ''} (${supplier.province || ''})`} />}
                 {supplier.contactPerson && <DetailRow icon={<UserCircleIcon className="h-5 w-5" />} label="Referente" value={supplier.contactPerson} />}
                 {supplier.email && <DetailRow icon={<EnvelopeIcon className="h-5 w-5" />} label="Email" value={supplier.email} />}
                 {supplier.phone && <DetailRow icon={<PhoneIcon className="h-5 w-5" />} label="Telefono" value={supplier.phone} />}
            </div>
        </CardContent>
        <CardFooter>
            <div className="flex justify-end items-center space-x-2">
                <button onClick={onEdit} className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Modifica fornitore">
                    <PencilIcon className="h-5 w-5"/>
                </button>
                <button onClick={onDelete} className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Elimina fornitore">
                    <TrashIcon className="h-5 w-5"/>
                </button>
            </div>
        </CardFooter>
    </Card>
);

const LocationCard: React.FC<{location: Location, supplierName: string | null, onEdit: () => void, onDelete: () => void}> = ({location, supplierName, onEdit, onDelete}) => {
    return (
     <Card>
        <CardContent>
             <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="bg-slate-200 p-3 rounded-full">
                        <LocationMarkerIcon className="text-slate-500 h-8 w-8"/>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg text-slate-800">{location.name}</h4>
                         <p className="text-sm text-slate-500">{location.address}</p>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                 <DetailRow icon={<UsersIcon className="h-5 w-5" />} label="Capienza" value={location.capacity} />
                 {supplierName && (
                    <DetailRow icon={<BuildingOffice2Icon className="h-5 w-5" />} label="Fornitore" value={supplierName} />
                 )}
            </div>
        </CardContent>
        <CardFooter>
            <div className="flex justify-end items-center space-x-2">
                <button onClick={onEdit} className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" aria-label="Modifica luogo">
                    <PencilIcon className="h-5 w-5"/>
                </button>
                <button onClick={onDelete} className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500" aria-label="Elimina luogo">
                    <TrashIcon className="h-5 w-5"/>
                </button>
            </div>
        </CardFooter>
    </Card>
    );
};


const LogisticsView: React.FC<LogisticsViewProps> = ({ 
    suppliers, addSupplier, updateSupplier, removeSupplier,
    locations, addLocation, updateLocation, removeLocation
}) => {
    const [activeTab, setActiveTab] = useState<LogisticsTab>('suppliers');
    
    const [editingItem, setEditingItem] = useState<Supplier | Location | null>(null);
    const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const isModalOpen = isNewItemModalOpen || !!editingItem;
    
    const supplierMap = useMemo(() => suppliers.reduce((acc, s) => ({...acc, [s.id]: s}), {} as Record<string, Supplier>), [suppliers]);

    useEffect(() => {
        if (editingItem) {
            setFormData(editingItem);
        } else {
            setFormData({});
        }
    }, [editingItem, isNewItemModalOpen]);


    const closeModal = () => {
        setEditingItem(null);
        setIsNewItemModalOpen(false);
        setFormData({});
        setErrors({});
    };

    const handleAddNewClick = () => {
        setIsNewItemModalOpen(true);
    };

    const handleEditClick = (item: Supplier | Location) => {
        setEditingItem(item);
    };
    
    const handleDeleteClick = (id: string) => {
        setDeletingItemId(id);
    };

    const handleConfirmDelete = async () => {
        if(deletingItemId) {
            if (activeTab === 'suppliers') {
                await removeSupplier(deletingItemId);
                // Note: Cascading logic to update locations is better handled in a backend/Firebase Function.
                // For client-side, this would require fetching locations and updating them.
            } else {
                await removeLocation(deletingItemId);
            }
            alert(`${activeTab === 'suppliers' ? 'Fornitore' : 'Luogo'} eliminato!`);
            setDeletingItemId(null);
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (activeTab === 'suppliers') {
            if (!formData.name?.trim()) newErrors.name = 'Il nome del fornitore è obbligatorio.';
            if (!formData.vatNumber?.trim()) newErrors.vatNumber = 'La Partita IVA è obbligatoria.';
        } else if (activeTab === 'locations') {
            if (!formData.name?.trim()) newErrors.name = 'Il nome del luogo è obbligatorio.';
            if (!formData.address?.trim()) newErrors.address = "L'indirizzo è obbligatorio.";
            if (!formData.capacity || parseInt(formData.capacity, 10) <= 0) newErrors.capacity = 'La capienza deve essere un numero positivo.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const preparedData: Partial<Supplier & Location> = { ...formData };
            if (activeTab === 'locations') {
                preparedData.capacity = parseInt(formData.capacity, 10);
                if (preparedData.supplierId === '') {
                    preparedData.supplierId = undefined;
                }
            }

            if (editingItem) {
                const { id, ...updates } = { ...editingItem, ...preparedData };
                if (activeTab === 'suppliers') {
                    await updateSupplier(id, updates);
                } else {
                    await updateLocation(id, updates);
                }
                alert(`${activeTab === 'suppliers' ? 'Fornitore' : 'Luogo'} aggiornato!`);
            } else {
                 if (activeTab === 'suppliers') {
                    const newItem = { id: `sup_${Date.now()}`, ...preparedData } as Supplier;
                    await addSupplier(newItem);
                 } else {
                    const newItem = { id: `loc_${Date.now()}`, ...preparedData } as Location;
                    await addLocation(newItem);
                 }
                alert(`Nuovo ${activeTab === 'suppliers' ? 'Fornitore' : 'Luogo'} salvato!`);
            }
            closeModal();
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const renderModalContent = () => {
        const formId = `form-${activeTab}`;
        const commonButtons = (
           <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button>
              <button type="submit" form={formId} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva</button>
            </div>
        );

        if (activeTab === 'suppliers') {
            return (
                <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
                    <Input id="name" label="Nome Fornitore" type="text" value={formData.name || ''} onChange={handleChange} error={errors.name} required />
                    <Input id="vatNumber" label="Partita IVA" type="text" value={formData.vatNumber || ''} onChange={handleChange} error={errors.vatNumber} required />
                    <Input id="address" label="Indirizzo" type="text" value={formData.address || ''} onChange={handleChange} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="zipCode" label="CAP" type="text" value={formData.zipCode || ''} onChange={handleChange} />
                        <Input id="city" label="Città" type="text" value={formData.city || ''} onChange={handleChange} />
                        <Input id="province" label="Provincia" type="text" value={formData.province || ''} onChange={handleChange} />
                    </div>
                    <Input id="contactPerson" label="Referente" type="text" value={formData.contactPerson || ''} onChange={handleChange} />
                    <Input id="email" label="Email" type="email" value={formData.email || ''} onChange={handleChange} />
                    <Input id="phone" label="Telefono" type="tel" value={formData.phone || ''} onChange={handleChange} />
                    {commonButtons}
                </form>
            );
        }
        if (activeTab === 'locations') {
            const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));

            return (
                <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
                    <Input id="name" label="Nome Luogo" type="text" value={formData.name || ''} onChange={handleChange} error={errors.name} required />
                    <Input id="address" label="Indirizzo" type="text" value={formData.address || ''} onChange={handleChange} error={errors.address} required />
                    <Input id="capacity" label="Capienza" type="number" value={formData.capacity || ''} onChange={handleChange} error={errors.capacity} required />
                    <Select
                        id="supplierId"
                        label="Fornitore (Opzionale)"
                        options={supplierOptions}
                        placeholder="Nessun fornitore specifico"
                        value={formData.supplierId || ''}
                        onChange={handleChange}
                    />
                    {commonButtons}
                </form>
            );
        }
        return null;
    };
    
    const renderContent = () => {
        switch (activeTab) {
            case 'suppliers': return (
                <div className="space-y-4">
                    {suppliers.map(supplier => (
                        <SupplierCard 
                            key={supplier.id} 
                            supplier={supplier} 
                            onEdit={() => handleEditClick(supplier)}
                            onDelete={() => handleDeleteClick(supplier.id)}
                        />
                    ))}
                </div>
            );
            case 'locations': return (
                 <div className="space-y-4">
                    {locations.map(loc => (
                        <LocationCard 
                            key={loc.id} 
                            location={loc}
                            supplierName={loc.supplierId ? supplierMap[loc.supplierId]?.name : null}
                            onEdit={() => handleEditClick(loc)}
                            onDelete={() => handleDeleteClick(loc.id)}
                        />
                    ))}
                </div>
            )
            default: return null;
        }
    }
    
    const getModalTitle = () => {
        const action = editingItem ? 'Modifica' : 'Aggiungi';
        const subject = activeTab === 'suppliers' ? 'Fornitore' : 'Luogo';
        return `${action} ${subject}`;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-700">Gestione Logistica</h2>
            <Card>
                <div className="p-4 border-b border-slate-200">
                    <div className="flex space-x-2">
                        <TabButton label="Fornitori" isActive={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} />
                        <TabButton label="Luoghi" isActive={activeTab === 'locations'} onClick={() => setActiveTab('locations')} />
                    </div>
                </div>
                <CardContent>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-800 capitalize">{activeTab === 'suppliers' ? 'Fornitori' : 'Luoghi'}</h3>
                         <button 
                            onClick={handleAddNewClick}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-md shadow hover:bg-indigo-700 flex items-center space-x-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>Aggiungi</span>
                        </button>
                    </div>
                   {renderContent()}
                </CardContent>
            </Card>

             <Modal isOpen={isModalOpen} onClose={closeModal} title={getModalTitle()}>
                {renderModalContent()}
            </Modal>
            <ConfirmModal
                isOpen={!!deletingItemId}
                onClose={() => setDeletingItemId(null)}
                onConfirm={handleConfirmDelete}
                title="Conferma Eliminazione"
            >
                <p>Sei sicuro di voler eliminare questo elemento? L'azione è irreversibile.</p>
            </ConfirmModal>
        </div>
    )
};

export default LogisticsView;