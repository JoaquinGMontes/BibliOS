const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = 'C:\\Users\\Jesus\\AppData\\Roaming\\biblios\\BibliOS\\biblios.db';
console.log('Opening database at:', dbPath);

try {
    const db = new Database(dbPath, { verbose: console.log });

    console.log('--- DUMPING PRESTAMOS TABLE ---');
    const loans = db.prepare('SELECT id, bibliotecaId, numero FROM prestamos').all();

    console.log('--- CHECKING TABLE INFO ---');
    const info = db.prepare('PRAGMA table_info(prestamos)').all();

    const output = {
        loans: loans,
        info: info
    };

    fs.writeFileSync('debug_output.json', JSON.stringify(output, null, 2));
    console.log('Done writing debug_output.json');
    db.close();

} catch (error) {
    console.error('Error opening database:', error);
}
