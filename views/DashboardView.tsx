// FIX: Created file to define the component and resolve "file not a module" error.
import React from 'react';
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

const DashboardView = ({ firestoreStatus, workshops, parents }: DashboardViewProps) => {
  return (
    <div>
      <h1 className="text-xl font-semibold text-testo-input">Dashboard</h1>
      <p>Firestore Status: {firestoreStatus}</p>
      <p>Workshops: {workshops.length}</p>
      <p>Clients: {parents.length}</p>
    </div>
  );
};

export default DashboardView;
