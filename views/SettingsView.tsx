import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import { PlusIcon, PencilIcon, TrashIcon, DocumentArrowDownIcon } from '../components/icons/HeroIcons';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import type { CompanyProfile, ReminderSetting, ErrorLog, Parent, Campaign } from '../types';

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
}

type SettingsTab = 'config' | 'reminders' | 'messaging' | 'debug';

const SettingsView = ({
    companyProfile, setCompanyProfile,
    reminderSettings, addReminderSetting, updateReminderSetting, removeReminderSetting,
    errorLogs,
    parents,
    campaigns
}: SettingsViewProps) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('config');

    // State for Company Profile
    const [settingsFormData, setSettingsFormData] = useState<CompanyProfile>(companyProfile);
    useEffect(() => { setSettingsFormData(companyProfile); }, [companyProfile]);

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
        setSettingsFormData({ ...settingsFormData, [e.target.id]: e.target.value });
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

    const renderContent = () => {
        switch (activeTab) {
            case 'config': return (
                <Card>
                    <CardHeader>Profilo Azienda</CardHeader>
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
            );
            case 'reminders': return (
                <Card>
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
                </Card>
            );
            case 'messaging': return (
                <Card>
                    <CardHeader>Centro Messaggistica</CardHeader>
                    <CardContent>
                        <p className="text-sm text-testo-input/80 mb-4">Invia comunicazioni a clienti singoli o multipli (l'invio è simulato).</p>
                        <div className="flex justify-center">
                            <button onClick={() => setMessagingModalOpen(true)} className="px-6 py-3 bg-bottone-azione text-white rounded-md hover:opacity-90">Componi Nuovo Messaggio</button>
                        </div>
                    </CardContent>
                </Card>
            );
            case 'debug': return (
                <Card>
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
                </Card>
            );
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-testo-input">Impostazioni</h2>

            <Card>
                <CardContent>
                    <div className="flex space-x-2 border-b border-black/10 pb-4 mb-4">
                        <TabButton id="config" label="Configurazione" />
                        <TabButton id="reminders" label="Reminder" />
                        <TabButton id="messaging" label="Messaggistica" />
                        <TabButton id="debug" label="Debug" />
                    </div>
                    {renderContent()}
                </CardContent>
            </Card>

            {/* Reminder Modal */}
            <Modal isOpen={reminderModalOpen} onClose={() => setReminderModalOpen(false)} title={editingReminder ? 'Modifica Regola Reminder' : 'Nuova Regola Reminder'}>
                 <form onSubmit={handleSaveReminder} className="space-y-4">
                    <Input id="name" label="Nome Regola" value={reminderFormData.name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderFormData({...reminderFormData, name: e.target.value})} required />
                    <Input id="preWarningDays" label="Giorni di Preavviso" type="number" value={reminderFormData.preWarningDays || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderFormData({...reminderFormData, preWarningDays: Number(e.target.value)})} required />
                    <Input id="cadence" label="Cadenza (ogni quanti giorni)" type="number" value={reminderFormData.cadence || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderFormData({...reminderFormData, cadence: Number(e.target.value)})} required />
                    <div className="flex justify-end space-x-3 pt-4"><button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md">Salva</button></div>
                </form>
            </Modal>
            
            {/* Messaging Modal */}
            <Modal isOpen={messagingModalOpen} onClose={() => setMessagingModalOpen(false)} title="Componi Messaggio">
                 <form onSubmit={handleSendMessage} className="space-y-4">
                    {/* FIX: Explicitly typed the event parameter 'e' and used e.currentTarget to resolve the "Property 'value' does not exist on type 'unknown'" error. */}
                    <Select id="type" label="Tipo Messaggio" options={[{value: 'email', label: 'Email'}, {value: 'whatsapp', label: 'WhatsApp'}]} value={messageData.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageData({...messageData, type: e.currentTarget.value})} />
                    <div>
                        <label className="block text-sm font-medium text-testo-input mb-1">Destinatari</label>
                        {/* FIX: Explicitly typed the event parameter 'e' to resolve potential type errors. */}
                        <select multiple value={messageData.recipients} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageData({...messageData, recipients: Array.from(e.currentTarget.selectedOptions, option => option.value)})} className="h-40 w-full border border-gray-300 rounded-md">
                            {parents.map(p => <option key={p.id} value={p.id}>{p.clientType === 'persona giuridica' ? p.companyName : `${p.name} ${p.surname}`}</option>)}
                        </select>
                    </div>
                    {/* FIX: Explicitly typed the event parameter 'e' and used e.currentTarget to resolve the "Property 'value' does not exist on type 'unknown'" error. */}
                    <Select id="useTemplate" label="Corpo del Messaggio" options={[{value: 'template', label: 'Usa Modello Campagna'}, {value: 'free', label: 'Testo Libero'}]} value={messageData.useTemplate} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageData({...messageData, useTemplate: e.currentTarget.value})} />
                    
                    {messageData.useTemplate === 'template' ? (
                        // FIX: Explicitly typed the event parameter 'e' to resolve the "Property 'value' does not exist on type 'unknown'" error.
                        <Select id="campaignId" label="Modello" options={campaigns.map(c => ({value: c.id, label: `(${c.type}) ${c.name}`}))} value={messageData.campaignId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMessageData({...messageData, campaignId: e.currentTarget.value})} />
                    ) : (
                        <>
                            {/* FIX: Explicitly typed the event parameter 'e' to resolve potential type errors. */}
                            <Input id="subject" label="Oggetto" value={messageData.subject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessageData({...messageData, subject: e.currentTarget.value})} />
                            {/* FIX: Explicitly typed the event parameter 'e' to resolve potential type errors. */}
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
