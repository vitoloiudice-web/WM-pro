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

const DashboardView = ({ firestoreStatus, workshops, parents, payments, registrations, locations, addParent, setCurrentView }: DashboardViewProps) => {
  return (
    <div>
      <h1 className="text-xl font-semibold text-testo-input">Dashboard</h1>
      <p className="mt-2 text-sm text-testo-input/80">Welcome to your workshop manager.</p>
      <div className="mt-4 p-4 bg-white rounded-lg shadow">
        <p>Firestore Status: <span className="font-semibold">{firestoreStatus}</span></p>
        <p>Loaded {workshops.length} workshops.</p>
        <p>Loaded {parents.length} parents.</p>
      </div>
    </div>
  );
};

export default DashboardView;
