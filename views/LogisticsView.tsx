import React, { useState, useEffect } from 'react';
import Card, { CardContent } from '../components/Card';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/HeroIcons';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import type { Supplier, Location } from '../types';

interface LogisticsViewProps {
    suppliers: Supplier[];
    addSupplier: (item: Omit<Supplier, 'id'>) => Promise<{id: string}>;
    updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
    removeSupplier: (id: string) => Promise<void>;
    locations: Location[];
    addLocation: (item: Omit<Location, 'id'>) => Promise<void>;
    updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
    removeLocation: (id: string) => Promise<void>;
}

type SupplierModalState =
    | { mode: 'new' }
    | { mode: 'edit', supplier: Supplier }
    | null;

type LocationModalState = 
    | { mode: 'new' }
    | { mode: 'edit', location: Partial<Location>, index: number }
    | null;

const COLORS = [
    { name: "Verde", hex: "#00db00" },
    { name: "Viola", hex: "#a200ff" },
    { name: "Marrone", hex: "#80370d" },
    { name: "Azzurro", hex: "#00e1ff" },
    { name: "Giallo", hex: "#FFFF00" },
    { name: "Rosso", hex: "#cc0606" },
    { name: "Fucsia", hex: "#FF00FF" },
    { name: "Lime", hex: "#93fc28" },
    { name: "Ocra", hex: "#d6a913" },
    { name: "Blu", hex: "#0303a3" },
    { name: "Grigio", hex: "#808080" },
    { name: "Arancio", hex: "#FF8000" },
    { name: "Oliva", hex: "#014f01" },
    { name: "Turchese", hex: "#279677" },
    { name: "Nero", hex: "#000000" },
];

