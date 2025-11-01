import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import Select from '../components/Select';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/HeroIcons';
import type { CompanyProfile, Payment, OperationalCost, Quote, Invoice, Parent, Workshop, Location, Supplier } from '../types';

interface FinanceViewProps {
    companyProfile: CompanyProfile | null;
    payments: Payment[];
    addPayment: (item: Omit<Payment, 'id'>) => Promise<any>;
    updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
    removePayment: (id: string) => Promise<void>;
    costs: OperationalCost[];
    addCost: (item: Omit<OperationalCost, 'id'>) => Promise<any>;
    updateCost: (id: string, updates: Partial<OperationalCost>) => Promise<void>;
    removeCost: (id: string) => Promise<void>;
    quotes: Quote[];
    addQuote: (item: Omit<Quote, 'id'>) => Promise<any>;
    updateQuote: (id: string, updates: Partial<Quote>) => Promise<void>;
    removeQuote: (id: string) => Promise<void>;
    invoices: Invoice[];
    addInvoice: (item: Omit<Invoice, 'id'>) => Promise<any>;
    updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
    removeInvoice: (id: string) => Promise<void>;
    parents: Parent[];
    workshops: Workshop[];
    locations: Location[];
    suppliers: Supplier[];
}

type FinanceTab = 'payments' | 'costs' | 'quotes' | 'invoices';
type ModalState = 
    | { view: 'payment', mode: 'new' } | { view: 'payment', mode: 'edit', item: Payment }
    | { view: 'cost', mode: 'new' } | { view: 'cost', mode: 'edit', item: OperationalCost }
    | null;

