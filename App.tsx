
import React, { useState, useEffect, Suspense, lazy } from 'react';
// FIX: Updated imports to remove file extensions
import { useCollection, useDocument } from './hooks/useFirestore';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
// LAZY LOAD VIEWS FOR CODE SPLITTING
const DashboardView = lazy(() => import('./views/DashboardView'));
const WorkshopsView = lazy(() => import('./views/WorkshopsView'));
const ClientsView = lazy(() => import('./views/ClientsView'));
const FinanceView = lazy(() => import('./views/FinanceView'));
const LogisticsView = lazy(() => import('./views/LogisticsView'));
const ReportsView = lazy(() => import('./views/ReportsView').then(module => ({ default: module.ReportsView })));
const CampaignsView = lazy(() => import('./views/CampaignsView'));
const SettingsView = lazy(() => import('./views/SettingsView'));


import type { View, Workshop, Parent, Child, Payment, OperationalCost, Quote, Invoice, Supplier, Location, Registration, CompanyProfile, Campaign, ReminderSetting, ErrorLog } from './types';
import { MOCK_COMPANY_PROFILE } from './data';
import { DocumentReference } from 'firebase/firestore';

const App = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [firestoreStatus, setFirestoreStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);

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
  const { data: campaigns, loading: caLoading, error: caError, addItem: addCampaign, updateItem: updateCampaign, removeItem: removeCampaign } = useCollection<Campaign>('campaigns');
  const { data: reminderSettings, loading: rsLoading, error: rsError, addItem: addReminderSetting, updateItem: updateReminderSetting, removeItem: removeReminderSetting } = useCollection<ReminderSetting>('reminderSettings');


  useEffect(() => {
    const allLoadings = [cpLoading, wsLoading, paLoading, chLoading, rgLoading, pyLoading, coLoading, quLoading, inLoading, suLoading, loLoading, caLoading, rsLoading];
    const anyErrors = [cpError, wsError, paError, chError, rgError, pyError, coError, quError, inError, suError, loError, caError, rsError].some(e => e);

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
    inLoading, inError, suLoading, suError, loLoading, loError, caLoading, caError, rsLoading, rsError
  ]);

    // FIX: Redefined functions to properly handle Promise<DocumentReference>
    const handleAddParent = (parent: Omit<Parent, 'id'>) => addParent(parent).then(() => Promise.resolve());
    const handleAddChild = (child: Omit<Child, 'id'>) => addChild(child).then(() => Promise.resolve());
    const handleAddRegistration = (reg: Omit<Registration, 'id'>) => addRegistration(reg).then(() => Promise.resolve());
    const handleAddPayment = (payment: Omit<Payment, 'id'>) => addPayment(payment).then(() => Promise.resolve());
    const handleAddLocation = (loc: Omit<Location, 'id'>) => addLocation(loc).then(() => Promise.resolve());
    // FIX: Redefined addSupplier to correctly return the DocumentReference which contains the new ID.
    const handleAddSupplier = (supplier: Omit<Supplier, 'id'>): Promise<DocumentReference> => {
        return addSupplier(supplier);
    };

    const logError = (error: Error, componentStack: string | null) => {
        console.error("Caught by Error Boundary:", error, componentStack);
        const newLog: ErrorLog = {
            timestamp: new Date().toISOString(),
            error: error.toString(),
            componentStack: componentStack,
        };
        setErrorLogs(prev => [...prev, newLog]);
    };


  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView 
          firestoreStatus={firestoreStatus}
          workshops={workshops} 
          parents={parents} 
          payments={payments} 
          registrations={registrations}
          locations={locations}
          addParent={handleAddParent}
          setCurrentView={setCurrentView}
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
            addParent={handleAddParent}
            updateParent={updateParent}
            removeParent={removeParent}
            children={children} 
            addChild={handleAddChild}
            updateChild={updateChild}
            removeChild={removeChild}
            workshops={workshops}
            registrations={registrations}
            addRegistration={handleAddRegistration}
            removeRegistration={removeRegistration}
            payments={payments}
            addPayment={handleAddPayment}
            updatePayment={updatePayment}
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
        // FIX: Pass parents and children to ReportsView to make them available for report generation.
        return <ReportsView 
            payments={payments}
            costs={costs}
            workshops={workshops}
            suppliers={suppliers}
            locations={locations}
            registrations={registrations}
            quotes={quotes}
            parents={parents}
            children={children}
        />;
      case 'logistics':
        return <LogisticsView 
            suppliers={suppliers} addSupplier={handleAddSupplier} updateSupplier={updateSupplier} removeSupplier={removeSupplier}
            locations={locations} addLocation={handleAddLocation} updateLocation={updateLocation} removeLocation={removeLocation}
        />;
      case 'campagne':
        return <CampaignsView 
          campaigns={campaigns}
          addCampaign={addCampaign}
          updateCampaign={updateCampaign}
          removeCampaign={removeCampaign}
        />;
      case 'impostazioni':
        return <SettingsView
          companyProfile={companyProfile}
          setCompanyProfile={setCompanyProfile}
          reminderSettings={reminderSettings}
          addReminderSetting={addReminderSetting}
          updateReminderSetting={updateReminderSetting}
          removeReminderSetting={removeReminderSetting}
          errorLogs={errorLogs}
          parents={parents}
          campaigns={campaigns}
         />;
      default:
        return <DashboardView 
          firestoreStatus={firestoreStatus}
          workshops={workshops} 
          parents={parents} 
          payments={payments} 
          registrations={registrations}
          locations={locations}
          addParent={handleAddParent}
          setCurrentView={setCurrentView}
        />;
    }
  };

  const LoadingFallback = () => (
    <div className="flex justify-center items-center h-64">
        <div className="flex items-center space-x-2 text-testo-input/80">
            <svg className="animate-spin h-5 w-5 text-testo-input/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg font-medium">Caricamento...</span>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sfondo-grigio">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <BottomNav currentView={currentView} setCurrentView={setCurrentView} />
      <div className="md:pl-64 flex flex-col">
        <header className="hidden md:block bg-cards-giallo shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-testo-input tracking-tight">Workshop Manager Pro</h1>
          </div>
        </header>
        <main className="flex-grow pt-20 md:pt-0 pb-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <ErrorBoundary logError={logError}>
              <Suspense fallback={<LoadingFallback />}>
                {renderView()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;