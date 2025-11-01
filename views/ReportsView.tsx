import React, { useState } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card';
import Input from '../components/Input';
import { DocumentArrowDownIcon } from '../components/icons/HeroIcons';
import type { Payment, OperationalCost, Workshop, Supplier, Location, Registration, Quote, Parent, Child } from '../types';

interface ReportsViewProps {
    payments: Payment[];
    costs: OperationalCost[];
    workshops: Workshop[];
    suppliers: Supplier[];
    locations: Location[];
    registrations: Registration[];
    quotes: Quote[];
    parents: Parent[];
    children: Child[];
}

type ReportType = 'payments' | 'costs' | 'registrations' | null;

export const ReportsView = (props: ReportsViewProps) => {
    const [reportType, setReportType] = useState<ReportType>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const generateCSV = (data: any[], headers: string[]) => {
        const csvRows = [headers.join(',')];
        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + row[header.toLowerCase().replace(/ /g, '_')]).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    };

    const downloadCSV = (csvString: string, filename: string) => {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleExport = () => {
        if (!reportType) {
            alert('Seleziona un tipo di report.');
            return;
        }

        const sDate = startDate ? new Date(startDate) : null;
        const eDate = endDate ? new Date(endDate) : null;
        if(eDate) eDate.setHours(23, 59, 59, 999); // Include whole end day

        let dataToExport: any[] = [];
        let headers: string[] = [];
        let filename = `${reportType}_report.csv`;

        switch(reportType) {
            case 'payments':
                headers = ['Data', 'Cliente', 'Descrizione', 'Importo', 'Metodo'];
                dataToExport = props.payments
                    .filter(p => {
                        const pDate = new Date(p.paymentDate);
                        return (!sDate || pDate >= sDate) && (!eDate || pDate <= eDate);
                    })
                    .map(p => ({
                        data: new Date(p.paymentDate).toLocaleDateString('it-IT'),
                        cliente: props.parents.find(parent => parent.id === p.parentId)?.surname || 'N/D',
                        descrizione: p.description,
                        importo: p.amount,
                        metodo: p.method
                    }));
                break;
            case 'costs':
                 headers = ['Data', 'Descrizione', 'Categoria', 'Importo', 'Fornitore'];
                 dataToExport = props.costs
                    .filter(c => {
                        const cDate = new Date(c.date);
                        return (!sDate || cDate >= sDate) && (!eDate || cDate <= eDate);
                    })
                    .map(c => ({
                        data: new Date(c.date).toLocaleDateString('it-IT'),
                        descrizione: c.description,
                        categoria: c.category,
                        importo: c.amount,
                        fornitore: props.suppliers.find(s => s.id === c.supplierId)?.name || 'N/D'
                    }));
                break;
            case 'registrations':
                 headers = ['Data Iscrizione', 'Bambino', 'Workshop', 'Sede', 'Tipo Iscrizione', 'Scadenza'];
                 dataToExport = props.registrations
                    .filter(r => {
                        const rDate = new Date(r.registrationDate);
                        return r.status === 'confermata' && (!sDate || rDate >= sDate) && (!eDate || rDate <= eDate);
                    })
                    .map(r => {
                        const child = props.children.find(c => c.id === r.childId);
                        const workshop = props.workshops.find(w => w.id === r.workshopId);
                        const location = props.locations.find(l => l.id === workshop?.locationId);
                        return {
                            data_iscrizione: new Date(r.registrationDate).toLocaleDateString('it-IT'),
                            bambino: `${child?.name} ${child?.surname}`,
                            workshop: workshop?.code || 'N/D',
                            sede: location?.name || 'N/D',
                            tipo_iscrizione: r.inscriptionType,
                            scadenza: r.inscriptionEndDate ? new Date(r.inscriptionEndDate).toLocaleDateString('it-IT') : 'N/D'
                        }
                    });
                break;
        }

        const csvString = generateCSV(dataToExport, headers);
        downloadCSV(csvString, filename);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-testo-input">Reportistica</h2>

            <Card>
                <CardHeader>Genera Report</CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="font-semibold mb-2">1. Seleziona il tipo di report</h4>
                        <div className="flex flex-wrap gap-2">
                           <ReportTypeButton label="Pagamenti Ricevuti" type="payments" activeType={reportType} setType={setReportType} />
                           <ReportTypeButton label="Costi Operativi" type="costs" activeType={reportType} setType={setReportType} />
                           <ReportTypeButton label="Iscrizioni Confermate" type="registrations" activeType={reportType} setType={setReportType} />
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2">2. Filtra per data (opzionale)</h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input id="startDate" label="Data Inizio" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <Input id="endDate" label="Data Fine" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-black/10">
                         <button 
                            onClick={handleExport}
                            disabled={!reportType}
                            className="bg-bottone-salvataggio text-white px-4 py-2 rounded-md shadow hover:opacity-90 flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            <DocumentArrowDownIcon /><span>Esporta CSV</span>
                        </button>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};

const ReportTypeButton = ({ label, type, activeType, setType }: {label: string, type: ReportType, activeType: ReportType, setType: (type: ReportType) => void}) => (
    <button
        onClick={() => setType(type)}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
            activeType === type ? 'bg-bottone-azione text-white' : 'bg-white hover:bg-gray-100 border'
        }`}
    >
        {label}
    </button>
)
