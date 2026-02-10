# 📚 Actualización de Estructura de Libros - BibliOS

## 📋 Resumen de Cambios

Se ha actualizado completamente la estructura de la entidad `Libro` basándose en el análisis de registros bibliográficos reales en formato **MARC** (Registro de Autoridades y Catalogación Legible por Máquina), que es el estándar internacional para bibliotecas.

---

## 🔍 Análisis de las Imágenes (Registros MARC Reales)

### Libro Identificado:
```
Título: Física general
Autor Principal: Sears, Francis Weston (1898)
Co-autor: Yusta Almarza, Albino (Traductor)
Editorial: Aguilar
Lugar: Madrid
Año: 1971
Edición: 5ª edición
Páginas: 1056
Dimensión: 23 cm
CDU: 53 (Física)
Materia: FÍSICA
Serie: Ciencia y Técnica. Secc. Física
Idioma: Español
Agencia: AR-LpUBP (Biblioteca Universidad Nacional La Plata, Argentina)
Número de Control: 10417I
```

---

## ❌ Campos Eliminados (Ejemplo)

| Campo Anterior | Razón |
|---|---|
| `autor` | Reemplazado por `mainAuthor` (más preciso) |
| `categoria` | Reemplazado por `subject` y `universalDecimalClassification` |
| `editorial` | Renombrado a `publisher` (estándar MARC) |
| `anioPublicacion` | Renombrado a `publicationYear` (convención camelCase) |
| `ubicacion` | Debe estar en tabla separada de "ejemplares" |
| `descripcion` | Distribuido en `generalNote` y `physicalDescription` |

---

## ✅ Nueva Estructura de la Tabla `libros`

### Identificadores Únicos
```javascript
controlNumber: STRING (UNIQUE, NOT NULL)      // Ej: "10417I" - ID único de la biblioteca
controlAgency: STRING                          // Ej: "AR-LpUBP" - Agencia catalogadora
```

### Información del Libro
```javascript
titulo: STRING (NOT NULL)                      // Ej: "Física general"
mainAuthor: STRING (NOT NULL)                  // Ej: "Sears, Francis Weston"
coAuthors: TEXT                                // Ej: "Zemansky, Mark W.; Yusta Almarza, Albino"
edition: STRING                                // Ej: "5a. ed."
```

### Publicación
```javascript
publisher: STRING (NOT NULL)                   // Ej: "Aguilar"
publicationYear: INTEGER (NOT NULL)            // Ej: 1971
publicationPlace: STRING                       // Ej: "Madrid"
```

### Identificadores Internacionales
```javascript
isbn: STRING (UNIQUE, OPTIONAL)                // Ej: "978-84-450-7054-9"
```

### Clasificación y Temas
```javascript
universalDecimalClassification: STRING         // CDU - Ej: "53" (Física)
subject: STRING                                // Materia - Ej: "Física"
series: STRING                                 // Serie/Colección - Ej: "Ciencia y Técnica"
```

### Descripción Física
```javascript
pageCount: INTEGER                             // Número de páginas - Ej: 1056
dimensions: STRING                             // Dimensiones - Ej: "23 cm"
physicalDescription: STRING                    // Detalles físicos - Ej: "front. il., grafs., tab."
```

### Metadatos del Sistema
```javascript
cataloguingLanguage: STRING                    // Código idioma - Ej: "spa" (español)
generalNote: TEXT                              // Nota general - Ej: "Traducción al español"
```

### Control de Copias (Mantenido del Sistema Anterior)
```javascript
cantidad: INTEGER (DEFAULT 1)                  // Total de copias
disponibles: INTEGER (DEFAULT 1)               // Copias disponibles
estado: STRING (DEFAULT 'disponible')          // Estado: disponible, prestado, etc.
```

### Relaciones y Auditoría
```javascript
bibliotecaId: INTEGER (FK)                     // Relación a biblioteca
fechaCreacion: DATETIME (DEFAULT CURRENT_TIMESTAMP)
lastModificationDate: DATETIME (DEFAULT CURRENT_TIMESTAMP)
```

---

## 📊 Ejemplo de Inserción

### Antes (Estructura Antigua)
```javascript
{
  titulo: 'Física general',
  autor: 'Sears, Francis Weston',
  isbn: '978-84-450-7054-9',
  categoria: 'Física',        // ❌ Muy genérico
  editorial: 'Aguilar',
  anioPublicacion: 1971,
  cantidad: 1,
  disponibles: 1,
  ubicacion: 'Estante A-1',   // ❌ Demasiado específico
  descripcion: 'Libro de física',
  bibliotecaId: 1
}
```

### Ahora (Estructura MARC)
```javascript
{
  controlNumber: '10417I',                    // ✅ Identificador único
  controlAgency: 'AR-LpUBP',
  titulo: 'Física general',
  mainAuthor: 'Sears, Francis Weston',
  coAuthors: 'Zemansky, Mark W.; Yusta Almarza, Albino',
  edition: '5a. ed.',
  publisher: 'Aguilar',
  publicationYear: 1971,
  publicationPlace: 'Madrid',
  isbn: '978-84-450-7054-9',
  universalDecimalClassification: '53',      // ✅ CDU estándar
  subject: 'Física',                          // ✅ Materia clara
  series: 'Ciencia y Técnica. Secc. Física',
  pageCount: 1056,
  dimensions: '23 cm',
  physicalDescription: 'front. (foto) il., grafs., tab.',
  cataloguingLanguage: 'spa',
  generalNote: 'Traducción al español; apéndices p. 955-1042',
  cantidad: 1,
  disponibles: 1,
  estado: 'disponible',
  bibliotecaId: 1
}
```

