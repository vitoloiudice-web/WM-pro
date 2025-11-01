import React from 'react';
import type { Payment, OperationalCost, Workshop, Supplier, Location, Registration, Quote } from '../types';

interface ReportsViewProps {
    payments: Payment[];
    costs: OperationalCost[];
    workshops: Workshop[];
    suppliers: Supplier[];
    locations: Location[];
    registrations: Registration[];
    quotes: Quote[];
}

export const ReportsView = (props: ReportsViewProps) => {
    return (
        <div>
            <h1 className="text-xl font-semibold text-testo-input">Reports</h1>
            <p className="mt-2 text-sm text-testo-input/80">View your reports here.</p>
        </div>
    );
};
