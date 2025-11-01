import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/HeroIcons';
import Modal from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import type { Campaign } from '../types';

interface CampaignsViewProps {
    campaigns: Campaign[];
    addCampaign: (item: Omit<Campaign, 'id'>) => Promise<void>;
    updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
    removeCampaign: (id: string) => Promise<void>;
}

type ModalState =
    | { mode: 'new', type: 'sollecito' | 'sviluppo' }
    | { mode: 'edit', campaign: Campaign }
    | null;

const CampaignsView = ({
    campaigns, addCampaign, updateCampaign, removeCampaign
}: CampaignsViewProps) => {
    const [modalState, setModalState] = useState<ModalState>(null);
    const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Campaign>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const sollecitoCampaigns = campaigns.filter(c => c.type === 'sollecito');
    const sviluppoCampaigns = campaigns.filter(c => c.type === 'sviluppo');
    
    useEffect(() => {
        if (modalState?.mode === 'edit') {
            setFormData(modalState.campaign);
        } else if (modalState?.mode === 'new') {
            setFormData({ type: modalState.type });
        } else {
            setFormData({});
        }
        setErrors({});
    }, [modalState]);
    
    const closeModal = () => setModalState(null);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name?.trim()) newErrors.name = 'Il nome del modello è obbligatorio.';
        if (!formData.subject?.trim()) newErrors.subject = "L'oggetto è obbligatorio.";
        if (!formData.body?.trim()) newErrors.body = 'Il corpo del messaggio è obbligatorio.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        
        const dataToSave: Omit<Campaign, 'id'> = {
            name: formData.name!,
            type: formData.type!,
            subject: formData.subject!,
            body: formData.body!,
            targetStatus: formData.type === 'sviluppo' ? ['prospect', 'sospeso'] : undefined
        };

        if (modalState?.mode === 'edit') {
            await updateCampaign(modalState.campaign.id, dataToSave);
            alert('Modello campagna aggiornato!');
        } else {
            await addCampaign(dataToSave);
            alert('Nuovo modello campagna salvato!');
        }
        closeModal();
    };
    
    const handleConfirmDelete = async () => {
        if (deletingCampaignId) {
            await removeCampaign(deletingCampaignId);
            alert('Modello campagna eliminato!');
            setDeletingCampaignId(null);
        }
    };
    
    const renderModalContent = () => {
        if (!modalState) return null;
        const title = modalState.mode === 'new'
            ? `Nuovo Modello ${modalState.type === 'sollecito' ? 'Sollecito' : 'Sviluppo'}`
            : 'Modifica Modello';
        
        return (
            <form id="campaign-form" onSubmit={handleSave} className="space-y-4" noValidate>
                <Input id="name" label="Nome Modello" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} error={errors.name} required autoComplete="off" />
                <Input id="subject" label="Oggetto (per Email)" value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} error={errors.subject} required autoComplete="off" />
                <div>
                    <label htmlFor="body" className="block text-sm font-medium text-testo-input mb-1">
                        Corpo del Messaggio {errors.body && <span className="text-red-500">*</span>}
                    </label>
                    <textarea 
                        id="body" 
                        rows={8}
                        value={formData.body || ''} 
                        onChange={e => setFormData({...formData, body: e.target.value})}
                        className={`block w-full rounded-md border-black/20 bg-white text-testo-input shadow-sm focus:border-bottone-azione focus:ring-bottone-azione sm:text-sm ${errors.body ? 'border-red-500' : ''}`}
                    />
                    {errors.body && <p className="mt-1 text-sm text-red-600">{errors.body}</p>}
                    <p className="mt-2 text-xs text-testo-input/70">
                        Puoi usare dei segnaposto come: <code className="bg-gray-200 p-0.5 rounded">{'{NOME_CLIENTE}'}</code>, <code className="bg-gray-200 p-0.5 rounded">{'{NOME_BAMBINO}'}</code>, <code className="bg-gray-200 p-0.5 rounded">{'{NOME_WORKSHOP}'}</code>.
                    </p>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-black/10">
                    <button type="button" onClick={closeModal} className="px-4 py-2 bg-bottone-annullamento text-testo-input rounded-md hover:opacity-90">Annulla</button>
                    <button type="submit" className="px-4 py-2 bg-bottone-salvataggio text-white rounded-md hover:opacity-90">Salva Modello</button>
                </div>
            </form>
        );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-testo-input">Gestione Campagne</h2>
            
            <CampaignSection 
                title="Modelli per Sollecito Pagamenti"
                campaigns={sollecitoCampaigns}
                onNew={() => setModalState({ mode: 'new', type: 'sollecito' })}
                onEdit={(campaign) => setModalState({ mode: 'edit', campaign })}
                onDelete={(id) => setDeletingCampaignId(id)}
                description="Messaggi per sollecitare pagamenti o rinnovi iscrizioni."
            />

            <CampaignSection 
                title="Modelli per Sviluppo Clienti"
                campaigns={sviluppoCampaigns}
                onNew={() => setModalState({ mode: 'new', type: 'sviluppo' })}
                onEdit={(campaign) => setModalState({ mode: 'edit', campaign })}
                onDelete={(id) => setDeletingCampaignId(id)}
                description="Messaggi per clienti 'Prospect' o 'Sospesi' per invogliarli a nuove iscrizioni."
            />
            
            <Modal isOpen={!!modalState} onClose={closeModal} title={modalState?.mode === 'edit' ? 'Modifica Modello' : 'Nuovo Modello'}>
                {renderModalContent()}
            </Modal>

             <ConfirmModal
                isOpen={!!deletingCampaignId}
                onClose={() => setDeletingCampaignId(null)}
                onConfirm={handleConfirmDelete}
                title="Conferma Eliminazione Modello"
              >
                <p>Sei sicuro di voler eliminare questo modello di campagna? L'azione è irreversibile.</p>
            </ConfirmModal>

        </div>
    );
};

interface CampaignSectionProps {
    title: string;
    description: string;
    campaigns: Campaign[];
    onNew: () => void;
    onEdit: (campaign: Campaign) => void;
    onDelete: (id: string) => void;
}

const CampaignSection = ({ title, description, campaigns, onNew, onEdit, onDelete }: CampaignSectionProps) => (
    <Card>
        <CardHeader actions={
            <button onClick={onNew} className="bg-bottone-azione text-white px-3 py-1.5 rounded-full shadow hover:opacity-90 flex items-center space-x-2 text-sm">
                <PlusIcon className="h-4 w-4" /><span>Crea Nuovo</span>
            </button>
        }>
            {title}
        </CardHeader>
        <CardContent>
            <p className="text-sm text-testo-input/80 mb-4">{description}</p>
            {campaigns.length > 0 ? (
                <ul className="space-y-3">
                    {campaigns.map(c => (
                        <li key={c.id} className="p-3 bg-white/40 rounded-md flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-testo-input">{c.name}</p>
                                <p className="text-sm text-testo-input/90 mt-1 italic">"{c.subject}"</p>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <button onClick={() => onEdit(c)} className="p-1.5 text-testo-input/80 hover:text-bottone-azione"><PencilIcon className="h-4 w-4" /></button>
                                <button onClick={() => onDelete(c.id)} className="p-1.5 text-testo-input/80 hover:text-bottone-eliminazione"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-testo-input/70 py-4 italic">Nessun modello creato per questa categoria.</p>
            )}
        </CardContent>
    </Card>
);

export default CampaignsView;
