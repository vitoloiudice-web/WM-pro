import React from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import { PlusIcon, ArrowUpRightIcon } from '../components/icons/HeroIcons';
import type { View, Workshop, Parent, Payment, Registration, Location } from '../types';

interface DashboardViewProps {
  firestoreStatus: 'connecting' | 'connected' | 'error';
  workshops: Workshop[];
  parents: Parent[];
  payments: Payment[];
  registrations: Registration[];
  locations: Location[];
  addParent: (parent: Omit<Parent, 'id'>) => Promise<void>;
  setCurrentView: (view: View) => void;
}

const StatCard = ({ title, value, actionLabel, onAction }: { title: string, value: string | number, actionLabel?: string, onAction?: () => void }) => (
    <Card>
        <CardContent>
            <p className="text-sm font-medium text-testo-input/80 truncate">{title}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-testo-input">{value}</p>
            {actionLabel && onAction && (
                 <button onClick={onAction} className="mt-4 text-sm font-semibold text-bottone-azione hover:opacity-80 flex items-center space-x-1">
                    <span>{actionLabel}</span>
                    <ArrowUpRightIcon className="h-4 w-4" />
                </button>
            )}
        </CardContent>
    </Card>
);


const DashboardView = ({ 
    firestoreStatus, 
    workshops, 
    parents, 
    payments,
    registrations,
    locations,
    addParent,
    setCurrentView
}: DashboardViewProps) => {

    const activeClients = parents.filter(p => p.status === 'attivo').length;
    
    const { monthlyIncome, monthlyRegistrations } = React.useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const income = payments
            .filter(p => {
                const paymentDate = new Date(p.paymentDate);
                return paymentDate >= startOfMonth && paymentDate <= endOfMonth;
            })
            .reduce((sum, p) => sum + p.amount, 0);
        
        const regs = registrations.filter(r => {
             const regDate = new Date(r.registrationDate);
             return r.status === 'confermata' && regDate >= startOfMonth && regDate <= endOfMonth;
        }).length;

        return { monthlyIncome: income, monthlyRegistrations: regs };
    }, [payments, registrations]);
    
    const getFirestoreStatusChip = () => {
        switch (firestoreStatus) {
            case 'connected':
                return <span className="px-2 py-1 text-xs font-medium bg-status-attivo-bg text-status-attivo-text rounded-full">Connesso</span>;
            case 'connecting':
                return <span className="px-2 py-1 text-xs font-medium bg-status-sospeso-bg text-status-sospeso-text rounded-full">In connessione...</span>;
            case 'error':
                return <span className="px-2 py-1 text-xs font-medium bg-status-cessato-bg text-status-cessato-text rounded-full">Errore</span>;
        }
    }

    return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-testo-input">Dashboard</h2>
            <span className="hidden sm:block">
                 <button onClick={() => setCurrentView('clients')} className="bg-bottone-azione text-white px-4 py-2 rounded-full shadow hover:opacity-90 flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bottone-azione">
                    <PlusIcon /><span>Nuovo Cliente</span>
                </button>
            </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Clienti Attivi" value={activeClients} actionLabel="Vai ai Clienti" onAction={() => setCurrentView('clients')} />
            <StatCard title="Workshop Attivi" value={workshops.length} actionLabel="Vai ai Workshop" onAction={() => setCurrentView('workshops')} />
            <StatCard title="Iscritti del Mese" value={monthlyRegistrations} />
            <StatCard title="Incassi del Mese" value={`€ ${monthlyIncome.toFixed(2)}`} actionLabel="Vai alle Finanze" onAction={() => setCurrentView('finance')} />
        </div>

        <Card>
            <CardHeader>Stato del Sistema</CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2">
                    <span>Stato Firestore:</span> 
                    {getFirestoreStatusChip()}
                </div>
                 <p className="text-sm text-testo-input/80 mt-2">Dati caricati: {parents.length} clienti, {workshops.length} workshop, {payments.length} pagamenti.</p>
            </CardContent>
        </Card>

    </div>
    );
};

export default DashboardView;
