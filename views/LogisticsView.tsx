import React, { useState, useEffect, useMemo } from 'react';
import Card, { CardContent } from '../components/Card.tsx';
import { PlusIcon, BuildingOffice2Icon, PencilIcon, TrashIcon, LocationMarkerIcon } from '../components/icons/HeroIcons.tsx';
import type { Supplier, Location } from '../types.ts';
import Modal from '../components/Modal.tsx';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import Input from '../components/Input.tsx';

// Initial empty forms
const emptySupplierForm: Partial<Supplier> = { name: '', vatNumber: '', address: '', zipCode: '', city: '', province: '', contactPerson: '', email: '', phone: '' };
const emptyLocationForm: Partial<Location> = { name: '', shortName: '', address: '', zipCode: '', province: '', capacity: 0, rentalCost: 0 };

const getSupplierDisplayName = (supplier: Supplier): string => {
    return supplier.name || 'Fornitore senza nome';
};

const generateShortName = (fullName: string): string => {
    if (!fullName) return '';
    const consonants = fullName.replace(/[^bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g, '');
    return consonants.slice(0, 4).toUpperCase();
};

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


const LogisticsView = ({
    suppliers, addSupplier, updateSupplier, removeSupplier,
    locations, addLocation, updateLocation, removeLocation
}: LogisticsViewProps) => {
    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Supplier state
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
    const [deletingSupplierId, setDeletingSupplierId] = useState<string | null>(null);
    const [supplierFormData, setSupplierFormData] = useState<Partial<Supplier>>(emptySupplierForm);
    const [supplierErrors, setSupplierErrors] = useState<Record<string, string>>({});

    // Location state
    const [locationModalState, setLocationModalState] = useState<{ mode: 'new'; supplierId: string } | { mode: 'edit'; location: Location } | null>(null);
    const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
    const [locationFormData, setLocationFormData] = useState<Partial<Location>>(emptyLocationForm);
    const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});

    const isSupplierModalOpen = isNewSupplierModalOpen || !!editingSupplier;
    const isLocationModalOpen = !!locationModalState;

    const filteredAndSortedSuppliers = useMemo(() => {
        let filtered = [...suppliers];

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(supplier =>
                supplier.name.toLowerCase().includes(lowercasedFilter) ||
                (supplier.city && supplier.city.toLowerCase().includes(lowercasedFilter)) ||
                (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(lowercasedFilter))
            );
        }

        filtered.sort((a, b) => {
            const nameA = getSupplierDisplayName(a).toLowerCase();
            const nameB = getSupplierDisplayName(b).toLowerCase();
            if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
            if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [suppliers, searchTerm, sortOrder]);


    // Effects for modals
    useEffect(() => {
        if (editingSupplier) setSupplierFormData({ ...emptySupplierForm, ...editingSupplier });
        else setSupplierFormData(emptySupplierForm);
    }, [editingSupplier, isNewSupplierModalOpen]);

    useEffect(() => {
        if (locationModalState?.mode === 'edit') {
            setLocationFormData({ ...emptyLocationForm, ...locationModalState.location });
        } else {
            setLocationFormData(emptyLocationForm);
        }
    }, [locationModalState]);


    // --- Supplier CRUD ---
    const closeSupplierModal = () => {
        setEditingSupplier(null);
        setIsNewSupplierModalOpen(false);
        setSupplierErrors({});
        setSupplierFormData(emptySupplierForm);
    };

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (!supplierFormData.name?.trim()) newErrors.name = 'Il nome del fornitore è obbligatorio.';
        if (!supplierFormData.vatNumber?.trim()) newErrors.vatNumber = 'La Partita IVA è obbligatoria.';
        
        setSupplierErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, supplierFormData);
                alert('Fornitore aggiornato!');
            } else {
                const newSupplier = {
                    id: `sup_${Date.now()}`,
                    ...emptySupplierForm,
                    ...supplierFormData
                } as Supplier;
                await addSupplier(newSupplier);
                alert('Nuovo fornitore salvato!');
            }
            closeSupplierModal();
        }
    };
    const handleConfirmDeleteSupplier = async () => {
        if (deletingSupplierId) {
            const hasLocations = locations.some(loc => loc.supplierId === deletingSupplierId);
            if (hasLocations) {
                alert("Impossibile eliminare il fornitore. Rimuovi prima tutte le sedi associate.");
                setDeletingSupplierId(null);
                return;
            }
            await removeSupplier(deletingSupplierId);
            alert(`Fornitore eliminato.`);
            setDeletingSupplierId(null);
        }
    };

    // --- Location CRUD ---
    const closeLocationModal = () => {
        setLocationModalState(null);
        setLocationErrors({});
        setLocationFormData(emptyLocationForm);
    };

    const handleLocationFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setLocationFormData(prev => {
            const newState = { ...prev, [id]: value };
            if (id === 'name') {
                newState.shortName = generateShortName(value);
            }
            if (id === 'shortName') {
                newState.shortName = value.slice(0, 4).toUpperCase();
            }
            return newState;
        });
    };
    
    const handleSaveLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (!locationFormData.name?.trim()) newErrors.name = 'Il nome completo è obbligatorio.';
        if (!locationFormData.shortName?.trim()) {
            newErrors.shortName = 'Il nome breve è obbligatorio.';
        } else if (locationFormData.shortName.length > 4) {
             newErrors.shortName = 'Massimo 4 caratteri.';
        }
        if (!locationFormData.address?.trim()) newErrors.address = "L'indirizzo è obbligatorio.";
        if (!locationFormData.capacity || Number(locationFormData.capacity) <= 0) {
            newErrors.capacity = 'La capienza deve essere un numero positivo.';
        }
        if (locationFormData.rentalCost === undefined || Number(locationFormData.rentalCost) < 0) {
            newErrors.rentalCost = 'Il costo non può essere negativo.';
        }
        
        setLocationErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
             const dataToSave = {
                ...locationFormData,
                capacity: Number(locationFormData.capacity || 0),
                rentalCost: Number(locationFormData.rentalCost || 0),
                shortName: locationFormData.shortName?.toUpperCase()
            };


            if (locationModalState?.mode === 'edit') {
                await updateLocation(locationModalState.location.id, dataToSave);
                alert('Sede aggiornata!');
            } else if (locationModalState?.mode === 'new') {
                const newLocation: Location = {
                    id: `loc_${Date.now()}`,
                    supplierId: locationModalState.supplierId,
                    name: dataToSave.name!,
                    shortName: dataToSave.shortName!,
                    address: dataToSave.address!,
                    zipCode: dataToSave.zipCode || '',
                    province: dataToSave.province || '',
                    capacity: dataToSave.capacity!,
                    rentalCost: dataToSave.rentalCost!,
                };
                await addLocation(newLocation);
                alert('Nuova sede salvata!');
            }
            closeLocationModal();
        }
    };
    
    const handleConfirmLocationDelete = async () => {
        if (deletingLocationId) {
            await removeLocation(deletingLocationId);
            alert(`Sede eliminata.`);
            setDeletingLocationId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-testo-input">Gestione Logistica</h2>
                <button onClick={() => setIsNewSupplierModalOpen(true)} className="bg-bottone-azione text-testo-input px-4 py-2 rounded-lg shadow hover:opacity-90 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottone-azione">
                    <PlusIcon /><span>Nuovo Fornitore</span>
                </button>
            </div>

            <Card>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            id="search"
                            label="Cerca fornitore"
                            placeholder="Nome, città, referente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div>
                            <label className="block text-sm font-medium text-testo-input mb-1">Ordina per</label>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => setSortOrder('asc')}
                                    className={`px-3 py-1.5 text-sm rounded-md ${sortOrder === 'asc' ? 'bg-bottone-azione text-testo-input' : 'bg-gray-300 text-black'}`}
                                >
                                    A-Z
                                </button>
                                <button
                                    onClick={() => setSortOrder('desc')}
                                    className={`px-3 py-1.5 text-sm rounded-md ${sortOrder === 'desc' ? 'bg-bottone-azione text-testo-input' : 'bg-gray-300 text-black'}`}
                                >
                                    Z-A
                                </button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {filteredAndSortedSuppliers.map(supplier => {
                    const supplierLocations = locations.filter(l => l.supplierId === supplier.id);

                    return (
                        <div key={supplier.id}>
                            <Card>
                                <CardContent>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-white/40 p-3 rounded-full"><BuildingOffice2Icon className="text-testo-input/80 h-8 w-8" /></div>
                                            <div>
                                                <h4 className="font-bold text-lg text-testo-input flex items-center">
                                                    {getSupplierDisplayName(supplier)}
                                                </h4>
                                                <p className="text-sm text-testo-input/80">{supplier.email || 'Nessuna email'}</p>
                                                {supplier.address && (
                                                    <p className="text-sm text-testo-input/80 mt-1">{`${supplier.address}, ${supplier.zipCode || ''} ${supplier.city || ''} (${supplier.province || ''})`}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => setEditingSupplier(supplier)} className="p-2 text-testo-input/80 hover:text-bottone-azione rounded-full hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-bottone-azione" aria-label="Modifica fornitore"><PencilIcon className="h-5 w-5" /></button>
                                            <button onClick={() => setDeletingSupplierId(supplier.id)} className="p-2 text-testo-input/80 hover:text-bottone-eliminazione rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-bottone-eliminazione" aria-label="Elimina fornitore"><TrashIcon className="h-5 w-5" /></button>
                                        </div>
                                    </div>

                                    {/* Locations section */}
                                    <div className="mt-4 pt-4 border-t border-black/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="font-semibold text-testo-input">Sedi / Luoghi</h5>
                                            <button onClick={() => setLocationModalState({ mode: 'new', supplierId: supplier.id })} className="text-sm text-bottone-azione hover:opacity-80 font-medium flex items-center space-x-1">
                                                <PlusIcon className="h-4 w-4" /><span>Aggiungi Sede</span>
                                            </button>
                                        </div>
                                        {supplierLocations.length > 0 ? (
                                            <ul className="space-y-2">
                                                {supplierLocations.map(loc => (
                                                    <li key={loc.id} className="flex justify-between items-center p-2 bg-white/30 rounded-md">
                                                        <div className="flex items-center space-x-3">
                                                            <LocationMarkerIcon className="h-5 w-5 text-testo-input/70 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-medium text-testo-input">{loc.name} ({loc.shortName})</p>
                                                                <p className="text-xs text-testo-input/80">{loc.address}, {loc.zipCode} {loc.province}</p>
                                                                <p className="text-xs text-testo-input/80">Capienza: {loc.capacity} - Nolo: €{(loc.rentalCost || 0).toFixed(2)}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <button onClick={() => setLocationModalState({ mode: 'edit', location: loc })} className="p-1 text-testo-input/80 hover:text-bottone-azione"><PencilIcon className="h-4 w-4" /></button>
                                                            <button onClick={() => setDeletingLocationId(loc.id)} className="p-1 text-testo-input/80 hover:text-bottone-eliminazione"><TrashIcon className="h-4 w-4" /></button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-sm text-testo-input/80 italic">Nessuna sede registrata per questo fornitore.</p>}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )
                })}
            </div>

            {/* --- MODALS --- */}
            <Modal isOpen={isSupplierModalOpen} onClose={closeSupplierModal} title={editingSupplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}>
                <form id="supplier-form" onSubmit={handleSaveSupplier} className="space-y-4" noValidate>
                    <Input id="name" label="Nome Fornitore" type="text" value={supplierFormData.name || ''} onChange={e => setSupplierFormData({...supplierFormData, name: e.target.value})} error={supplierErrors.name} required />
                    <Input id="vatNumber" label="Partita IVA" type="text" value={supplierFormData.vatNumber || ''} onChange={e => setSupplierFormData({...supplierFormData, vatNumber: e.target.value})} error={supplierErrors.vatNumber} required />
                    <Input id="address" label="Indirizzo" type="text" value={supplierFormData.address || ''} onChange={e => setSupplierFormData({...supplierFormData, address: e.target.value})} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="zipCode" label="CAP" type="text" value={supplierFormData.zipCode || ''} onChange={e => setSupplierFormData({...supplierFormData, zipCode: e.target.value})} />
                        <Input id="city" label="Città" type="text" value={supplierFormData.city || ''} onChange={e => setSupplierFormData({...supplierFormData, city: e.target.value})} />
                        <Input id="province" label="Provincia" type="text" value={supplierFormData.province || ''} onChange={e => setSupplierFormData({...supplierFormData, province: e.target.value})} />
                    </div>
                    <Input id="contactPerson" label="Referente" type="text" value={supplierFormData.contactPerson || ''} onChange={e => setSupplierFormData({...supplierFormData, contactPerson: e.target.value})} />
                    <Input id="email" label="Email" type="email" value={supplierFormData.email || ''} onChange={e => setSupplierFormData({...supplierFormData, email: e.target.value})} />
                    <Input id="phone" label="Telefono" type="tel" value={supplierFormData.phone || ''} onChange={e => setSupplierFormData({...supplierFormData, phone: e.target.value})} />

                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={closeSupplierModal} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
                        <button type="submit" form="supplier-form" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isLocationModalOpen} onClose={closeLocationModal} title={locationModalState?.mode === 'edit' ? 'Modifica Sede' : 'Nuova Sede'}>
                <form id="location-form" onSubmit={handleSaveLocation} className="space-y-4" noValidate>
                    <Input id="name" label="Nome Completo Sede" type="text" value={locationFormData.name || ''} onChange={handleLocationFormChange} error={locationErrors.name} required />
                    <Input id="shortName" label="Nome Breve Sede (max 4)" type="text" value={locationFormData.shortName || ''} onChange={handleLocationFormChange} error={locationErrors.shortName} required maxLength={4} />
                    <Input id="address" label="Indirizzo" type="text" value={locationFormData.address || ''} onChange={handleLocationFormChange} error={locationErrors.address} required />
                     <div className="grid grid-cols-2 gap-4">
                        <Input id="zipCode" label="CAP" type="text" value={locationFormData.zipCode || ''} onChange={handleLocationFormChange} />
                        <Input id="province" label="Prov" type="text" value={locationFormData.province || ''} onChange={handleLocationFormChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="capacity" label="Capienza Massima (Max People)" type="number" value={locationFormData.capacity || ''} onChange={handleLocationFormChange} error={locationErrors.capacity} required />
                        <Input id="rentalCost" label="Costo Nolo (€)" type="number" step="0.01" value={locationFormData.rentalCost || ''} onChange={handleLocationFormChange} error={locationErrors.rentalCost} required />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={closeLocationModal} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
                        <button type="submit" form="location-form" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal isOpen={!!deletingSupplierId} onClose={() => setDeletingSupplierId(null)} onConfirm={handleConfirmDeleteSupplier} title="Conferma Eliminazione Fornitore">
                <p>Sei sicuro di voler eliminare questo fornitore? L'azione è irreversibile. Potrai eliminare il fornitore solo se non ha sedi associate.</p>
            </ConfirmModal>

            <ConfirmModal isOpen={!!deletingLocationId} onClose={() => setDeletingLocationId(null)} onConfirm={handleConfirmLocationDelete} title="Conferma Eliminazione Sede">
                <p>Sei sicuro di voler eliminare questa sede? Se la sede è utilizzata in workshop esistenti, potrebbero verificarsi errori di visualizzazione.</p>
            </ConfirmModal>
        </div>
    );
};

export default LogisticsView;