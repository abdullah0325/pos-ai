import { initialDatabase, defaultCompanyProfile, type AppDatabase, type ProductItem } from './db';
// Stable IDs and prices; passing the same anchor always generates identical records.
export function buildDemo(anchor = '2026-10-23'): AppDatabase {
    const now = `${anchor}T10:00:00.000Z`, db = structuredClone(initialDatabase);
    db.companyProfile = { ...defaultCompanyProfile, name: 'Al Farooq Hardware', tagline: 'Electrical | Plumbing | Building materials | Tools', address: 'Main Market, Lahore, Pakistan' };
    const categories = ['Electrical', 'Water supply & plumbing', 'Building materials', 'General hardware & tools', 'Electronics'];
    db.categories = categories.map((name, i) => ({ id: `cat-${i}`, name, color: ['amber', 'blue', 'stone', 'emerald', 'purple'][i] }));
    db.supplierCategories = categories.map((name, i) => ({ id: `scat-${i}`, name }));
    db.customerCategories = [{ id: 'retail', name: 'Retailer', parentType: 'Retailer' }, { id: 'contractor', name: 'Contractor', parentType: 'Wholesaler' }, { id: 'electrician', name: 'Electrician', parentType: 'Retailer' }, { id: 'plumber', name: 'Plumber', parentType: 'Retailer' }, { id: 'walk', name: 'Walk-in Customer', parentType: 'Walk-in' }];
    db.purchaseCategories = [{ id: 'pc-hardware', name: 'Finished Product', description: 'Hardware stock replenishment' }];
    db.expenseCategories = [{ id: 'rent', name: 'Rent' }, { id: 'transport', name: 'Fuel & Transport' }, { id: 'utilities', name: 'Bills/Utilities' }];
    const add = (group: string, spec: string, category: number, cost: number, sale: number, unit = 'piece', conversion?: [
        string,
        number
    ][]) => {
        const id = `hw-${String(db.products.length + 1).padStart(3, '0')}`;
        const units = [{ unit, factor_to_base: 1 }, ...(conversion || []).map(([unit, factor_to_base]) => ({ unit, factor_to_base }))];
        db.products.push({ id, name: `${group}${spec ? ' ' + spec : ''}`, groupName: group, spec, category: categories[category], sku: id.toUpperCase(), unit, baseUnit: unit, units, costPrice: cost, retailPrice: sale, wholesalePrice: Math.round(sale * .95 * 100) / 100, quantity: 0, reorderLevel: unit === 'foot' ? 180 : 10, status: 'In stock', isPurchasedProduct: true, updatedAt: now });
    };
    for (const [spec, cost] of [['1.5mm', 42], ['2.5mm', 65], ['4mm', 105], ['6mm', 155]] as const)
        add('Copper wire', spec, 0, cost, Math.round(cost * 1.2), 'foot', [['coil', 90], ['meter', 3.28084], ['inch', 1 / 12]]);
    add('Flexible wire', '2 core', 0, 38, 48, 'foot', [['coil', 90], ['meter', 3.28084]]);
    for (const [group, spec, cost, sale] of [['Switch', '1 gang', 130, 170], ['Socket', '13A', 260, 340], ['MCB', '10A', 650, 800], ['MCB', '16A', 700, 850], ['MCB', '32A', 800, 980], ['LED bulb', '12W', 230, 300], ['LED tube', '20W', 650, 800], ['Bulb holder', 'ceramic', 85, 120], ['Conduit pipe', '3/4 inch', 160, 210], ['Electrical tape', 'PVC', 45, 65], ['Extension board', '4 socket', 1100, 1450], ['Ceiling fan', '56 inch', 8200, 9800]] as const)
        add(group, spec, 0, cost, sale);
    for (const [spec, cost] of [['1/2 inch', 32], ['3/4 inch', 42], ['1 inch', 60], ['1.5 inch', 95], ['2 inch', 145]] as const)
        add('PVC pipe', spec, 1, cost, Math.round(cost * 1.25), 'foot', [['length', 10], ['meter', 3.28084], ['inch', 1 / 12]]);
    for (const [group, spec, cost, sale] of [['PVC elbow', '1 inch', 45, 60], ['PVC tee', '1 inch', 65, 85], ['PVC socket', '1 inch', 30, 45], ['PVC elbow', '2 inch', 105, 140], ['PVC tee', '2 inch', 150, 195], ['Gate valve', '1 inch', 850, 1050], ['Water tap', '1/2 inch', 400, 550], ['Basin mixer', 'chrome', 4200, 5400], ['Water tank', '500 litre', 12000, 14500], ['Ball valve', '3/4 inch', 380, 500], ['Teflon tape', '12mm', 25, 40], ['PPR pipe', '25mm', 125, 160], ['PPR elbow', '25mm', 65, 90], ['PPR tee', '25mm', 80, 110], ['Pump connector', '1 inch', 250, 350], ['Foot valve', '1 inch', 800, 1050]] as const)
        add(group, spec, 1, cost, sale);
    add('Cement', '50kg', 2, 1380, 1460, 'bag');
    add('Steel bar', '12mm', 2, 255, 275, 'kg');
    add('Binding wire', '18 gauge', 2, 280, 320, 'kg');
    add('Sand', 'tractor load', 2, 10500, 12000, 'load');
    add('Crush', 'tractor load', 2, 14500, 16500, 'load');
    add('Brick', 'A grade', 2, 16, 19, 'piece', [['thousand', 1000]]);
    add('Floor tile', '24 inch', 2, 210, 260, 'piece', [['box', 4]]);
    add('Tile adhesive', '20kg', 2, 780, 950, 'bag');
    add('Wall putty', '20kg', 2, 1100, 1350, 'bag');
    add('Emulsion paint', 'white', 2, 700, 850, 'litre', [['gallon', 4]]);
    add('Enamel paint', 'black', 2, 1050, 1250, 'litre', [['gallon', 4]]);
    add('Paint brush', '3 inch', 2, 180, 250);
    add('Paint roller', '9 inch', 2, 450, 600);
    add('Nails', '2 inch', 3, 240, 290, 'kg', [['gram', .001]]);
    add('Screw', '1 inch', 3, 2, 3, 'piece', [['box', 100], ['dozen', 12]]);
    add('Bolt and nut', '10mm', 3, 20, 30, 'set', [['box', 100]]);
    add('Wall plug', '6mm', 3, 1.5, 3, 'piece', [['box', 100]]);
    for (const [group, spec, cost, sale] of [['Hinge', '4 inch', 110, 150], ['Padlock', '50mm', 550, 720], ['Door handle', 'lever set', 1200, 1550], ['Hammer', '500g', 650, 850], ['Pliers', '8 inch', 700, 900], ['Drill bit', '6mm', 100, 150], ['Drill bit', '8mm', 140, 200], ['Measuring tape', '5 meter', 250, 350], ['Cutting disc', '4 inch', 80, 120], ['Work gloves', 'cotton pair', 85, 120]] as const)
        add(group, spec, 3, cost, sale);
    for (const [group, spec, cost, sale] of [['Power adapter', '12V 2A', 450, 650], ['Battery', 'AA pair', 90, 140], ['HDMI cable', '1.5 meter', 300, 450], ['USB cable', 'Type C', 150, 250], ['USB charger', '20W', 650, 900], ['Torch', 'rechargeable', 950, 1250], ['Solar light', '60W', 3200, 4100]] as const)
        add(group, spec, 4, cost, sale);
    const supplierNames = ['Pakistan Wire Dealer', 'Punjab Pipe Distributors', 'Lahore Cement Agency', 'City Electrical Wholesale', 'Master Paint Dealer', 'Steel & Sons', 'Builders Supply Depot', 'Tools Trading House', 'Plumbing Centre', 'Electronic Bazaar'];
    db.suppliers = supplierNames.map((name, i) => ({ id: `sup-${i + 1}`, name, contactPerson: '', category: categories[i % 5], phone: `0300123${String(i).padStart(4, '0')}`, address: 'Main Market', city: 'Lahore', openingBalance: 0, currentBalance: 0, status: 'Active', updatedAt: now }));
    db.customers = Array.from({ length: 15 }, (_, i) => ({ id: `cust-${i + 1}`, name: ['Ahmed Contractors', 'Bilal Electrician', 'Usman Plumber', 'Hassan Builders', 'Ali Renovations', 'Faisal Electrician', 'Imran Plumbing', 'Khan Construction', 'Raza Contractor', 'Saeed Homes', 'Naveed Electrician', 'Tariq Plumber', 'Akram Builders', 'Waqas Contractor', 'Walk-in'][i], type: i === 14 ? 'Walk-in' : i % 3 === 0 ? 'Contractor' : i % 3 === 1 ? 'Electrician' : 'Plumber', phone: `0321123${String(i).padStart(4, '0')}`, address: 'Lahore', openingBalance: 0, currentBalance: 0, creditLimit: 200000, status: 'Active', updatedAt: now }));
    db.accounts = [{ id: 'cash-in-hand', name: 'Cash in hand', type: 'Cash', balance: 500000, updatedAt: now }, { id: 'meezan-bank', name: 'Meezan Bank', type: 'Bank', balance: 350000, updatedAt: now }, { id: 'hbl-bank', name: 'HBL Bank', type: 'Bank', balance: 150000, updatedAt: now }];
    db.stockMovements = [];
    const day = (days: number) => new Date(Date.parse(now) - days * 86400000).toISOString().slice(0, 10);
    const movement = (p: ProductItem, qty: number, type: 'opening' | 'purchase' | 'sale' | 'adjust', ref: string, date: string) => { p.quantity = Math.round((p.quantity + qty) * 1000000) / 1000000; db.stockMovements!.push({ id: `mov-${db.stockMovements!.length + 1}`, itemId: p.id, kind: 'product', type, qty, refId: ref, createdAt: `${date}T10:00:00.000Z` }); };
    for (const p of db.products)
        movement(p, p.unit === 'foot' ? 2000 : p.unit === 'kg' ? 500 : p.unit === 'load' ? 15 : 150, 'opening', `open-${p.id}`, day(60));
    for (let i = 0; i < 25; i++) {
        const id = `demo-po-${i + 1}`, date = day(59 - i * 2), supplier = db.suppliers[i % 10];
        const items = Array.from({ length: 3 }, (_, j) => { const p = db.products[(i * 3 + j) % db.products.length], u = p.units!.find(u => ['coil', 'length', 'box'].includes(u.unit)) || p.units![0], qty = p.unit === 'load' ? 2 : 3 + (i + j) % 6, rate = Math.round(p.costPrice * u.factor_to_base * 100) / 100; movement(p, qty * u.factor_to_base, 'purchase', id, date); return { itemId: p.id, productId: p.id, itemType: 'Finished Product' as const, name: p.name, quantity: qty, unit: u.unit, unitPrice: rate, total: qty * rate }; });
        const total = items.reduce((s, l) => s + l.total, 0), paid = i % 3 === 0 ? total : Math.round(total * .4), due = total - paid;
        supplier.currentBalance += due;
        db.accounts[0].balance -= paid;
        db.purchases.push({ id, poNumber: `PO-${1001 + i}`, date, supplierId: supplier.id, supplierName: supplier.name, items, grandTotal: total, amountPaid: paid, balanceDue: due, status: due ? 'Partial' : 'Paid', paymentMethod: 'Cash', createdAt: `${date}T10:00:00.000Z` });
        db.ledgers.push({ id: `ledger-po-${i}`, partyId: supplier.id, partyType: 'Supplier', date, referenceType: 'Purchase', referenceId: id, description: 'Demo supplier purchase, net payable', debit: 0, credit: due, balance: supplier.currentBalance });
    }
    for (let i = 0; i < 80; i++) {
        const id = `demo-sale-${i + 1}`, date = day(29 - i % 30), customer = db.customers[i % 15], credit = i % 3 === 0 && i % 15 !== 14;
        const items = Array.from({ length: 2 }, (_, j) => { const p = db.products[(i * 7 + j * 3) % db.products.length], u = i % 4 === 0 ? (p.units!.find(u => ['coil', 'box', 'length'].includes(u.unit)) || p.units![0]) : p.units![0], qty = p.unit === 'load' ? 1 : 1 + (i + j) % 4, rate = Math.round(p.retailPrice * u.factor_to_base * 100) / 100; movement(p, -qty * u.factor_to_base, 'sale', id, date); return { productId: p.id, name: p.name, quantity: qty, unit: u.unit, unitPrice: rate, costPrice: p.costPrice * u.factor_to_base, total: qty * rate }; });
        const total = items.reduce((s, l) => s + l.total, 0);
        if (credit) {
            customer.currentBalance += total;
            db.ledgers.push({ id: `ledger-sale-${i}`, partyId: customer.id, partyType: 'Customer', date, referenceType: 'Invoice', referenceId: id, description: 'Demo credit sale', debit: total, credit: 0, balance: customer.currentBalance });
        }
        else
            db.accounts[0].balance += total;
        db.invoices.push({ id, invoiceNumber: `INV-${2001 + i}`, date, customerId: customer.id, customerName: customer.name, customerType: customer.type, phone: customer.phone, address: customer.address, saleType: 'Retail', items, subtotal: total, discount: 0, tax: 0, grandTotal: total, amountPaid: credit ? 0 : total, balanceDue: credit ? total : 0, status: credit ? 'Unpaid' : 'Paid', paymentMethod: credit ? 'Credit' : 'Cash', paymentAccount: 'cash-in-hand', deliveryStatus: 'Delivered', createdAt: `${date}T11:00:00.000Z` });
    }
    for (const p of db.products.slice(-5))
        movement(p, 3 - p.quantity, 'adjust', `count-${p.id}`, anchor);
    for (const p of db.products)
        p.status = p.quantity <= 0 ? 'Out of stock' : p.quantity <= p.reorderLevel ? 'Low stock' : 'In stock';
    db.expenses = [{ id: 'demo-exp-rent', expenseNumber: 'EXP-1001', date: day(15), category: 'Rent', description: 'Shop monthly rent', amount: 25000, paidTo: 'Landlord', paymentMethod: 'Cash', paymentAccount: 'cash-in-hand', status: 'Paid', createdAt: now }, { id: 'demo-exp-freight', expenseNumber: 'EXP-1002', date: day(4), category: 'Fuel & Transport', description: 'Delivery transport', amount: 3500, paidTo: 'Transporter', paymentMethod: 'Cash', paymentAccount: 'cash-in-hand', status: 'Paid', createdAt: now }];
    db.accounts[0].balance -= 28500;
    db.productAliases = [{ aliasKey: 'bijli taar 2.5mm', productId: 'hw-002', source: 'demo' }, { aliasKey: 'pvc pipe 1 inch', productId: 'hw-020', source: 'demo' }];
    return db;
}
