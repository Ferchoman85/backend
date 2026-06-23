"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("./db"));
async function main() {
    console.log('Starting seeder...');
    // 1. Clean Database
    await db_1.default.exhibition.deleteMany({});
    await db_1.default.inventory.deleteMany({});
    await db_1.default.price.deleteMany({});
    await db_1.default.visitPhoto.deleteMany({});
    await db_1.default.visit.deleteMany({});
    await db_1.default.routeCustomer.deleteMany({});
    await db_1.default.route.deleteMany({});
    await db_1.default.article.deleteMany({});
    await db_1.default.customer.deleteMany({});
    await db_1.default.merchandiser.deleteMany({});
    await db_1.default.user.deleteMany({});
    // 2. Create Admin User
    const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
    const admin = await db_1.default.user.create({
        data: {
            email: 'admin@integratrade.com',
            password: adminPassword,
            name: 'Diego Mantilla (Admin)',
            role: 'ADMIN',
            isActive: true
        }
    });
    console.log('Created Admin user:', admin.email);
    // 3. Create Merchandiser User
    const mercPassword = await bcryptjs_1.default.hash('merc123', 10);
    const mercUser = await db_1.default.user.create({
        data: {
            email: 'merc1@integratrade.com',
            password: mercPassword,
            name: 'Carlos Pérez',
            role: 'MERCADERISTA',
            isActive: true
        }
    });
    const merchandiser = await db_1.default.merchandiser.create({
        data: {
            userId: mercUser.id,
            phone: '+57 300 123 4567'
        }
    });
    console.log('Created Merchandiser user:', mercUser.email);
    // 4. Create Customers
    const customer1 = await db_1.default.customer.create({
        data: {
            code: 'CLI-001',
            name: 'Supermercado Éxito Country',
            address: 'Calle 134 # 9-51, Bogotá',
            latitude: 4.717013,
            longitude: -74.030560,
            phone: '601-3001122',
            contact: 'Sandra Gómez (Gerente de Pasillo)'
        }
    });
    const customer2 = await db_1.default.customer.create({
        data: {
            code: 'CLI-002',
            name: 'Carulla Pepe Sierra',
            address: 'Calle 116 # 15-49, Bogotá',
            latitude: 4.697682,
            longitude: -74.043690,
            phone: '601-4455880',
            contact: 'Jorge Beltrán (Supervisor de Recibo)'
        }
    });
    const customer3 = await db_1.default.customer.create({
        data: {
            code: 'CLI-003',
            name: 'Tiendas D1 Usaquén',
            address: 'Carrera 7 # 120-20, Bogotá',
            latitude: 4.695810,
            longitude: -74.027581,
            phone: '315-9988776',
            contact: 'Andrea Ruiz (Líder de Tienda)'
        }
    });
    const customer4 = await db_1.default.customer.create({
        data: {
            code: 'CLI-004',
            name: 'Olímpica Calle 100',
            address: 'Calle 100 # 13-55, Bogotá',
            latitude: 4.685954,
            longitude: -74.042302,
            phone: '601-9080706',
            contact: 'Marcos Rincón (Jefe de Mercadeo)'
        }
    });
    console.log('Created 4 Customers');
    // 5. Create Articles
    const article1 = await db_1.default.article.create({
        data: {
            code: 'ART-001',
            name: 'Refresco Coca-Cola Sabor Original 1.5L',
            brand: 'Coca-Cola',
            category: 'Bebidas',
            suggestedPrice: 4200.00
        }
    });
    const article2 = await db_1.default.article.create({
        data: {
            code: 'ART-002',
            name: 'Papas Fritas Margarita Natural 110g',
            brand: 'Margarita',
            category: 'Snacks',
            suggestedPrice: 3800.00
        }
    });
    const article3 = await db_1.default.article.create({
        data: {
            code: 'ART-003',
            name: 'Café Sello Rojo Molido 500g',
            brand: 'Sello Rojo',
            category: 'Abarrotes',
            suggestedPrice: 12500.00
        }
    });
    const article4 = await db_1.default.article.create({
        data: {
            code: 'ART-004',
            name: 'Chocolate Corona en Barra 250g',
            brand: 'Corona',
            category: 'Abarrotes',
            suggestedPrice: 7200.00
        }
    });
    console.log('Created 4 Articles');
    // 6. Create Routes & Assign Customers
    const route = await db_1.default.route.create({
        data: {
            name: 'Ruta Bogotá Norte - Lunes y Miércoles',
            merchandiserId: merchandiser.id
        }
    });
    // Assign Customer 1
    await db_1.default.routeCustomer.create({
        data: {
            routeId: route.id,
            customerId: customer1.id,
            order: 1,
            visitDays: 'Lunes,Miércoles'
        }
    });
    // Assign Customer 2
    await db_1.default.routeCustomer.create({
        data: {
            routeId: route.id,
            customerId: customer2.id,
            order: 2,
            visitDays: 'Lunes,Miércoles'
        }
    });
    // Assign Customer 3
    await db_1.default.routeCustomer.create({
        data: {
            routeId: route.id,
            customerId: customer3.id,
            order: 3,
            visitDays: 'Lunes,Miércoles'
        }
    });
    console.log('Created route and assigned customers');
    console.log('Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await db_1.default.$disconnect();
});
