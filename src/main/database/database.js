const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

// ===== VALIDADORES =====
class Validators {
    static validateEmail(email) {
        if (!email) return true; // Devuelve true aunque no esté ya que el Email es opcional
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        if (!phone) return true; // Teléfono opcional
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10;
    }

    static validateISBN(isbn) {
        if (!isbn) return true; // ISBN opcional
        const cleanISBN = isbn.replace(/[-\s]/g, '');
        // ISBN-10: 10 dígitos
        if (cleanISBN.length === 10) {
            return /^\d{9}[\dX]$/.test(cleanISBN);
        }
        // ISBN-13: 13 dígitos
        if (cleanISBN.length === 13) {
            return /^\d{13}$/.test(cleanISBN);
        }
        return false;
    }

    static validateYear(year) {
        if (!year) return true; // Año opcional
        const currentYear = new Date().getFullYear();
        return year >= 0 && year <= currentYear + 1;
    }

    static validateRequired(value, fieldName) {

        const stringValue = String(value || ''); // Si tiene un valor thruty lo convierte a string, si no, devuelve una cadena vacía
        if (!value || stringValue.trim() === '') { // si value es falsy devuelve true
            throw new Error(`El campo "${fieldName}" es requerido`);
        }
        return true;
    }

    static validatePositiveNumber(value, fieldName) {
        if (value !== undefined && value !== null) {
            const num = Number(value);
            if (isNaN(num) || num < 0) {
                throw new Error(`El campo "${fieldName}" debe ser un número positivo`);
            }
        }
        return true;
    }
}

