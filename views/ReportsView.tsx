import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card, { CardContent, CardHeader } from '../components/Card.tsx';
import { DocumentDownloadIcon, CurrencyDollarIcon, UsersIcon, ChartPieIcon } from '../components/icons/HeroIcons.tsx';
import type { Payment, OperationalCost, Workshop, Supplier, Location, Registration, Quote, PaymentMethod } from '../types.ts';

declare const Chart: any; // Using Chart.js from CDN

type ReportType = '' | 'revenue-total' | 'revenue-by-workshop' | 'costs-total' | 'costs-by-supplier' | 'net-profit' | 'participants-by-workshop' | 'workshops-by-location' | 'participants-by-location' | 'revenue-per-participant' | 'costs-per-workshop' | 'profit-per-participant-stats' | 'quote-conversion-analysis';

type ReportData = { headers: string[], rows: Record<string, any>[] };

interface ReportsViewProps {
    payments: Payment[];
    costs: OperationalCost[];
    workshops: Workshop[];
    suppliers: Supplier[];
    locations: Location[];
    registrations: Registration[];
    quotes: Quote[];
}

const reportOptions: { value: ReportType; label: string }[] = [
    { value: '', label: 'Seleziona un report' },
    { value: 'revenue-total', label: 'Ricavi totali (per metodo)' },
    { value: 'revenue-by-workshop', label: 'Ricavi per workshop' },
    { value: 'costs-total', label: 'Spese operative totali (per metodo)' },
    { value: 'costs-by-supplier', label: 'Spese per fornitore' },
    { value: 'costs-per-workshop', label: 'Spese operative per workshop' },
    { value: 'net-profit', label: 'Utile Netto (EBITDA)' },
    { value: 'quote-conversion-analysis', label: 'Analisi Conversione Preventivi' },
    { value: 'participants-by-workshop', label: 'Iscritti per workshop' },
    { value: 'participants-by-location', label: 'Iscritti per luogo' },
    { value: 'workshops-by-location', label: 'Workshop per luogo' },
    { value: 'revenue-per-participant', label: 'Ricavi medi per iscritto' },
    { value: 'profit-per-participant-stats', label: 'Utile minimo/medio/massimo per iscritto' },
];

// Helper to generate colors for charts
const generateChartColors = (numColors: number) => {
    const colors = [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(255, 205, 86, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(201, 203, 207, 0.6)'
    ];
    const borderColors = colors.map(c => c.replace('0.6', '1'));
    
    let backgroundColors: string[] = [];
    let borderColorsResult: string[] = [];

    for (let i = 0; i < numColors; i++) {
        backgroundColors.push(colors[i % colors.length]);
        borderColorsResult.push(borderColors[i % borderColors.length]);
    }
    return { backgroundColor: backgroundColors, borderColor: borderColorsResult };
};


const KPICard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card>
    <CardContent>
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-full text-indigo-600">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ChartCard: React.FC<{ title: string; chartRef: React.RefObject<HTMLCanvasElement>, chartHeight?: string }> = ({ title, chartRef, chartHeight = 'h-64' }) => (
    <Card>
        <CardHeader>{title}</CardHeader>
        <CardContent>
            <div className={`relative ${chartHeight}`}>
                <canvas ref={chartRef}></canvas>
            </div>
        </CardContent>
    </Card>
);

