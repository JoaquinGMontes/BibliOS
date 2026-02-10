const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

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
            this.dbPath = path.join(dbDir, 'biblios.db'); // Nombre del arc de la BD

            // Conectar a la base de datos
            this.db = new Database(this.dbPath); //Crea una conexión directa a ese archivo (el de arriba).

            // Habilitar foreign keys
            this.db.pragma('foreign_keys = ON');

            // Migrar tablas existentes si es necesario (ANTES de crear tablas)
            this.migrateTables();

            // Funcion para crear tablas (implementada abajo)
            this.createTables();

            // Verificar si el archivo de la base de datos se creó correctamente
            if (!fs.existsSync(this.dbPath)) {
                console.error(`El archivo de la base de datos no se creó en la ruta esperada: ${this.dbPath}`);
            } else {
                console.log(`Archivo de base de datos creado correctamente en: ${this.dbPath}`);
            }

            console.log(`Base de datos SQLite inicializada en: $ qu{this.dbPath}`);

        } catch (error) {
            console.error('Error al inicializar la base de datos:', error);
            throw error;
        }
    }

    createTables() {
        try {
            console.log('Iniciando la creación de tablas...');
            console.log('Creando tabla bibliotecas...');
            console.log('Creando tabla libros...');
            console.log('Creando tabla socios...');
            console.log('Creando tabla préstamos...');
            console.log('Creando índices para mejorar rendimiento...');

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
                    fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    activa BOOLEAN DEFAULT 0
                )
            `);

            // Tabla libros - Estructura basada en estándares MARC para bibliotecas
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS libros (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    
                    -- Identificadores únicos
                    controlNumber TEXT UNIQUE NOT NULL,
                    controlAgency TEXT,
                    
                    -- Información básica del libro
                    titulo TEXT NOT NULL,
                    mainAuthor TEXT NOT NULL,
                    coAuthors TEXT,
                    edition TEXT,
                    
                    -- Publicación
                    publisher TEXT NOT NULL,
                    publicationYear INTEGER NOT NULL,
                    publicationPlace TEXT,
                    
                    -- Identificadores internacionales
                    isbn TEXT UNIQUE,
                    
                    -- Clasificación y temas
                    universalDecimalClassification TEXT,
                    subject TEXT,
                    series TEXT,
                    
                    -- Descripción física
                    pageCount INTEGER,
                    dimensions TEXT,
                    physicalDescription TEXT,
                    
                    -- Metadatos del sistema
                    cataloguingLanguage TEXT,
                    generalNote TEXT,
                    
                    -- Control de copias (del sistema anterior)
                    cantidad INTEGER DEFAULT 1,
                    disponibles INTEGER DEFAULT 1,
                    estado TEXT DEFAULT 'disponible',
                    
                    -- Metadatos del sistema
                    bibliotecaId INTEGER,
                    fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                    lastModificationDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE
                )
            `);

            // Tabla socios
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS socios (
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
                    FOREIGN KEY (libroId) REFERENCES libros(id) ON DELETE SET NULL,
                    FOREIGN KEY (socioId) REFERENCES socios(id) ON DELETE SET NULL,
                    FOREIGN KEY (bibliotecaId) REFERENCES bibliotecas(id) ON DELETE CASCADE
                )
            `);

            // Crear índices para mejorar rendimiento
            this.db.exec(`
                -- Índices para libros
                CREATE INDEX IF NOT EXISTS idx_libros_titulo ON libros(titulo);
                CREATE INDEX IF NOT EXISTS idx_libros_mainAuthor ON libros(mainAuthor);
                CREATE INDEX IF NOT EXISTS idx_libros_subject ON libros(subject);
                CREATE INDEX IF NOT EXISTS idx_libros_biblioteca ON libros(bibliotecaId);
                CREATE INDEX IF NOT EXISTS idx_libros_isbn ON libros(isbn);
                CREATE INDEX IF NOT EXISTS idx_libros_controlNumber ON libros(controlNumber);
                CREATE INDEX IF NOT EXISTS idx_libros_estado ON libros(estado);
                CREATE INDEX IF NOT EXISTS idx_libros_disponibles ON libros(disponibles);
                CREATE INDEX IF NOT EXISTS idx_libros_cdu ON libros(universalDecimalClassification);
                
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
            // ===== MIGRACIÓN DE TABLA LIBROS: De estructura antigua a MARC =====
            const librosTableInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='libros'").get();

            if (librosTableInfo) {
                // Obtener la estructura actual de la tabla libros
                const librosColumns = this.db.prepare("PRAGMA table_info(libros)").all();
                const hasMainAuthor = librosColumns.some(col => col.name === 'mainAuthor');
                const hasAutorAntiguo = librosColumns.some(col => col.name === 'autor');

                // Si tiene estructura antigua (campo 'autor', 'categoria', 'ubicacion', etc.)
                if (hasAutorAntiguo && !hasMainAuthor) {
                    console.log('Detectada estructura antigua de tabla libros. Iniciando migración a formato MARC...');

                    try {
                        // Eliminar tabla antigua y sus índices
                        this.db.exec(`
                            DROP INDEX IF EXISTS idx_libros_titulo;
                            DROP INDEX IF EXISTS idx_libros_autor;
                            DROP INDEX IF EXISTS idx_libros_categoria;
                            DROP INDEX IF EXISTS idx_libros_biblioteca;
                            DROP INDEX IF EXISTS idx_libros_isbn;
                            DROP INDEX IF EXISTS idx_libros_estado;
                            DROP INDEX IF EXISTS idx_libros_disponibles;
                            DROP TABLE IF EXISTS libros;
                        `);

                        console.log('Tabla libros antigua eliminada. Se recreará con estructura MARC.');
                    } catch (error) {
                        console.error('Error al eliminar tabla libros antigua:', error);
                        // Si hay error, intentar solo drop simple
                        try {
                            this.db.exec('DROP TABLE IF EXISTS libros CASCADE;');
                        } catch (e) {
                            console.warn('No se pudo eliminar tabla libros, continuando...');
                        }
                    }
                }
            }

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
        } catch (error) {
            console.error('Error al migrar tablas:', error);
            // No lanzar error para no bloquear la aplicación
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

            return this.getBibliotecaById(result.lastInsertRowid);
        } catch (error) {
            console.error('Error al crear biblioteca:', error);
            throw error;
        }
    }

    async getBibliotecas() {
        try {
            const stmt = this.db.prepare('SELECT * FROM bibliotecas ORDER BY fechaCreacion DESC');
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

    // ===== OPERACIONES DE LIBROS =====

    async createLibro(libroData) {
        try {
            // VALIDACIONES
            Validators.validateRequired(libroData.controlNumber, 'controlNumber'); // Número de control único
            Validators.validateRequired(libroData.titulo, 'titulo');
            Validators.validateRequired(libroData.mainAuthor, 'mainAuthor');
            Validators.validateRequired(libroData.publisher, 'publisher');
            Validators.validateRequired(libroData.publicationYear, 'publicationYear');
            Validators.validateRequired(libroData.bibliotecaId, 'bibliotecaId');

            if (libroData.isbn && !Validators.validateISBN(libroData.isbn)) {
                throw new Error('El ISBN proporcionado no es válido (debe ser ISBN-10 o ISBN-13)');
            }

            if (libroData.publicationYear && !Validators.validateYear(libroData.publicationYear)) {
                throw new Error('El año de publicación no es válido');
            }

            Validators.validatePositiveNumber(libroData.cantidad, 'cantidad');
            Validators.validatePositiveNumber(libroData.disponibles, 'disponibles');
            Validators.validatePositiveNumber(libroData.pageCount, 'pageCount');

            // Verificar que la biblioteca existe
            const biblioteca = this.db.prepare('SELECT id FROM bibliotecas WHERE id = ?').get(libroData.bibliotecaId);
            if (!biblioteca) {
                throw new Error('La biblioteca especificada no existe');
            }

            // Verificar que el controlNumber sea único dentro de la biblioteca (combinación controlNumber + bibliotecaId)
            const existingBook = this.db.prepare(
                'SELECT id FROM libros WHERE controlNumber = ? AND bibliotecaId = ?'
            ).get(libroData.controlNumber, libroData.bibliotecaId);

            if (existingBook) {
                throw new Error(`Ya existe un libro con el número de control "${libroData.controlNumber}" en esta biblioteca`);
            }

            const stmt = this.db.prepare(`
                INSERT INTO libros (
                    controlNumber, controlAgency, titulo, mainAuthor, coAuthors, edition,
                    publisher, publicationYear, publicationPlace, isbn,
                    universalDecimalClassification, subject, series,
                    pageCount, dimensions, physicalDescription,
                    cataloguingLanguage, generalNote,
                    cantidad, disponibles, estado, bibliotecaId
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                libroData.controlNumber,
                libroData.controlAgency || null,
                libroData.titulo,
                libroData.mainAuthor,
                libroData.coAuthors || null,
                libroData.edition || null,
                libroData.publisher,
                libroData.publicationYear,
                libroData.publicationPlace || null,
                libroData.isbn || null,
                libroData.universalDecimalClassification || null,
                libroData.subject || null,
                libroData.series || null,
                libroData.pageCount || null,
                libroData.dimensions || null,
                libroData.physicalDescription || null,
                libroData.cataloguingLanguage || null,
                libroData.generalNote || null,
                libroData.cantidad || 1,
                libroData.disponibles || libroData.cantidad || 1,
                libroData.estado || 'disponible',
                libroData.bibliotecaId
            );

            return this.getLibroById(result.lastInsertRowid);
        } catch (error) {
            console.error('Error al crear libro:', error);
            throw error;
        }
    }

    async getLibros(bibliotecaId, filters = {}) {
        try {
            // OPTIMIZACIÓN: Usar índices y LIMIT para paginación
            let query = 'SELECT * FROM libros WHERE bibliotecaId = ?';
            const params = [bibliotecaId];

            if (filters.search) {
                // Buscar en campos principales: título, autor principal y materia
                query += ' AND (titulo LIKE ? OR mainAuthor LIKE ? OR subject LIKE ? OR isbn LIKE ? OR controlNumber LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
            }

            if (filters.subject) {
                query += ' AND subject = ?';
                params.push(filters.subject);
            }

            if (filters.cdu) {
                query += ' AND universalDecimalClassification = ?';
                params.push(filters.cdu);
            }

            if (filters.estado) {
                query += ' AND estado = ?';
                params.push(filters.estado);
            }

            if (filters.publisher) {
                query += ' AND publisher = ?';
                params.push(filters.publisher);
            }

            query += ' ORDER BY titulo ASC';

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
            console.log(`Actualizados ${updateResult.changes} préstamos`); //actualiza a null la cant de prestamos de este libro

            // Ahora eliminar el libro
            const stmt = this.db.prepare('DELETE FROM libros WHERE id = ?');
            const result = stmt.run(id);

            return result.changes > 0;
        }); // por eso termina aca por mas que esten separadas las lineas de la query

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

            // Verificar si ya existe un socio con ese email (globalmente, no solo por biblioteca)
            const emailNormalizado = socioData.email.toLowerCase().trim();
            const existingSocio = this.db.prepare('SELECT id, nombre FROM socios WHERE LOWER(TRIM(email)) = ?').get(emailNormalizado);

            if (existingSocio) {
                throw new Error(`Ya existe un socio con el email "${socioData.email}". El email debe ser único.`);
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
                query += ' AND (nombre LIKE ? OR email LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm);
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

                // Verificar que no exista otro socio con ese email
                const emailNormalizado = updates.email.toLowerCase().trim();
                const existingSocio = this.db.prepare('SELECT id FROM socios WHERE LOWER(TRIM(email)) = ? AND id != ?').get(emailNormalizado, id);

                if (existingSocio) {
                    throw new Error(`Ya existe un socio con el email "${updates.email}". El email debe ser único.`);
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
            const stmt = this.db.prepare(`
                INSERT INTO prestamos (libroId, socioId, bibliotecaId, fechaDevolucion, observaciones)
                VALUES (?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                prestamoData.libroId,
                prestamoData.socioId,
                prestamoData.bibliotecaId,
                prestamoData.fechaDevolucion,
                prestamoData.observaciones || null
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

            if (result.changes > 0 && prestamo.libroId) { //si se detecto un cambio y el id del libro no es null updateamos el estado de disponibilidad del libro
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

    async getLibrosPorMateria(bibliotecaId) {
        try {
            // OPTIMIZACIÓN: Usar índice en subject y bibliotecaId
            const stmt = this.db.prepare(`
                SELECT 
                    COALESCE(subject, 'Sin materia especificada') as materia, 
                    COUNT(*) as cantidad
                FROM libros 
                WHERE bibliotecaId = ? 
                GROUP BY subject
                ORDER BY cantidad DESC
            `);

            return stmt.all(bibliotecaId);
        } catch (error) {
            console.error('Error al obtener libros por materia:', error);
            throw error;
        }
    }

    // Función de compatibilidad con nombre antiguo
    async getLibrosPorCategoria(bibliotecaId) {
        return this.getLibrosPorMateria(bibliotecaId);
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
            // Insertar libros de ejemplo con la nueva estructura (formato MARC)
            const librosEjemplo = [{
                    controlNumber: 'LIB-001',
                    controlAgency: 'AR-LpUBP',
                    titulo: 'El Señor de los Anillos',
                    mainAuthor: 'Tolkien, J.R.R.',
                    coAuthors: null,
                    edition: '1ª ed.',
                    publisher: 'Minotauro',
                    publicationYear: 1954,
                    publicationPlace: 'Barcelona',
                    isbn: '978-84-450-7054-9',
                    universalDecimalClassification: '820',
                    subject: 'Fantasía',
                    series: 'The Lord of the Rings',
                    pageCount: 1178,
                    dimensions: '22 cm',
                    physicalDescription: 'Tapa dura, ilustraciones',
                    cataloguingLanguage: 'spa',
                    generalNote: 'Traducción al español',
                    cantidad: 3,
                    disponibles: 3,
                    estado: 'disponible',
                    bibliotecaId
                },
                {
                    controlNumber: 'LIB-002',
                    controlAgency: 'AR-LpUBP',
                    titulo: 'Cien años de soledad',
                    mainAuthor: 'García Márquez, Gabriel',
                    coAuthors: null,
                    edition: '1ª ed.',
                    publisher: 'Editorial Sudamericana',
                    publicationYear: 1967,
                    publicationPlace: 'Buenos Aires',
                    isbn: '978-84-397-2071-7',
                    universalDecimalClassification: '860',
                    subject: 'Novela latinoamericana',
                    series: null,
                    pageCount: 417,
                    dimensions: '21 cm',
                    physicalDescription: 'Tapa blanda',
                    cataloguingLanguage: 'spa',
                    generalNote: 'Obra maestra del realismo mágico',
                    cantidad: 2,
                    disponibles: 2,
                    estado: 'disponible',
                    bibliotecaId
                },
                {
                    controlNumber: 'LIB-003',
                    controlAgency: 'AR-LpUBP',
                    titulo: '1984',
                    mainAuthor: 'Orwell, George',
                    coAuthors: null,
                    edition: '1ª ed.',
                    publisher: 'Debolsillo',
                    publicationYear: 1949,
                    publicationPlace: 'Reino Unido',
                    isbn: '978-84-206-0000-0',
                    universalDecimalClassification: '827',
                    subject: 'Ciencia ficción distópica',
                    series: null,
                    pageCount: 328,
                    dimensions: '21 cm',
                    physicalDescription: 'Tapa blanda',
                    cataloguingLanguage: 'spa',
                    generalNote: 'Traducción al español',
                    cantidad: 4,
                    disponibles: 4,
                    estado: 'disponible',
                    bibliotecaId
                }
            ];

            // Insertar socios de ejemplo (sin cambios)
            const sociosEjemplo = [{
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
            console.log('Creando datos de muestra para UTN-FRLP (Formato MARC)...');

            // Libros de muestra con estructura MARC
            const librosUTN = [
                { controlNumber: 'UTN-2020-001', controlAgency: 'AR-UTN-FRLP', titulo: 'Introducción a la Programación', mainAuthor: 'Martínez, Carlos', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2020, publicationPlace: 'La Plata', isbn: '978-1234567890', universalDecimalClassification: '005.1', subject: 'Programación', series: 'Fundamentos de Informática', pageCount: 320, dimensions: '21 cm', physicalDescription: 'Tapa blanda, ilustraciones', cataloguingLanguage: 'spa', generalNote: 'Con ejemplos prácticos', cantidad: 5, disponibles: 3, bibliotecaId },
                { controlNumber: 'UTN-2021-001', controlAgency: 'AR-UTN-FRLP', titulo: 'Estructuras de Datos', mainAuthor: 'Fernández, Laura', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2021, publicationPlace: 'La Plata', isbn: '978-1234567891', universalDecimalClassification: '005.73', subject: 'Algoritmos y estructuras', series: null, pageCount: 280, dimensions: '21 cm', physicalDescription: 'Tapa blanda', cataloguingLanguage: 'spa', generalNote: 'Enfoque didáctico', cantidad: 4, disponibles: 2, bibliotecaId },
                { controlNumber: 'UTN-2022-001', controlAgency: 'AR-UTN-FRLP', titulo: 'Base de Datos', mainAuthor: 'Sánchez, Roberto', edition: '2ª ed.', publisher: 'UTN Press', publicationYear: 2022, publicationPlace: 'La Plata', isbn: '978-1234567892', universalDecimalClassification: '005.74', subject: 'Bases de datos', series: 'Informática Aplicada', pageCount: 410, dimensions: '22 cm', physicalDescription: 'Tapa dura, diagramas', cataloguingLanguage: 'spa', generalNote: 'Incluye SQL avanzado', cantidad: 6, disponibles: 4, bibliotecaId },
                { controlNumber: 'UTN-2019-001', controlAgency: 'AR-UTN-FRLP', titulo: 'Matemática Discreta', mainAuthor: 'García, Ana', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2019, publicationPlace: 'La Plata', isbn: '978-1234567893', universalDecimalClassification: '511.3', subject: 'Matemática discreta', series: 'Matemáticas', pageCount: 390, dimensions: '21 cm', physicalDescription: 'Tapa blanda, gráficos', cataloguingLanguage: 'spa', generalNote: 'Teoría de grafos incluida', cantidad: 3, disponibles: 1, bibliotecaId },
                { controlNumber: 'UTN-2020-002', controlAgency: 'AR-UTN-FRLP', titulo: 'Álgebra Lineal', mainAuthor: 'Torres, Miguel', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2020, publicationPlace: 'La Plata', isbn: '978-1234567894', universalDecimalClassification: '512.5', subject: 'Álgebra', series: 'Matemáticas', pageCount: 350, dimensions: '21 cm', physicalDescription: 'Tapa blanda', cataloguingLanguage: 'spa', generalNote: null, cantidad: 4, disponibles: 2, bibliotecaId },
                { controlNumber: 'UTN-2021-002', controlAgency: 'AR-UTN-FRLP', titulo: 'Cálculo Diferencial', mainAuthor: 'López, Patricia', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2021, publicationPlace: 'La Plata', isbn: '978-1234567895', universalDecimalClassification: '517.2', subject: 'Cálculo', series: 'Matemáticas', pageCount: 420, dimensions: '21 cm', physicalDescription: 'Tapa blanda, gráficos', cataloguingLanguage: 'spa', generalNote: 'Problemas resueltos', cantidad: 5, disponibles: 3, bibliotecaId },
                { controlNumber: 'UTN-2019-002', controlAgency: 'AR-UTN-FRLP', titulo: 'Física I', mainAuthor: 'Ruiz, Daniel', edition: '3ª ed.', publisher: 'UTN Press', publicationYear: 2019, publicationPlace: 'La Plata', isbn: '978-1234567896', universalDecimalClassification: '531', subject: 'Física - Mecánica', series: 'Ciencias Básicas', pageCount: 480, dimensions: '22 cm', physicalDescription: 'Tapa dura, ilustraciones', cataloguingLanguage: 'spa', generalNote: 'Experimentos de laboratorio', cantidad: 4, disponibles: 2, bibliotecaId },
                { controlNumber: 'UTN-2020-003', controlAgency: 'AR-UTN-FRLP', titulo: 'Física II', mainAuthor: 'Díaz, Carmen', edition: '2ª ed.', publisher: 'UTN Press', publicationYear: 2020, publicationPlace: 'La Plata', isbn: '978-1234567897', universalDecimalClassification: '537', subject: 'Física - Electricidad', series: 'Ciencias Básicas', pageCount: 450, dimensions: '22 cm', physicalDescription: 'Tapa dura', cataloguingLanguage: 'spa', generalNote: null, cantidad: 3, disponibles: 1, bibliotecaId },
                { controlNumber: 'UTN-2022-002', controlAgency: 'AR-UTN-FRLP', titulo: 'Redes de Computadoras', mainAuthor: 'Morales, Fernando', edition: '2ª ed.', publisher: 'UTN Press', publicationYear: 2022, publicationPlace: 'La Plata', isbn: '978-1234567898', universalDecimalClassification: '004.65', subject: 'Redes', series: 'Informática Aplicada', pageCount: 380, dimensions: '21 cm', physicalDescription: 'Tapa blanda, diagramas', cataloguingLanguage: 'spa', generalNote: 'Protocolos TCP/IP', cantidad: 5, disponibles: 3, bibliotecaId },
                { controlNumber: 'UTN-2021-003', controlAgency: 'AR-UTN-FRLP', titulo: 'Ingeniería de Software', mainAuthor: 'Ramírez, Silvia', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2021, publicationPlace: 'La Plata', isbn: '978-1234567899', universalDecimalClassification: '005.1', subject: 'Ingeniería de software', series: 'Informática Avanzada', pageCount: 400, dimensions: '21 cm', physicalDescription: 'Tapa blanda', cataloguingLanguage: 'spa', generalNote: 'Metodologías ágiles', cantidad: 4, disponibles: 2, bibliotecaId },
                { controlNumber: 'UTN-2023-001', controlAgency: 'AR-UTN-FRLP', titulo: 'Inteligencia Artificial', mainAuthor: 'Herrera, Luis', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2023, publicationPlace: 'La Plata', isbn: '978-1234567900', universalDecimalClassification: '006.3', subject: 'Inteligencia artificial', series: 'Informática Avanzada', pageCount: 360, dimensions: '21 cm', physicalDescription: 'Tapa blanda', cataloguingLanguage: 'spa', generalNote: 'Machine Learning básico', cantidad: 3, disponibles: 1, bibliotecaId },
                { controlNumber: 'UTN-2020-004', controlAgency: 'AR-UTN-FRLP', titulo: 'Química General', mainAuthor: 'González, María', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2020, publicationPlace: 'La Plata', isbn: '978-1234567901', universalDecimalClassification: '540', subject: 'Química', series: 'Ciencias Básicas', pageCount: 420, dimensions: '22 cm', physicalDescription: 'Tapa dura, tablas', cataloguingLanguage: 'spa', generalNote: 'Prácticas de laboratorio', cantidad: 4, disponibles: 2, bibliotecaId },
                { controlNumber: 'UTN-2021-004', controlAgency: 'AR-UTN-FRLP', titulo: 'Diseño Gráfico', mainAuthor: 'Castro, Jorge', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2021, publicationPlace: 'La Plata', isbn: '978-1234567902', universalDecimalClassification: '741.6', subject: 'Diseño', series: null, pageCount: 300, dimensions: '25 cm', physicalDescription: 'Tapa blanda, a color', cataloguingLanguage: 'spa', generalNote: 'Abundantes ilustraciones', cantidad: 3, disponibles: 1, bibliotecaId },
                { controlNumber: 'UTN-2022-003', controlAgency: 'AR-UTN-FRLP', titulo: 'Marketing Digital', mainAuthor: 'Silva, Andrea', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2022, publicationPlace: 'La Plata', isbn: '978-1234567903', universalDecimalClassification: '658.84', subject: 'Marketing digital', series: null, pageCount: 280, dimensions: '21 cm', physicalDescription: 'Tapa blanda', cataloguingLanguage: 'spa', generalNote: 'Estrategias digitales actuales', cantidad: 5, disponibles: 3, bibliotecaId },
                { controlNumber: 'UTN-2020-005', controlAgency: 'AR-UTN-FRLP', titulo: 'Gestión de Proyectos', mainAuthor: 'Vargas, Ricardo', edition: '1ª ed.', publisher: 'UTN Press', publicationYear: 2020, publicationPlace: 'La Plata', isbn: '978-1234567904', universalDecimalClassification: '658.4', subject: 'Gestión de proyectos', series: 'Administración', pageCount: 350, dimensions: '21 cm', physicalDescription: 'Tapa blanda', cataloguingLanguage: 'spa', generalNote: 'PMI y metodología ágil', cantidad: 4, disponibles: 2, bibliotecaId }
            ];

            // Socios de muestra (sin cambios, pero con nota)
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

            console.log('Insertando libros en formato MARC...');
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

            console.log('Datos de muestra MARC creados exitosamente');

            return {
                success: true,
                message: 'Datos de muestra UTN-FRLP (Formato MARC) insertados correctamente',
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