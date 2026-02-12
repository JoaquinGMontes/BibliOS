const { app } = require('electron');
const path = require('path');
const fs = require('fs');

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
    process.exit(1);
});

// Mock electron modules
const testDirName = `test_data_loans_${Date.now()}`;
const mockApp = {
    getPath: (name) => {
        if (name === 'userData') return path.join(process.cwd(), testDirName);
        return process.cwd();
    }
};

// Mock crypto manually since DatabaseService likely uses it
const crypto = require('crypto');

// Mock module for electron
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id) {
    if (id === 'electron') {
        return { app: mockApp, ipcMain: { handle: () => { } } };
    }
    return originalRequire.apply(this, arguments);
};

const DatabaseService = require('./src/main/database/database.js');

async function testLoanNumbering() {
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
        // 1. Create Libraries
        console.log('Creating libraries...');
        const libA = await dbService.createBiblioteca({
            nombre: 'Library A',
            direccion: 'Address A',
            password: '123'
        });

        const libB = await dbService.createBiblioteca({
            nombre: 'Library B',
            direccion: 'Address B',
            password: '123'
        });

        // 2. Create Book and Socio for Lib A
        console.log('Creating assets for Lib A...');
        const bookA = await dbService.createLibro({
            titulo: 'Book A',
            autor: 'Author A',
            bibliotecaId: libA.id,
            cantidad: 1,
            disponibles: 1
        });

        const socioA = await dbService.createSocio({
            nombre: 'Socio A',
            email: 'socioA@test.com',
            bibliotecaId: libA.id
        });

        // 3. Create Book and Socio for Lib B
        console.log('Creating assets for Lib B...');
        const bookB = await dbService.createLibro({
            titulo: 'Book B',
            autor: 'Author B',
            bibliotecaId: libB.id,
            cantidad: 1,
            disponibles: 1
        });

        const socioB = await dbService.createSocio({
            nombre: 'Socio B',
            email: 'socioB@test.com',
            bibliotecaId: libB.id
        });

        // 4. Create Loans in Lib A
        console.log('Creating Loan 1 in Lib A...');
        await dbService.createPrestamo({
            libroId: bookA.id,
            socioId: socioA.id,
            bibliotecaId: libA.id,
            fechaDevolucion: '2024-12-31'
        });

        // Note: To avoid availability error, let's create another book
        const bookA2 = await dbService.createLibro({ titulo: 'Book A2', autor: 'Author A', bibliotecaId: libA.id, cantidad: 1, disponibles: 1 });

        await dbService.createPrestamo({
            libroId: bookA2.id,
            socioId: socioA.id,
            bibliotecaId: libA.id,
            fechaDevolucion: '2024-12-31'
        });



        // 5. Create Loan in Lib B
        console.log('Creating Loan 1 in Lib B...');
        await dbService.createPrestamo({
            libroId: bookB.id,
            socioId: socioB.id,
            bibliotecaId: libB.id,
            fechaDevolucion: '2024-12-31'
        });

        // 6. Verify Numbers
        const loansA = await dbService.getPrestamos(libA.id);
        const loansB = await dbService.getPrestamos(libB.id);

        console.log('Loans in Lib A:', loansA.map(l => ({ id: l.id, numero: l.numero })));
        console.log('Loans in Lib B:', loansB.map(l => ({ id: l.id, numero: l.numero })));

        // Sort by numero to verify sequence
        loansA.sort((a, b) => a.numero - b.numero);
        loansB.sort((a, b) => a.numero - b.numero);

        const loanA1 = loansA[0];
        const loanA2 = loansA[1];
        const loanB1 = loansB[0];

        if (loanA1.numero !== 1) throw new Error(`Loan A1 should be #1, got ${loanA1.numero}`);
        if (loanA2.numero !== 2) throw new Error(`Loan A2 should be #2, got ${loanA2.numero}`);
        if (loanB1.numero !== 1) throw new Error(`Loan B1 should be #1, got ${loanB1.numero}`);

        console.log('SUCCESS: Loan numbering is scoped per library!');

    } catch (error) {
        console.error('TEST FAILED:', error);
        if (error.code) console.error('Error Code:', error.code);
        if (error.message) console.error('Error Message:', error.message);
        process.exit(1);
    }
}

testLoanNumbering();
