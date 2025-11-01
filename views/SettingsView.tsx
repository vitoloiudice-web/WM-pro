import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import { PlusIcon, PencilIcon, TrashIcon, DocumentArrowDownIcon, StarIcon } from '../components/icons/HeroIcons';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import type { CompanyProfile, ReminderSetting, ErrorLog, Parent, Campaign, CustomInscriptionType } from '../types';

interface SettingsViewProps {
    companyProfile: CompanyProfile;
    setCompanyProfile: (profile: CompanyProfile) => void;
    reminderSettings: ReminderSetting[];
    addReminderSetting: (item: Omit<ReminderSetting, 'id'>) => Promise<void>;
    updateReminderSetting: (id: string, updates: Partial<ReminderSetting>) => Promise<void>;
    removeReminderSetting: (id: string) => Promise<void>;
    errorLogs: ErrorLog[];
    parents: Parent[];
    campaigns: Campaign[];
    inscriptionTypes: CustomInscriptionType[];
    addInscriptionType: (item: Omit<CustomInscriptionType, 'id'>) => Promise<any>;
    updateInscriptionType: (id: string, updates: Partial<CustomInscriptionType>) => Promise<void>;
    removeInscriptionType: (id: string) => Promise<void>;
}

type SettingsTab = 'inscriptionTypes' | 'rating' | 'status'| 'reminders' | 'messaging' | 'debug';

