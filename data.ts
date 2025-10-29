import type { Parent, Child, Supplier, Location, Workshop, Registration, Payment, OperationalCost, Quote, Invoice, CompanyProfile } from './types.ts';

export const MOCK_COMPANY_PROFILE: CompanyProfile = {
    companyName: 'Il Tuo Nome / Nome Attività',
    vatNumber: '12345678901',
    address: 'Via di Esempio 1, 00100 Città (XX)',
    email: 'tua.email@esempio.com',
    phone: '333 123 4567',
    taxRegime: "Operazione effettuata in regime fiscale di vantaggio ai sensi dell'articolo 1, commi 54-89, Legge n. 190/2014 e successive modificazioni. Si richiede di non operare la ritenuta alla fonte a titolo di acconto ai sensi dell'articolo 27, D.P.R. 29 settembre 1973, n. 600."
};

export const MOCK_PARENTS: Parent[] = [
  { id: 'p1', clientType: 'persona fisica', name: 'Mario', surname: 'Rossi', email: 'mario.rossi@email.com', phone: '3331234567', taxCode: 'RSSMRA80A01H501U', address: 'Via Garibaldi 10', zipCode: '20121', city: 'Milano', province: 'MI' },
  { id: 'p2', clientType: 'persona fisica', name: 'Laura', surname: 'Bianchi', email: 'laura.bianchi@email.com', phone: '3357654321', taxCode: 'BNCLRA82B02F205Z', address: 'Corso Vittorio Emanuele 5', zipCode: '00186', city: 'Roma', province: 'RM' },
  { id: 'p3', clientType: 'persona giuridica', companyName: 'Scuola "Bimbi Felici"', vatNumber: '11223344556', email: 'info@scuolabimbifelici.it', phone: '021234567', address: 'Piazza della Signoria 1', zipCode: '50122', city: 'Firenze', province: 'FI'}
];

export const MOCK_CHILDREN: Child[] = [
    { id: 'c1', parentId: 'p1', name: 'Giulia', birthDate: '2018-05-10' },
    { id: 'c2', parentId: 'p1', name: 'Luca', birthDate: '2020-02-20' },
    { id: 'c3', parentId: 'p2', name: 'Sofia', birthDate: '2019-11-30' },
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'Cartoleria "La Matita"', vatNumber: '12345678901', address: 'Via dei Colori 25', zipCode: '20159', city: 'Milano', province: 'MI' },
  { id: 's2', name: 'Immobiliare "Spazio Facile"', vatNumber: '09876543211', address: 'Corso Sempione 100', zipCode: '20154', city: 'Milano', province: 'MI' },
];

export const MOCK_LOCATIONS: Location[] = [
  { id: 'l1', name: 'Spazio Bimbi Felici', address: 'Via Roma 10, Milano', capacity: 12, supplierId: 's2' },
  { id: 'l2', name: 'Centro Polifunzionale', address: 'Piazza Duomo 1, Milano', capacity: 25 },
];

export const MOCK_WORKSHOPS: Workshop[] = [
  { id: 'w1', name: 'Avventura nella Scienza', locationId: 'l1', startDate: '2024-10-25', endDate: '2024-10-25', pricePerChild: 30 },
  { id: 'w2', name: 'Piccoli Artisti Crescono', locationId: 'l2', startDate: '2024-11-10', endDate: '2024-11-12', pricePerChild: 80 },
  { id: 'w3', name: 'Coding per Bambini', locationId: 'l1', startDate: '2024-09-15', endDate: '2024-09-15', pricePerChild: 35 },
];

export const MOCK_REGISTRATIONS: Registration[] = [
    // w1: Avventura nella Scienza (2 iscritti)
    { id: 'r1', workshopId: 'w1', childId: 'c1', registrationDate: '2024-10-01' },
    { id: 'r2', workshopId: 'w1', childId: 'c3', registrationDate: '2024-10-02' },
    // w2: Piccoli Artisti Crescono (1 iscritto)
    { id: 'r3', workshopId: 'w2', childId: 'c2', registrationDate: '2024-10-15' },
    // w3: Coding per Bambini (3 iscritti)
    { id: 'r4', workshopId: 'w3', childId: 'c1', registrationDate: '2024-09-01' },
    { id: 'r5', workshopId: 'w3', childId: 'c2', registrationDate: '2024-09-01' },
    { id: 'r6', workshopId: 'w3', childId: 'c3', registrationDate: '2024-09-02' },
];

export const MOCK_PAYMENTS: Payment[] = [
    {id: 'pay1', parentId: 'p1', workshopId: 'w3', amount: 35, paymentDate: '2024-09-10', method: 'card'},
    {id: 'pay2', parentId: 'p2', workshopId: 'w3', amount: 35, paymentDate: '2024-09-11', method: 'transfer'},
    {id: 'pay3', parentId: 'p1', workshopId: 'w1', amount: 30, paymentDate: '2024-10-20', method: 'cash'},
];

export const MOCK_COSTS: OperationalCost[] = [
    {id: 'cost1', costType: 'general', description: 'Materiali artistici', amount: 150.75, date: '2024-11-01', supplierId: 's1', workshopId: 'w2', method: 'card'},
    {id: 'cost2', costType: 'general', description: 'Affitto sala', amount: 200, date: '2024-10-20', supplierId: 's2', workshopId: 'w1', method: 'transfer'},
    {id: 'cost3', costType: 'general', description: 'Cancelleria varia', amount: 45.50, date: '2024-09-10', supplierId: 's1', workshopId: 'w3', method: 'cash'},
    {
        id: 'cost4',
        costType: 'fuel',
        locationId: 'l1',
        distanceKm: 25,
        fuelCostPerKm: 0.18,
        amount: 9.00,
        date: '2024-10-24',
        description: '', // This will be generated on the fly.
        method: 'card'
    },
];

export const MOCK_QUOTES: Quote[] = [
    {id: 'q1', parentId: 'p3', description: 'Ciclo 4 workshop scientifici', amount: 800, date: '2024-08-20', status: 'approved', method: 'transfer'},
    {
        id: 'q2',
        potentialClient: {
            clientType: 'persona fisica',
            name: 'Giovanni',
            surname: 'Verdi',
            email: 'g.verdi@example.com',
            address: 'Via Nuova 123',
            zipCode: '10100',
            city: 'Torino',
            province: 'TO',
            taxCode: 'VRDGVN85A01L219J'
        },
        description: 'Consulenza pedagogica',
        amount: 150,
        date: '2024-09-01',
        status: 'sent'
    }
];

export const MOCK_INVOICES: Invoice[] = [
    {id: 'inv1', parentId: 'p1', workshopId: 'w3', amount: 35, issueDate: '2024-09-12', sdiNumber: 'IT01234567890', method: 'card'},
    {id: 'inv2', parentId: 'p2', workshopId: 'w3', amount: 35, issueDate: '2024-09-12', sdiNumber: 'IT01234567891', method: 'transfer'},
];