const ReportsView: React.FC<ReportsViewProps> = ({ payments, costs, workshops, suppliers, locations, registrations, quotes }) => {
    const [reportType, setReportType] = useState<ReportType>('');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    
    // Ref for detailed report chart
    const detailedChartRef = useRef<HTMLCanvasElement | null>(null);
    const detailedChartInstanceRef = useRef<any | null>(null);

    // Refs for dashboard charts
    const overviewChartsRef = useRef<any[]>([]);
    const revenueMethodChartRef = useRef<HTMLCanvasElement | null>(null);
    const costMethodChartRef = useRef<HTMLCanvasElement | null>(null);
    const topWsRevenueChartRef = useRef<HTMLCanvasElement | null>(null);
    const topWsParticipantsChartRef = useRef<HTMLCanvasElement | null>(null);
    const topLocParticipantsChartRef = useRef<HTMLCanvasElement | null>(null);
    const topSupCostsChartRef = useRef<HTMLCanvasElement | null>(null);

    const workshopMap = useMemo(() => workshops.reduce((acc, ws) => ({ ...acc, [ws.id]: ws }), {} as Record<string, Workshop>), [workshops]);
    const supplierMap = useMemo(() => suppliers.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, Supplier>), [suppliers]);
    const locationMap = useMemo(() => locations.reduce((acc, l) => ({ ...acc, [l.id]: l }), {} as Record<string, Location>), [locations]);
    
    const overviewData = useMemo(() => {
        const totalRevenue = payments.reduce((sum: number, p) => sum + p.amount, 0);
        const totalCosts = costs.reduce((sum: number, c) => sum + c.amount, 0);
        // Fix: Removed redundant Number() casting which was causing issues.
        const netProfit = totalRevenue - totalCosts;
        const totalParticipants = new Set(registrations.map(r => r.childId)).size;

        const approvedQuotesCount = quotes.filter(q => q.status === 'approved').length;
        const rejectedQuotesCount = quotes.filter(q => q.status === 'rejected').length;
        const decidedQuotesCount = approvedQuotesCount + rejectedQuotesCount;
        const conversionRate = decidedQuotesCount > 0 ? (approvedQuotesCount / decidedQuotesCount) * 100 : 0;
        
        // Data for charts
        const revenueByMethod = payments.reduce((acc: Record<string, number>, p) => {
            const methodLabel = p.method === 'cash' ? 'Contanti' : p.method === 'transfer' ? 'Bonifico' : 'Carta';
            // Fix: Removed redundant Number() casting. `p.amount` is already a number.
            acc[methodLabel] = (acc[methodLabel] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);

        const costsByMethod = costs.reduce((acc: Record<string, number>, c) => {
            if (c.method) {
                const methodLabel = c.method === 'cash' ? 'Contanti' : c.method === 'transfer' ? 'Bonifico' : 'Carta';
                // Fix: Removed redundant Number() casting. `c.amount` is already a number.
                acc[methodLabel] = (acc[methodLabel] || 0) + c.amount;
            } else {
                // Fix: Removed redundant Number() casting.
                acc['Non specificato'] = (acc['Non specificato'] || 0) + c.amount;
            }
            return acc;
        }, {} as Record<string, number>);

        const revenueByWs = payments.reduce((acc: Record<string, number>, p) => {
            // Fix: Removed redundant Number() casting. `p.amount` is already a number.
            acc[p.workshopId] = (acc[p.workshopId] || 0) + p.amount;
            return acc;
        }, {} as Record<string, number>);
        const topWorkshopsByRevenue = Object.entries(revenueByWs)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([wsId, amount]) => ({ name: workshopMap[wsId]?.name || `ID: ${wsId}`, value: amount }));

        const participantsByWs = registrations.reduce((acc: Record<string, number>, reg) => {
            // Fix: Removed redundant Number() casting.
            acc[reg.workshopId] = (acc[reg.workshopId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topWorkshopsByParticipants = Object.entries(participantsByWs)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([wsId, count]) => ({ name: workshopMap[wsId]?.name || `ID: ${wsId}`, value: count }));

        const workshopLocationMap = workshops.reduce((acc: Record<string, string>, ws) => ({ ...acc, [ws.id]: ws.locationId }), {} as Record<string, string>);
        const participantsByLoc = registrations.reduce((acc: Record<string, number>, reg) => {
            const locId = workshopLocationMap[reg.workshopId];
            // Fix: Removed redundant Number() casting.
            if (locId) acc[locId] = (acc[locId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topLocationsByParticipants = Object.entries(participantsByLoc)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([locId, count]) => ({ name: locationMap[locId]?.name || `ID: ${locId}`, value: count }));

        const costsBySup = costs.reduce((acc: Record<string, number>, cost) => {
            const supId = cost.supplierId || 'none';
            // Fix: Removed redundant Number() casting.
            acc[supId] = (acc[supId] || 0) + cost.amount;
            return acc;
        }, {} as Record<string, number>);
        const topSuppliersByCosts = Object.entries(costsBySup)
            .filter(([supId]) => supId !== 'none')
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([supId, amount]) => ({ name: supplierMap[supId]?.name || `ID: ${supId}`, value: amount }));

        return {
            kpis: {
                totalRevenue,
                totalCosts,
                netProfit,
                totalParticipants,
                conversionRate,
            },
            topFives: {
                topWorkshopsByRevenue,
                topWorkshopsByParticipants,
                topLocationsByParticipants,
                topSuppliersByCosts,
            },
            charts: {
                revenueByMethod,
                costsByMethod,
            }
        };
    }, [payments, costs, quotes, registrations, workshops, locations, suppliers, workshopMap, locationMap, supplierMap]);


    // Effect for DASHBOARD charts
    useEffect(() => {
        const chartsToCreate: { ref: React.RefObject<HTMLCanvasElement>, config: any }[] = [];
        
        // Always clean up previous charts before creating new ones.
        overviewChartsRef.current.forEach(chart => chart.destroy());
        overviewChartsRef.current = [];

        if (reportType === '') { // only render if on dashboard
            // Revenue by Method Pie Chart
            if (revenueMethodChartRef.current) {
                const data = overviewData.charts.revenueByMethod;
                const labels = Object.keys(data);
                const dataPoints = Object.values(data);
                if (labels.length > 0) {
                    chartsToCreate.push({
                        ref: revenueMethodChartRef,
                        config: {
                            type: 'pie',
                            data: {
                                labels,
                                datasets: [{ data: dataPoints, ...generateChartColors(labels.length) }]
                            },
                            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                        }
                    });
                }
            }
            // Cost by Method Pie Chart
            if (costMethodChartRef.current) {
                const data = overviewData.charts.costsByMethod;
                const labels = Object.keys(data);
                const dataPoints = Object.values(data);
                if (labels.length > 0) {
                    chartsToCreate.push({
                        ref: costMethodChartRef,
                        config: {
                            type: 'pie',
                            data: {
                                labels,
                                datasets: [{ data: dataPoints, ...generateChartColors(labels.length) }]
                            },
                            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
                        }
                    });
                }
            }

            // Top 5 Bar Charts Helper
            const createBarChartConfig = (data: {name: string, value: number}[], label: string, axis: 'x' | 'y' = 'y', valuePrefix = '') => {
                 if (data.length === 0) return null;
                 const labels = data.map(d => d.name).reverse();
                 const dataPoints = data.map(d => d.value).reverse();
                 const colors = generateChartColors(1);

                 return {
                     type: 'bar',
                     data: {
                         labels,
                         datasets: [{
                             label,
                             data: dataPoints,
                             backgroundColor: colors.backgroundColor,
                             borderColor: colors.borderColor,
                             borderWidth: 1
                         }]
                     },
                     options: {
                         indexAxis: axis,
                         responsive: true,
                         maintainAspectRatio: false,
                         plugins: { legend: { display: false } },
                         scales: {
                            [axis === 'y' ? 'x' : 'y']: { 
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value: any) {
                                        return valuePrefix + value;
                                    }
                                }
                            }
                         }
                     }
                 };
            };

            const topWsRevenueConfig = createBarChartConfig(overviewData.topFives.topWorkshopsByRevenue, 'Ricavi', 'y', '€');
            if (topWsRevenueChartRef.current && topWsRevenueConfig) chartsToCreate.push({ ref: topWsRevenueChartRef, config: topWsRevenueConfig });

            const topWsParticipantsConfig = createBarChartConfig(overviewData.topFives.topWorkshopsByParticipants, 'Iscritti');
            if (topWsParticipantsChartRef.current && topWsParticipantsConfig) chartsToCreate.push({ ref: topWsParticipantsChartRef, config: topWsParticipantsConfig });

            const topLocParticipantsConfig = createBarChartConfig(overviewData.topFives.topLocationsByParticipants, 'Iscritti');
            if (topLocParticipantsChartRef.current && topLocParticipantsConfig) chartsToCreate.push({ ref: topLocParticipantsChartRef, config: topLocParticipantsConfig });
            
            const topSupCostsConfig = createBarChartConfig(overviewData.topFives.topSuppliersByCosts, 'Costi', 'y', '€');
            if (topSupCostsChartRef.current && topSupCostsConfig) chartsToCreate.push({ ref: topSupCostsChartRef, config: topSupCostsConfig });

            // Instantiate all charts
            chartsToCreate.forEach(chartInfo => {
                 if (chartInfo.ref.current) {
                    const newChart = new Chart(chartInfo.ref.current.getContext('2d'), chartInfo.config);
                    overviewChartsRef.current.push(newChart);
                 }
            });
        }
        
        // Cleanup function for this effect
        return () => {
            overviewChartsRef.current.forEach(chart => chart.destroy());
            overviewChartsRef.current = [];
        }

    }, [reportType, overviewData]);
    

    useEffect(() => {
        if (detailedChartInstanceRef.current) {
            detailedChartInstanceRef.current.destroy();
            detailedChartInstanceRef.current = null;
        }

        if (!reportData || !detailedChartRef.current || reportData.rows.length === 0) {
            return;
        }

        const ctx = detailedChartRef.current.getContext('2d');
        if (!ctx) return;

        let chartType: 'bar' | 'pie' = 'bar';
        let labels: string[] = [];
        let dataPoints: number[] = [];
        let label = '';
        
        const isPieChart = ['costs-by-supplier', 'workshops-by-location', 'participants-by-location', 'quote-conversion-analysis'].includes(reportType);
        chartType = isPieChart ? 'pie' : 'bar';
        
        let rowsToChart = reportData.rows;
        // For reports with a "Total" row, exclude it from the chart
        if (['revenue-total', 'costs-total'].includes(reportType)) {
            rowsToChart = reportData.rows.filter(r => !Object.values(r)[0].toString().toLowerCase().includes('totale'));
        }

        switch (reportType) {
            case 'revenue-total':
            case 'costs-total':
            case 'net-profit':
            case 'revenue-per-participant':
            case 'profit-per-participant-stats':
                labels = rowsToChart.map(r => r[reportData.headers[0]]);
                dataPoints = rowsToChart.map(r => parseFloat(String(r[reportData.headers[1]]).replace('€', '').trim()));
                label = 'Valore';
                chartType = 'bar';
                break;
            case 'revenue-by-workshop':
                labels = rowsToChart.map(r => r['Workshop']);
                dataPoints = rowsToChart.map(r => parseFloat(String(r['Ricavi']).replace('€', '')));
                label = 'Ricavi';
                break;
            case 'costs-by-supplier':
                labels = rowsToChart.map(r => r['Fornitore']);
                dataPoints = rowsToChart.map(r => parseFloat(String(r['Costo Totale']).replace('€', '')));
                label = 'Costi';
                break;
             case 'costs-per-workshop':
                labels = rowsToChart.map(r => r['Workshop']);
                dataPoints = rowsToChart.map(r => parseFloat(String(r['Costo Totale']).replace('€', '')));
                label = 'Costi';
                break;
            case 'participants-by-workshop':
                labels = rowsToChart.map(r => r['Workshop']);
                dataPoints = rowsToChart.map(r => r['Numero Iscritti']);
                label = 'Iscritti';
                break;
            case 'workshops-by-location':
            case 'participants-by-location':
                labels = rowsToChart.map(r => r[reportData.headers[0]]);
                dataPoints = rowsToChart.map(r => r[reportData.headers[1]]);
                label = reportData.headers[1];
                break;
            case 'quote-conversion-analysis':
                const approvedCount = reportData.rows.find(r => r['Metrica'] === 'Preventivi Approvati')?.['Valore'] || 0;
                const rejectedCount = reportData.rows.find(r => r['Metrica'] === 'Preventivi Rifiutati')?.['Valore'] || 0;
                const sentCount = reportData.rows.find(r => r['Metrica'] === 'Preventivi Inviati (in attesa)')?.['Valore'] || 0;
                
                labels = ['Approvati', 'Rifiutati', 'In Attesa'];
                dataPoints = [approvedCount, rejectedCount, sentCount];
                label = 'Stato Preventivi';
                break;
            default:
                return;
        }

        const { backgroundColor, borderColor } = generateChartColors(labels.length);

        detailedChartInstanceRef.current = new Chart(ctx, {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: dataPoints,
                    backgroundColor,
                    borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: isPieChart ? 'top' : 'bottom',
                    },
                    title: {
                        display: true,
                        text: reportOptions.find(opt => opt.value === reportType)?.label || 'Grafico',
                        font: { size: 16 },
                        padding: { top: 10, bottom: 20 }
                    }
                },
                scales: isPieChart ? {} : {
                    y: {
                        beginAtZero: true,
                        ticks: {
                           callback: function(value: any) {
                                const currencyReports: ReportType[] = ['revenue-total', 'costs-total', 'net-profit', 'revenue-by-workshop', 'costs-by-supplier', 'revenue-per-participant', 'costs-per-workshop', 'profit-per-participant-stats'];
                                if (currencyReports.includes(reportType)) {
                                    return '€' + value;
                                }
                                return value;
                            }
                        }
                    }
                }
            }
        });

    }, [reportData, reportType]);

    const generateReport = () => {
        let data: ReportData | null = null;
        switch (reportType) {
            case 'revenue-total': {
                const revenueByMethod = payments.reduce((acc: Record<PaymentMethod, number>, p) => {
                    // Fix: Removed redundant Number() casting.
                    acc[p.method] = (acc[p.method] || 0) + p.amount;
                    return acc;
                }, {} as Record<PaymentMethod, number>);
                const totalRevenue = Object.values(revenueByMethod).reduce((sum: number, amount: number) => sum + amount, 0);
                
                data = {
                    headers: ['Metodo di Pagamento', 'Ricavi Totali'],
                    rows: [
                        // Fix: Removed redundant Number() casting.
                        { 'Metodo di Pagamento': 'Contanti', 'Ricavi Totali': `€${(revenueByMethod['cash'] || 0).toFixed(2)}` },
                        // Fix: Removed redundant Number() casting.
                        { 'Metodo di Pagamento': 'Bonifico', 'Ricavi Totali': `€${(revenueByMethod['transfer'] || 0).toFixed(2)}` },
                        // Fix: Removed redundant Number() casting.
                        { 'Metodo di Pagamento': 'Carta', 'Ricavi Totali': `€${(revenueByMethod['card'] || 0).toFixed(2)}` },
                        // Fix: Removed redundant Number() casting.
                        { 'Metodo di Pagamento': 'Totale', 'Ricavi Totali': `€${totalRevenue.toFixed(2)}` }
                    ]
                };
                break;
            }
            case 'revenue-by-workshop': {
                const revenueByWs = payments.reduce((acc: Record<string, number>, p) => {
                    // Fix: Removed redundant Number() casting.
                    acc[p.workshopId] = (acc[p.workshopId] || 0) + p.amount;
                    return acc;
                }, {} as Record<string, number>);
                data = {
                    headers: ['Workshop', 'Ricavi'],
                    rows: Object.entries(revenueByWs).map(([wsId, amount]) => ({
                        'Workshop': workshopMap[wsId]?.name || `ID: ${wsId}`,
                        // Fix: Removed redundant Number() casting.
                        'Ricavi': `€${amount.toFixed(2)}`
                    }))
                };
                break;
            }
             case 'costs-total': {
                const costsByMethod = costs.reduce((acc: Record<string, number>, c) => {
                    const method = c.method || 'cash'; // Default to cash if not specified
                    // Fix: Removed redundant Number() casting.
                    acc[method] = (acc[method] || 0) + c.amount;
                    return acc;
                }, {} as Record<string, number>);
                const totalCosts = Object.values(costsByMethod).reduce((sum: number, amount: number) => sum + amount, 0);

                data = {
                    headers: ['Metodo di Pagamento', 'Costi Totali'],
                    rows: [
                        // Fix: Removed redundant Number() casting.
                        { 'Metodo di Pagamento': 'Contanti', 'Costi Totali': `€${(costsByMethod['cash'] || 0).toFixed(2)}` },
                        // Fix: Removed redundant Number() casting.
                        { 'Metodo di Pagamento': 'Bonifico', 'Costi Totali': `€${(costsByMethod['transfer'] || 0).toFixed(2)}` },
                        // Fix: Removed redundant Number() casting.
                        { 'Metodo di Pagamento': 'Carta', 'Costi Totali': `€${(costsByMethod['card'] || 0).toFixed(2)}` },
                        // Fix: Removed redundant Number() casting.
                        { 'Metodo di Pagamento': 'Totale', 'Costi Totali': `€${totalCosts.toFixed(2)}` }
                    ]
                };
                break;
            }
            case 'costs-by-supplier': {
                const costsBySup = costs.reduce((acc: Record<string, number>, cost) => {
                    const supId = cost.supplierId || 'none';
                    // Fix: Removed redundant Number() casting.
                    acc[supId] = (acc[supId] || 0) + cost.amount;
                    return acc;
                }, {} as Record<string, number>);
                data = {
                    headers: ['Fornitore', 'Costo Totale'],
                    rows: Object.entries(costsBySup).map(([supId, amount]) => ({
                        'Fornitore': supplierMap[supId]?.name || 'Senza fornitore',
                        // Fix: Removed redundant Number() casting.
                        'Costo Totale': `€${amount.toFixed(2)}`
                    }))
                };
                break;
            }
            case 'net-profit': {
                const totalRevenueForProfit = payments.reduce((sum: number, p) => sum + p.amount, 0);
                const totalCostsForProfit = costs.reduce((sum: number, c) => sum + c.amount, 0);
                // Fix: Removed redundant Number() casting.
                const netProfit = totalRevenueForProfit - totalCostsForProfit;
                data = {
                    headers: ['Descrizione', 'Valore'],
                    rows: [
                        // Fix: Removed redundant Number() casting.
                        { 'Descrizione': 'Ricavi Totali', 'Valore': `€${totalRevenueForProfit.toFixed(2)}` },
                        // Fix: Removed redundant Number() casting.
                        { 'Descrizione': 'Costi Operativi Totali', 'Valore': `€${totalCostsForProfit.toFixed(2)}` },
                        // Fix: Removed redundant Number() casting.
                        { 'Descrizione': 'Utile Netto (EBITDA)', 'Valore': `€${netProfit.toFixed(2)}` }
                    ]
                };
                break;
            }
            case 'quote-conversion-analysis': {
                const totalQuotes = quotes.length;
                const approvedQuotes = quotes.filter(q => q.status === 'approved');
                const rejectedQuotes = quotes.filter(q => q.status === 'rejected');
                const sentQuotes = quotes.filter(q => q.status === 'sent');

                const approvedCount = approvedQuotes.length;
                const rejectedCount = rejectedQuotes.length;
                const sentCount = sentQuotes.length;

                const decidedQuotes = approvedCount + rejectedCount;
                const conversionRate = decidedQuotes > 0 ? (approvedCount / decidedQuotes) * 100 : 0;
                
                const approvedValue = approvedQuotes.reduce((sum: number, q) => sum + q.amount, 0);
                const rejectedValue = rejectedQuotes.reduce((sum: number, q) => sum + q.amount, 0);
                const sentValue = sentQuotes.reduce((sum: number, q) => sum + q.amount, 0);

                data = {
                    headers: ['Metrica', 'Valore'],
                    rows: [
                        { 'Metrica': 'Numero Totale Preventivi', 'Valore': totalQuotes },
                        { 'Metrica': 'Preventivi Approvati', 'Valore': approvedCount },
                        { 'Metrica': 'Preventivi Rifiutati', 'Valore': rejectedCount },
                        { 'Metrica': 'Preventivi Inviati (in attesa)', 'Valore': sentCount },
                        { 'Metrica': 'Tasso di Conversione (su decisi)', 'Valore': `${conversionRate.toFixed(2)}%` },
                        { 'Metrica': 'Valore Approvato', 'Valore': `€${approvedValue.toFixed(2)}` },
                        { 'Metrica': 'Valore Rifiutato', 'Valore': `€${rejectedValue.toFixed(2)}` },
                        { 'Metrica': 'Valore Inviato (in attesa)', 'Valore': `€${sentValue.toFixed(2)}` },
                    ]
                };
                break;
            }
            case 'participants-by-workshop': {
                const participantsByWs = registrations.reduce((acc: Record<string, number>, reg) => {
                    // Fix: Removed redundant Number() casting.
                    acc[reg.workshopId] = (acc[reg.workshopId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                data = {
                    headers: ['Workshop', 'Numero Iscritti'],
                    rows: workshops.map(ws => ({
                        'Workshop': ws.name,
                        'Numero Iscritti': participantsByWs[ws.id] || 0
                    }))
                };
                break;
            }
             case 'workshops-by-location': {
                const workshopsByLoc = workshops.reduce((acc: Record<string, number>, ws) => {
                    // Fix: Removed redundant Number() casting.
                    acc[ws.locationId] = (acc[ws.locationId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                data = {
                    headers: ['Luogo', 'Numero Workshop'],
                    rows: Object.entries(workshopsByLoc).map(([locId, count]) => ({
                        'Luogo': locationMap[locId]?.name || `ID: ${locId}`,
                        'Numero Workshop': count
                    }))
                };
                break;
            }
            case 'participants-by-location': {
                const workshopLocationMap = workshops.reduce((acc: Record<string, string>, ws) => {
                    acc[ws.id] = ws.locationId;
                    return acc;
                }, {} as Record<string, string>);

                const participantsByLoc = registrations.reduce((acc: Record<string, number>, reg) => {
                    const locId = workshopLocationMap[reg.workshopId];
                    if (locId) {
                        // Fix: Removed redundant Number() casting.
                        acc[locId] = (acc[locId] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>);

                data = {
                    headers: ['Luogo', 'Numero Iscritti'],
                    rows: Object.entries(participantsByLoc).map(([locId, count]) => ({
                        'Luogo': locationMap[locId]?.name || `ID: ${locId}`,
                        'Numero Iscritti': count
                    }))
                };
                break;
            }
            
            case 'revenue-per-participant': {
                const totalRevenueForAvg = payments.reduce((sum: number, p) => sum + p.amount, 0);
                const totalParticipants = registrations.length;
                const avgRevenue = totalParticipants > 0 ? totalRevenueForAvg / totalParticipants : 0;
                data = {
                    headers: ['Descrizione', 'Valore'],
                    rows: [{ 'Descrizione': 'Ricavo Medio per Iscritto', 'Valore': `€${avgRevenue.toFixed(2)}` }]
                };
                break;
            }

            case 'costs-per-workshop': {
                const costsByWs = costs.reduce((acc: Record<string, number>, cost) => {
                    if (cost.workshopId) {
                        // Fix: Removed redundant Number() casting.
                        acc[cost.workshopId] = (acc[cost.workshopId] || 0) + cost.amount;
                    }
                    return acc;
                }, {} as Record<string, number>);

                data = {
                    headers: ['Workshop', 'Costo Totale'],
                    rows: Object.entries(costsByWs).map(([wsId, amount]) => ({
                        'Workshop': workshopMap[wsId]?.name || `ID: ${wsId}`,
                        // Fix: Removed redundant Number() casting.
                        'Costo Totale': `€${amount.toFixed(2)}`
                    }))
                };
                break;
            }
            case 'profit-per-participant-stats': {
                const revenueByWsForProfit = payments.reduce((acc: Record<string, number>, p) => {
                    // Fix: Removed redundant Number() casting.
                    acc[p.workshopId] = (acc[p.workshopId] || 0) + p.amount;
                    return acc;
                }, {} as Record<string, number>);
    
                const costsByWsForProfit = costs.reduce((acc: Record<string, number>, cost) => {
                    if (cost.workshopId) {
                        // Fix: Removed redundant Number() casting.
                        acc[cost.workshopId] = (acc[cost.workshopId] || 0) + cost.amount;
                    }
                    return acc;
                }, {} as Record<string, number>);
    
                const participantsByWsForProfit = registrations.reduce((acc: Record<string, number>, reg) => {
                    // Fix: Removed redundant Number() casting.
                    acc[reg.workshopId] = (acc[reg.workshopId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
    
                const profitsPerParticipant: number[] = [];
                workshops.forEach(ws => {
                    const revenue = revenueByWsForProfit[ws.id] || 0;
                    const cost = costsByWsForProfit[ws.id] || 0;
                    const participants = participantsByWsForProfit[ws.id] || 0;
    
                    if (participants > 0) {
                        const profit = revenue - cost;
                        const profitPerParticipant = profit / participants;
                        profitsPerParticipant.push(profitPerParticipant);
                    }
                });
    
                if (profitsPerParticipant.length > 0) {
                    const minProfit = Math.min(...profitsPerParticipant);
                    const maxProfit = Math.max(...profitsPerParticipant);
                    const avgProfit = profitsPerParticipant.reduce((sum: number, p) => sum + p, 0) / profitsPerParticipant.length;
                    
                    data = {
                        headers: ['Statistica', 'Valore'],
                        rows: [
                            { 'Statistica': 'Utile Minimo per Iscritto', 'Valore': `€${minProfit.toFixed(2)}` },
                            { 'Statistica': 'Utile Medio per Iscritto', 'Valore': `€${avgProfit.toFixed(2)}` },
                            { 'Statistica': 'Utile Massimo per Iscritto', 'Valore': `€${maxProfit.toFixed(2)}` }
                        ]
                    };
                } else {
                    data = { headers: ['Statistica', 'Valore'], rows: [] };
                }
                break;
            }
        }
        setReportData(data);
    };
    
    const exportToCsv = () => {
        if (!reportData || !reportData.rows.length) return;
        
        const { headers, rows } = reportData;
        const csvContent = [
            headers.join(';'),
            ...rows.map(row => headers.map(header => `"${(row[header] ?? '').toString().replace(/"/g, '""')}"`).join(';'))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${reportType}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const { kpis } = overviewData;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-700">Reportistica Avanzata</h2>
            <Card>
                <CardHeader>Genera Report Dettagliato</CardHeader>
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-4 sm:space-y-0">
                    <div className="flex-grow">
                        <label htmlFor="report-type" className="block text-sm font-medium text-slate-700 mb-1">Tipo di Report</label>
                        <select
                            id="report-type"
                            value={reportType}
                            onChange={e => {
                                setReportType(e.target.value as ReportType);
                                setReportData(null); // Reset report data on new selection
                            }}
                            className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        >
                            {reportOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <button 
                        onClick={generateReport}
                        disabled={!reportType}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed self-end"
                    >
                        Genera
                    </button>
                </CardContent>
            </Card>
            
            {reportType === '' ? (
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <KPICard title="Ricavi Totali" value={`€${kpis.totalRevenue.toFixed(2)}`} icon={<CurrencyDollarIcon />} />
                        <KPICard title="Costi Totali" value={`€${kpis.totalCosts.toFixed(2)}`} icon={<CurrencyDollarIcon />} />
                        <KPICard title="Utile Netto" value={`€${kpis.netProfit.toFixed(2)}`} icon={<CurrencyDollarIcon />} />
                        <KPICard title="Partecipanti Unici" value={String(kpis.totalParticipants)} icon={<UsersIcon />} />
                        <KPICard title="Conversione Preventivi" value={`${kpis.conversionRate.toFixed(1)}%`} icon={<ChartPieIcon />} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <ChartCard title="Ripartizione Ricavi per Metodo" chartRef={revenueMethodChartRef} chartHeight="h-56"/>
                         <ChartCard title="Ripartizione Costi per Metodo" chartRef={costMethodChartRef} chartHeight="h-56"/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <ChartCard title="Top 5 Workshop per Ricavi" chartRef={topWsRevenueChartRef} />
                         <ChartCard title="Top 5 Workshop per Iscritti" chartRef={topWsParticipantsChartRef} />
                         <ChartCard title="Top 5 Luoghi per Iscritti" chartRef={topLocParticipantsChartRef} />
                         <ChartCard title="Top 5 Fornitori per Costi" chartRef={topSupCostsChartRef} />
                    </div>
                </div>
            ) : (
                <>
                    {reportData && reportData.rows.length > 0 && (
                        <Card>
                            <CardHeader>Visualizzazione Grafica</CardHeader>
                            <CardContent>
                                <div className="relative h-96">
                                    <canvas ref={detailedChartRef}></canvas>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {reportData && (
                         <Card>
                            <CardHeader actions={
                                <button onClick={exportToCsv} className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                    <DocumentDownloadIcon />
                                    <span>Esporta CSV</span>
                                </button>
                            }>
                                Risultati Report
                            </CardHeader>
                            <CardContent>
                                {reportData.rows.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    {reportData.headers.map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {reportData.rows.map((row, idx) => (
                                                    <tr key={idx} className={row['Descrizione'] === 'Utile Netto (EBITDA)' || row[reportData.headers[0]].toString().toLowerCase().includes('totale') ? 'bg-slate-50 font-bold' : ''}>
                                                        {reportData.headers.map(h => <td key={h} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{row[h]}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center text-slate-500 py-4">Nessun dato da visualizzare per questo report.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default ReportsView;