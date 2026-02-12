
const DatabaseHandlers = require('./src/main/ipc/databaseHandlers');
const { app } = require('electron');
const path = require('path');

// Mock app.getPath for testing environment if needed, but since we run with electron, it might work.
// If running with pure node, better to mock. 
// But we will run with `npx electron test_update_library.js`

async function testUpdate() {
    try {
        console.log('Initializing DatabaseHandlers...');
        const handlers = new DatabaseHandlers();

        // Wait a bit for db to init
        await new Promise(r => setTimeout(r, 1000));

        // Get active library or first library
        const libraries = await handlers.db.getBibliotecas();
        if (libraries.length === 0) {
            console.log('No libraries found to update. Creating one...');
            await handlers.db.createUTNLibrary();
        }

        const lib = libraries[0] || (await handlers.db.getBibliotecas())[0];
        console.log('Testing update on library:', lib.nombre);

        const newDescription = `Updated description at ${new Date().toISOString()}`;
        const updates = {
            descripcion: newDescription
        };

        const success = await handlers.db.updateBiblioteca(lib.id, updates);
        console.log('Update result:', success);

        if (success) {
            const updatedLib = await handlers.db.getBibliotecaById(lib.id);
            if (updatedLib.descripcion === newDescription) {
                console.log('SUCCESS: Description updated correctly.');
            } else {
                console.error('FAILURE: Description mismatch.', updatedLib.descripcion);
            }
        } else {
            console.error('FAILURE: Update returned false.');
        }

        // Clean up
        process.exit(0);

    } catch (error) {
        console.error('Test failed with error:', error);
        process.exit(1);
    }
}

app.whenReady().then(testUpdate);
