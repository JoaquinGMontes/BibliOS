const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Mock electron modules
const testDirName = `test_data_persistent_${Date.now()}`;
const mockApp = {
    getPath: (name) => {
        if (name === 'userData') return path.join(process.cwd(), testDirName);
        return process.cwd();
    }
};

const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
    if (id === 'electron') {
        return { app: mockApp, ipcMain: { handle: () => { } } };
    }
    return originalRequire.apply(this, arguments);
};

const DatabaseService = require('./src/main/database/database.js');

async function testPersistentCounter() {
    // Clean up test data
    const testDir = path.join(process.cwd(), testDirName);
    if (fs.existsSync(testDir)) {
        try {
            fs.rmSync(testDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('Could not clean up test dir:', e.message);
        }
    }

    console.log('Initializing DatabaseService...');
    const dbService = new DatabaseService();

    try {
        // 1. Create Library
        console.log('Creating library...');
        const lib = await dbService.createBiblioteca({
            nombre: 'Persistent Lib',
            direccion: 'Test Address',
            password: '123'
        });

        // 2. Create Book and Socio
        console.log('Creating assets...');
        const book = await dbService.createLibro({
            titulo: 'Test Book',
            autor: 'Test Author',
            bibliotecaId: lib.id,
            cantidad: 10,
            disponibles: 10
        });

        const socio = await dbService.createSocio({
            nombre: 'Test Socio',
            email: 'test@example.com',
            bibliotecaId: lib.id
        });

        // 3. Create Loan 1 -> Expected #1
        console.log('Creating Loan 1...');
        const params1 = {
            libroId: book.id,
            socioId: socio.id,
            bibliotecaId: lib.id,
            fechaDevolucion: '2025-01-01'
        };
        const loan1Id = await dbService.createPrestamo(params1);
        const loan1 = await dbService.getPrestamoById(loan1Id.id || loan1Id);
        console.log(`Loan 1 created. ID: ${loan1.id}, Numero: ${loan1.numero}`);

        if (loan1.numero !== 1) throw new Error(`Expected Loan 1 to be #1, got #${loan1.numero}`);

        // 4. Create Loan 2 -> Expected #2
        console.log('Creating Loan 2...');
        const params2 = { ...params1 };
        const loan2Id = await dbService.createPrestamo(params2);
        const loan2 = await dbService.getPrestamoById(loan2Id.id || loan2Id);
        console.log(`Loan 2 created. ID: ${loan2.id}, Numero: ${loan2.numero}`);

        if (loan2.numero !== 2) throw new Error(`Expected Loan 2 to be #2, got #${loan2.numero}`);

        // 5. Delete Loan 2
        console.log('Deleting Loan 2...');
        await dbService.deletePrestamo(loan2.id);
        console.log('Loan 2 deleted.');

        // 6. Create Loan 3 -> Expected #3 (NOT #2)
        console.log('Creating Loan 3...');
        const params3 = { ...params1 };
        const loan3Id = await dbService.createPrestamo(params3);
        const loan3 = await dbService.getPrestamoById(loan3Id.id || loan3Id);
        console.log(`Loan 3 created. ID: ${loan3.id}, Numero: ${loan3.numero}`);

        if (loan3.numero !== 3) {
            throw new Error(`Expected Loan 3 to be #3 (persistent counter), but got #${loan3.numero}. The counter was reused!`);
        }

        console.log('SUCCESS: Persistent counter working correctly. No reuse on delete.');

    } catch (error) {
        console.error('TEST FAILED:', error);
        process.exit(1);
    }
}

testPersistentCounter();
