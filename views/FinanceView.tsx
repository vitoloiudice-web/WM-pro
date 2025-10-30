
import React, { useState, useEffect, useMemo } from 'react';
import Card, { CardContent } from '../components/Card.tsx';
import { PlusIcon, PencilIcon, TrashIcon, DocumentArrowDownIcon } from '../components/icons/HeroIcons.tsx';
import Modal from '../components/Modal.tsx';
import ConfirmModal from '../components/ConfirmModal.tsx';
import Input from '../components/Input.tsx';
import Select from '../components/Select.tsx';
import type { Payment, OperationalCost, Quote, Invoice, PaymentMethod, Parent, Workshop, Location, Supplier, CompanyProfile, ClientDetails } from '../types.ts';

declare const jspdf: any;

type FinanceTab = 'payments' | 'costs' | 'quotes' | 'invoices';
type FinanceItem = Payment | OperationalCost | Quote | Invoice;

const getParentDisplayName = (parent: Parent): string => {
    if (parent.clientType === 'persona giuridica') {
        return parent.companyName || 'Cliente Giuridico';
    }
    return `${parent.name || ''} ${parent.surname || ''}`.trim();
};

interface FinanceViewProps {
    companyProfile: CompanyProfile;
    payments: Payment[];
    addPayment: (item: Payment) => Promise<void>;
    updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
    removePayment: (id: string) => Promise<void>;
    costs: OperationalCost[];
    addCost: (item: OperationalCost) => Promise<void>;
    updateCost: (id: string, updates: Partial<OperationalCost>) => Promise<void>;
    removeCost: (id: string) => Promise<void>;
    quotes: Quote[];
    addQuote: (item: Quote) => Promise<void>;
    updateQuote: (id: string, updates: Partial<Quote>) => Promise<void>;
    removeQuote: (id: string) => Promise<void>;
    invoices: Invoice[];
    addInvoice: (item: Invoice) => Promise<void>;
    updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
    removeInvoice: (id: string) => Promise<void>;
    parents: Parent[];
    workshops: Workshop[];
    locations: Location[];
    suppliers: Supplier[];
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

const FinanceListItem: React.FC<{onEdit: () => void, onDelete: () => void, onDownload?: () => void, children: React.ReactNode}> = ({onEdit, onDelete, onDownload, children}) => (
    <li className="p-3 bg-slate-100 rounded-md text-sm text-slate-700 flex justify-between items-center">
      <span className="truncate pr-4">{children}</span>
      <div className="flex items-center space-x-2 transition-opacity">
        {onDownload && (
          <button onClick={onDownload} className="p-1 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-200" aria-label="Scarica PDF">
            <DocumentArrowDownIcon className="h-4 w-4"/>
          </button>
        )}
        <button onClick={onEdit} className="p-1 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-200" aria-label="Modifica">
          <PencilIcon className="h-4 w-4"/>
        </button>
        <button onClick={onDelete} className="p-1 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-200" aria-label="Elimina">
          <TrashIcon className="h-4 w-4"/>
        </button>
      </div>
    </li>
);

const FinanceView: React.FC<FinanceViewProps> = ({
    companyProfile,
    payments, addPayment, updatePayment, removePayment,
    costs, addCost, updateCost, removeCost,
    quotes, addQuote, updateQuote, removeQuote,
    invoices, addInvoice, updateInvoice, removeInvoice,
    parents, workshops, locations
}) => {
    const [activeTab, setActiveTab] = useState<FinanceTab>('payments');
    
    const [editingItem, setEditingItem] = useState<FinanceItem | null>(null);
    const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    const [isPotentialClientModalOpen, setIsPotentialClientModalOpen] = useState(false);
    const [potentialClientFormData, setPotentialClientFormData] = useState<Partial<ClientDetails>>({ clientType: 'persona fisica' });
    const [potentialClientErrors, setPotentialClientErrors] = useState<Record<string, string>>({});

    const isModalOpen = isNewItemModalOpen || !!editingItem;

    const parentMap = useMemo(() => parents.reduce((acc, p) => ({...acc, [p.id]: p}), {} as Record<string, Parent>), [parents]);
    const workshopMap = useMemo(() => workshops.reduce((acc, w) => ({...acc, [w.id]: w}), {} as Record<string, Workshop>), [workshops]);
    const locationMap = useMemo(() => locations.reduce((acc, l) => ({...acc, [l.id]: l}), {} as Record<string, Location>), [locations]);

    const paymentMethodOptions = [
        { value: 'cash', label: 'Contanti' },
        { value: 'transfer', label: 'Bonifico' },
        { value: 'card', label: 'Carta' },
    ];

    const getPaymentMethodLabel = (method?: PaymentMethod): string => {
        if (!method) return '';
        switch (method) {
            case 'cash': return 'Contanti';
            case 'transfer': return 'Bonifico';
            case 'card': return 'Carta';
            default: return '';
        }
    };

    const getQuoteClientDisplayName = (quote: Quote): string => {
        if (quote.parentId) {
            const parent = parentMap[quote.parentId];
            return parent ? getParentDisplayName(parent) : 'Cliente Registrato Sconosciuto';
        }
        if (quote.potentialClient) {
            if (quote.potentialClient.clientType === 'persona giuridica') {
                return quote.potentialClient.companyName || 'Cliente Potenziale';
            }
            return `${quote.potentialClient.name || ''} ${quote.potentialClient.surname || ''}`.trim();
        }
        return 'Nessun Cliente';
    };


    useEffect(() => {
        if (editingItem) {
            let initialData = {};
            switch (activeTab) {
                case 'payments':
                    initialData = { ...(editingItem as Payment) };
                    break;
                case 'costs':
                    const cost = editingItem as OperationalCost;
                    initialData = {
                        ...cost,
                        costType: cost.costType || 'general',
                    };
                    break;
                case 'quotes':
                     initialData = { ...(editingItem as Quote) };
                    break;
                case 'invoices':
                    initialData = { ...(editingItem as Invoice) };
                    break;
            }
            setFormData(initialData);
        } else {
            setFormData({}); // Clear form when modal closes or switches to new
        }
    }, [editingItem, activeTab, isNewItemModalOpen]);

    const closeModal = () => {
        setIsNewItemModalOpen(false);
        setEditingItem(null);
        setFormData({});
        setErrors({});
    };

    const handleAddNewClick = () => {
        setIsNewItemModalOpen(true);
    };
    
    const handleEditClick = (item: FinanceItem) => {
        setEditingItem(item);
    };

    const handleDeleteClick = (id: string) => {
        setDeletingItemId(id);
    };
    
    const handleConfirmDelete = async () => {
        if(deletingItemId) {
            switch(activeTab) {
                case 'payments': await removePayment(deletingItemId); break;
                case 'costs': await removeCost(deletingItemId); break;
                case 'quotes': await removeQuote(deletingItemId); break;
                case 'invoices': await removeInvoice(deletingItemId); break;
            }
            alert(`Elemento eliminato!`);
            setDeletingItemId(null);
        }
    };

    const getQuoteClientDetails = (quote: Quote): ClientDetails | Parent | null => {
        if (quote.parentId) {
            return parentMap[quote.parentId] || null;
        }
        if (quote.potentialClient) {
            return quote.potentialClient;
        }
        return null;
    }

    const handleGeneratePdf = (quote: Quote) => {
        if (!companyProfile) {
            alert("Profilo aziendale non configurato. Vai nella Dashboard per inserire i dati.");
            return;
        }
        const client = getQuoteClientDetails(quote);
        if (!client) {
            alert("Dati cliente non trovati per questo preventivo.");
            return;
        }

        const doc = new jspdf.jsPDF();

        doc.setFont("helvetica");

        // --- Header Section ---
        const headerX = 15;
        const headerY = 20;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(companyProfile.companyName || 'Nome Attività', headerX, headerY);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(companyProfile.address || 'Indirizzo', headerX, headerY + 7);
        doc.text(`P.IVA: ${companyProfile.vatNumber || 'N/D'}`, headerX, headerY + 12);
        doc.text(`Email: ${companyProfile.email || 'N/D'}`, headerX, headerY + 17);
        doc.text(`Tel: ${companyProfile.phone || 'N/D'}`, headerX, headerY + 22);

        // --- Quote Info (Right Aligned) ---
        const infoX = 195;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("PREVENTIVO", infoX, headerY, { align: "right" });
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Numero: Q-${quote.id}`, infoX, headerY + 8, { align: "right" });
        doc.text(`Data: ${new Date(quote.date).toLocaleDateString('it-IT')}`, infoX, headerY + 13, { align: "right" });

        // --- Client Section ---
        const clientY = headerY + 35;
        doc.setDrawColor(220); // light grey line
        doc.line(headerX, clientY - 5, infoX - headerX + 15, clientY - 5);
        doc.setFont("helvetica", "bold");
        doc.text("Spett.le:", headerX, clientY);
        doc.setFont("helvetica", "normal");

        let clientYCursor = clientY + 7;
        const clientDisplayName = client.clientType === 'persona giuridica' ? client.companyName : `${client.name || ''} ${client.surname || ''}`.trim();
        doc.text(clientDisplayName, headerX, clientYCursor);

        if (client.address) {
            clientYCursor += 5;
            const addressLine = `${client.address}, ${client.zipCode || ''} ${client.city || ''} (${client.province || ''})`;
            doc.text(addressLine, headerX, clientYCursor);
        }

        if (client.clientType === 'persona giuridica' && client.vatNumber) {
            clientYCursor += 5;
            doc.text(`P.IVA: ${client.vatNumber}`, headerX, clientYCursor);
        } else if (client.clientType === 'persona fisica' && client.taxCode) {
            clientYCursor += 5;
            doc.text(`C.F.: ${client.taxCode}`, headerX, clientYCursor);
        }

        // --- Table Section ---
        const tableY = clientYCursor + 15;
        const tableHeaderX = headerX;
        const amountX = infoX;
        
        // Header
        doc.setFillColor(245, 245, 245);
        doc.rect(tableHeaderX, tableY - 6, (amountX - tableHeaderX), 10, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50);
        doc.text("Descrizione", tableHeaderX + 3, tableY);
        doc.text("Importo", amountX - 3, tableY, { align: "right" });

        // Body
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        const descriptionLines = doc.splitTextToSize(quote.description, 130);
        const rowHeight = Math.max(15, descriptionLines.length * 5 + 8);
        
        doc.setDrawColor(220);
        doc.line(tableHeaderX, tableY + 4, amountX, tableY + 4); // top line
        doc.line(tableHeaderX, tableY + 4 + rowHeight, amountX, tableY + 4 + rowHeight); // bottom line
        doc.line(tableHeaderX, tableY + 4, tableHeaderX, tableY + 4 + rowHeight); // left line
        doc.line(amountX, tableY + 4, amountX, tableY + 4 + rowHeight); // right line

        doc.text(descriptionLines, tableHeaderX + 3, tableY + 12);
        doc.text(`€ ${quote.amount.toFixed(2)}`, amountX - 3, tableY + 12, { align: "right" });

        // --- Total Section ---
        let totalY = tableY + 4 + rowHeight + 15;
        const bollo = 2;
        const showBollo = quote.amount > 77;
        const finalAmount = showBollo ? quote.amount + bollo : quote.amount;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Imponibile", amountX - 45, totalY, { align: "right" });
        doc.text(`€ ${quote.amount.toFixed(2)}`, amountX - 3, totalY, { align: "right" });
        
        if (showBollo) {
            totalY += 6;
            doc.text("Bollo virtuale", amountX - 45, totalY, { align: "right" });
            doc.text(`€ ${bollo.toFixed(2)}`, amountX - 3, totalY, { align: "right" });
        }
        
        totalY += 6;
        doc.setDrawColor(50);
        doc.line(amountX - 60, totalY - 3, amountX, totalY - 3);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TOTALE", amountX - 45, totalY + 4, { align: "right" });
        doc.text(`€ ${finalAmount.toFixed(2)}`, amountX - 3, totalY + 4, { align: "right" });
        
        // --- Footer Section ---
        const footerY = 270;
        doc.setDrawColor(220);
        doc.line(headerX, footerY - 5, infoX - headerX + 15, footerY - 5);
        doc.setFontSize(8);
        doc.setTextColor(120);
        
        const footerTextParts: string[] = [];
        if(companyProfile.taxRegime) {
          footerTextParts.push(companyProfile.taxRegime);
        }
        if(showBollo) {
            footerTextParts.push("Imposta di bollo assolta in modo virtuale ai sensi del D.M. 17/06/2014.");
        }
        
        if(footerTextParts.length > 0) {
            const footerText = doc.splitTextToSize(footerTextParts.join(' '), 180);
            doc.text(footerText, (doc.internal.pageSize.getWidth() / 2), footerY, { align: 'center' });
        }

        doc.save(`Preventivo-${quote.id}.pdf`);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        switch (activeTab) {
            case 'payments':
                if (!formData.parentId) newErrors.parentId = 'È obbligatorio selezionare un cliente.';
                if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = "L'importo deve essere un numero positivo.";
                if (!formData.paymentDate) newErrors.paymentDate = 'La data è obbligatoria.';
                if (!formData.method) newErrors.method = 'Il metodo di pagamento è obbligatorio.';
                break;
            case 'costs':
                const costType = formData.costType || 'general';
                if (costType === 'fuel') {
                    if (!formData.locationId) newErrors.locationId = 'Il luogo è obbligatorio.';
                    if (!formData.distanceKm || parseFloat(formData.distanceKm) <= 0) newErrors.distanceKm = 'La distanza deve essere un numero positivo.';
                    if (!formData.fuelCostPerKm || parseFloat(formData.fuelCostPerKm) <= 0) newErrors.fuelCostPerKm = 'Il costo al km deve essere un numero positivo.';
                } else {
                    if (!formData.description?.trim()) newErrors.description = 'La descrizione è obbligatoria.';
                    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = "L'importo deve essere un numero positivo.";
                }
                if (!formData.date) newErrors.date = 'La data è obbligatoria.';
                break;
            case 'quotes':
                if (!formData.parentId && !formData.potentialClient) newErrors.client = 'È obbligatorio selezionare o inserire un cliente.';
                if (!formData.description?.trim()) newErrors.description = 'La descrizione è obbligatoria.';
                if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = "L'importo deve essere un numero positivo.";
                if (!formData.date) newErrors.date = 'La data è obbligatoria.';
                if (!formData.status) newErrors.status = 'Lo stato è obbligatorio.';
                break;
            case 'invoices':
                if (!formData.parentId) newErrors.parentId = 'È obbligatorio selezionare un cliente.';
                if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = "L'importo deve essere un numero positivo.";
                if (!formData.sdiNumber?.trim()) newErrors.sdiNumber = 'Il numero SDI è obbligatorio.';
                if (!formData.issueDate) newErrors.issueDate = 'La data di emissione è obbligatoria.';
                if (!formData.method) newErrors.method = 'Il metodo di pagamento è obbligatorio.';
                break;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if(validate()){
            // Fix: Explicitly typed `dataToSave` to prevent incorrect type inference by TypeScript,
            // which was causing errors when accessing properties like `costType`.
            const dataToSave: Record<string, any> = { ...formData, amount: parseFloat(formData.amount || '0') };
            
            if (activeTab === 'costs' && (dataToSave.costType || 'general') === 'fuel') {
                const distance = parseFloat(dataToSave.distanceKm) || 0;
                const costPerKm = parseFloat(dataToSave.fuelCostPerKm) || 0;
                dataToSave.amount = distance * 2 * costPerKm;
                const locationName = locationMap[dataToSave.locationId]?.name || 'N/D';
                dataToSave.description = `Carburante per ${locationName} (${distance}km A/R)`;
            }
            
            if(editingItem) {
                const { id, ...updates } = { ...editingItem, ...dataToSave };
                switch(activeTab) {
                    case 'payments': await updatePayment(id, updates); break;
                    case 'costs': await updateCost(id, updates); break;
                    case 'quotes': await updateQuote(id, updates); break;
                    case 'invoices': await updateInvoice(id, updates); break;
                }
                 alert(`Elemento "${activeTab.slice(0, -1)}" aggiornato!`);
            } else {
                const baseItem = { id: `item_${Date.now()}`, ...dataToSave };
                switch(activeTab) {
                    case 'payments': await addPayment(baseItem as Payment); break;
                    case 'costs': await addCost(baseItem as OperationalCost); break;
                    case 'quotes': await addQuote(baseItem as Quote); break;
                    case 'invoices': await addInvoice(baseItem as Invoice); break;
                }
                alert(`Nuovo elemento "${activeTab.slice(0, -1)}" salvato!`);
            }
            closeModal();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        const newFormData = { ...formData, [id]: value };

        if (id === 'costType') {
            // Reset fields when switching type
            if (value === 'fuel') {
                newFormData.description = '';
                newFormData.amount = 0;
            } else {
                delete newFormData.locationId;
                delete newFormData.distanceKm;
                delete newFormData.fuelCostPerKm;
            }
        }
    
        setFormData(newFormData);
    };

    const handlePotentialClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setPotentialClientFormData({ ...potentialClientFormData, [e.target.id]: e.target.value });
    };

    const handleSavePotentialClient = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        const { clientType } = potentialClientFormData;
        if (clientType === 'persona giuridica') {
            if (!potentialClientFormData.companyName?.trim()) newErrors.companyName = 'La ragione sociale è obbligatoria.';
            if (!potentialClientFormData.vatNumber?.trim()) newErrors.vatNumber = 'La Partita IVA è obbligatoria.';
        } else {
            if (!potentialClientFormData.name?.trim()) newErrors.name = 'Il nome è obbligatorio.';
            if (!potentialClientFormData.surname?.trim()) newErrors.surname = 'Il cognome è obbligatorio.';
        }
        if (!potentialClientFormData.email?.trim()) {
            newErrors.email = "L'email è obbligatoria.";
        } else if (!/\S+@\S+\.\S+/.test(potentialClientFormData.email)) {
            newErrors.email = 'Formato email non valido.';
        }
        setPotentialClientErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            setFormData(prev => ({
                ...prev,
                potentialClient: potentialClientFormData as ClientDetails,
                parentId: undefined
            }));
            setIsPotentialClientModalOpen(false);
        }
    };

    const renderModalContent = () => {
        const formId = `form-${activeTab}`;
        const commonButtons = (
           <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button>
              <button type="submit" form={formId} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Salva</button>
            </div>
        );

        const parentOptions = parents.map(p => ({ value: p.id, label: getParentDisplayName(p) }));
        
        switch (activeTab) {
            case 'payments': return (
                <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
                    <Select id="parentId" label="Cliente" options={parentOptions} placeholder="Seleziona un cliente" value={formData.parentId || ''} onChange={handleChange} error={errors.parentId} required />
                    <Input id="amount" label="Importo" type="number" step="0.01" value={formData.amount || ''} onChange={handleChange} error={errors.amount} required />
                    <Select id="method" label="Metodo di Pagamento" options={paymentMethodOptions} value={formData.method || ''} onChange={handleChange} error={errors.method} required />
                    <Input id="paymentDate" label="Data Pagamento" type="date" value={formData.paymentDate || new Date().toISOString().substring(0, 10)} onChange={handleChange} error={errors.paymentDate} required />
                    {commonButtons}
                </form>
            );
            case 'costs': 
                const costType = formData.costType || 'general';
                const distance = parseFloat(formData.distanceKm) || 0;
                const costPerKm = parseFloat(formData.fuelCostPerKm) || 0;
                const calculatedAmount = (distance * 2 * costPerKm).toFixed(2);
                
                const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
                const workshopOptions = workshops.map(w => ({ value: w.id, label: w.name }));

                return (
                    <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
                        <Select id="costType" label="Tipo di Costo" options={[{value: 'general', label: 'Generico'}, {value: 'fuel', label: 'Carburante'}]} value={costType} onChange={handleChange} />
                        
                        {costType === 'fuel' ? (
                            <>
                                <Select id="locationId" label="Luogo di destinazione" options={locationOptions} placeholder="Seleziona un luogo" value={formData.locationId || ''} onChange={handleChange} error={errors.locationId} required />
                                <Input id="distanceKm" label="Distanza (solo andata, in km)" type="number" step="0.1" value={formData.distanceKm || ''} onChange={handleChange} error={errors.distanceKm} required />
                                <Input id="fuelCostPerKm" label="Costo carburante al km (€)" type="number" step="0.01" value={formData.fuelCostPerKm || ''} onChange={handleChange} error={errors.fuelCostPerKm} required />
                                <div className="p-3 bg-slate-100 rounded-md text-center">
                                    <p className="text-sm text-slate-600">Costo totale calcolato (A/R):</p>
                                    <p className="text-xl font-bold text-indigo-600">€{calculatedAmount}</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <Input id="description" label="Descrizione" type="text" value={formData.description || ''} onChange={handleChange} error={errors.description} required />
                                <Input id="amount" label="Importo" type="number" step="0.01" value={formData.amount || ''} onChange={handleChange} error={errors.amount} required />
                            </>
                        )}

                        <Select id="workshopId" label="Workshop (Opzionale)" options={workshopOptions} placeholder="Nessun workshop specifico" value={formData.workshopId || ''} onChange={handleChange} error={errors.workshopId} />
                        <Input id="date" label="Data" type="date" value={formData.date || new Date().toISOString().substring(0, 10)} onChange={handleChange} error={errors.date} required />
                        <Select id="method" label="Metodo di Pagamento (Opzionale)" options={paymentMethodOptions} placeholder="Non specificato" value={formData.method || ''} onChange={handleChange} />
                        {commonButtons}
                    </form>
                );
            case 'quotes': return (
                <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                        {formData.potentialClient ? (
                             <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-md">
                                <span className="font-semibold text-indigo-800">
                                    {formData.potentialClient.clientType === 'persona giuridica' 
                                        ? formData.potentialClient.companyName 
                                        : `${formData.potentialClient.name || ''} ${formData.potentialClient.surname || ''}`.trim()
                                    }
                                </span>
                                <button type="button" onClick={() => setFormData(prev => ({...prev, potentialClient: undefined}))} className="text-sm text-slate-500 hover:text-slate-700">Cambia</button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <div className="flex-grow">
                                     <Select 
                                        id="parentId"
                                        label=""
                                        options={parentOptions} 
                                        placeholder="Seleziona un cliente esistente" 
                                        value={formData.parentId || ''} 
                                        onChange={(e) => {
                                            setFormData(prev => ({...prev, parentId: e.target.value, potentialClient: undefined }));
                                        }} 
                                    />
                                </div>
                                 <button 
                                    type="button" 
                                    onClick={() => {
                                        setPotentialClientFormData({ clientType: 'persona fisica' });
                                        setPotentialClientErrors({});
                                        setIsPotentialClientModalOpen(true);
                                    }}
                                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 text-sm font-medium whitespace-nowrap self-end"
                                    style={{ height: '38px' }}
                                >
                                    + Nuovo
                                </button>
                            </div>
                        )}
                         {errors.client && <p className="mt-1 text-sm text-red-600">{errors.client}</p>}
                    </div>

                    <Input id="description" label="Descrizione" type="text" value={formData.description || ''} onChange={handleChange} error={errors.description} required />
                    <Input id="amount" label="Importo" type="number" step="0.01" value={formData.amount || ''} onChange={handleChange} error={errors.amount} required />
                    <Input id="date" label="Data Preventivo" type="date" value={formData.date || new Date().toISOString().substring(0, 10)} onChange={handleChange} error={errors.date} required />
                    <Select id="status" label="Stato" options={[{value: 'sent', label: 'Inviato'}, {value: 'approved', label: 'Approvato'}, {value: 'rejected', label: 'Rifiutato'}]} value={formData.status || 'sent'} onChange={handleChange} error={errors.status} required />
                    <Select id="method" label="Metodo di Pagamento (Opzionale)" options={paymentMethodOptions} placeholder="Non specificato" value={formData.method || ''} onChange={handleChange} error={errors.method} />
                    {commonButtons}
                </form>
            );
            case 'invoices': return (
                 <form id={formId} onSubmit={handleSave} className="space-y-4" noValidate>
                    <Select id="parentId" label="Cliente" options={parentOptions} placeholder="Seleziona un cliente" value={formData.parentId || ''} onChange={handleChange} error={errors.parentId} required />
                    <Input id="amount" label="Importo" type="number" step="0.01" value={formData.amount || ''} onChange={handleChange} error={errors.amount} required />
                    <Input id="sdiNumber" label="Numero SDI" type="text" value={formData.sdiNumber || ''} onChange={handleChange} error={errors.sdiNumber} required />
                    <Select id="method" label="Metodo di Pagamento" options={paymentMethodOptions} value={formData.method || ''} onChange={handleChange} error={errors.method} required />
                    <Input id="issueDate" label="Data Emissione" type="date" value={formData.issueDate || new Date().toISOString().substring(0, 10)} onChange={handleChange} error={errors.issueDate} required />
                    {commonButtons}
                </form>
            );
            default: return null;
        }
    };
    
    const renderContent = () => {
        const listProps = { onEdit: handleEditClick, onDelete: handleDeleteClick };
        
        switch (activeTab) {
            case 'payments': return <List<Payment> items={payments} renderItem={p => `Pagamento di €${p.amount.toFixed(2)} da ${parentMap[p.parentId] ? getParentDisplayName(parentMap[p.parentId]) : 'Sconosciuto'} (${getPaymentMethodLabel(p.method)})`} {...listProps} />;
            case 'costs': return <List<OperationalCost> 
                items={costs} 
                renderItem={c => {
                    if (c.costType === 'fuel' && c.locationId) {
                        const locationName = locationMap[c.locationId]?.name || 'N/D';
                        return `Carburante per ${locationName} (${c.distanceKm}km x 2) - €${c.amount.toFixed(2)}`;
                    }
                    return `${c.description} - €${c.amount.toFixed(2)}${c.workshopId ? ` (${workshopMap[c.workshopId]?.name || ''})` : ''}`
                }} 
                {...listProps} 
            />;
            case 'quotes': return <List<Quote> items={quotes} renderItem={q => `${getQuoteClientDisplayName(q)}: ${q.description} - €${q.amount.toFixed(2)} (${q.status})`} onDownload={handleGeneratePdf} {...listProps} />;
            case 'invoices': return <List<Invoice> items={invoices} renderItem={i => `Fattura a ${parentMap[i.parentId] ? getParentDisplayName(parentMap[i.parentId]) : 'Sconosciuto'} - €${i.amount.toFixed(2)} (${getPaymentMethodLabel(i.method)}, SDI: ${i.sdiNumber})`} {...listProps} />;
            default: return null;
        }
    }
    
    const getModalTitle = () => {
        const action = editingItem ? 'Modifica' : 'Aggiungi';
        switch(activeTab) {
            case 'payments': return `${action} Pagamento`;
            case 'costs': return `${action} Costo`;
            case 'quotes': return `${action} Preventivo`;
            case 'invoices': return `${action} Fattura`;
        }
    }
    
    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-700">Gestione Finanziaria</h2>
            <Card>
                <div className="p-4 border-b border-slate-200">
                    <div className="flex space-x-2">
                        <TabButton label="Pagamenti" isActive={activeTab === 'payments'} onClick={() => setActiveTab('payments')} />
                        <TabButton label="Costi" isActive={activeTab === 'costs'} onClick={() => setActiveTab('costs')} />
                        <TabButton label="Preventivi" isActive={activeTab === 'quotes'} onClick={() => setActiveTab('quotes')} />
                        <TabButton label="Fatture" isActive={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} />
                    </div>
                </div>
                <CardContent>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-800 capitalize">{activeTab.replace('_', ' ')}</h3>
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

            <Modal isOpen={isPotentialClientModalOpen} onClose={() => setIsPotentialClientModalOpen(false)} title="Aggiungi Cliente Potenziale al Preventivo">
                <form id="potential-client-form" onSubmit={handleSavePotentialClient} className="space-y-4" noValidate>
                    <Select 
                        id="clientType"
                        label="Tipo Cliente"
                        options={[
                            { value: 'persona fisica', label: 'Persona Fisica' },
                            { value: 'persona giuridica', label: 'Persona Giuridica' }
                        ]}
                        value={potentialClientFormData.clientType || 'persona fisica'}
                        onChange={e => {
                            const newType = e.target.value as 'persona fisica' | 'persona giuridica';
                            setPotentialClientFormData({ clientType: newType });
                            setPotentialClientErrors({});
                        }}
                        required
                    />

                    {potentialClientFormData.clientType === 'persona giuridica' ? (
                        <>
                            <Input id="companyName" label="Ragione Sociale" type="text" value={potentialClientFormData.companyName || ''} onChange={handlePotentialClientChange} error={potentialClientErrors.companyName} required />
                            <Input id="vatNumber" label="Partita IVA" type="text" value={potentialClientFormData.vatNumber || ''} onChange={handlePotentialClientChange} error={potentialClientErrors.vatNumber} required />
                        </>
                    ) : (
                        <>
                            <Input id="name" label="Nome" type="text" value={potentialClientFormData.name || ''} onChange={handlePotentialClientChange} error={potentialClientErrors.name} required />
                            <Input id="surname" label="Cognome" type="text" value={potentialClientFormData.surname || ''} onChange={handlePotentialClientChange} error={potentialClientErrors.surname} required />
                            <Input id="taxCode" label="Codice Fiscale" type="text" value={potentialClientFormData.taxCode || ''} onChange={handlePotentialClientChange} />
                        </>
                    )}

                    <Input id="email" label="Email" type="email" value={potentialClientFormData.email || ''} onChange={handlePotentialClientChange} error={potentialClientErrors.email} required />
                    <Input id="phone" label="Telefono" type="tel" value={potentialClientFormData.phone || ''} onChange={handlePotentialClientChange} />
                    <Input id="address" label="Indirizzo" type="text" value={potentialClientFormData.address || ''} onChange={handlePotentialClientChange} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input id="zipCode" label="CAP" type="text" value={potentialClientFormData.zipCode || ''} onChange={handlePotentialClientChange} />
                        <Input id="city" label="Città" type="text" value={potentialClientFormData.city || ''} onChange={handlePotentialClientChange} />
                        <Input id="province" label="Provincia" type="text" value={potentialClientFormData.province || ''} onChange={handlePotentialClientChange} />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => setIsPotentialClientModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Annulla</button>
                        <button type="submit" form="potential-client-form" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Aggiungi Cliente</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
};


const List = <T extends {id: string}>({ items, renderItem, onEdit, onDelete, onDownload }: { items: T[], renderItem: (item: T) => React.ReactNode, onEdit: (item: T) => void, onDelete: (id: string) => void, onDownload?: (item: T) => void }) => (
    <ul className="space-y-3">
        {items.map((item) => (
            <FinanceListItem 
                key={item.id}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item.id)}
                onDownload={onDownload ? () => onDownload(item) : undefined}
            >
                {renderItem(item)}
            </FinanceListItem>
        ))}
        {items.length === 0 && <p className="text-center text-slate-500 py-4">Nessun elemento da visualizzare.</p>}
    </ul>
);

export default FinanceView;