const FinanceView = (props: FinanceViewProps) => {
    const [activeTab, setActiveTab] = useState<FinanceTab>('payments');
    const [modal, setModal] = useState<ModalState>(null);
    const [formData, setFormData] = useState<any>({});
    const [deletingItem, setDeletingItem] = useState<{type: FinanceTab, id: string} | null>(null);

    const parentMap = useMemo(() => new Map(props.parents.map(p => [p.id, `${p.name} ${p.surname}`])), [props.parents]);

    useEffect(() => {
        if (modal?.mode === 'edit') {
            setFormData(modal.item);
        } else {
            setFormData({ paymentDate: new Date().toISOString().substring(0,10), date: new Date().toISOString().substring(0,10) });
        }
    }, [modal]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modal) return;

        switch (modal.view) {
            case 'payment':
                const paymentData = {
                    ...formData,
                    amount: Number(formData.amount)
                };
                if (modal.mode === 'edit') await props.updatePayment(modal.item.id, paymentData);
                else await props.addPayment(paymentData);
                break;
            case 'cost':
                 const costData = {
                    ...formData,
                    amount: Number(formData.amount)
                };
                if (modal.mode === 'edit') await props.updateCost(modal.item.id, costData);
                else await props.addCost(costData);
                break;
        }
        setModal(null);
    };
    
    const handleConfirmDelete = async () => {
        if (!deletingItem) return;
        switch(deletingItem.type) {
            case 'payments': await props.removePayment(deletingItem.id); break;
            case 'costs': await props.removeCost(deletingItem.id); break;
            case 'quotes': await props.removeQuote(deletingItem.id); break;
            case 'invoices': await props.removeInvoice(deletingItem.id); break;
        }
        setDeletingItem(null);
    }

    const renderPayments = () => (
        <Table
            headers={['Data', 'Cliente', 'Descrizione', 'Importo', 'Metodo']}
            data={props.payments}
            renderRow={(p: Payment) => (
                <>
                    <td>{new Date(p.paymentDate).toLocaleDateString('it-IT')}</td>
                    <td>{parentMap.get(p.parentId) || 'N/D'}</td>
                    <td>{p.description}</td>
                    <td>€ {p.amount.toFixed(2)}</td>
                    <td>{p.method}</td>
                </>
            )}
            onEdit={(item) => setModal({view: 'payment', mode: 'edit', item})}
            onDelete={(id) => setDeletingItem({type: 'payments', id})}
        />
    );
    
    const renderCosts = () => (
        <Table
            headers={['Data', 'Descrizione', 'Categoria', 'Importo']}
            data={props.costs}
            renderRow={(c: OperationalCost) => (
                <>
                    <td>{new Date(c.date).toLocaleDateString('it-IT')}</td>
                    <td>{c.description}</td>
                    <td>{c.category}</td>
                    <td>€ {c.amount.toFixed(2)}</td>
                </>
            )}
            onEdit={(item) => setModal({view: 'cost', mode: 'edit', item})}
            onDelete={(id) => setDeletingItem({type: 'costs', id})}
        />
    );

    const renderModalContent = () => {
        if (!modal) return null;
        if (modal.view === 'payment') {
            return (
                <form onSubmit={handleSave} className="space-y-4">
                    <Input id="paymentDate" label="Data Pagamento" type="date" value={formData.paymentDate?.substring(0,10) || ''} onChange={e => setFormData({...formData, paymentDate: e.target.value})} required/>
                    <Select id="parentId" label="Cliente" value={formData.parentId || ''} onChange={e => setFormData({...formData, parentId: e.target.value})} options={props.parents.map(p => ({value: p.id, label: `${p.name} ${p.surname}`}))} required/>
                    <Input id="description" label="Descrizione" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} required/>
                    <Input id="amount" label="Importo" type="number" step="0.01" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} required/>
                    <Select id="method" label="Metodo" value={formData.method || ''} onChange={e => setFormData({...formData, method: e.target.value})} options={[{value: 'bonifico', label: 'Bonifico'}, {value: 'contanti', label: 'Contanti'}, {value: 'carta', label: 'Carta'}]} required/>
                    <div className="flex justify-end space-x-3 pt-4"><button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md">Salva</button></div>
                </form>
            );
        }
        if (modal.view === 'cost') {
             return (
                <form onSubmit={handleSave} className="space-y-4">
                    <Input id="date" label="Data" type="date" value={formData.date?.substring(0,10) || ''} onChange={e => setFormData({...formData, date: e.target.value})} required/>
                    <Input id="description" label="Descrizione" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} required/>
                    <Select id="category" label="Categoria" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} options={[{value: 'materiali', label: 'Materiali'}, {value: 'affitto', label: 'Affitto'}, {value: 'stipendi', label: 'Stipendi'}, {value: 'marketing', label: 'Marketing'}, {value: 'altro', label: 'Altro'}]} required/>
                    <Input id="amount" label="Importo" type="number" step="0.01" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} required/>
                    <div className="flex justify-end space-x-3 pt-4"><button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md">Salva</button></div>
                </form>
            );
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-testo-input">Finanze</h2>
            <Card>
                <CardContent>
                    <div className="flex space-x-2 border-b border-black/10 pb-4 mb-4">
                        <TabButton id="payments" label="Pagamenti" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="costs" label="Costi" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="quotes" label="Preventivi" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton id="invoices" label="Fatture" activeTab={activeTab} setActiveTab={setActiveTab} />
                    </div>

                    <div className="flex justify-end mb-4">
                       {activeTab !== 'quotes' && activeTab !== 'invoices' && (
                         <button onClick={() => setModal({view: activeTab.slice(0, -1) as 'payment' | 'cost', mode: 'new'})} className="bg-bottone-azione text-white px-3 py-1.5 rounded-full shadow hover:opacity-90 flex items-center space-x-2 text-sm">
                            <PlusIcon className="h-4 w-4" /><span>Aggiungi</span>
                        </button>
                       )}
                    </div>
                    
                    {activeTab === 'payments' && renderPayments()}
                    {activeTab === 'costs' && renderCosts()}
                    {(activeTab === 'quotes' || activeTab === 'invoices') && <p className="text-center text-sm text-testo-input/80 py-8">Funzionalità in sviluppo.</p>}

                </CardContent>
            </Card>

            <Modal isOpen={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'new' ? 'Nuovo' : 'Modifica'}>
                {renderModalContent()}
            </Modal>
            
            <ConfirmModal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)} onConfirm={handleConfirmDelete} title="Conferma Eliminazione">
                <p>Sei sicuro di voler eliminare questo elemento?</p>
            </ConfirmModal>

        </div>
    );
};

const TabButton = ({ id, label, activeTab, setActiveTab }: { id: FinanceTab, label: string, activeTab: FinanceTab, setActiveTab: (tab: FinanceTab) => void }) => (
    <button onClick={() => setActiveTab(id)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === id ? 'bg-bottone-azione text-white' : 'hover:bg-gray-100'}`}>
        {label}
    </button>
);

const Table = ({ headers, data, renderRow, onEdit, onDelete }: { headers: string[], data: any[], renderRow: (item: any) => React.ReactNode, onEdit: (item: any) => void, onDelete: (id: string) => void}) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    {headers.map(h => <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}
                    <th className="px-4 py-2"></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {data.map(item => (
                    <tr key={item.id}>
                        {renderRow(item)}
                        <td className="text-right">
                            <button onClick={() => onEdit(item)} className="p-1"><PencilIcon className="h-4 w-4"/></button>
                            <button onClick={() => onDelete(item.id)} className="p-1"><TrashIcon className="h-4 w-4"/></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


export default FinanceView;