const LogisticsView = ({
    suppliers, addSupplier, updateSupplier, removeSupplier,
    locations, addLocation, updateLocation, removeLocation
}: LogisticsViewProps) => {
    // --- DEBUG START: LOGISTICS_RENDER ---
    console.log('[DEBUG] LogisticsView: Component rendered.');
    console.log('[DEBUG] LogisticsView: Props received:', { suppliers, locations });
    // --- DEBUG END: LOGISTICS_RENDER ---

    const [supplierModalState, setSupplierModalState] = useState<SupplierModalState>(null);
    const [locationModalState, setLocationModalState] = useState<LocationModalState>(null);
    const [deletingItem, setDeletingItem] = useState<{ type: 'supplier' | 'location', id: string, name: string } | null>(null);

    // State for the main supplier modal
    const [supplierFormData, setSupplierFormData] = useState<Partial<Supplier>>({});
    const [locationsInModal, setLocationsInModal] = useState<Partial<Location>[]>([]);
    const [locationsToDelete, setLocationsToDelete] = useState<string[]>([]);
    const [supplierErrors, setSupplierErrors] = useState<Record<string, string>>({});

    // State for the nested location modal
    const [locationFormData, setLocationFormData] = useState<Partial<Location>>({});
    const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
    const [isShortNameManual, setIsShortNameManual] = useState(false);

    const generateShortName = (name: string): string => {
        if (!name) return '';
        const consonants = (name.match(/[bcdfghjklmnpqrstvwxyz]/ig) || []).join('');
        return consonants.substring(0, 4).toUpperCase();
    };

    useEffect(() => {
        if (supplierModalState?.mode === 'edit') {
            setSupplierFormData(supplierModalState.supplier);
            const supplierLocations = locations.filter(loc => loc.supplierId === supplierModalState.supplier.id);
            setLocationsInModal(supplierLocations);
        } else {
            setSupplierFormData({});
            setLocationsInModal([]);
        }
        setLocationsToDelete([]);
        setSupplierErrors({});
    }, [supplierModalState, locations]);

    useEffect(() => {
        if(locationModalState?.mode === 'edit') {
            setLocationFormData(locationModalState.location);
            setIsShortNameManual(!!locationModalState.location.shortName);
        } else {
            setLocationFormData({ color: COLORS[0].hex }); // Default color
            setIsShortNameManual(false);
        }
        setLocationErrors({});
    }, [locationModalState]);

    useEffect(() => {
        if (locationFormData.name && !isShortNameManual) {
            setLocationFormData(prev => ({ ...prev, shortName: generateShortName(prev.name || '') }));
        }
    }, [locationFormData.name, isShortNameManual]);


    const closeSupplierModal = () => setSupplierModalState(null);
    const closeLocationModal = () => setLocationModalState(null);

    const validateSupplier = () => {
        const newErrors: Record<string, string> = {};
        if (!supplierFormData.name?.trim()) newErrors.name = 'Il nome del fornitore è obbligatorio.';
        setSupplierErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateLocation = () => {
        const newErrors: Record<string, string> = {};
        if (!locationFormData.name?.trim()) newErrors.name = 'Il nome della sede è obbligatorio.';
        if (!locationFormData.address?.trim()) newErrors.address = "L'indirizzo è obbligatorio.";
        if (locationFormData.capacity === undefined || Number(locationFormData.capacity) <= 0) newErrors.capacity = 'La capienza deve essere un numero positivo.';
        setLocationErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateSupplier()) return;

        let supplierId: string;
        if (supplierModalState?.mode === 'edit') {
            supplierId = supplierModalState.supplier.id;
            await updateSupplier(supplierId, supplierFormData);
        } else {
            const newSupplier = { name: 'Temp', ...supplierFormData };
            const docRef = await addSupplier(newSupplier as Omit<Supplier, 'id'>);
            supplierId = docRef.id;
        }

        for (const locId of locationsToDelete) {
            await removeLocation(locId);
        }
        
        for (const loc of locationsInModal) {
            const locationData: Omit<Location, 'id'> = {
                supplierId: supplierId,
                name: loc.name!,
                address: loc.address!,
                capacity: Number(loc.capacity!),
                color: loc.color,
                shortName: loc.shortName,
                zipCode: loc.zipCode,
                city: loc.city,
                province: loc.province,
                rentalCost: Number(loc.rentalCost || 0),
                distanceKm: Number(loc.distanceKm || 0),
            };

            if (loc.id) {
                await updateLocation(loc.id, locationData);
            } else {
                await addLocation(locationData);
            }
        }
        
        alert('Fornitore e sedi salvati con successo!');
        closeSupplierModal();
    };
    
    const handleSaveLocation = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateLocation()) return;

        if (locationModalState?.mode === 'edit') {
            const updatedLocations = [...locationsInModal];
            updatedLocations[locationModalState.index] = { ...updatedLocations[locationModalState.index], ...locationFormData };
            setLocationsInModal(updatedLocations);
        } else {
            setLocationsInModal([...locationsInModal, locationFormData]);
        }
        closeLocationModal();
    };
    
    const handleDeleteLocationInModal = (index: number) => {
        const locationToDelete = locationsInModal[index];
        if (locationToDelete.id) {
            setLocationsToDelete([...locationsToDelete, locationToDelete.id]);
        }
        const updatedLocations = locationsInModal.filter((_, i) => i !== index);
        setLocationsInModal(updatedLocations);
    };


    const handleConfirmDelete = async () => {
        if (deletingItem) {
            if (deletingItem.type === 'supplier') {
                const supplierLocations = locations.filter(loc => loc.supplierId === deletingItem.id);
                for (const loc of supplierLocations) {
                    await removeLocation(loc.id);
                }
                await removeSupplier(deletingItem.id);
            } else {
                await removeLocation(deletingItem.id);
            }
            alert('Elemento eliminato!');
            setDeletingItem(null);
        }
    };

    const renderLocationModal = () => {
        if (!locationModalState) return null;
        const title = locationModalState.mode === 'new' ? 'Aggiungi Sede' : 'Modifica Sede';

        return (
            <Modal isOpen={!!locationModalState} onClose={closeLocationModal} title={title}>
                 <form id="location-form" onSubmit={handleSaveLocation} className="space-y-4" noValidate>
                    <Input id="name" label="Nome" value={locationFormData.name || ''} onChange={e => setLocationFormData({ ...locationFormData, name: e.target.value })} error={locationErrors.name} required autoComplete="off" />
                    <Input 
                        id="shortName" 
                        label="Nome Breve (max 4)" 
                        value={locationFormData.shortName || ''} 
                        onChange={e => {
                            setIsShortNameManual(true);
                            setLocationFormData({ ...locationFormData, shortName: e.target.value });
                        }} 
                        maxLength={4}
                        placeholder="Auto-generato"
                        autoComplete="off"
                    />
                    <Input id="address" label="Indirizzo" value={locationFormData.address || ''} onChange={e => setLocationFormData({ ...locationFormData, address: e.target.value })} error={locationErrors.address} required autoComplete="street-address" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="zipCode" label="CAP" value={locationFormData.zipCode || ''} onChange={e => setLocationFormData({ ...locationFormData, zipCode: e.target.value })} autoComplete="postal-code" />
                        <Input id="city" label="Città" value={locationFormData.city || ''} onChange={e => setLocationFormData({ ...locationFormData, city: e.target.value })} autoComplete="address-level2" />
                        <Input id="province" label="Prov" value={locationFormData.province || ''} onChange={e => setLocationFormData({ ...locationFormData, province: e.target.value })} autoComplete="address-level1" />
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="capacity" label="Max People" type="number" value={locationFormData.capacity || ''} onChange={e => setLocationFormData({ ...locationFormData, capacity: Number(e.target.value) })} error={locationErrors.capacity} required autoComplete="off" />
                        <Input id="rentalCost" label="Nolo (€)" type="number" step="0.01" value={locationFormData.rentalCost || ''} onChange={e => setLocationFormData({ ...locationFormData, rentalCost: Number(e.target.value) })} autoComplete="off" />
                        <Input id="distanceKm" label="Distanza (km)" type="number" step="0.1" value={locationFormData.distanceKm || ''} onChange={e => setLocationFormData({ ...locationFormData, distanceKm: Number(e.target.value) })} autoComplete="off" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-testo-input mb-2">Colore Etichetta</label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map(color => (
                                <button
                                    type="button"
                                    key={color.hex}
                                    onClick={() => setLocationFormData({ ...locationFormData, color: color.hex })}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 ${locationFormData.color === color.hex ? 'border-bottone-azione scale-110 ring-2 ring-bottone-azione/50' : 'border-transparent'}`}
                                    style={{ backgroundColor: color.hex }}
                                    aria-label={`Seleziona colore ${color.name}`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={closeLocationModal} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
                        <button type="submit" form="location-form" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva Sede</button>
                    </div>
                </form>
            </Modal>
        )
    }

    const renderSupplierModal = () => {
        if (!supplierModalState) return null;
        const title = supplierModalState.mode === 'new' ? 'Nuovo Fornitore' : 'Modifica Fornitore';

        return (
             <Modal isOpen={!!supplierModalState} onClose={closeSupplierModal} title={title}>
                <form id="supplier-form" onSubmit={handleSave} className="space-y-6" noValidate>
                    {/* Supplier Details */}
                    <fieldset className="space-y-4 border-b border-black/10 pb-6">
                         <Input id="name" label="Nome Fornitore" value={supplierFormData.name || ''} onChange={e => setSupplierFormData({ ...supplierFormData, name: e.target.value })} error={supplierErrors.name} required autoComplete="organization" />
                         <Input id="vatNumber" label="P.IVA / C.F." value={supplierFormData.vatNumber || ''} onChange={e => setSupplierFormData({ ...supplierFormData, vatNumber: e.target.value })} autoComplete="off" />
                         <Input id="email" label="Email" type="email" value={supplierFormData.email || ''} onChange={e => setSupplierFormData({ ...supplierFormData, email: e.target.value })} autoComplete="email" />
                         <Input id="phone" label="Telefono" type="tel" value={supplierFormData.phone || ''} onChange={e => setSupplierFormData({ ...supplierFormData, phone: e.target.value })} autoComplete="tel" />
                         <Input id="contact" label="Referente" value={supplierFormData.contact || ''} onChange={e => setSupplierFormData({ ...supplierFormData, contact: e.target.value })} autoComplete="name" />
                    </fieldset>
                    
                    {/* Locations Management */}
                    <div>
                         <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-testo-input">Sedi / Luoghi</h4>
                            <button type="button" onClick={() => setLocationModalState({ mode: 'new' })} className="text-sm text-bottone-azione hover:opacity-80 font-medium flex items-center space-x-1">
                                <PlusIcon className="h-4 w-4" /><span>Aggiungi Sede</span>
                            </button>
                        </div>
                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {locationsInModal.map((loc, index) => (
                                <li key={loc.id || `new-${index}`} className="p-2.5 bg-white/40 rounded-md flex justify-between items-center">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: loc.color || '#cccccc' }}></div>
                                        <div>
                                            <p className="font-semibold text-testo-input">{loc.name}</p>
                                            <p className="text-xs text-testo-input/80">{loc.address}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <button type="button" onClick={() => setLocationModalState({ mode: 'edit', location: loc, index })} className="p-1.5 text-testo-input/80 hover:text-bottone-azione"><PencilIcon className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => handleDeleteLocationInModal(index)} className="p-1.5 text-testo-input/80 hover:text-bottone-eliminazione"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                </li>
                            ))}
                            {locationsInModal.length === 0 && <p className="text-center text-sm text-testo-input/80 py-4 italic">Nessuna sede aggiunta.</p>}
                        </ul>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-black/10">
                        <button type="button" onClick={closeSupplierModal} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
                        <button type="submit" form="supplier-form" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva Fornitore</button>
                    </div>
                </form>
                {renderLocationModal()}
            </Modal>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-xl font-semibold text-testo-input">Logistica e Fornitori</h2>
                 <button onClick={() => setSupplierModalState({ mode: 'new' })} className="bg-bottone-azione text-white px-4 py-2 rounded-full shadow hover:opacity-90 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottone-azione">
                    <PlusIcon /><span>Nuovo Fornitore</span>
                </button>
            </div>
            
            <div className="space-y-4">
                {suppliers.map(supplier => {
                    const supplierLocations = locations.filter(loc => loc.supplierId === supplier.id);
                    return (
                        <div key={supplier.id}>
                            <Card>
                                <CardContent>
                                    <div className="flex justify-between items-start pb-4 border-b border-black/10">
                                        <div>
                                            <h4 className="font-bold text-lg text-testo-input">{supplier.name}</h4>
                                            <p className="text-sm text-testo-input/80">{supplier.email} {supplier.phone && ` - ${supplier.phone}`}</p>
                                            <p className="text-sm text-testo-input/80">{supplier.vatNumber && `P.IVA: ${supplier.vatNumber}`} {supplier.contact && `- Ref: ${supplier.contact}`}</p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => setSupplierModalState({ mode: 'edit', supplier })} className="p-2 text-testo-input/80 hover:text-bottone-azione rounded-full hover:bg-white/30" aria-label="Modifica Fornitore"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => setDeletingItem({ type: 'supplier', id: supplier.id, name: supplier.name })} className="p-2 text-testo-input/80 hover:text-bottone-eliminazione rounded-full hover:bg-red-50" aria-label="Elimina Fornitore"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <h5 className="font-semibold text-testo-input mb-2 text-sm">Sedi / Luoghi</h5>
                                        {supplierLocations.length > 0 ? (
                                            <ul className="space-y-2">
                                                {supplierLocations.map(location => (
                                                    <li key={location.id} className="p-2.5 bg-white/30 rounded-md flex items-center space-x-4">
                                                        <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: location.color || '#cccccc' }}></div>
                                                        <div>
                                                            <p className="font-semibold text-testo-input">{location.name} (Capienza: {location.capacity})</p>
                                                            <p className="text-xs text-testo-input/80">{location.address}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-testo-input/80 italic px-2">Nessuna sede associata a questo fornitore.</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}
            </div>
            
            {renderSupplierModal()}

            <ConfirmModal
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleConfirmDelete}
                title={`Conferma Eliminazione ${deletingItem?.type === 'supplier' ? 'Fornitore' : 'Sede'}`}
            >
                <p>
                    {deletingItem?.type === 'supplier' 
                        ? `Sei sicuro di voler eliminare il fornitore "${deletingItem?.name}"? Verranno eliminate anche tutte le sue sedi associate. L'azione è irreversibile.`
                        : `Sei sicuro di voler eliminare la sede "${deletingItem?.name}"? L'azione è irreversibile.`
                    }
                </p>
            </ConfirmModal>
        </div>
    );
};

export default LogisticsView;