---

## 🔧 Cambios en las Funciones

### `createLibro(libroData)`
**Validaciones Agregadas:**
- ✅ `controlNumber` (obligatorio, único)
- ✅ `mainAuthor` (obligatorio, mejor nombre)
- ✅ `publisher` (obligatorio)
- ✅ `publicationYear` (obligatorio)
- ✅ Validación de unicidad de `controlNumber` por biblioteca

### `getLibros(bibliotecaId, filters)`
**Filtros Mejorados:**
- ✅ Búsqueda en: `titulo`, `mainAuthor`, `subject`, `isbn`, `controlNumber`
- ✅ Filtro por `subject` (antes `categoria`)
- ✅ Filtro por CDU (`universalDecimalClassification`)
- ✅ Filtro por `publisher`

### Nuevas Funciones
- ✅ `getLibrosPorMateria()` - Reemplaza `getLibrosPorCategoria()` (con compatibilidad)
- ✅ Función de compatibilidad `getLibrosPorCategoria()` → llama a `getLibrosPorMateria()`

---

## 📈 Índices Optimizados

```sql
CREATE INDEX idx_libros_titulo ON libros(titulo);
CREATE INDEX idx_libros_mainAuthor ON libros(mainAuthor);
CREATE INDEX idx_libros_subject ON libros(subject);
CREATE INDEX idx_libros_cdu ON libros(universalDecimalClassification);
CREATE INDEX idx_libros_controlNumber ON libros(controlNumber);
CREATE INDEX idx_libros_isbn ON libros(isbn);
CREATE INDEX idx_libros_biblioteca ON libros(bibliotecaId);
CREATE INDEX idx_libros_estado ON libros(estado);
CREATE INDEX idx_libros_disponibles ON libros(disponibles);
```

---

## 🗂️ Datos de Prueba (UTN-FRLP)

Se han actualizado todos los datos de prueba para usar la nueva estructura MARC:

```javascript
// Ejemplo de libro de prueba
{
  controlNumber: 'UTN-2020-001',
  controlAgency: 'AR-UTN-FRLP',
  titulo: 'Introducción a la Programación',
  mainAuthor: 'Martínez, Carlos',
  edition: '1ª ed.',
  publisher: 'UTN Press',
  publicationYear: 2020,
  publicationPlace: 'La Plata',
  isbn: '978-1234567890',
  universalDecimalClassification: '005.1',
  subject: 'Programación',
  series: 'Fundamentos de Informática',
  pageCount: 320,
  dimensions: '21 cm',
  physicalDescription: 'Tapa blanda, ilustraciones',
  cataloguingLanguage: 'spa',
  generalNote: 'Con ejemplos prácticos',
  cantidad: 5,
  disponibles: 3
}
```

---

## 🚀 Migración de Base de Datos

Los cambios en la estructura de la tabla `libros` requieren una **migración manual de datos** si ya tienes datos existentes:

### Pasos de Migración (si necesario)

1. **Backup previo:**
   ```bash
   npm run backup
   ```

2. **Limpiar datos antiguos (si no hay datos importantes):**
   ```javascript
   // La función migrateTables() lo hará automáticamente
   // cuando la BD se inicialice
   ```

3. **Reinicializar la aplicación:**
   - La BD se recreará con la nueva estructura automáticamente
   - Los datos de muestra UTN-FRLP se cargarán con el nuevo formato

---

## ✨ Ventajas de la Nueva Estructura

| Aspecto | Antes | Ahora |
|---|---|---|
| **Estandarización** | Campos genéricos | Formato MARC internacional |
| **Precisión** | `autor` confuso | `mainAuthor` + `coAuthors` |
| **Clasificación** | `categoria` vaga | `subject` + CDU + Series |
| **Documentación** | Escasa | `generalNote` + `physicalDescription` |
| **Identificación** | Solo ISBN | ISBN + Control Number única por biblioteca |
| **Búsqueda** | Limitada | Búsqueda multicamp completa |
| **Compatibilidad** | N/A | Compatible con sistemas MARC/OPAC |

---

## 📝 Notas Importantes

1. **`controlNumber` es obligatorio:** Cada libro debe tener un identificador único asignado por la biblioteca.

2. **Nombres en camelCase:** Se mantiene coherencia con convenciones JavaScript.

3. **Estados del libro:** Los estados (`disponible`, `prestado`) se mantienen igual.

4. **JSON en coautores:** El campo `coAuthors` puede almacenarse como:
   - Cadena separada por punto y coma: "Autor1; Autor2; Autor3"
   - JSON: `["Autor1", "Autor2"]` (si se implementa serialización)

5. **Backward Compatibility:** Función `getLibrosPorCategoria()` aún existe pero usa `subject` internamente.

---

## 🔗 Referencias

- **MARC Format:** https://www.loc.gov/marc/
- **CDU (Clasificación Decimal Universal):** https://www.udcc.org/
- **OPAC (Catálogos Web de Bibliotecas):** Sistema estándar que usa estos campos

---

## ✅ Estado de la Implementación

- ✅ Estructura de BD actualizada
- ✅ Funciones de CRUD actualizadas
- ✅ Índices optimizados
- ✅ Datos de prueba UTN-FRLP en formato MARC
- ✅ Validaciones mejoradas
- ✅ Compatibilidad backward
- ✅ Documentación completa

**Próximas mejoras recomendadas:**
- [ ] Tabla separada para `exemplares` (copias físicas)
- [ ] Tabla de `autoridades` para autores y editores
- [ ] Importación desde sistemas MARC reales
- [ ] Generación de números de control automáticos
- [ ] UI actualizada para mostrar nuevos campos
