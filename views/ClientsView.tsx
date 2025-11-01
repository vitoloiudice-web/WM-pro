import React from 'react';
import type { Parent, Child, Workshop, Registration, Payment, Location } from '../types';

interface ClientsViewProps {
    parents: Parent[];
    addParent: (parent: Omit<Parent, 'id'>) => Promise<void>;
    updateParent: (id: string, updates: Partial<Parent>) => Promise<void>;
    removeParent: (id: string) => Promise<void>;
    children: Child[];
    addChild: (child: Omit<Child, 'id'>) => Promise<void>;
    updateChild: (id: string, updates: Partial<Child>) => Promise<void>;
    removeChild: (id: string) => Promise<void>;
    workshops: Workshop[];
    registrations: Registration[];
    addRegistration: (reg: Omit<Registration, 'id'>) => Promise<void>;
    removeRegistration: (id: string) => Promise<void>;
    payments: Payment[];
    addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
    updatePayment: (id: string, updates: Partial<Payment>) => Promise<void>;
    locations: Location[];
}

const ClientsView = (props: ClientsViewProps) => {
    return (
        <div>
            <h1 className="text-xl font-semibold text-testo-input">Clients</h1>
            <p className="mt-2 text-sm text-testo-input/80">Manage your clients here.</p>
        </div>
    );
};

export default ClientsView;
