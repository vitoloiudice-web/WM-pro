import React, { useState, useEffect } from 'react';
import { useCollection, useDocument } from './hooks/useFirestore.ts';
import BottomNav from './components/BottomNav.tsx';
import Sidebar from './components/Sidebar.tsx';
import DashboardView from './views/DashboardView.tsx';
import WorkshopsView from './views/WorkshopsView.tsx';
import ClientsView from './views/ClientsView.tsx';
import FinanceView from './views/FinanceView.tsx';
import LogisticsView from './views/LogisticsView.tsx';
import ReportsView from './views/ReportsView.tsx';
import type { View, Workshop, Parent, Child, Payment, OperationalCost, Quote, Invoice, Supplier, Location, Registration, CompanyProfile } from './types.ts';
import { MOCK_COMPANY_PROFILE } from './data.ts';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [firestoreStatus, setFirestoreStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // --- Centralized state management with Firebase Hooks ---
  const { data: companyProfile, loading: cpLoading, error: cpError, updateData: setCompanyProfile } = useDocument<CompanyProfile>('companyProfile', 'main', MOCK_COMPANY_PROFILE);
  const { data: workshops, loading: wsLoading, error: wsError, addItem: addWorkshop, updateItem: updateWorkshop, removeItem: removeWorkshop } = useCollection<Workshop>('workshops');
  const { data: parents, loading: paLoading, error: paError, addItem: addParent, updateItem: updateParent, removeItem: removeParent } = useCollection<Parent>('parents');
  const { data: children, loading: chLoading, error: chError, addItem: addChild, updateItem: updateChild, removeItem: removeChild } = useCollection<Child>('children');
  const { data: registrations, loading: rgLoading, error: rgError, addItem: addRegistration, removeItem: removeRegistration } = useCollection<Registration>('registrations');
  const { data: payments, loading: pyLoading, error: pyError, addItem: addPayment, updateItem: updatePayment, removeItem: removePayment } = useCollection<Payment>('payments');
  const { data: costs, loading: coLoading, error: coError, addItem: addCost, updateItem: updateCost, removeItem: removeCost } = useCollection<OperationalCost>('costs');
  const { data: quotes, loading: quLoading, error: quError, addItem: addQuote, updateItem: updateQuote, removeItem: removeQuote } = useCollection<Quote>('quotes');
  const { data: invoices, loading: inLoading, error: inError, addItem: addInvoice, updateItem: updateInvoice, removeItem: removeInvoice } = useCollection<Invoice>('invoices');
  const { data: suppliers, loading: suLoading, error: suError, addItem: addSupplier, updateItem: updateSupplier, removeItem: removeSupplier } = useCollection<Supplier>('suppliers');
  const { data: locations, loading: loLoading, error: loError, addItem: addLocation, updateItem: updateLocation, removeItem: removeLocation } = useCollection<Location>('locations');

  useEffect(() => {
    const allLoadings = [cpLoading, wsLoading, paLoading, chLoading, rgLoading, pyLoading, coLoading, quLoading, inLoading, suLoading, loLoading];
    const anyErrors = [cpError, wsError, paError, chError, rgError, pyError, coError, quError, inError, suError, loError].some(e => e);

    if (anyErrors) {
      setFirestoreStatus('error');
    } else if (allLoadings.every(loading => !loading)) {
      setFirestoreStatus('connected');
    } else {
      setFirestoreStatus('connecting');
    }
  }, [
    cpLoading, cpError, wsLoading, wsError, paLoading, paError, chLoading, chError, 
    rgLoading, rgError, pyLoading, pyError, coLoading, coError, quLoading, quError, 
    inLoading, inError, suLoading, suError, loLoading, loError
  ]);


  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView 
          firestoreStatus={firestoreStatus}
          companyProfile={companyProfile}
          setCompanyProfile={setCompanyProfile}
          workshops={workshops} 
          parents={parents} 
          payments={payments} 
          registrations={registrations}
          locations={locations}
        />;
      case 'workshops':
        return <WorkshopsView 
            workshops={workshops} 
            addWorkshop={addWorkshop}
            updateWorkshop={updateWorkshop}
            removeWorkshop={removeWorkshop} 
            locations={locations}
            registrations={registrations}
            children={children}
            parents={parents}
        />;
      case 'clients':
        return <ClientsView 
            parents={parents} 
            addParent={addParent}
            updateParent={updateParent}
            removeParent={removeParent}
            children={children} 
            addChild={addChild}
            updateChild={updateChild}
            removeChild={removeChild}
            workshops={workshops}
            registrations={registrations}
            addRegistration={addRegistration}
            removeRegistration={removeRegistration}
            payments={payments}
            addPayment={addPayment}
            locations={locations}
        />;
      case 'finance':
        return <FinanceView 
            companyProfile={companyProfile}
            payments={payments} addPayment={addPayment} updatePayment={updatePayment} removePayment={removePayment}
            costs={costs} addCost={addCost} updateCost={updateCost} removeCost={removeCost}
            quotes={quotes} addQuote={addQuote} updateQuote={updateQuote} removeQuote={removeQuote}
            invoices={invoices} addInvoice={addInvoice} updateInvoice={updateInvoice} removeInvoice={removeInvoice}
            parents={parents}
            workshops={workshops}
            locations={locations}
            suppliers={suppliers}
        />;
      case 'reports':
        return <ReportsView 
            payments={payments}
            costs={costs}
            workshops={workshops}
            suppliers={suppliers}
            locations={locations}
            registrations={registrations}
            quotes={quotes}
        />;
      case 'logistics':
        return <LogisticsView 
            suppliers={suppliers} addSupplier={addSupplier} updateSupplier={updateSupplier} removeSupplier={removeSupplier}
            locations={locations} addLocation={addLocation} updateLocation={updateLocation} removeLocation={removeLocation}
        />;
      default:
        return <DashboardView 
          firestoreStatus={firestoreStatus}
          companyProfile={companyProfile}
          setCompanyProfile={setCompanyProfile}
          workshops={workshops} 
          parents={parents} 
          payments={payments} 
          registrations={registrations}
          locations={locations}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      <div className="md:pl-64 flex flex-col">
        <header className="hidden md:block bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Workshop Manager Pro</h1>
          </div>
        </header>
        <main className="flex-grow pt-20 md:pt-0 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;