const SettingsView = ({
    companyProfile, setCompanyProfile,
    reminderSettings, addReminderSetting, updateReminderSetting, removeReminderSetting,
    errorLogs,
    parents,
    campaigns,
    inscriptionTypes, addInscriptionType, updateInscriptionType, removeInscriptionType
}: SettingsViewProps) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('inscriptionTypes');

    // State for Company Profile
    const [settingsFormData, setSettingsFormData] = useState<CompanyProfile>(companyProfile);
    useEffect(() => { setSettingsFormData(companyProfile); }, [companyProfile]);

    // State for Inscription Types
    const [inscriptionTypeModalOpen, setInscriptionTypeModalOpen] = useState(false);
    const [editingInscriptionType, setEditingInscriptionType] = useState<CustomInscriptionType | null>(null);
    const [inscriptionTypeFormData, setInscriptionTypeFormData] = useState<Partial<CustomInscriptionType>>({});
    const [deletingInscriptionTypeId, setDeletingInscriptionTypeId] = useState<string | null>(null);

    // State for Reminders
    const [reminderModalOpen, setReminderModalOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<ReminderSetting | null>(null);
    const [reminderFormData, setReminderFormData] = useState<Partial<ReminderSetting>>({});
    
    // State for Messaging
    const [messagingModalOpen, setMessagingModalOpen] = useState(false);
    const [messageData, setMessageData] = useState({ type: 'email', recipients: [] as string[], campaignId: '', subject: '', body: '', useTemplate: 'template' });

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        setCompanyProfile(settingsFormData);
        alert('Profilo azienda salvato!');
    };
    
    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        // FIX: Use e.currentTarget for better type safety.
        setSettingsFormData({ ...settingsFormData, [e.currentTarget.id]: e.currentTarget.value });
    };

    const handleSaveInscriptionType = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            name: inscriptionTypeFormData.name!,
            durationMonths: Number(inscriptionTypeFormData.durationMonths) || 0,
            price: Number(inscriptionTypeFormData.price) || 0,
            numberOfTimeslots: Number(inscriptionTypeFormData.numberOfTimeslots) || 0,
        };
        if (editingInscriptionType) {
            await updateInscriptionType(editingInscriptionType.id, dataToSave);
        } else {
            await addInscriptionType(dataToSave);
        }
        setInscriptionTypeModalOpen(false);
    };

    const handleConfirmDeleteInscriptionType = async () => {
        if (deletingInscriptionTypeId) {
            await removeInscriptionType(deletingInscriptionTypeId);
            setDeletingInscriptionTypeId(null);
        }
    };

    const handleSaveReminder = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            name: reminderFormData.name || 'Nuovo Reminder',
            preWarningDays: Number(reminderFormData.preWarningDays) || 7,
            cadence: Number(reminderFormData.cadence) || 1,
            enabled: reminderFormData.enabled !== undefined ? reminderFormData.enabled : true,
        };
        if (editingReminder) {
            await updateReminderSetting(editingReminder.id, dataToSave);
        } else {
            await addReminderSetting(dataToSave);
        }
        setReminderModalOpen(false);
        setEditingReminder(null);
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        // This is a simulation. In a real app, this would trigger an API call.
        console.log("--- SIMULAZIONE INVIO MESSAGGIO ---");
        console.log("Tipo:", messageData.type);
        console.log("Da:", messageData.type === 'email' ? companyProfile.email : companyProfile.phone);
        console.log("A:", messageData.recipients.map(id => parents.find(p=>p.id === id)?.email || 'N/D'));
        console.log("Oggetto:", messageData.subject);
        console.log("Corpo:", messageData.body);
        console.log("Firma:", companyProfile.companyName);
        console.log("------------------------------------");
        alert("Messaggio inviato (simulazione). Controlla la console del browser per i dettagli.");
        setMessagingModalOpen(false);
    };
    
    useEffect(() => {
        if (messageData.campaignId) {
            const selectedCampaign = campaigns.find(c => c.id === messageData.campaignId);
            if (selectedCampaign) {
                setMessageData(prev => ({ ...prev, subject: selectedCampaign.subject, body: selectedCampaign.body }));
            }
        }
    }, [messageData.campaignId, campaigns]);
    
    const downloadErrorLog = () => {
        if (errorLogs.length === 0) {
            alert("Nessun errore da esportare.");
            return;
        }
        const headers = ['Timestamp', 'Error', 'Component Stack'];
        const rows = errorLogs.map(log => [
            `"${log.timestamp}"`,
            `"${log.error.replace(/"/g, '""')}"`,
            `"${(log.componentStack || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ]);

        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\r\n" 
            + rows.join("\r\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "error_log.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const TabButton = ({ label, id }: { label: string, id: SettingsTab }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === id ? 'bg-bottone-azione text-white' : 'text-testo-input/90 hover:bg-white/30'
            }`}
        >
            {label}
        </button>
    );

    const renderSettingsContent = () => {
        switch (activeTab) {
            case 'inscriptionTypes': return (
                <>
                    <CardHeader actions={<button onClick={() => { setEditingInscriptionType(null); setInscriptionTypeFormData({}); setInscriptionTypeModalOpen(true); }} className="text-sm text-bottone-azione hover:opacity-80 font-medium flex items-center space-x-1"><PlusIcon className="h-4 w-4" /><span>Nuovo Tipo</span></button>}>
                        Tipi Iscrizione e Prezzi
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-testo-input/80 mb-4">Gestisci i tipi di abbonamento, i prezzi e il numero di timeslot (crediti) associati.</p>
                        <ul className="space-y-2">
                            {inscriptionTypes.map(it => (
                                <li key={it.id} className="flex justify-between items-center p-3 bg-white/40 rounded-md">
                                    <div>
                                        <p className="font-semibold">{it.name}</p>
                                        <p className="text-xs text-testo-input/80">
                                            Timeslot: {it.numberOfTimeslots > 0 ? it.numberOfTimeslots : 'Manuale'} | Prezzo: €{it.price}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => { setEditingInscriptionType(it); setInscriptionTypeFormData(it); setInscriptionTypeModalOpen(true); }} className="p-1.5 hover:text-bottone-azione"><PencilIcon className="h-4 w-4" /></button>
                                        <button onClick={() => setDeletingInscriptionTypeId(it.id)} className="p-1.5 hover:text-bottone-eliminazione"><TrashIcon className="h-4 w-4" /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </>
            );
            case 'rating': return (
                 <>
                    <CardHeader>Definizione Rating Clienti</CardHeader>
                    <CardContent>
                         <p className="text-sm text-testo-input/80 mb-4">Questa è una legenda per il sistema di valutazione dei clienti. Il rating viene assegnato manualmente dalla scheda del cliente.</p>
                         <ul className="space-y-3 text-sm">
                            <li className="flex items-start"><StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <strong>5 Stelle:</strong> Pagamenti puntuali, nessuna assenza.</li>
                            <li className="flex items-start"><StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <strong>4 Stelle:</strong> Pagamenti puntuali, da 1 a 3 assenze.</li>
                            <li className="flex items-start"><StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <strong>3 Stelle:</strong> Pagamenti quasi sempre puntuali, assenze da 1 in poi.</li>
                            <li className="flex items-start"><StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <strong>2 Stelle:</strong> Pagamenti randomici, assenze da 1 in poi.</li>
                            <li className="flex items-start"><StarIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" solid /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <StarIcon className="h-5 w-5 text-gray-300 mr-2 flex-shrink-0" /> <strong>1 Stella:</strong> Pagamenti in ritardo, assenze da 1 in poi.</li>
                         </ul>
                    </CardContent>
                </>
            );
            case 'status': return (
                <>
                    <CardHeader>Definizione Status Cliente</CardHeader>
                    <CardContent>
                        <p className="text-sm text-testo-input/80 mb-4">Gli status aiutano a categorizzare i clienti per una gestione più efficace. Non sono modificabili.</p>
                        <ul className="space-y-2 text-sm">
                            <li><strong className="text-status-attivo-text">Attivo:</strong> Cliente con almeno un'iscrizione confermata e non scaduta.</li>
                            <li><strong className="text-status-sospeso-text">Sospeso:</strong> Cliente che ha terminato un ciclo di iscrizioni e non ha ancora rinnovato.</li>
                             <li><strong className="text-status-cessato-text">Cessato:</strong> Cliente che ha interrotto le attività e non si prevede che torni.</li>
                            <li><strong className="text-status-prospect-text">Prospect:</strong> Cliente potenziale che ha mostrato interesse ma non si è ancora iscritto.</li>
                        </ul>
                    </CardContent>
                </>
            );
            case 'reminders': return (
                <>
                     <CardHeader actions={<button onClick={() => { setEditingReminder(null); setReminderFormData({}); setReminderModalOpen(true); }} className="text-sm text-bottone-azione hover:opacity-80 font-medium flex items-center space-x-1"><PlusIcon className="h-4 w-4" /><span>Nuova Regola</span></button>}>
                        Impostazioni Reminder
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-testo-input/80 mb-4">Configura le regole per i promemoria automatici (funzionalità in sviluppo).</p>
                        {reminderSettings.map(r => (
                            <div key={r.id} className="flex justify-between items-center p-2 bg-white/30 rounded">
                                <span>{r.name} - Preavviso: {r.preWarningDays} giorni, Cadenza: {r.cadence} giorni</span>
                                <button onClick={() => { setEditingReminder(r); setReminderFormData(r); setReminderModalOpen(true); }}><PencilIcon className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </CardContent>
                </>
            );
            case 'messaging': return (
                <>
                    <CardHeader>Centro Messaggistica</CardHeader>
                    <CardContent>
                        <p className="text-sm text-testo-input/80 mb-4">Invia comunicazioni a clienti singoli o multipli (l'invio è simulato).</p>
                        <div className="flex justify-center">
                            <button onClick={() => setMessagingModalOpen(true)} className="px-6 py-3 bg-bottone-azione text-white rounded-md hover:opacity-90">Componi Nuovo Messaggio</button>
                        </div>
                    </CardContent>
                </>
            );
            case 'debug': return (
                <>
                    <CardHeader actions={<button onClick={downloadErrorLog} className="text-sm text-bottone-azione hover:opacity-80 font-medium flex items-center space-x-1"><DocumentArrowDownIcon /><span>Esporta CSV</span></button>}>
                        Log Errori Applicazione
                    </CardHeader>
                    <CardContent>
                         <p className="text-sm text-testo-input/80 mb-4">Questa sezione registra automaticamente gli errori che si verificano per facilitare la risoluzione dei problemi.</p>
                         <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Errore</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {errorLogs.length > 0 ? errorLogs.map((log, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 font-mono">{new Date(log.timestamp).toLocaleString('it-IT')}</td>
                                            <td className="px-4 py-2 text-xs text-gray-700">
                                                <details>
                                                    <summary className="cursor-pointer">{log.error}</summary>
                                                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap"><code>{log.componentStack}</code></pre>
                                                </details>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={2} className="text-center py-4 text-sm text-gray-500">Nessun errore registrato.</td></tr>
                                    )}
                                </tbody>
                            </table>
                         </div>
                    </CardContent>
                </>
            );
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-testo-input">Impostazioni</h2>

            <Card>
                <CardHeader>Azienda</CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveSettings} className="space-y-4" noValidate>
                        <p className="text-sm text-testo-input/90">
                            Queste informazioni verranno utilizzate per generare preventivi, fatture e come mittente predefinito per le comunicazioni.
                        </p>
                        <Input id="companyName" label="Nome Attività" type="text" value={settingsFormData.companyName || ''} onChange={handleSettingsChange} required autoComplete="organization" />
                        <Input id="vatNumber" label="Partita IVA / C.F." type="text" value={settingsFormData.vatNumber || ''} onChange={handleSettingsChange} required autoComplete="off" />
                        <Input id="address" label="Indirizzo Completo" type="text" value={settingsFormData.address || ''} onChange={handleSettingsChange} required autoComplete="street-address" />
                        <Input id="email" label="Email" type="email" value={settingsFormData.email || ''} onChange={handleSettingsChange} required autoComplete="email" />
                        <Input id="phone" label="Telefono / Cellulare (per WhatsApp)" type="tel" value={settingsFormData.phone || ''} onChange={handleSettingsChange} autoComplete="tel" />
                        <div>
                            <label htmlFor="taxRegime" className="block text-sm font-medium text-testo-input mb-1">Note Fiscali / Regime</label>
                            <textarea id="taxRegime" value={settingsFormData.taxRegime || ''} onChange={handleSettingsChange} rows={4} className="block w-full rounded-md border-black/20 bg-white text-testo-input shadow-sm focus:border-bottone-azione focus:ring-bottone-azione sm:text-sm" placeholder="Es: Operazione in regime forfettario..." />
                        </div>
                        <div className="flex justify-end pt-4">
                            <button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva Profilo</button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="flex flex-wrap gap-2 border-b border-black/10 p-4">
                        <TabButton id="inscriptionTypes" label="Tipi Iscrizione" />
                        <TabButton id="rating" label="Rating Clienti" />
                        <TabButton id="status" label="Status Clienti" />
                        <TabButton id="reminders" label="Reminder" />
                        <TabButton id="messaging" label="Messaggistica" />
                        <TabButton id="debug" label="Debug" />
                    </div>
                    <div className="p-4 sm:p-6">
                         {renderSettingsContent()}
                    </div>
                </CardContent>
            </Card>

            {/* Inscription Type Modal */}
            <Modal isOpen={inscriptionTypeModalOpen} onClose={() => setInscriptionTypeModalOpen(false)} title={editingInscriptionType ? 'Modifica Tipo Iscrizione' : 'Nuovo Tipo Iscrizione'}>
                <form onSubmit={handleSaveInscriptionType} className="space-y-4">
                    {/* FIX: Explicitly typed event parameter and used currentTarget for type safety. */}
                    <Input id="name" label="Nome del Tipo" value={inscriptionTypeFormData.name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInscriptionTypeFormData({ ...inscriptionTypeFormData, name: e.currentTarget.value })} required />
                    {/* FIX: Explicitly typed event parameter and used currentTarget for type safety. */}
                    <Input id="price" label="Prezzo (€)" type="number" step="0.01" value={inscriptionTypeFormData.price || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInscriptionTypeFormData({ ...inscriptionTypeFormData, price: Number(e.currentTarget.value) })} required />
                    {/* FIX: Explicitly typed event parameter and used currentTarget for type safety. */}
                    <Input id="numberOfTimeslots" label="Numero Timeslot / Crediti" type="number" value={inscriptionTypeFormData.numberOfTimeslots || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInscriptionTypeFormData({ ...inscriptionTypeFormData, numberOfTimeslots: Number(e.currentTarget.value) })} required />
                     <p className="text-xs text-testo-input/70 -mt-2">Imposta a 0 per tipi come 'Campus' o 'Scolastico' dove i timeslot non sono contati singolarmente.</p>
                    {/* FIX: Explicitly typed event parameter and used currentTarget for type safety. */}
                    <Input id="durationMonths" label="Durata (mesi)" type="number" value={inscriptionTypeFormData.durationMonths || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInscriptionTypeFormData({ ...inscriptionTypeFormData, durationMonths: Number(e.currentTarget.value) })} required />
                    <p className="text-xs text-testo-input/70 -mt-2">Usa 0 per eventi singoli che non hanno una scadenza basata su mesi (es. Open Day).</p>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-black/10">
                        <button type="button" onClick={() => setInscriptionTypeModalOpen(false)} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md">Salva</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={!!deletingInscriptionTypeId}
                onClose={() => setDeletingInscriptionTypeId(null)}
                onConfirm={handleConfirmDeleteInscriptionType}
                title="Conferma Eliminazione"
            >
                <p>Sei sicuro di voler eliminare questo tipo di iscrizione? L'azione non può essere annullata.</p>
            </ConfirmModal>

            {/* Reminder Modal */}
            <Modal isOpen={reminderModalOpen} onClose={() => setReminderModalOpen(false)} title={editingReminder ? 'Modifica Regola Reminder' : 'Nuova Regola Reminder'}>
                 <form onSubmit={handleSaveReminder} className="space-y-4">
                    {/* FIX: Used currentTarget for better type safety. */}
                    <Input id="name" label="Nome Regola" value={reminderFormData.name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderFormData({...reminderFormData, name: e.currentTarget.value})} required />
                    {/* FIX: Used currentTarget for better type safety. */}
                    <Input id="preWarningDays" label="Giorni di Preavviso" type="number" value={reminderFormData.preWarningDays || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderFormData({...reminderFormData, preWarningDays: Number(e.currentTarget.value)})} required />
                    {/* FIX: Used currentTarget for better type safety. */}
                    <Input id="cadence" label="Cadenza (ogni quanti giorni)" type="number" value={reminderFormData.cadence || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderFormData({...reminderFormData, cadence: Number(e.currentTarget.value)})} required />
                    <div className="flex justify-end space-x-3 pt-4"><button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md">Salva</button></div>
                </form>
            </Modal>
            
            {/* Messaging Modal */}
            <Modal isOpen={messagingModalOpen} onClose={() => setMessagingModalOpen(false)} title="Componi Messaggio">
                 <form onSubmit={handleSendMessage} className="space-y-4">
                    {/* FIX: Used currentTarget for better type safety. */}
                    <Select id="type" label="Tipo Messaggio" options={[{value: 'email', label: 'Email'}, {value: 'whatsapp', label: 'WhatsApp'}]} value={messageData.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageData({...messageData, type: e.currentTarget.value})} />
                    <div>
                        <label className="block text-sm font-medium text-testo-input mb-1">Destinatari</label>
                        {/* FIX: Used currentTarget for better type safety. */}
                        <select multiple value={messageData.recipients} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageData({...messageData, recipients: Array.from(e.currentTarget.selectedOptions, option => option.value)})} className="h-40 w-full border border-gray-300 rounded-md">
                            {parents.map(p => <option key={p.id} value={p.id}>{p.clientType === 'persona giuridica' ? p.companyName : `${p.name} ${p.surname}`}</option>)}
                        </select>
                    </div>
                    {/* FIX: Used currentTarget for better type safety to resolve "Property 'value' does not exist on type 'unknown'" error. */}
                    <Select id="useTemplate" label="Corpo del Messaggio" options={[{value: 'template', label: 'Usa Modello Campagna'}, {value: 'free', label: 'Testo Libero'}]} value={messageData.useTemplate} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageData({...messageData, useTemplate: e.currentTarget.value})} />
                    
                    {messageData.useTemplate === 'template' ? (
                        // FIX: Used currentTarget for better type safety.
                        <Select id="campaignId" label="Modello" options={campaigns.map(c => ({value: c.id, label: `(${c.type}) ${c.name}`}))} value={messageData.campaignId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageData({...messageData, campaignId: e.currentTarget.value})} />
                    ) : (
                        <>
                            {/* FIX: Used currentTarget for better type safety. */}
                            <Input id="subject" label="Oggetto" value={messageData.subject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageData({...messageData, subject: e.currentTarget.value})} />
                            {/* FIX: Used currentTarget for better type safety. */}
                            <textarea id="body" rows={6} value={messageData.body} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageData({...messageData, body: e.currentTarget.value})} className="w-full border border-gray-300 rounded-md p-2"></textarea>
                        </>
                    )}
                    
                    <div className="p-2 bg-gray-100 text-xs rounded">
                        <p><strong>Anteprima Corpo:</strong></p>
                        <p className="whitespace-pre-wrap">{messageData.body}</p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4"><button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md">Invia (Simulazione)</button></div>
                </form>
            </Modal>
        </div>
    );
};

export default SettingsView;