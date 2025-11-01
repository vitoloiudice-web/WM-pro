import React from 'react';
import type { Workshop, Location, Registration, Child, Parent } from '../types';

interface WorkshopsViewProps {
  workshops: Workshop[];
  addWorkshop: (item: Omit<Workshop, 'id'>) => Promise<any>;
  updateWorkshop: (id: string, updates: Partial<Workshop>) => Promise<void>;
  removeWorkshop: (id: string) => Promise<void>;
  locations: Location[];
  registrations: Registration[];
  children: Child[];
  parents: Parent[];
}

const WorkshopsView = (props: WorkshopsViewProps) => {
  return (
    <div>
      <h1 className="text-xl font-semibold text-testo-input">Workshops</h1>
      <p className="mt-2 text-sm text-testo-input/80">Manage your workshops here.</p>
    </div>
  );
};

export default WorkshopsView;