class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = null;
        this.init();
    }

    init() {
        try {
            console.log('Inicializando base de datos SQLite...');

            // Crear directorio de datos si no existe
            const userDataPath = app.getPath('userData'); // Ruta al directorio de datos del usuario
            const dbDir = path.join(userDataPath, 'BibliOS'); // Ruta al directorio de la base de datos

            // Crear directorio si no existe
            const fs = require('fs'); // Importa el modulo del sistema de archivos y se lo asigna a la variable fs
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Ruta de la base de datos
            this.dbPath = path.join(dbDir, 'biblios.db');// Nombre del arc de la BD

            // Conectar a la base de datos
            this.db = new Database(this.dbPath);//Crea una conexión directa a ese archivo (el de arriba).

            // Habilitar foreign keys
            this.db.pragma('foreign_keys = ON');

            // Funcion para crear tablas (implementada abajo)
            this.createTables();

            // Migrar tablas existentes si es necesario
            this.migrateTables();

            console.log(`Base de datos SQLite inicializada en: ${this.dbPath}`);

        } catch (error) {
            console.error('Error al inicializar la base de datos:', error);
            throw error;
        }
    }

    createTables() {
        try {
            // Tabla bibliotecas
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS bibliotecas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL UNIQUE,
                    direccion TEXT,
                    telefono TEXT,
                    email TEXT,
                    responsable TEXT,
                    horarios TEXT,
                    descripcion TEXT,
                    password TEXT,
                    salt TEXT,
                    fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    activa BOOLEAN DEFAULT 0
                )
            `);

            // Tabla libros
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS libros (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    titulo TEXT NOT NULL,
                    autor TEXT NOT NULL,
                    isbn TEXT,
                    categoria TEXT,
                    editorial TEXT,
                    lugarPublicacion TEXT,
                    anioPublicacion INTEGER,
                    edicion TEXT,
                    cantidad INTEGER DEFAULT 1,
                    disponibles INTEGER DEFAULT 1,
                    paginas TEXT,
                    clasificacion TEXT,
                    ubicacion TEXT,
                    estado TEXT DEFAULT 'disponible',
                    descripcion TEXT,
                    cabecera TEXT,
                    numeroControl TEXT,
                    bibliotecaId INTEGER,
                    fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE,
                    UNIQUE(isbn, bibliotecaId)
                )
            `);

            // Tabla socios
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS socios (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    email TEXT NOT NULL,
                    telefono TEXT,
                    direccion TEXT,
                    fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
                    estado TEXT DEFAULT 'activo',
                    observaciones TEXT,
                    bibliotecaId INTEGER,
                    FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE,
                    UNIQUE(email, bibliotecaId),
                    UNIQUE(telefono, bibliotecaId)
                )
            `);

            // Tabla préstamos
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS prestamos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    libroId INTEGER,
                    socioId INTEGER,
                    bibliotecaId INTEGER,
                    fechaPrestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fechaDevolucion DATETIME,
                    fechaDevolucionReal DATETIME,
                    estado TEXT DEFAULT 'activo',
                    observaciones TEXT,
                    numero INTEGER,
                    FOREIGN KEY (libroId) REFERENCES libros(id) ON DELETE SET NULL,
                    FOREIGN KEY (socioId) REFERENCES socios(id) ON DELETE SET NULL,
                    FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE,
                    UNIQUE(numero, bibliotecaId)
                )
            `);

            // Crear índices para mejorar rendimiento
            this.db.exec(`
                -- Índices para libros
                CREATE INDEX IF NOT EXISTS idx_libros_titulo ON libros(titulo);
                CREATE INDEX IF NOT EXISTS idx_libros_autor ON libros(autor);
                CREATE INDEX IF NOT EXISTS idx_libros_categoria ON libros(categoria);
                CREATE INDEX IF NOT EXISTS idx_libros_biblioteca ON libros(bibliotecaId);
                CREATE INDEX IF NOT EXISTS idx_libros_isbn ON libros(isbn);
                CREATE INDEX IF NOT EXISTS idx_libros_estado ON libros(estado);
                CREATE INDEX IF NOT EXISTS idx_libros_disponibles ON libros(disponibles);
                
                -- Índices para socios
                CREATE INDEX IF NOT EXISTS idx_socios_nombre ON socios(nombre);
                CREATE INDEX IF NOT EXISTS idx_socios_biblioteca ON socios(bibliotecaId);
                CREATE INDEX IF NOT EXISTS idx_socios_estado ON socios(estado);
                CREATE INDEX IF NOT EXISTS idx_socios_email ON socios(email);
                
                -- Índices para préstamos
                CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
                CREATE INDEX IF NOT EXISTS idx_prestamos_biblioteca ON prestamos(bibliotecaId);
                CREATE INDEX IF NOT EXISTS idx_prestamos_libro ON prestamos(libroId);
                CREATE INDEX IF NOT EXISTS idx_prestamos_socio ON prestamos(socioId);
                CREATE INDEX IF NOT EXISTS idx_prestamos_fecha ON prestamos(fechaPrestamo);
                CREATE INDEX IF NOT EXISTS idx_prestamos_devolucion ON prestamos(fechaDevolucion);
                
                -- Índices para bibliotecas
                CREATE INDEX IF NOT EXISTS idx_bibliotecas_activa ON bibliotecas(activa);
                CREATE INDEX IF NOT EXISTS idx_bibliotecas_nombre ON bibliotecas(nombre);
            `);

            console.log('Tablas creadas correctamente');

        } catch (error) {
            console.error('Error al crear tablas:', error);
            throw error;
        }
    }

    migrateTables() {
        try {
            // Verificar si la tabla socios existe
            const tableInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='socios'").get();

            if (tableInfo) {
                // Obtener la estructura actual de la tabla
                const pragmaInfo = this.db.prepare("PRAGMA table_info(socios)").all();
                const emailColumn = pragmaInfo.find(col => col.name === 'email');

                // Si la columna email existe pero no tiene restricción UNIQUE
                if (emailColumn && !emailColumn.notnull) {
                    console.log('Migrando tabla socios: agregando restricción UNIQUE al email...');

                    // Crear tabla temporal con la nueva estructura
                    this.db.exec(`
                        CREATE TABLE socios_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            nombre TEXT NOT NULL,
                            email TEXT NOT NULL UNIQUE,
                            telefono TEXT,
                            direccion TEXT,
                            fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
                            estado TEXT DEFAULT 'activo',
                            observaciones TEXT,
                            bibliotecaId INTEGER,
                            FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE
                        )
                    `);

                    // Copiar datos existentes (eliminando duplicados si existen)
                    this.db.exec(`
                        INSERT INTO socios_new (id, nombre, email, telefono, direccion, fechaRegistro, estado, observaciones, bibliotecaId)
                        SELECT id, nombre, 
                               CASE WHEN email IS NULL OR email = '' THEN 'sin-email-' || id || '@temporal.com' ELSE email END,
                               telefono, direccion, fechaRegistro, estado, observaciones, bibliotecaId
                        FROM socios
                        GROUP BY LOWER(TRIM(email))
                    `);

                    // Eliminar tabla antigua
                    this.db.exec('DROP TABLE socios');

                    // Renombrar tabla nueva
                    this.db.exec('ALTER TABLE socios_new RENAME TO socios');

                    // Recrear índices
                    this.db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_socios_nombre ON socios(nombre);
                        CREATE INDEX IF NOT EXISTS idx_socios_biblioteca ON socios(bibliotecaId);
                        CREATE INDEX IF NOT EXISTS idx_socios_estado ON socios(estado);
                        CREATE INDEX IF NOT EXISTS idx_socios_email ON socios(email);
                    `);

                    console.log('Migración completada: email ahora es único y requerido');
                }
            }

            // Migrar tabla préstamos para cambiar CASCADE a SET NULL
            const prestamosTableInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prestamos'").get();

            if (prestamosTableInfo) {
                // Verificar si necesita migración buscando la definición de la tabla
                const tableDef = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='prestamos'").get();

                console.log('Verificando migración de tabla préstamos...');
                console.log('Definición actual:', tableDef ? tableDef.sql : 'No encontrada');

                // Migrar si tiene CASCADE o si no tiene SET NULL
                const needsMigration = tableDef && (
                    tableDef.sql.includes('ON DELETE CASCADE') ||
                    !tableDef.sql.includes('ON DELETE SET NULL')
                );

                console.log('¿Necesita migración?', needsMigration);

                if (needsMigration) {
                    console.log('Migrando tabla préstamos: cambiando CASCADE a SET NULL...');

                    // Crear tabla temporal con la nueva estructura
                    this.db.exec(`
                        CREATE TABLE prestamos_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            libroId INTEGER,
                            socioId INTEGER,
                            bibliotecaId INTEGER,
                            fechaPrestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
                            fechaDevolucion DATETIME,
                            fechaDevolucionReal DATETIME,
                            estado TEXT DEFAULT 'activo',
                            observaciones TEXT,
                            FOREIGN KEY (libroId) REFERENCES libros(id) ON DELETE SET NULL,
                            FOREIGN KEY (socioId) REFERENCES socios(id) ON DELETE SET NULL,
                            FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE
                        )
                    `);

                    // Copiar datos existentes
                    this.db.exec(`
                        INSERT INTO prestamos_new (id, libroId, socioId, bibliotecaId, fechaPrestamo, fechaDevolucion, fechaDevolucionReal, estado, observaciones)
                        SELECT id, libroId, socioId, bibliotecaId, fechaPrestamo, fechaDevolucion, fechaDevolucionReal, estado, observaciones
                        FROM prestamos
                    `);

                    // Eliminar tabla antigua
                    this.db.exec('DROP TABLE prestamos');

                    // Renombrar tabla nueva
                    this.db.exec('ALTER TABLE prestamos_new RENAME TO prestamos');

                    // Recrear índices
                    this.db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
                        CREATE INDEX IF NOT EXISTS idx_prestamos_biblioteca ON prestamos(bibliotecaId);
                        CREATE INDEX IF NOT EXISTS idx_prestamos_libro ON prestamos(libroId);
                        CREATE INDEX IF NOT EXISTS idx_prestamos_socio ON prestamos(socioId);
                        CREATE INDEX IF NOT EXISTS idx_prestamos_fecha ON prestamos(fechaPrestamo);
                        CREATE INDEX IF NOT EXISTS idx_prestamos_devolucion ON prestamos(fechaDevolucion);
                    `);

                    console.log('Migración completada: préstamos ahora mantienen historial al eliminar libros/socios');
                } else {
                    console.log('Tabla préstamos ya tiene la estructura correcta (SET NULL)');
                }
            }

            // Migrar tabla libros: agregar columnas si no existen (cabecera, numeroControl, lugarPublicacion, edicion, paginas, clasificacion)
            const librosTableInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='libros'").get();
            if (librosTableInfo) {
                const librosColumns = this.db.prepare("PRAGMA table_info(libros)").all();
                const colNames = librosColumns.map(c => c.name);
                const columnsToAdd = [
                    'cabecera', 'numeroControl', 'lugarPublicacion', 'edicion', 'paginas', 'clasificacion'
                ];
                for (const col of columnsToAdd) {
                    if (!colNames.includes(col)) {
                        this.db.exec(`ALTER TABLE libros ADD COLUMN ${col} TEXT`);
                        console.log(`Migración libros: agregada columna ${col}`);
                    }
                }
            }

            // Migración: Permitir mismo email en diferentes bibliotecas
            // Verificamos si la tabla tiene la restricción UNIQUE(email, bibliotecaId)
            const sociosDef = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='socios'").get();
            // Si la definición existe y NO tiene la restricción compuesta, migramos
            if (sociosDef && !sociosDef.sql.includes('UNIQUE(email, bibliotecaId)')) {
                console.log('Migrando tabla socios: permitiendo emails duplicados en diferentes bibliotecas...');

                this.db.transaction(() => {
                    // Crear tabla temporal con la nueva estructura
                    this.db.exec(`
                        CREATE TABLE socios_v2 (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            nombre TEXT NOT NULL,
                            email TEXT NOT NULL,
                            telefono TEXT,
                            direccion TEXT,
                            fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
                            estado TEXT DEFAULT 'activo',
                            observaciones TEXT,
                            bibliotecaId INTEGER,
                            FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE,
                            UNIQUE(email, bibliotecaId)
                        )
                    `);

                    // Copiar datos existentes
                    this.db.exec(`
                        INSERT INTO socios_v2 (id, nombre, email, telefono, direccion, fechaRegistro, estado, observaciones, bibliotecaId)
                        SELECT id, nombre, email, telefono, direccion, fechaRegistro, estado, observaciones, bibliotecaId
                        FROM socios
                    `);

                    // Eliminar tabla antigua y renombrar nueva
                    this.db.exec('DROP TABLE socios');
                    this.db.exec('ALTER TABLE socios_v2 RENAME TO socios');

                    // Recrear índices
                    this.db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_socios_nombre ON socios(nombre);
                        CREATE INDEX IF NOT EXISTS idx_socios_biblioteca ON socios(bibliotecaId);
                        CREATE INDEX IF NOT EXISTS idx_socios_estado ON socios(estado);
                        CREATE INDEX IF NOT EXISTS idx_socios_email ON socios(email);
                    `);
                })();

                console.log('Migración de socios completada exitosamente');
            }

            // Migración: Asegurar unicidad de teléfonos por biblioteca
            // Verificamos si la tabla tiene la restricción UNIQUE(telefono, bibliotecaId)
            const sociosDefV3 = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='socios'").get();
            if (sociosDefV3 && !sociosDefV3.sql.includes('UNIQUE(telefono, bibliotecaId)')) {
                console.log('Migrando tabla socios v3: asegurando teléfonos únicos por biblioteca...');

                this.db.transaction(() => {
                    // Crear tabla temporal con nueva estructura
                    this.db.exec(`
                        CREATE TABLE socios_v3 (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            nombre TEXT NOT NULL,
                            email TEXT NOT NULL,
                            telefono TEXT,
                            direccion TEXT,
                            fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
                            estado TEXT DEFAULT 'activo',
                            observaciones TEXT,
                            bibliotecaId INTEGER,
                            FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE,
                            UNIQUE(email, bibliotecaId),
                            UNIQUE(telefono, bibliotecaId)
                        )
                    `);

                    // Copiar datos
                    // Importante: Si hay teléfonos duplicados, vamos a tener un problema.
                    // SQLite con INSERT INTO ... SELECT fallará si rompe la constraint.
                    // Podríamos intentar arreglar los duplicados agregando algo al telefono, o just let it fail/handle it.
                    // Para evitar fallo catastrófico, usamos INSERT OR IGNORE o modificamos los duplicados al vuelo.
                    // Vamos a intentar modificar los duplicados appendando el ID.

                    // Primero copiamos todo lo que no rompe reglas (donde telefono es null o unico)
                    // Haremos algo más inteligente: SELECT y luego INSERT manual manejando duplicados

                    const sociosOld = this.db.prepare("SELECT * FROM socios").all();
                    const insertStmt = this.db.prepare(`
                        INSERT INTO socios_v3 (id, nombre, email, telefono, direccion, fechaRegistro, estado, observaciones, bibliotecaId)
                        VALUES (@id, @nombre, @email, @telefono, @direccion, @fechaRegistro, @estado, @observaciones, @bibliotecaId)
                    `);

                    const checkPhone = this.db.prepare("SELECT id FROM socios_v3 WHERE telefono = ? AND bibliotecaId = ?");

                    for (const socio of sociosOld) {
                        let telefonoToInsert = socio.telefono;

                        if (telefonoToInsert) {
                            const exists = checkPhone.get(telefonoToInsert, socio.bibliotecaId);
                            if (exists) {
                                // Si ya existe, lo modificamos para que sea válido y no perder el dato
                                console.warn(`Teléfono duplicado encontrado durante migración (Socio ID ${socio.id}). Modificando...`);
                                telefonoToInsert = `${telefonoToInsert}-${socio.id}`;
                            }
                        }

                        insertStmt.run({
                            ...socio,
                            telefono: telefonoToInsert
                        });
                    }

                    this.db.exec('DROP TABLE socios');
                    this.db.exec('ALTER TABLE socios_v3 RENAME TO socios');

                    // Recrear índices
                    this.db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_socios_nombre ON socios(nombre);
                        CREATE INDEX IF NOT EXISTS idx_socios_biblioteca ON socios(bibliotecaId);
                        CREATE INDEX IF NOT EXISTS idx_socios_estado ON socios(estado);
                        CREATE INDEX IF NOT EXISTS idx_socios_email ON socios(email);
                    `);
                })();

                console.log('Migración de socios v3 completada exitosamente');
            }

            // Migración: Permitir mismo ISBN en diferentes bibliotecas
            // Verificamos si la tabla libros tiene la restricción UNIQUE(isbn, bibliotecaId)
            const librosDef = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='libros'").get();
            if (librosDef && !librosDef.sql.includes('UNIQUE(isbn, bibliotecaId)')) {
                console.log('Migrando tabla libros: permitiendo ISBNs duplicados en diferentes bibliotecas...');

                this.db.transaction(() => {
                    // Crear tabla temporal con nueva estructura
                    this.db.exec(`
                        CREATE TABLE libros_v2 (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            titulo TEXT NOT NULL,
                            autor TEXT NOT NULL,
                            isbn TEXT,
                            categoria TEXT,
                            editorial TEXT,
                            lugarPublicacion TEXT,
                            anioPublicacion INTEGER,
                            edicion TEXT,
                            cantidad INTEGER DEFAULT 1,
                            disponibles INTEGER DEFAULT 1,
                            paginas TEXT,
                            clasificacion TEXT,
                            ubicacion TEXT,
                            estado TEXT DEFAULT 'disponible',
                            descripcion TEXT,
                            cabecera TEXT,
                            bibliotecaId INTEGER,
                            FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE,
                            UNIQUE(isbn, bibliotecaId)
                        )
                    `);

                    // Copiar datos
                    this.db.exec(`
                        INSERT INTO libros_v2 (id, titulo, autor, isbn, categoria, editorial, lugarPublicacion, anioPublicacion, edicion, cantidad, disponibles, paginas, clasificacion, ubicacion, estado, descripcion, cabecera, bibliotecaId)
                        SELECT id, titulo, autor, isbn, categoria, editorial, lugarPublicacion, anioPublicacion, edicion, cantidad, disponibles, paginas, clasificacion, ubicacion, estado, descripcion, cabecera, bibliotecaId
                        FROM libros
                    `);

                    // Eliminar tabla antigua y renombrar nueva
                    this.db.exec('DROP TABLE libros');
                    this.db.exec('ALTER TABLE libros_v2 RENAME TO libros');

                    // Indices para libros
                    this.db.exec(`
                        CREATE INDEX IF NOT EXISTS idx_libros_titulo ON libros(titulo);
                        CREATE INDEX IF NOT EXISTS idx_libros_autor ON libros(autor);
                        CREATE INDEX IF NOT EXISTS idx_libros_isbn ON libros(isbn);
                        CREATE INDEX IF NOT EXISTS idx_libros_categoria ON libros(categoria);
                        CREATE INDEX IF NOT EXISTS idx_libros_biblioteca ON libros(bibliotecaId);
                    `);
                })();
            }

            // Migración: Agregar número de préstamo secuencial por biblioteca
            // Verificamos si la tabla prestamos tiene la columna numero
            const prestamosInfo = this.db.prepare("PRAGMA table_info(prestamos)").all();
            const hasNumeroCol = prestamosInfo.some(c => c.name === 'numero');

            // Verificamos si hay préstamos con numero NULL (migración incompleta o previa)
            let hasNullNumero = false;
            if (hasNumeroCol) {
                const nullCheck = this.db.prepare("SELECT COUNT(*) as count FROM prestamos WHERE numero IS NULL").get();
                hasNullNumero = nullCheck.count > 0;
            }

            if (!hasNumeroCol || hasNullNumero) {
                console.log('Migrando tabla prestamos: agregando/corrigiendo números secuenciales por biblioteca...');

                this.db.transaction(() => {
                    // Si no existe la columna, recreamos la tabla. 
                    // Si existe pero hay nulos, también recreamos para simplificar la lógica de renumeración.

                    // Crear tabla temporal con nueva estructura
                    this.db.exec(`
                         CREATE TABLE IF NOT EXISTS prestamos_v2 (
                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                             libroId INTEGER,
                             socioId INTEGER,
                             bibliotecaId INTEGER,
                             fechaPrestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
                             fechaDevolucion DATETIME,
                             fechaDevolucionReal DATETIME,
                             estado TEXT DEFAULT 'activo',
                             observaciones TEXT,
                             numero INTEGER,
                             FOREIGN KEY (libroId) REFERENCES libros(id) ON DELETE SET NULL,
                             FOREIGN KEY (socioId) REFERENCES socios(id) ON DELETE SET NULL,
                             FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE,
                             UNIQUE(numero, bibliotecaId)
                         )
                     `);

                    // Obtener todos los préstamos existentes agrupados por biblioteca
                    const bibliotecas = this.db.prepare("SELECT DISTINCT bibliotecaId FROM prestamos").all();

                    for (const bib of bibliotecas) {
                        // Ordenar por fecha o ID para mantener orden cronológico
                        const prestamosBib = this.db.prepare("SELECT * FROM prestamos WHERE bibliotecaId = ? ORDER BY id ASC").all(bib.bibliotecaId);

                        let contador = 1;
                        const insertStmt = this.db.prepare(`
                             INSERT INTO prestamos_v2 (id, libroId, socioId, bibliotecaId, fechaPrestamo, fechaDevolucion, fechaDevolucionReal, estado, observaciones, numero)
                             VALUES (@id, @libroId, @socioId, @bibliotecaId, @fechaPrestamo, @fechaDevolucion, @fechaDevolucionReal, @estado, @observaciones, @numero)
                         `);

                        for (const prestamo of prestamosBib) {
                            insertStmt.run({
                                ...prestamo,
                                numero: contador++
                            });
                        }
                    }

                    // Eliminar tabla antigua y renombrar nueva
                    this.db.exec('DROP TABLE prestamos');
                    this.db.exec('ALTER TABLE prestamos_v2 RENAME TO prestamos');


                    // Recrear índices
                    this.db.exec(`
                         CREATE INDEX IF NOT EXISTS idx_prestamos_estado ON prestamos(estado);
                         CREATE INDEX IF NOT EXISTS idx_prestamos_biblioteca ON prestamos(bibliotecaId);
                         CREATE INDEX IF NOT EXISTS idx_prestamos_libro ON prestamos(libroId);
                         CREATE INDEX IF NOT EXISTS idx_prestamos_socio ON prestamos(socioId);
                         CREATE INDEX IF NOT EXISTS idx_prestamos_fecha ON prestamos(fechaPrestamo);
                         CREATE INDEX IF NOT EXISTS idx_prestamos_devolucion ON prestamos(fechaDevolucion);
                     `);
                })();

                console.log('Migración de préstamos completada exitosamente');
            }

            // Migración: Agregar contador persistente de préstamos a bibliotecas
            // Verificamos si bibliotecas tiene lastPrestamoNumero
            const bibInfo = this.db.prepare("PRAGMA table_info(bibliotecas)").all();
            const hasLastPrestamoNumero = bibInfo.some(c => c.name === 'lastPrestamoNumero');

            if (!hasLastPrestamoNumero) {
                console.log('Migrando bibliotecas: agregando contador persistente de préstamos...');
                this.db.exec("ALTER TABLE bibliotecas ADD COLUMN lastPrestamoNumero INTEGER DEFAULT 0");

                // Inicializar con el máximo número de préstamo actual para cada biblioteca
                const bibliotecas = this.db.prepare("SELECT id FROM bibliotecas").all();
                const updateCounter = this.db.prepare("UPDATE bibliotecas SET lastPrestamoNumero = ? WHERE id = ?");
                const getMaxNumero = this.db.prepare("SELECT MAX(numero) as maxNum FROM prestamos WHERE bibliotecaId = ?");

                for (const bib of bibliotecas) {
                    const result = getMaxNumero.get(bib.id);
                    const maxNum = result.maxNum || 0;
                    updateCounter.run(maxNum, bib.id);
                    console.log(`Biblioteca ${bib.id}: lastPrestamoNumero inicializado a ${maxNum}`);
                }
            }

        } catch (error) {
            console.error('Error al migrar tablas:', error);
            // No lanzar error para no bloquear la aplicación
        }

        // Migración: Agregar password y salt a bibliotecas si no existen
        try {
            const tableInfo = this.db.prepare("PRAGMA table_info(bibliotecas)").all();
            const colNames = tableInfo.map(c => c.name);

            if (!colNames.includes('password')) {
                console.log('Migrando bibliotecas: agregando columnas de autenticación...');
                this.db.exec("ALTER TABLE bibliotecas ADD COLUMN password TEXT");
                this.db.exec("ALTER TABLE bibliotecas ADD COLUMN salt TEXT");

                // Establecer contraseña por defecto '123456' para bibliotecas existentes
                const salt = crypto.randomBytes(16).toString('hex');
                const hash = crypto.pbkdf2Sync('123456', salt, 1000, 64, 'sha512').toString('hex');

                this.db.prepare("UPDATE bibliotecas SET password = ?, salt = ?").run(hash, salt);
                console.log('Bibliotecas migradas con contraseña por defecto "123456"');
            }
        } catch (error) {
            console.error('Error al migrar autenticación:', error);
        }
    }

    // ===== OPERACIONES DE BIBLIOTECAS =====

    async createBiblioteca(bibliotecaData) {
        try {
            // VALIDACIONES
            Validators.validateRequired(bibliotecaData.nombre, 'nombre');

            if (bibliotecaData.email && !Validators.validateEmail(bibliotecaData.email)) {
                throw new Error('El email proporcionado no es válido');
            }

            if (bibliotecaData.telefono && !Validators.validatePhone(bibliotecaData.telefono)) {
                throw new Error('El teléfono debe tener al menos 10 dígitos');
            }

            // Verificar si ya existe una biblioteca con ese nombre
            const existingLibrary = this.db.prepare('SELECT id FROM bibliotecas WHERE nombre = ?').get(bibliotecaData.nombre);

            if (existingLibrary) {
                throw new Error(`Ya existe una biblioteca con el nombre "${bibliotecaData.nombre}". Por favor, elige un nombre diferente.`);
            }

            // Desactivar todas las bibliotecas existentes
            this.db.prepare('UPDATE bibliotecas SET activa = 0').run();

            const stmt = this.db.prepare(`
                INSERT INTO bibliotecas (nombre, direccion, telefono, email, responsable, horarios, descripcion, activa)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `);

            const result = stmt.run(
                bibliotecaData.nombre,
                bibliotecaData.direccion || null,
                bibliotecaData.telefono || null,
                bibliotecaData.email || null,
                bibliotecaData.responsable || null,
                bibliotecaData.horarios || null,
                bibliotecaData.descripcion || null
            );

            // Si hay contraseña, la guardamos (asumiendo que viene en bibliotecaData.password)
            // Si no viene, generamos una por defecto o dejamos null (pero mejor exigirla)
            if (bibliotecaData.password) {
                const salt = crypto.randomBytes(16).toString('hex');
                const hash = crypto.pbkdf2Sync(bibliotecaData.password, salt, 1000, 64, 'sha512').toString('hex');

                this.db.prepare("UPDATE bibliotecas SET password = ?, salt = ? WHERE id = ?")
                    .run(hash, salt, result.lastInsertRowid);
            }

            return this.getBibliotecaById(result.lastInsertRowid);
        } catch (error) {
            console.error('Error al crear biblioteca:', error);
            throw error;
        }
    }

    async getBibliotecas() {
        try {
            // No devolver password ni salt
            const stmt = this.db.prepare('SELECT id, nombre, direccion, telefono, email, responsable, horarios, descripcion, fechaCreacion, activa FROM bibliotecas ORDER BY fechaCreacion DESC');
            return stmt.all();
        } catch (error) {
            console.error('Error al obtener bibliotecas:', error);
            throw error;
        }
    }

    async getBibliotecaById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM bibliotecas WHERE id = ?');
            return stmt.get(id);
        } catch (error) {
            console.error('Error al obtener biblioteca:', error);
            throw error;
        }
    }

    async getBibliotecaActiva() {
        try {
            const stmt = this.db.prepare('SELECT * FROM bibliotecas WHERE activa = 1 LIMIT 1');
            return stmt.get();
        } catch (error) {
            console.error('Error al obtener biblioteca activa:', error);
            throw error;
        }
    }

    async updateBiblioteca(id, updates) {
        try {
            const fields = [];
            const values = [];

            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(updates[key]);
                }
            });

            if (fields.length === 0) return false;

            values.push(id);
            const stmt = this.db.prepare(`UPDATE bibliotecas SET ${fields.join(', ')} WHERE id = ?`);
            const result = stmt.run(...values);

            return result.changes > 0;
        } catch (error) {
            console.error('Error al actualizar biblioteca:', error);
            throw error;
        }
    }

    async deleteBiblioteca(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM bibliotecas WHERE id = ?');
            const result = stmt.run(id);
            return result.changes > 0;
        } catch (error) {
            console.error('Error al eliminar biblioteca:', error);
            throw error;
        }
    }

    async activateBiblioteca(id) {
        try {
            // Desactivar todas las bibliotecas
            this.db.prepare('UPDATE bibliotecas SET activa = 0').run();

            // Activar la biblioteca seleccionada
            const stmt = this.db.prepare('UPDATE bibliotecas SET activa = 1 WHERE id = ?');
            const result = stmt.run(id);

            return result.changes > 0;
        } catch (error) {
            console.error('Error al activar biblioteca:', error);
            throw error;
        }
    }

    async loginBiblioteca(nombre, password) {
        try {
            const biblioteca = this.db.prepare('SELECT * FROM bibliotecas WHERE nombre = ?').get(nombre);

            if (!biblioteca) {
                throw new Error('Biblioteca no encontrada');
            }

            if (!biblioteca.password || !biblioteca.salt) {
                // Si es una biblioteca antigua sin password (aunque la migración debería haberlo arreglado)
                // Permitir acceso si no tiene pass configurada (o forzar update, depende política)
                // Para seguridad, requerimos pass.
                throw new Error('Esta biblioteca no tiene contraseña configurada. Contacte soporte.');
            }

            const hash = crypto.pbkdf2Sync(password, biblioteca.salt, 1000, 64, 'sha512').toString('hex');

            if (hash === biblioteca.password) {
                // Login exitoso: activar biblioteca
                await this.activateBiblioteca(biblioteca.id);

                // Devolver datos sin password/salt
                const { password, salt, ...safeBiblioteca } = biblioteca;
                return safeBiblioteca;
            } else {
                throw new Error('Contraseña incorrecta');
            }
        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    }

    // ===== OPERACIONES DE LIBROS =====

    async createLibro(libroData) {
        try {
            // VALIDACIONES
            Validators.validateRequired(libroData.titulo, 'titulo');// Valida que el titulo no esté vacío
            Validators.validateRequired(libroData.autor, 'autor');// lo mismo el autor
            Validators.validateRequired(libroData.bibliotecaId, 'bibliotecaId'); // se asegura de que se asigne a una biblioteca

            if (libroData.isbn && !Validators.validateISBN(libroData.isbn)) { //para que la sentencia derecha de true, el valid tiene que ser false(no cumple el formato)
                throw new Error('El ISBN proporcionado no es válido (debe ser ISBN-10 o ISBN-13)');
            }

            if (libroData.anioPublicacion && !Validators.validateYear(libroData.anioPublicacion)) { //lo mismo
                throw new Error('El año de publicación no es válido');
            }

            Validators.validatePositiveNumber(libroData.cantidad, 'cantidad');
            Validators.validatePositiveNumber(libroData.disponibles, 'disponibles');

            // Validar Número de Control (solo números)
            if (libroData.numeroControl && !/^\d+$/.test(libroData.numeroControl)) {
                throw new Error('El número de control debe contener solo números');
            }

            // Validar Páginas (entero positivo)
            if (libroData.paginas) {
                const paginasNum = Number(libroData.paginas);
                if (!Number.isInteger(paginasNum) || paginasNum <= 0) {
                    throw new Error('El número de páginas debe ser un número entero positivo');
                }
            }

            // Verificar que la biblioteca existe
            const biblioteca = this.db.prepare('SELECT id FROM bibliotecas WHERE id = ?').get(libroData.bibliotecaId);
            if (!biblioteca) {
                throw new Error('La biblioteca especificada no existe');
            }

            // Validar que el ISBN no exista en ESTA biblioteca
            if (libroData.isbn) {
                const existingBook = this.db.prepare('SELECT id FROM libros WHERE isbn = ? AND bibliotecaId = ?')
                    .get(libroData.isbn, libroData.bibliotecaId);

                if (existingBook) {
                    throw new Error(`Ya existe un libro con el ISBN "${libroData.isbn}" en esta biblioteca.`);
                }
            }

            const stmt = this.db.prepare(`
                INSERT INTO libros (titulo, autor, isbn, categoria, editorial, lugarPublicacion, anioPublicacion, edicion, cantidad, disponibles, paginas, clasificacion, ubicacion, estado, descripcion, cabecera, numeroControl, bibliotecaId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            //Devuelve un objeto statement, que se guarda en stmt. Luego se ejecuta con los datos del libro  
            //Con el prepare lo que hace es preparar la sentencia SQL para su ejecución posterior con los valores proporcionados.
            const result = stmt.run(
                libroData.titulo,
                libroData.autor,
                libroData.isbn || null,
                libroData.categoria || null,
                libroData.editorial || null,
                libroData.lugarPublicacion || null,
                libroData.anioPublicacion || null,
                libroData.edicion || null,
                libroData.cantidad || 1,
                libroData.disponibles || libroData.cantidad || 1,
                libroData.paginas || null,
                libroData.clasificacion || null,
                libroData.ubicacion || null,
                libroData.estado || 'disponible',
                libroData.descripcion || null,
                libroData.cabecera || null,
                libroData.numeroControl || null,
                libroData.bibliotecaId
            );

            return this.getLibroById(result.lastInsertRowid); // usa la funcion getLibroById que es una funcion que ejecutauna query select para devolver el libro recien creado
        } catch (error) {
            console.error('Error al crear libro:', error);
            throw error;
        }
    }

    async getLibros(bibliotecaId, filters = {}) { //filter es un objeto con posibles filtros de busqueda
        try {
            // OPTIMIZACIÓN: Usar índices y LIMIT para paginación
            let query = 'SELECT * FROM libros WHERE bibliotecaId = ?';
            const params = [bibliotecaId];

            if (filters.search) { //si escribio algo en el campo de busqueda "nombre" lo toma como thruty y entra, si puso 0 o nada no
                query += ' AND (titulo LIKE ? OR autor LIKE ? OR isbn LIKE ?)';
                const searchTerm = `%${filters.search}%`; //agrega % antes y despues del termino de busqueda para que busque coincidencias en cualquier parte del texto (como hacemos en sql server)
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (filters.categoria) {
                query += ' AND categoria = ?';
                params.push(filters.categoria); //agrega el valor del filtro a los parametros de la query
            }

            if (filters.estado) {
                query += ' AND estado = ?';
                params.push(filters.estado); // lo mismo
            }

            query += ' ORDER BY titulo ASC';  // agrupa de forma ascendente alfabeticamente

            // Agregar LIMIT para paginación si se especifica
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);

                if (filters.offset) {
                    query += ' OFFSET ?';
                    params.push(filters.offset);
                }
            }

            const stmt = this.db.prepare(query); //ahora si deja la query lista y abajo le pasa el array de parametros
            return stmt.all(...params);
        } catch (error) {
            console.error('Error al obtener libros:', error);
            throw error;
        }
    }

    async getLibroById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM libros WHERE id = ?');
            return stmt.get(id);
        } catch (error) {
            console.error('Error al obtener libro:', error);
            throw error;
        }
    }

    async updateLibro(id, updates) { //updates es un objeto con los campos que se quieren modificar
        try {
            const fields = []; //fields guarda fragmentos de texto tipo "titulo = ?", "autor = ?", etc
            const values = []; //values guarda los valores correspondientes a cada campo

            Object.keys(updates).forEach(key => { // obtiene los nombres de las propiedades del objeto.(por eso los keys) ej: "autor","titulo",etc.
                if (updates[key] !== undefined) { // verifica que el valor sea undefined
                    fields.push(`${key} = ?`); // agrega el fragmento de texto al array fields (la key)
                    values.push(updates[key]); // agrega el valor (el value) correspondiente del campo ingresado para modificar al array values
                }
            });

            if (fields.length === 0) return false;

            // VALIDACIONES DE ACTUALIZACIÓN

            // Validar Número de Control (solo números)
            if (updates.numeroControl !== undefined && updates.numeroControl !== null && updates.numeroControl !== '') {
                if (!/^\d+$/.test(updates.numeroControl)) {
                    throw new Error('El número de control debe contener solo números');
                }
            }

            // Validar Páginas (entero positivo)
            if (updates.paginas !== undefined && updates.paginas !== null && updates.paginas !== '') {
                const paginasNum = Number(updates.paginas);
                if (!Number.isInteger(paginasNum) || paginasNum <= 0) {
                    throw new Error('El número de páginas debe ser un número entero positivo');
                }
            }

            // Validar ISBN único en la biblioteca si cambiaron el ISBN
            if (updates.isbn) {
                // Buscamos el libro actual para saber su biblioteca
                if (!currentBook) throw new Error('Libro no encontrado');

                // Buscar si existe otro libro con mismo ISBN en la misma biblioteca
                const existingBook = this.db.prepare('SELECT id FROM libros WHERE isbn = ? AND bibliotecaId = ? AND id != ?')
                    .get(updates.isbn, currentBook.bibliotecaId, id);

                if (existingBook) {
                    throw new Error(`Ya existe un libro con el ISBN "${updates.isbn}" en esta biblioteca.`);
                }
            }

            values.push(id);
            const stmt = this.db.prepare(`UPDATE libros SET ${fields.join(', ')} WHERE id = ?`);
            const result = stmt.run(...values);

            return result.changes > 0;
        } catch (error) {
            console.error('Error al actualizar libro:', error);
            throw error;
        }
    }

    async deleteLibro(id) {
        // TRANSACCIÓN: Usar transacción para garantizar consistencia
        const transaction = this.db.transaction((id) => { // el transaction hace toda la consulta se efectue de manera atomica
            // Verificar si hay préstamos activos asociados a este libro
            const prestamosActivos = this.db.prepare('SELECT COUNT(*) as count FROM prestamos WHERE libroId = ? AND estado = ?').get(id, 'activo');
            // con una query de sql se fija el numero de prestamos activos de este libro
            if (prestamosActivos.count > 0) {
                throw new Error(`No se puede eliminar el libro porque tiene ${prestamosActivos.count} préstamo(s) activo(s). Debe devolver todos los préstamos antes de eliminar el libro.`);
            }

            // IMPORTANTE: Poner en NULL los libroId de los préstamos ANTES de eliminar el libro
            // Esto mantiene el historial de préstamos incluso después de eliminar el libro
            console.log(`Poniendo en NULL los libroId de los préstamos para el libro ${id}...`);
            const updateResult = this.db.prepare('UPDATE prestamos SET libroId = NULL WHERE libroId = ?').run(id);
            console.log(`Actualizados ${updateResult.changes} préstamos`);  //actualiza a null la cant de prestamos de este libro

            // Ahora eliminar el libro
            const stmt = this.db.prepare('DELETE FROM libros WHERE id = ?');
            const result = stmt.run(id);

            return result.changes > 0;
        });  // por eso termina aca por mas que esten separadas las lineas de la query

        try {
            return transaction(id);
        } catch (error) {
            console.error('Error al eliminar libro:', error);
            throw error;
        }
    }

    // ===== OPERACIONES DE SOCIOS =====

    async createSocio(socioData) {
        try {
            // VALIDACIONES
            Validators.validateRequired(socioData.nombre, 'nombre');
            Validators.validateRequired(socioData.email, 'email');
            Validators.validateRequired(socioData.bibliotecaId, 'bibliotecaId');

            if (!Validators.validateEmail(socioData.email)) {
                throw new Error('El email proporcionado no es válido');
            }

            if (socioData.telefono && !Validators.validatePhone(socioData.telefono)) {
                throw new Error('El teléfono debe tener al menos 10 dígitos');
            }

            // Verificar que la biblioteca existe
            const biblioteca = this.db.prepare('SELECT id FROM bibliotecas WHERE id = ?').get(socioData.bibliotecaId);
            if (!biblioteca) {
                throw new Error('La biblioteca especificada no existe');
            }

            // Verificar si ya existe un socio con ese email EN ESTA BIBLIOTECA
            const emailNormalizado = socioData.email.toLowerCase().trim();
            const existingSocio = this.db.prepare('SELECT id, nombre FROM socios WHERE LOWER(TRIM(email)) = ? AND bibliotecaId = ?')
                .get(emailNormalizado, socioData.bibliotecaId);

            if (existingSocio) {
                throw new Error(`Ya existe un socio con el email "${socioData.email}" en esta biblioteca.`);
            }

            // Verificar si ya existe un socio con ese teléfono EN ESTA BIBLIOTECA
            if (socioData.telefono) {
                const existingPhone = this.db.prepare('SELECT id FROM socios WHERE telefono = ? AND bibliotecaId = ?')
                    .get(socioData.telefono, socioData.bibliotecaId);

                if (existingPhone) {
                    throw new Error(`Ya existe un socio con el teléfono "${socioData.telefono}" en esta biblioteca.`);
                }
            }

            const stmt = this.db.prepare(`
                INSERT INTO socios (nombre, email, telefono, direccion, estado, observaciones, bibliotecaId)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                socioData.nombre,
                socioData.email,
                socioData.telefono || null,
                socioData.direccion || null,
                socioData.estado || 'activo',
                socioData.observaciones || null,
                socioData.bibliotecaId
            );

            return this.getSocioById(result.lastInsertRowid);
        } catch (error) {
            console.error('Error al crear socio:', error);
            throw error;
        }
    }

    async getSocios(bibliotecaId, filters = {}) {
        try {
            // OPTIMIZACIÓN: Usar índices y LIMIT para paginación
            let query = 'SELECT * FROM socios WHERE bibliotecaId = ?';
            const params = [bibliotecaId];

            if (filters.search) {
                const searchTerm = `%${filters.search}%`;
                // Si el término de búsqueda es un número, también buscamos por ID
                if (!isNaN(filters.search) && filters.search.trim() !== '') {
                    query += ' AND (nombre LIKE ? OR email LIKE ? OR CAST(id AS TEXT) LIKE ?)';
                    params.push(searchTerm, searchTerm, searchTerm);
                } else {
                    query += ' AND (nombre LIKE ? OR email LIKE ?)';
                    params.push(searchTerm, searchTerm);
                }
            }

            if (filters.estado) {
                query += ' AND estado = ?';
                params.push(filters.estado);
            }

            query += ' ORDER BY nombre ASC';

            // Agregar LIMIT para paginación si se especifica
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);

                if (filters.offset) {
                    query += ' OFFSET ?';
                    params.push(filters.offset);
                }
            }

            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        } catch (error) {
            console.error('Error al obtener socios:', error);
            throw error;
        }
    }

    async getSocioById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM socios WHERE id = ?');
            return stmt.get(id);
        } catch (error) {
            console.error('Error al obtener socio:', error);
            throw error;
        }
    }

    async updateSocio(id, updates) {
        try {
            // Si se está actualizando el email, validar que sea único
            if (updates.email !== undefined) {
                // Validar formato del email
                if (!Validators.validateEmail(updates.email)) {
                    throw new Error('El email proporcionado no es válido');
                }

                // Obtener el socio actual para saber su bibliotecaId
                const currentSocio = await this.getSocioById(id);
                if (!currentSocio) {
                    throw new Error('El socio que intenta actualizar no existe');
                }

                // Verificar que no exista otro socio con ese email en la misma biblioteca
                const emailNormalizado = updates.email.toLowerCase().trim();
                const existingSocio = this.db.prepare('SELECT id FROM socios WHERE LOWER(TRIM(email)) = ? AND bibliotecaId = ? AND id != ?')
                    .get(emailNormalizado, currentSocio.bibliotecaId, id);

                if (existingSocio) {
                    throw new Error(`Ya existe un socio con el email "${updates.email}" en esta biblioteca.`);
                }
            }

            // Validar teléfono único si se actualiza
            if (updates.telefono !== undefined && updates.telefono !== null && updates.telefono !== '') {
                // Si no tenemos currentSocio (porque no se actualizó el email), lo buscamos
                let bibId = null;
                const currentSocio = this.db.prepare('SELECT bibliotecaId FROM socios WHERE id = ?').get(id);
                if (!currentSocio) throw new Error('Socio no encontrado');
                bibId = currentSocio.bibliotecaId;

                const existingPhone = this.db.prepare('SELECT id FROM socios WHERE telefono = ? AND bibliotecaId = ? AND id != ?')
                    .get(updates.telefono, bibId, id);

                if (existingPhone) {
                    throw new Error(`Ya existe un socio con el teléfono "${updates.telefono}" en esta biblioteca.`);
                }
            }

            const fields = [];
            const values = [];

            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(updates[key]);
                }
            });

            if (fields.length === 0) return false;

            values.push(id);
            const stmt = this.db.prepare(`UPDATE socios SET ${fields.join(', ')} WHERE id = ?`);
            const result = stmt.run(...values);

            return result.changes > 0;
        } catch (error) {
            console.error('Error al actualizar socio:', error);
            throw error;
        }
    }

    async deleteSocio(id) {
        // TRANSACCIÓN: Usar transacción para garantizar consistencia
        const transaction = this.db.transaction((id) => {
            // Verificar si hay préstamos activos asociados a este socio
            const prestamosActivos = this.db.prepare('SELECT COUNT(*) as count FROM prestamos WHERE socioId = ? AND estado = ?').get(id, 'activo');

            if (prestamosActivos.count > 0) {
                throw new Error(`No se puede eliminar el socio porque tiene ${prestamosActivos.count} préstamo(s) activo(s). Debe devolver todos los préstamos antes de eliminar el socio.`);
            }

            // IMPORTANTE: Poner en NULL los socioId de los préstamos ANTES de eliminar el socio
            // Esto mantiene el historial de préstamos incluso después de eliminar el socio
            console.log(`Poniendo en NULL los socioId de los préstamos para el socio ${id}...`);
            const updateResult = this.db.prepare('UPDATE prestamos SET socioId = NULL WHERE socioId = ?').run(id);
            console.log(`Actualizados ${updateResult.changes} préstamos`);

            // Ahora eliminar el socio
            const stmt = this.db.prepare('DELETE FROM socios WHERE id = ?');
            const result = stmt.run(id);

            return result.changes > 0;
        });

        try {
            return transaction(id);
        } catch (error) {
            console.error('Error al eliminar socio:', error);
            throw error;
        }
    }

    // ===== OPERACIONES DE PRÉSTAMOS =====

    async createPrestamo(prestamoData) {
        // TRANSACCIÓN: Usar transacción para garantizar consistencia
        const transaction = this.db.transaction((prestamoData) => {
            // VALIDACIONES
            if (!prestamoData.libroId || !prestamoData.socioId || !prestamoData.bibliotecaId) {
                throw new Error('Los campos libroId, socioId y bibliotecaId son requeridos');
            }

            // Verificar que el libro existe
            const libro = this.db.prepare('SELECT * FROM libros WHERE id = ?').get(prestamoData.libroId);
            if (!libro) {
                throw new Error('El libro especificado no existe');
            }

            // Verificar que el socio existe
            const socio = this.db.prepare('SELECT * FROM socios WHERE id = ?').get(prestamoData.socioId);
            if (!socio) {
                throw new Error('El socio especificado no existe');
            }

            // Verificar que el libro esté disponible
            if (libro.disponibles <= 0) {
                throw new Error('El libro no está disponible para préstamo');
            }

            // Crear el préstamo
            // Usar contador persistente en la tabla bibliotecas para evitar reutilización y asegurar secuencia
            // Primero, incrementamos el contador y obtenemos el nuevo valor
            let nextNumero = 1;

            // Transacción anidada o asegurarse que esto es parte de la transacción principal (lo es)
            // Actualizamos y obtenemos en pasos separados porque RETURNING no es soportado por todas las versiones de SQLite o better-sqlite3 de forma directa en todos los contextos,
            // pero vamos a intentar hacerlo de forma segura.

            // 1. Obtener valor actual e incrementar
            const updateCounterParams = this.db.prepare('UPDATE bibliotecas SET lastPrestamoNumero = lastPrestamoNumero + 1 WHERE id = ?').run(prestamoData.bibliotecaId);

            // 2. Obtener el nuevo valor
            const newCounter = this.db.prepare('SELECT lastPrestamoNumero FROM bibliotecas WHERE id = ?').get(prestamoData.bibliotecaId);

            if (newCounter && newCounter.lastPrestamoNumero) {
                nextNumero = newCounter.lastPrestamoNumero;
            } else {
                // Fallback por si algo falló (no debería)
                const lastLoanParams = this.db.prepare('SELECT MAX(numero) as maxNum FROM prestamos WHERE bibliotecaId = ?').get(prestamoData.bibliotecaId);
                nextNumero = (lastLoanParams && lastLoanParams.maxNum) ? lastLoanParams.maxNum + 1 : 1;
            }



            const stmt = this.db.prepare(`
                INSERT INTO prestamos (libroId, socioId, bibliotecaId, fechaPrestamo, fechaDevolucion, observaciones, numero)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                prestamoData.libroId,
                prestamoData.socioId,
                prestamoData.bibliotecaId,
                prestamoData.fechaPrestamo || new Date().toISOString(),
                prestamoData.fechaDevolucion,
                prestamoData.observaciones || null,
                nextNumero
            );

            // Actualizar disponibilidad del libro
            const updateStmt = this.db.prepare(`
                UPDATE libros 
                SET disponibles = disponibles - 1, 
                    estado = CASE WHEN disponibles - 1 = 0 THEN 'prestado' ELSE 'disponible' END
                WHERE id = ?
            `);
            updateStmt.run(prestamoData.libroId);

            return result.lastInsertRowid;
        });

        try {
            const prestamoId = transaction(prestamoData);
            return this.getPrestamoById(prestamoId);
        } catch (error) {
            console.error('Error al crear préstamo:', error);
            throw error;
        }
    }

    async getPrestamos(bibliotecaId, filters = {}) {
        try {
            let query = `
                SELECT p.*, 
                       COALESCE(l.titulo, '[Libro eliminado]') as libroTitulo, 
                       COALESCE(l.autor, '') as libroAutor, 
                       COALESCE(s.nombre, '[Socio eliminado]') as socioNombre, 
                       COALESCE(s.email, '') as socioEmail
                FROM prestamos p
                LEFT JOIN libros l ON p.libroId = l.id
                LEFT JOIN socios s ON p.socioId = s.id
                WHERE p.bibliotecaId = ?
            `;
            const params = [bibliotecaId];

            if (filters.estado) {
                query += ' AND p.estado = ?';
                params.push(filters.estado);
            }

            query += ' ORDER BY p.fechaPrestamo DESC';

            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        } catch (error) {
            console.error('Error al obtener préstamos:', error);
            throw error;
        }
    }

    async getPrestamoById(id) {
        try {
            const stmt = this.db.prepare(`
                SELECT p.*, 
                       COALESCE(l.titulo, '[Libro eliminado]') as libroTitulo, 
                       COALESCE(l.autor, '') as libroAutor, 
                       COALESCE(s.nombre, '[Socio eliminado]') as socioNombre, 
                       COALESCE(s.email, '') as socioEmail
                FROM prestamos p
                LEFT JOIN libros l ON p.libroId = l.id
                LEFT JOIN socios s ON p.socioId = s.id
                WHERE p.id = ?
            `);
            return stmt.get(id);
        } catch (error) {
            console.error('Error al obtener préstamo:', error);
            throw error;
        }
    }
    ///////////////////////////////////////////////// Estado de disponibilidad del libro y cambio de estado del prestamo
    async devolverLibro(prestamoId) {
        // TRANSACCIÓN: Usa transacción para garantizar consistencia
        const transaction = this.db.transaction((prestamoId) => {
            // Obtener el préstamo
            const prestamo = this.db.prepare(`
                SELECT p.*, 
                       COALESCE(l.titulo, '[Libro eliminado]') as libroTitulo, 
                       COALESCE(l.autor, '') as libroAutor, 
                       COALESCE(s.nombre, '[Socio eliminado]') as socioNombre, 
                       COALESCE(s.email, '') as socioEmail
                FROM prestamos p
                LEFT JOIN libros l ON p.libroId = l.id
                LEFT JOIN socios s ON p.socioId = s.id
                WHERE p.id = ?
            `).get(prestamoId); //el coalesce es para que devuelva el primer valor que no sea null
            //aca le pasamos al prepare el id del prestamo del libro que queremos retornar al sistema(biblioteca)
            if (!prestamo) {
                throw new Error('Préstamo no encontrado');
            }

            // Verificar que el préstamo no esté ya completado
            if (prestamo.estado === 'completado') {
                throw new Error('El préstamo ya está completado');
            }

            // Actualizar el préstamo
            const updatePrestamo = this.db.prepare(`
                UPDATE prestamos 
                SET estado = 'completado', fechaDevolucionReal = CURRENT_TIMESTAMP 
                WHERE id = ?
            `);
            const result = updatePrestamo.run(prestamoId);

            if (result.changes > 0 && prestamo.libroId) {  //si se detecto un cambio y el id del libro no es null updateamos el estado de disponibilidad del libro
                // Actualizar disponibilidad del libro solo si el libro existe
                const updateLibro = this.db.prepare(`
                    UPDATE libros 
                    SET disponibles = disponibles + 1, 
                        estado = 'disponible'
                    WHERE id = ?
                `);
                updateLibro.run(prestamo.libroId);
            }

            return result.changes > 0;
        });

        try {
            return transaction(prestamoId);
        } catch (error) {
            console.error('Error al devolver libro:', error);
            throw error;
        }
    }

    async updatePrestamo(id, updates) {
        try {
            const fields = [];
            const values = [];

            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    fields.push(`${key} = ?`);
                    values.push(updates[key]);
                }
            });

            if (fields.length === 0) return false;

            values.push(id);
            const stmt = this.db.prepare(`UPDATE prestamos SET ${fields.join(', ')} WHERE id = ?`);
            const result = stmt.run(...values);

            return result.changes > 0;
        } catch (error) {
            console.error('Error al actualizar préstamo:', error);
            throw error;
        }
    }

    async deletePrestamo(id) {
        // TRANSACCIÓN: Usar transacción para garantizar consistencia
        const transaction = this.db.transaction((id) => {
            // Obtener el préstamo para verificar su estado
            const prestamo = this.db.prepare('SELECT * FROM prestamos WHERE id = ?').get(id);

            if (!prestamo) {
                throw new Error('Préstamo no encontrado');
            }

            // Si el préstamo está activo, devolver el libro antes de eliminar
            if (prestamo.estado === 'activo' && prestamo.libroId) {
                // Aumentar disponibilidad del libro
                const updateLibro = this.db.prepare(`
                    UPDATE libros 
                    SET disponibles = disponibles + 1, 
                        estado = 'disponible'
                    WHERE id = ?
                `);
                updateLibro.run(prestamo.libroId);
            }

            // Eliminar el préstamo
            const stmt = this.db.prepare('DELETE FROM prestamos WHERE id = ?');
            const result = stmt.run(id);

            return result.changes > 0;
        });

        try {
            return transaction(id);
        } catch (error) {
            console.error('Error al eliminar préstamo:', error);
            throw error;
        }
    }

    // ===== ESTADÍSTICAS Y REPORTES =====

    async getBibliotecaStats(bibliotecaId) {
        try {
            // OPTIMIZACIÓN: Consulta única con UNION ALL para obtener todas las estadísticas
            const stmt = this.db.prepare(`
                SELECT 
                    'libros' as tipo,
                    COUNT(*) as count
                FROM libros 
                WHERE bibliotecaId = ?
                
                UNION ALL
                
                SELECT 
                    'socios' as tipo,
                    COUNT(*) as count
                FROM socios 
                WHERE bibliotecaId = ?
                
                UNION ALL
                
                SELECT 
                    'prestamos_activos' as tipo,
                    COUNT(*) as count
                FROM prestamos 
                WHERE bibliotecaId = ? AND estado = 'activo'
                
                UNION ALL
                
                SELECT 
                    'prestamos_vencidos' as tipo,
                    COUNT(*) as count
                FROM prestamos 
                WHERE bibliotecaId = ? AND estado = 'activo' AND fechaDevolucion < CURRENT_TIMESTAMP
                
                UNION ALL
                
                SELECT 
                    'prestamos_completados' as tipo,
                    COUNT(*) as count
                FROM prestamos 
                WHERE bibliotecaId = ? AND estado = 'completado'
            `);

            const results = stmt.all(bibliotecaId, bibliotecaId, bibliotecaId, bibliotecaId, bibliotecaId);

            // Convertir resultados en objeto
            const stats = {};
            results.forEach(row => {
                switch (row.tipo) {
                    case 'libros':
                        stats.totalLibros = row.count;
                        break;
                    case 'socios':
                        stats.totalSocios = row.count;
                        break;
                    case 'prestamos_activos':
                        stats.prestamosActivos = row.count;
                        break;
                    case 'prestamos_vencidos':
                        stats.prestamosVencidos = row.count;
                        break;
                    case 'prestamos_completados':
                        stats.prestamosCompletados = row.count;
                        break;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    }

    async getPrestamosPorMes(bibliotecaId, meses = 6) {
        try {
            // OPTIMIZACIÓN: Usar índices en fechaPrestamo y bibliotecaId
            const stmt = this.db.prepare(`
                SELECT 
                    strftime('%Y-%m', fechaPrestamo) as mes,
                    COUNT(*) as prestamos,
                    SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as devoluciones
                FROM prestamos 
                WHERE bibliotecaId = ? 
                AND fechaPrestamo >= date('now', '-' || ? || ' months')
                GROUP BY strftime('%Y-%m', fechaPrestamo)
                ORDER BY mes ASC
            `);

            return stmt.all(bibliotecaId, meses);
        } catch (error) {
            console.error('Error al obtener préstamos por mes:', error);
            throw error;
        }
    }

    async getLibrosPorCategoria(bibliotecaId) {
        try {
            // OPTIMIZACIÓN: Usar índice en categoria y bibliotecaId
            const stmt = this.db.prepare(`
                SELECT 
                    COALESCE(categoria, 'Sin categoría') as categoria, 
                    COUNT(*) as cantidad
                FROM libros 
                WHERE bibliotecaId = ? 
                GROUP BY categoria
                ORDER BY cantidad DESC
            `);

            return stmt.all(bibliotecaId);
        } catch (error) {
            console.error('Error al obtener libros por categoría:', error);
            throw error;
        }
    }

    async getSociosPorMes(bibliotecaId, meses = 6) {
        try {
            // Contar socios registrados por mes
            const stmt = this.db.prepare(`
                SELECT 
                    strftime('%Y-%m', fechaRegistro) as mes,
                    COUNT(*) as sociosNuevos
                FROM socios 
                WHERE bibliotecaId = ? 
                AND fechaRegistro >= date('now', '-' || ? || ' months')
                GROUP BY strftime('%Y-%m', fechaRegistro)
                ORDER BY mes ASC
            `);

            const resultados = stmt.all(bibliotecaId, meses);

            // Calcular total acumulado por mes
            let totalAcumulado = 0;
            return resultados.map(item => {
                totalAcumulado += item.sociosNuevos;
                return {
                    mes: item.mes,
                    sociosNuevos: item.sociosNuevos,
                    totalAcumulado: totalAcumulado
                };
            });
        } catch (error) {
            console.error('Error al obtener socios por mes:', error);
            throw error;
        }
    }

    // ===== UTILIDADES =====

    async close() {
        if (this.db) {
            this.db.close();
            console.log('Base de datos cerrada correctamente');
        }
    }

    async backup(destinationPath) {
        try {
            // Para SQLite, simplemente copiar el archivo
            const fs = require('fs');
            fs.copyFileSync(this.dbPath, destinationPath);
            return true;
        } catch (error) {
            console.error('Error al hacer backup:', error);
            return false;
        }
    }

    // ===== MÉTODOS DE INICIALIZACIÓN =====

    async insertSampleData(bibliotecaId) {
        try {
            // Insertar libros de ejemplo
            const librosEjemplo = [
                {
                    titulo: 'El Señor de los Anillos',
                    autor: 'J.R.R. Tolkien',
                    isbn: '978-84-450-7054-9',
                    categoria: 'Fantasía',
                    editorial: 'Minotauro',
                    anioPublicacion: 1954,
                    cantidad: 3,
                    disponibles: 3,
                    ubicacion: 'Estante A-1',
                    descripcion: 'Trilogía épica de fantasía',
                    bibliotecaId
                },
                {
                    titulo: 'Cien años de soledad',
                    autor: 'Gabriel García Márquez',
                    isbn: '978-84-397-2071-7',
                    categoria: 'Literatura',
                    editorial: 'Editorial Sudamericana',
                    anioPublicacion: 1967,
                    cantidad: 2,
                    disponibles: 2,
                    ubicacion: 'Estante B-3',
                    descripcion: 'Obra maestra del realismo mágico',
                    bibliotecaId
                },
                {
                    titulo: '1984',
                    autor: 'George Orwell',
                    isbn: '978-84-206-0000-0',
                    categoria: 'Ciencia Ficción',
                    editorial: 'Debolsillo',
                    anioPublicacion: 1949,
                    cantidad: 4,
                    disponibles: 4,
                    ubicacion: 'Estante C-2',
                    descripcion: 'Distopía clásica',
                    bibliotecaId
                }
            ];

            // Insertar socios de ejemplo
            const sociosEjemplo = [
                {
                    nombre: 'María González',
                    email: 'maria@email.com',
                    telefono: '123-456-789',
                    direccion: 'Av. San Martín 123',
                    observaciones: 'Socia frecuente',
                    bibliotecaId
                },
                {
                    nombre: 'Juan Pérez',
                    email: 'juan@email.com',
                    telefono: '123-456-790',
                    direccion: 'Belgrano 456',
                    observaciones: '',
                    bibliotecaId
                },
                {
                    nombre: 'Ana López',
                    email: 'ana@email.com',
                    telefono: '123-456-791',
                    direccion: 'Rivadavia 789',
                    observaciones: 'Socia activa',
                    bibliotecaId
                }
            ];

            // Insertar libros
            for (const libro of librosEjemplo) {
                await this.createLibro(libro);
            }

            // Insertar socios
            for (const socio of sociosEjemplo) {
                await this.createSocio(socio);
            }

            return {
                success: true,
                message: 'Datos de ejemplo insertados correctamente',
                librosInsertados: librosEjemplo.length,
                sociosInsertados: sociosEjemplo.length
            };
        } catch (error) {
            console.error('Error al insertar datos de ejemplo:', error);
            throw error;
        }
    }

    async insertUTNSampleData(bibliotecaId) {
        try {
            console.log('Creando datos de muestra para UTN-FRLP...');

            // Libros de muestra más extensos
            const librosUTN = [
                { titulo: 'Introducción a la Programación', autor: 'Dr. Carlos Martínez', isbn: '978-1234567890', categoria: 'Informática', editorial: 'UTN Press', anioPublicacion: 2020, cantidad: 5, disponibles: 3, ubicacion: 'Estante A-1', descripcion: 'Fundamentos de programación', bibliotecaId },
                { titulo: 'Estructuras de Datos', autor: 'Prof. Laura Fernández', isbn: '978-1234567891', categoria: 'Informática', editorial: 'UTN Press', anioPublicacion: 2021, cantidad: 4, disponibles: 2, ubicacion: 'Estante A-2', descripcion: 'Algoritmos y estructuras', bibliotecaId },
                { titulo: 'Base de Datos', autor: 'Ing. Roberto Sánchez', isbn: '978-1234567892', categoria: 'Informática', editorial: 'UTN Press', anioPublicacion: 2022, cantidad: 6, disponibles: 4, ubicacion: 'Estante A-3', descripcion: 'SQL y diseño de BD', bibliotecaId },
                { titulo: 'Matemática Discreta', autor: 'Dr. Ana García', isbn: '978-1234567893', categoria: 'Matemática', editorial: 'UTN Press', anioPublicacion: 2019, cantidad: 3, disponibles: 1, ubicacion: 'Estante B-1', descripcion: 'Lógica y teoría de grafos', bibliotecaId },
                { titulo: 'Álgebra Lineal', autor: 'Prof. Miguel Torres', isbn: '978-1234567894', categoria: 'Matemática', editorial: 'UTN Press', anioPublicacion: 2020, cantidad: 4, disponibles: 2, ubicacion: 'Estante B-2', descripcion: 'Vectores y matrices', bibliotecaId },
                { titulo: 'Cálculo Diferencial', autor: 'Dr. Patricia López', isbn: '978-1234567895', categoria: 'Matemática', editorial: 'UTN Press', anioPublicacion: 2021, cantidad: 5, disponibles: 3, ubicacion: 'Estante B-3', descripcion: 'Límites y derivadas', bibliotecaId },
                { titulo: 'Física I', autor: 'Ing. Daniel Ruiz', isbn: '978-1234567896', categoria: 'Física', editorial: 'UTN Press', anioPublicacion: 2019, cantidad: 4, disponibles: 2, ubicacion: 'Estante C-1', descripcion: 'Mecánica clásica', bibliotecaId },
                { titulo: 'Física II', autor: 'Prof. Carmen Díaz', isbn: '978-1234567897', categoria: 'Física', editorial: 'UTN Press', anioPublicacion: 2020, cantidad: 3, disponibles: 1, ubicacion: 'Estante C-2', descripcion: 'Electricidad y magnetismo', bibliotecaId },
                { titulo: 'Redes de Computadoras', autor: 'Ing. Fernando Morales', isbn: '978-1234567898', categoria: 'Informática', editorial: 'UTN Press', anioPublicacion: 2022, cantidad: 5, disponibles: 3, ubicacion: 'Estante A-4', descripcion: 'Protocolos y arquitecturas', bibliotecaId },
                { titulo: 'Ingeniería de Software', autor: 'Dr. Silvia Ramírez', isbn: '978-1234567899', categoria: 'Informática', editorial: 'UTN Press', anioPublicacion: 2021, cantidad: 4, disponibles: 2, ubicacion: 'Estante A-5', descripcion: 'Metodologías ágiles', bibliotecaId },
                { titulo: 'Inteligencia Artificial', autor: 'Prof. Luis Herrera', isbn: '978-1234567900', categoria: 'Informática', editorial: 'UTN Press', anioPublicacion: 2023, cantidad: 3, disponibles: 1, ubicacion: 'Estante A-6', descripcion: 'Machine Learning básico', bibliotecaId },
                { titulo: 'Química General', autor: 'Dr. María González', isbn: '978-1234567901', categoria: 'Química', editorial: 'UTN Press', anioPublicacion: 2020, cantidad: 4, disponibles: 2, ubicacion: 'Estante D-1', descripcion: 'Fundamentos químicos', bibliotecaId },
                { titulo: 'Diseño Gráfico', autor: 'Prof. Jorge Castro', isbn: '978-1234567902', categoria: 'Diseño', editorial: 'UTN Press', anioPublicacion: 2021, cantidad: 3, disponibles: 1, ubicacion: 'Estante E-1', descripcion: 'Principios de diseño', bibliotecaId },
                { titulo: 'Marketing Digital', autor: 'Ing. Andrea Silva', isbn: '978-1234567903', categoria: 'Marketing', editorial: 'UTN Press', anioPublicacion: 2022, cantidad: 5, disponibles: 3, ubicacion: 'Estante F-1', descripcion: 'Estrategias digitales', bibliotecaId },
                { titulo: 'Gestión de Proyectos', autor: 'Dr. Ricardo Vargas', isbn: '978-1234567904', categoria: 'Administración', editorial: 'UTN Press', anioPublicacion: 2020, cantidad: 4, disponibles: 2, ubicacion: 'Estante G-1', descripcion: 'PMI y Scrum', bibliotecaId }
            ];

            // Socios de muestra
            const sociosUTN = [
                { nombre: 'Juan Pérez', email: 'juan.perez@utn.frlp.edu.ar', telefono: '221-4567890', direccion: 'Calle 60 1234', observaciones: 'Estudiante de Ingeniería en Sistemas', bibliotecaId },
                { nombre: 'María González', email: 'maria.gonzalez@utn.frlp.edu.ar', telefono: '221-4567891', direccion: 'Av. 7 567', observaciones: 'Estudiante de Ingeniería Industrial', bibliotecaId },
                { nombre: 'Carlos Rodríguez', email: 'carlos.rodriguez@utn.frlp.edu.ar', telefono: '221-4567892', direccion: 'Calle 50 890', observaciones: 'Estudiante de Ingeniería Química', bibliotecaId },
                { nombre: 'Ana Martínez', email: 'ana.martinez@utn.frlp.edu.ar', telefono: '221-4567893', direccion: 'Av. 13 234', observaciones: 'Estudiante de Ingeniería en Sistemas', bibliotecaId },
                { nombre: 'Luis Fernández', email: 'luis.fernandez@utn.frlp.edu.ar', telefono: '221-4567894', direccion: 'Calle 66 456', observaciones: 'Estudiante de Ingeniería Industrial', bibliotecaId },
                { nombre: 'Laura Sánchez', email: 'laura.sanchez@utn.frlp.edu.ar', telefono: '221-4567895', direccion: 'Av. 1 789', observaciones: 'Estudiante de Ingeniería Química', bibliotecaId },
                { nombre: 'Roberto Díaz', email: 'roberto.diaz@utn.frlp.edu.ar', telefono: '221-4567896', direccion: 'Calle 52 123', observaciones: 'Estudiante de Ingeniería en Sistemas', bibliotecaId },
                { nombre: 'Carmen Torres', email: 'carmen.torres@utn.frlp.edu.ar', telefono: '221-4567897', direccion: 'Av. 7 890', observaciones: 'Estudiante de Ingeniería Industrial', bibliotecaId },
                { nombre: 'Miguel Ruiz', email: 'miguel.ruiz@utn.frlp.edu.ar', telefono: '221-4567898', direccion: 'Calle 60 567', observaciones: 'Estudiante de Ingeniería Química', bibliotecaId },
                { nombre: 'Patricia López', email: 'patricia.lopez@utn.frlp.edu.ar', telefono: '221-4567899', direccion: 'Av. 13 234', observaciones: 'Docente de Informática', bibliotecaId },
                { nombre: 'Daniel Morales', email: 'daniel.morales@utn.frlp.edu.ar', telefono: '221-4567900', direccion: 'Calle 50 456', observaciones: 'Docente de Matemática', bibliotecaId },
                { nombre: 'Silvia Ramírez', email: 'silvia.ramirez@utn.frlp.edu.ar', telefono: '221-4567901', direccion: 'Av. 7 123', observaciones: 'Docente de Física', bibliotecaId },
                { nombre: 'Fernando Herrera', email: 'fernando.herrera@utn.frlp.edu.ar', telefono: '221-4567902', direccion: 'Calle 66 789', observaciones: 'Estudiante de Ingeniería en Sistemas', bibliotecaId },
                { nombre: 'Andrea Castro', email: 'andrea.castro@utn.frlp.edu.ar', telefono: '221-4567903', direccion: 'Av. 1 567', observaciones: 'Estudiante de Ingeniería Industrial', bibliotecaId },
                { nombre: 'Jorge Silva', email: 'jorge.silva@utn.frlp.edu.ar', telefono: '221-4567904', direccion: 'Calle 52 890', observaciones: 'Estudiante de Ingeniería Química', bibliotecaId }
            ];

            console.log('Insertando libros...');
            const librosInsertados = [];
            for (const libro of librosUTN) {
                try {
                    const nuevoLibro = await this.createLibro(libro);
                    librosInsertados.push(nuevoLibro);
                } catch (error) {
                    console.error('Error al insertar libro:', libro.titulo, error.message);
                }
            }

            console.log('Insertando socios...');
            const sociosInsertados = [];
            for (const socio of sociosUTN) {
                try {
                    const nuevoSocio = await this.createSocio(socio);
                    sociosInsertados.push(nuevoSocio);
                } catch (error) {
                    console.error('Error al insertar socio:', socio.nombre, error.message);
                }
            }

            console.log('Creando préstamos de muestra...');
            const prestamosInsertados = [];

            // Crear algunos préstamos completados (historial)
            for (let i = 0; i < 30; i++) {
                const libroRandom = librosInsertados[Math.floor(Math.random() * librosInsertados.length)];
                const socioRandom = sociosInsertados[Math.floor(Math.random() * sociosInsertados.length)];

                // Fecha aleatoria en los últimos 6 meses
                const fechaPrestamo = new Date();
                fechaPrestamo.setMonth(fechaPrestamo.getMonth() - Math.floor(Math.random() * 6));
                fechaPrestamo.setDate(fechaPrestamo.getDate() - Math.floor(Math.random() * 30));

                const fechaDevolucion = new Date(fechaPrestamo);
                fechaDevolucion.setDate(fechaDevolucion.getDate() + 7 + Math.floor(Math.random() * 14));

                try {
                    // Crear préstamo completado
                    const prestamo = await this.createPrestamo({
                        libroId: libroRandom.id,
                        socioId: socioRandom.id,
                        bibliotecaId: bibliotecaId,
                        fechaDevolucion: fechaDevolucion.toISOString(),
                        observaciones: 'Préstamo de muestra'
                    });

                    // Completar el préstamo
                    await this.devolverLibro(prestamo.id);
                    prestamosInsertados.push(prestamo);
                } catch (error) {
                    console.error('Error al crear préstamo:', error.message);
                }
            }

            // Crear algunos préstamos activos
            for (let i = 0; i < 8; i++) {
                const libroRandom = librosInsertados[Math.floor(Math.random() * librosInsertados.length)];
                const socioRandom = sociosInsertados[Math.floor(Math.random() * sociosInsertados.length)];

                // Fecha aleatoria en los últimos 15 días
                const fechaPrestamo = new Date();
                fechaPrestamo.setDate(fechaPrestamo.getDate() - Math.floor(Math.random() * 15));

                const fechaDevolucion = new Date(fechaPrestamo);
                fechaDevolucion.setDate(fechaDevolucion.getDate() + 14);

                try {
                    const prestamo = await this.createPrestamo({
                        libroId: libroRandom.id,
                        socioId: socioRandom.id,
                        bibliotecaId: bibliotecaId,
                        fechaDevolucion: fechaDevolucion.toISOString(),
                        observaciones: 'Préstamo activo'
                    });
                    prestamosInsertados.push(prestamo);
                } catch (error) {
                    console.error('Error al crear préstamo activo:', error.message);
                }
            }

            console.log('Datos de muestra creados exitosamente');

            return {
                success: true,
                message: 'Datos de muestra UTN-FRLP insertados correctamente',
                librosInsertados: librosInsertados.length,
                sociosInsertados: sociosInsertados.length,
                prestamosInsertados: prestamosInsertados.length
            };
        } catch (error) {
            console.error('Error al insertar datos de muestra UTN:', error);
            throw error;
        }
    }

    // ===== INFORMACIÓN DEL SISTEMA =====

    getDatabaseInfo() {
        return {
            type: 'sqlite',
            path: this.dbPath,
            dialect: 'sqlite'
        };
    }

    async createUTNLibrary() {
        try {
            console.log('Creando biblioteca UTN-FRLP...');

            // Verificar si ya existe
            const existingLibrary = this.db.prepare('SELECT id FROM bibliotecas WHERE nombre = ?').get('UTN-FRLP');

            if (existingLibrary) {
                console.log('La biblioteca UTN-FRLP ya existe');
                return { exists: true, id: existingLibrary.id };
            }

            // Crear la biblioteca
            const biblioteca = await this.createBiblioteca({
                nombre: 'UTN-FRLP',
                direccion: 'Av. 1 y 47, La Plata, Buenos Aires',
                telefono: '221-484-0156',
                email: 'biblioteca@utn.frlp.edu.ar',
                responsable: 'Biblioteca Central UTN-FRLP',
                horarios: 'Lunes a Viernes: 8:00 - 20:00',
                descripcion: 'Biblioteca de la Universidad Tecnológica Nacional - Facultad Regional La Plata'
            });

            console.log('Biblioteca UTN-FRLP creada con ID:', biblioteca.id);

            // Insertar datos de muestra
            const result = await this.insertUTNSampleData(biblioteca.id);

            console.log('Datos de muestra insertados:', result);

            return {
                exists: false,
                biblioteca: biblioteca,
                datos: result
            };
        } catch (error) {
            console.error('Error al crear biblioteca UTN-FRLP:', error);
            throw error;
        }
    }
}

module.exports = DatabaseService;