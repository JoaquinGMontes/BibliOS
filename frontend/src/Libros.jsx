import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, BookOpen, User, Calendar, 
  CheckCircle, AlertTriangle, Clock, Eye, Edit, Trash2,
  ArrowUpDown, Book, FileText, Circle, Triangle, CheckCircle2, 
  MapPin, Hash, Tag, Star, Users, Zap, Info
} from 'lucide-react';
import './libros.css';
import Navbar from './Navbar.jsx';
import { buscarLibroPorTitulo, buscarLibroPorISBN } from './utils/openLibraryAPI.js';

export default function Libros() {
  // Estados principales
  const [libros, setLibros] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selectedLibro, setSelectedLibro] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [libroToDelete, setLibroToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [libroToEdit, setLibroToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSearching, setIsSearching] = useState(false);

  // Estado del formulario (Estructura MARC)
  const [formData, setFormData] = useState({
    controlNumber: '',
    controlAgency: '',
    titulo: '',
    mainAuthor: '',
    coAuthors: '',
    edition: '',
    publisher: '',
    publicationYear: '',
    publicationPlace: '',
    isbn: '',
    universalDecimalClassification: '',
    subject: '',
    series: '',
    pageCount: '',
    dimensions: '',
    physicalDescription: '',
    cataloguingLanguage: 'spa',
    generalNote: '',
    cabecera: '',
    fechaUltimaTransaccion: '',
    cantidad: '1',
    estado: 'disponible'
  });

  // Cargar datos REALES desde la base de datos
  useEffect(() => {
    const loadLibros = async () => {
      try {
        console.log('📚 INICIANDO CARGA DE LIBROS...');
        // Obtener biblioteca activa
        const storedLibrary = localStorage.getItem('bibliotecaActiva');
        console.log('📖 Biblioteca activa encontrada:', storedLibrary);
        if (storedLibrary && window.electronAPI) {
          const library = JSON.parse(storedLibrary);
          console.log('🏢 Biblioteca ID:', library.id);
          
          // Cargar libros REALES de la biblioteca
          console.log('🔄 Haciendo llamada a getLibros...');
          const librosReales = await window.electronAPI.getLibros(library.id, {});
          console.log('✅ Libros cargados desde BD:', librosReales);
          
          // Formatear los datos para el componente
          const librosFormateados = librosReales.map(libro => ({
            id: libro.id,
            titulo: libro.titulo,
            mainAuthor: libro.mainAuthor || '',
            isbn: libro.isbn || '',
            subject: libro.subject || '',
            publisher: libro.publisher || '',
            publicationYear: libro.publicationYear || '',
            cdu: libro.universalDecimalClassification || '',
            cantidad: libro.cantidad || 1,
            disponibles: libro.disponibles || 0,
            prestamosTotales: 0,
            estado: libro.estado || 'disponible',
            pageCount: libro.pageCount || '',
            edition: libro.edition || ''
          }));
          
          console.log('✅ Libros formateados:', librosFormateados.length, 'libros');
          setLibros(librosFormateados);
        } else {
          console.warn('⚠️ No hay biblioteca activa o electronAPI no disponible');
          // Si no hay biblioteca activa, no mostrar libros
          setLibros([]);
        }
      } catch (error) {
        console.error('❌ Error al cargar libros:', error);
        setLibros([]);
      }
    };

    loadLibros();
  }, []);

  // Funciones auxiliares
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'disponible': return '#10b981';
      case 'prestado': return '#f59e0b';
      case 'mantenimiento': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'disponible': return <CheckCircle size={14} />;
      case 'prestado': return <Clock size={14} />;
      case 'mantenimiento': return <AlertTriangle size={14} />;
      default: return <Circle size={14} />;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para restaurar focus en inputs (solución para Windows/Electron)
  const handleInputClick = (e) => {
    e.target.focus();
    e.target.select();
  };

  // Función para buscar automáticamente el libro por ISBN
  const handleAutoSearch = async () => {
    if (!formData.isbn.trim()) {
      await window.nativeDialog.warning({
        message: 'ISBN requerido',
        detail: 'Por favor ingresa el ISBN del libro para buscar automáticamente.'
      });
      return;
    }

    setIsSearching(true);
    try {
      const libroEncontrado = await buscarLibroPorISBN(formData.isbn.trim());

      if (libroEncontrado) {
        // Actualizar el formulario con los datos encontrados
        setFormData(prev => ({
          ...prev,
          titulo: libroEncontrado.titulo || prev.titulo,
          autor: libroEncontrado.autor || prev.autor,
          isbn: libroEncontrado.isbn || prev.isbn,
          categoria: libroEncontrado.categoria || prev.categoria,
          editorial: libroEncontrado.editorial || prev.editorial,
          anioPublicacion: libroEncontrado.anioPublicacion || prev.anioPublicacion,
          descripcion: libroEncontrado.descripcion || prev.descripcion
        }));
        
        await window.nativeDialog.message({
          message: '¡Libro encontrado!',
          detail: 'Los datos se han llenado automáticamente. Revisa y ajusta si es necesario.'
        });
      } else {
        await window.nativeDialog.warning({
          message: 'Libro no encontrado',
          detail: 'No se encontró información del libro con ese ISBN. Por favor completa los datos manualmente.'
        });
      }
    } catch (error) {
      console.error('Error al buscar libro:', error);
      await window.nativeDialog.error({
        message: 'Error al buscar el libro',
        detail: error.message
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Obtener biblioteca activa
      const storedLibrary = localStorage.getItem('bibliotecaActiva');
      if (!storedLibrary) {
        await window.nativeDialog.error({
          message: 'No hay biblioteca activa',
          detail: 'Por favor, selecciona una biblioteca primero.'
        });
        return;
      }
      
      const library = JSON.parse(storedLibrary);
      
      // Crear libro en la base de datos
      if (window.electronAPI) {
        const newLibro = await window.electronAPI.createLibro({
          controlNumber: formData.controlNumber,
          controlAgency: formData.controlAgency || '',
          titulo: formData.titulo,
          mainAuthor: formData.mainAuthor,
          coAuthors: formData.coAuthors || null,
          edition: formData.edition || null,
          publisher: formData.publisher,
          publicationYear: formData.publicationYear ? parseInt(formData.publicationYear) : null,
          publicationPlace: formData.publicationPlace || null,
          isbn: formData.isbn || null,
          universalDecimalClassification: formData.universalDecimalClassification || null,
          subject: formData.subject || null,
          series: formData.series || null,
          pageCount: formData.pageCount ? parseInt(formData.pageCount) : null,
          dimensions: formData.dimensions || null,
          physicalDescription: formData.physicalDescription || null,
          cataloguingLanguage: formData.cataloguingLanguage || 'spa',
          generalNote: formData.generalNote || null,
          cabecera: formData.cabecera || null,
          fechaUltimaTransaccion: formData.fechaUltimaTransaccion || null,
          cantidad: parseInt(formData.cantidad) || 1,
          estado: formData.estado || 'disponible',
          bibliotecaId: library.id
        });
        
        // Agregar a la lista local
        setLibros([...libros, {
          ...newLibro,
          prestamosTotales: 0
        }]);
      } else {
        // Fallback local
        const newLibro = {
          id: Date.now(),
          ...formData,
          cantidad: parseInt(formData.cantidad),
          disponibles: parseInt(formData.cantidad),
          prestamosTotales: 0,
          estado: 'disponible',
          anioPublicacion: formData.anioPublicacion || new Date().getFullYear().toString()
        };
        setLibros([...libros, newLibro]);
      }
      
      // Limpiar formulario
      setFormData({
        controlNumber: '',
        controlAgency: '',
        titulo: '',
        mainAuthor: '',
        coAuthors: '',
        edition: '',
        publisher: '',
        publicationYear: '',
        publicationPlace: '',
        isbn: '',
        universalDecimalClassification: '',
        subject: '',
        series: '',
        pageCount: '',
        dimensions: '',
        physicalDescription: '',
        cataloguingLanguage: 'spa',
        generalNote: '',
        cabecera: '',
        fechaUltimaTransaccion: '',
        cantidad: '1',
        estado: 'disponible'
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error al crear libro:', error);
      await window.nativeDialog.error({
        message: 'Error al crear libro',
        detail: error.message
      });
    }
  };

  const handleEliminar = (libroId) => {
    setLibroToDelete(libroId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (libroToDelete) {
      try {
        // Eliminar de la base de datos
        if (window.electronAPI) {
          await window.electronAPI.deleteLibro(libroToDelete);
        }
        
        // Eliminar de la lista local
        setLibros(libros.filter(libro => libro.id !== libroToDelete));
        setLibroToDelete(null);
      } catch (error) {
        console.error('Error al eliminar libro:', error);
        await window.nativeDialog.error({
          message: 'Error al eliminar libro',
          detail: error.message
        });
      }
    }
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setLibroToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Funciones de edición
  const handleEditClick = (libro) => {
    setLibroToEdit(libro);
    setEditFormData({
      controlNumber: libro.controlNumber || '',
      controlAgency: libro.controlAgency || '',
      titulo: libro.titulo,
      mainAuthor: libro.mainAuthor,
      coAuthors: libro.coAuthors || '',
      edition: libro.edition || '',
      publisher: libro.publisher || '',
      publicationYear: libro.publicationYear || '',
      publicationPlace: libro.publicationPlace || '',
      isbn: libro.isbn || '',
      universalDecimalClassification: libro.universalDecimalClassification || '',
      subject: libro.subject || '',
      series: libro.series || '',
      pageCount: libro.pageCount || '',
      dimensions: libro.dimensions || '',
      physicalDescription: libro.physicalDescription || '',
      cataloguingLanguage: libro.cataloguingLanguage || 'spa',
      generalNote: libro.generalNote || '',
      cantidad: libro.cantidad || 1,
      estado: libro.estado || 'disponible'
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para restaurar focus en inputs del formulario de edición
  const handleEditInputClick = (e) => {
    e.target.focus();
    e.target.select();
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (window.electronAPI && libroToEdit) {
        await window.electronAPI.updateLibro(libroToEdit.id, {
          controlNumber: editFormData.controlNumber,
          controlAgency: editFormData.controlAgency || '',
          titulo: editFormData.titulo,
          mainAuthor: editFormData.mainAuthor,
          coAuthors: editFormData.coAuthors || null,
          edition: editFormData.edition || null,
          publisher: editFormData.publisher,
          publicationYear: editFormData.publicationYear ? parseInt(editFormData.publicationYear) : null,
          publicationPlace: editFormData.publicationPlace || null,
          isbn: editFormData.isbn || null,
          universalDecimalClassification: editFormData.universalDecimalClassification || null,
          subject: editFormData.subject || null,
          series: editFormData.series || null,
          pageCount: editFormData.pageCount ? parseInt(editFormData.pageCount) : null,
          dimensions: editFormData.dimensions || null,
          physicalDescription: editFormData.physicalDescription || null,
          cataloguingLanguage: editFormData.cataloguingLanguage || 'spa',
          generalNote: editFormData.generalNote || null,
          cabecera: editFormData.cabecera || null,
          fechaUltimaTransaccion: editFormData.fechaUltimaTransaccion || null,
          cantidad: parseInt(editFormData.cantidad) || 1,
          estado: editFormData.estado || 'disponible'
        });
        
        // Actualizar lista local
        setLibros(libros.map(libro => 
          libro.id === libroToEdit.id 
            ? { ...libro, ...editFormData, cantidad: parseInt(editFormData.cantidad) }
            : libro
        ));
      }
      
      setShowEditModal(false);
      setLibroToEdit(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error al actualizar libro:', error);
      await window.nativeDialog.error({
        message: 'Error al actualizar libro',
        detail: error.message
      });
    }
  };

  // Filtrado y búsqueda
  const filteredLibros = libros.filter(libro => {
    const matchesSearch = searchTerm === '' || 
      libro.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      libro.mainAuthor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      libro.isbn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (libro.subject && libro.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === 'todos' || libro.estado === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Estadísticas
  const stats = {
    total: libros.length,
    disponibles: libros.filter(l => l.estado === 'disponible').length,
    prestados: libros.filter(l => l.estado === 'prestado').length,
    totalEjemplares: libros.reduce((sum, libro) => sum + libro.cantidad, 0)
  };

  return (
    <>
      <Navbar />
      <div className="libros-container">
        {/* Header */}
        <div className="libros-header">
          <div className="header-content">
            <h1>Gestión de Libros</h1>
            <span className="header-separator">|</span>
            <p>Administrá el catálogo de libros, ejemplares y disponibilidad</p>
          </div>
          <button 
            className="add-button"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={18} />
            Nuevo Libro
          </button>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Book size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Total Libros</h3>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle2 size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Disponibles</h3>
              <p className="stat-value">{stats.disponibles}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Prestados</h3>
              <p className="stat-value">{stats.prestados}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Total Ejemplares</h3>
              <p className="stat-value">{stats.totalEjemplares}</p>
            </div>
          </div>
        </div>

        {/* Formulario de nuevo libro */}
        {showForm && (
          <div className="form-section">
            <h3>Nuevo Libro (Formato MARC)</h3>
            <form onSubmit={handleSubmit} className="libro-form">
              {/* FILA 1: Identificadores */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="controlNumber">Número de Control *</label>
                  <input
                    type="text"
                    id="controlNumber"
                    name="controlNumber"
                    value={formData.controlNumber}
                    onChange={handleInputChange}
                    placeholder="Ej: 10417I"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="controlAgency">Agencia Catalogadora</label>
                  <input
                    type="text"
                    id="controlAgency"
                    name="controlAgency"
                    value={formData.controlAgency}
                    onChange={handleInputChange}
                    placeholder="Ej: AR-LpUBP"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="isbn">ISBN</label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleInputChange}
                    placeholder="Ej: 978-84-450-7054-9"
                  />
                </div>
              </div>

              {/* FILA 2: Información principal */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="titulo">Título *</label>
                  <input
                    type="text"
                    id="titulo"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="mainAuthor">Autor Principal *</label>
                  <input
                    type="text"
                    id="mainAuthor"
                    name="mainAuthor"
                    value={formData.mainAuthor}
                    onChange={handleInputChange}
                    placeholder="Ej: Sears, Francis Weston"
                    required
                  />
                </div>
              </div>

              {/* FILA 3: Co-autores y edición */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="coAuthors">Co-Autores / Traductores</label>
                  <input
                    type="text"
                    id="coAuthors"
                    name="coAuthors"
                    value={formData.coAuthors}
                    onChange={handleInputChange}
                    placeholder="Ej: Zemansky, Mark W.; Yusta Almarza, Albino"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edition">Edición</label>
                  <input
                    type="text"
                    id="edition"
                    name="edition"
                    value={formData.edition}
                    onChange={handleInputChange}
                    placeholder="Ej: 5a. ed."
                  />
                </div>
              </div>

              {/* FILA 4: Publicación */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="publisher">Editorial / Publicador *</label>
                  <input
                    type="text"
                    id="publisher"
                    name="publisher"
                    value={formData.publisher}
                    onChange={handleInputChange}
                    placeholder="Ej: Aguilar"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="publicationYear">Año de Publicación *</label>
                  <input
                    type="number"
                    id="publicationYear"
                    name="publicationYear"
                    value={formData.publicationYear}
                    onChange={handleInputChange}
                    min="1000"
                    max={new Date().getFullYear()}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="publicationPlace">Lugar de Publicación</label>
                  <input
                    type="text"
                    id="publicationPlace"
                    name="publicationPlace"
                    value={formData.publicationPlace}
                    onChange={handleInputChange}
                    placeholder="Ej: Madrid"
                  />
                </div>
              </div>

              {/* FILA 5: Clasificación */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="universalDecimalClassification">CDU (Clasif. Decimal Universal)</label>
                  <input
                    type="text"
                    id="universalDecimalClassification"
                    name="universalDecimalClassification"
                    value={formData.universalDecimalClassification}
                    onChange={handleInputChange}
                    placeholder="Ej: 53 (Física)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="subject">Materia / Tema *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="Ej: Física"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="series">Serie / Colección</label>
                  <input
                    type="text"
                    id="series"
                    name="series"
                    value={formData.series}
                    onChange={handleInputChange}
                    placeholder="Ej: Ciencia y Técnica. Secc. Física"
                  />
                </div>
              </div>

              {/* FILA 6: Descripción física */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pageCount">Número de Páginas</label>
                  <input
                    type="number"
                    id="pageCount"
                    name="pageCount"
                    value={formData.pageCount}
                    onChange={handleInputChange}
                    placeholder="Ej: 1056"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dimensions">Dimensiones</label>
                  <input
                    type="text"
                    id="dimensions"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    placeholder="Ej: 23 cm"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="physicalDescription">Descripción Física</label>
                  <input
                    type="text"
                    id="physicalDescription"
                    name="physicalDescription"
                    value={formData.physicalDescription}
                    onChange={handleInputChange}
                    placeholder="Ej: front. (foto) il., grafs., tab."
                  />
                </div>
              </div>

              {/* FILA 7: Metadatos */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cataloguingLanguage">Idioma Catalogación</label>
                  <select
                    id="cataloguingLanguage"
                    name="cataloguingLanguage"
                    value={formData.cataloguingLanguage}
                    onChange={handleInputChange}
                  >
                    <option value="spa">Español (spa)</option>
                    <option value="eng">Inglés (eng)</option>
                    <option value="fra">Francés (fra)</option>
                    <option value="por">Portugués (por)</option>
                    <option value="deu">Alemán (deu)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="cantidad">Cantidad de Ejemplares *</label>
                  <input
                    type="number"
                    id="cantidad"
                    name="cantidad"
                    value={formData.cantidad}
                    onChange={handleInputChange}
                    required
                    min="1"
                  />
                </div>
              </div>

              {/* FILA 8: Notas y estado */}
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="generalNote">Nota General</label>
                  <textarea
                    id="generalNote"
                    name="generalNote"
                    value={formData.generalNote}
                    onChange={handleInputChange}
                    placeholder="Ej: Traducción al español; apéndices p. 955-1042"
                    rows="2"
                  />
                </div>
              </div>

              {/* FILA 9: Cabecera y Fecha última transacción */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cabecera">Cabecera</label>
                  <input
                    type="text"
                    id="cabecera"
                    name="cabecera"
                    value={formData.cabecera}
                    onChange={handleInputChange}
                    placeholder="Ej: Cabecera del libro"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fechaUltimaTransaccion">Fecha y Hora Última Transacción</label>
                  <input
                    type="datetime-local"
                    id="fechaUltimaTransaccion"
                    name="fechaUltimaTransaccion"
                    value={formData.fechaUltimaTransaccion}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">
                  <Plus size={16} />
                  Registrar Libro
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="filters-section">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por título, autor, materia o ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-box">
            <Filter size={16} />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="disponible">Disponibles</option>
              <option value="prestado">Prestados</option>
              <option value="mantenimiento">En mantenimiento</option>
            </select>
          </div>
        </div>

        {/* Tabla de libros */}
        <div className="table-section">
          <div className="table-header">
            <h3>Catálogo de Libros</h3>
            <span className="count">{filteredLibros.length} libros</span>
          </div>
          <div className="table-container">
            <table className="libros-table">
              <thead>
                <tr>
                  <th>Libro</th>
                  <th>Información</th>
                  <th>Ejemplares</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredLibros.map(libro => {
                  return (
                    <tr key={libro.id}>
                      <td>
                        <div className="libro-info">
                          <BookOpen size={16} />
                          <div>
                            <strong>{libro.titulo}</strong>
                            <div className="libro-author">
                              <User size={12} />
                              {libro.mainAuthor}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="libro-details">
                          {libro.isbn && (
                            <div className="detail-item">
                              <Hash size={12} />
                              {libro.isbn}
                            </div>
                          )}
                          {libro.subject && (
                            <div className="detail-item">
                              <Tag size={12} />
                              {libro.subject}
                            </div>
                          )}
                          {libro.publisher && (
                            <div className="detail-item">
                              <FileText size={12} />
                              {libro.publisher} ({libro.publicationYear})
                            </div>
                          )}
                          {libro.cdu && (
                            <div className="detail-item">
                              <Tag size={12} />
                              CDU: {libro.cdu}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="ejemplares-info">
                          <div className="ejemplares-total">
                            <Book size={12} />
                            {libro.cantidad} total
                          </div>
                          <div className="ejemplares-disponibles">
                            <CheckCircle size={12} />
                            {libro.disponibles} disponibles
                          </div>
                          <div className="ejemplares-prestados">
                            <Clock size={12} />
                            {libro.cantidad - libro.disponibles} prestados
                          </div>
                        </div>
                      </td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getEstadoColor(libro.estado) }}
                        >
                          {getEstadoIcon(libro.estado)}
                          {libro.estado}
                        </span>
                      </td>
                      <td>
                        {libro.edition && (
                          <div className="ubicacion-info">
                            <Info size={12} />
                            {libro.edition}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="actions">
                          <button 
                            className="action-btn view"
                            onClick={() => {
                              setSelectedLibro(libro);
                              setShowDetails(true);
                            }}
                            title="Ver detalles"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEditClick(libro)}
                            title="Editar libro"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleEliminar(libro.id)}
                            title="Eliminar libro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de detalles */}
        {showDetails && selectedLibro && (
          <div className="modal-overlay" onClick={() => setShowDetails(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Detalles del Libro #{selectedLibro.id}</h3>
                <button 
                  className="close-button"
                  onClick={() => setShowDetails(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="detail-row">
                  <span className="label">Número de Control:</span>
                  <span className="value">{selectedLibro.controlNumber || 'No especificado'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Título:</span>
                  <span className="value">{selectedLibro.titulo}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Autor Principal:</span>
                  <span className="value">{selectedLibro.mainAuthor}</span>
                </div>
                {selectedLibro.coAuthors && (
                  <div className="detail-row">
                    <span className="label">Coautores:</span>
                    <span className="value">{selectedLibro.coAuthors}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">ISBN:</span>
                  <span className="value">{selectedLibro.isbn || 'No especificado'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Editorial:</span>
                  <span className="value">{selectedLibro.publisher || 'No especificada'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Año de Publicación:</span>
                  <span className="value">{selectedLibro.publicationYear}</span>
                </div>
                {selectedLibro.publicationPlace && (
                  <div className="detail-row">
                    <span className="label">Lugar de Publicación:</span>
                    <span className="value">{selectedLibro.publicationPlace}</span>
                  </div>
                )}
                {selectedLibro.edition && (
                  <div className="detail-row">
                    <span className="label">Edición:</span>
                    <span className="value">{selectedLibro.edition}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Tema/Asunto:</span>
                  <span className="value">{selectedLibro.subject || 'No especificado'}</span>
                </div>
                {selectedLibro.universalDecimalClassification && (
                  <div className="detail-row">
                    <span className="label">CDU (Clasificación Decimal Universal):</span>
                    <span className="value">{selectedLibro.universalDecimalClassification}</span>
                  </div>
                )}
                {selectedLibro.series && (
                  <div className="detail-row">
                    <span className="label">Serie o Colección:</span>
                    <span className="value">{selectedLibro.series}</span>
                  </div>
                )}
                {selectedLibro.pageCount && (
                  <div className="detail-row">
                    <span className="label">Número de Páginas:</span>
                    <span className="value">{selectedLibro.pageCount}</span>
                  </div>
                )}
                {selectedLibro.dimensions && (
                  <div className="detail-row">
                    <span className="label">Dimensiones:</span>
                    <span className="value">{selectedLibro.dimensions}</span>
                  </div>
                )}
                {selectedLibro.physicalDescription && (
                  <div className="detail-row">
                    <span className="label">Descripción Física:</span>
                    <span className="value">{selectedLibro.physicalDescription}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Idioma de Catalogación:</span>
                  <span className="value">{selectedLibro.cataloguingLanguage || 'spa'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Cantidad Total:</span>
                  <span className="value">{selectedLibro.cantidad} ejemplares</span>
                </div>
                <div className="detail-row">
                  <span className="label">Disponibles:</span>
                  <span className="value">{selectedLibro.disponibles} ejemplares</span>
                </div>
                <div className="detail-row">
                  <span className="label">Prestados:</span>
                  <span className="value">{selectedLibro.cantidad - selectedLibro.disponibles} ejemplares</span>
                </div>
                <div className="detail-row">
                  <span className="label">Total de Préstamos:</span>
                  <span className="value">{selectedLibro.prestamosTotales}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Estado:</span>
                  <span 
                    className="value status-badge"
                    style={{ backgroundColor: getEstadoColor(selectedLibro.estado) }}
                  >
                    {selectedLibro.estado}
                  </span>
                </div>
                {selectedLibro.generalNote && (
                  <div className="detail-row">
                    <span className="label">Notas Generales:</span>
                    <span className="value">{selectedLibro.generalNote}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteConfirm && (
          <div className="modal-overlay" onClick={cancelDelete}>
            <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Confirmar Eliminación</h3>
                <button 
                  className="close-button"
                  onClick={cancelDelete}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="confirm-message">
                  <AlertTriangle size={24} color="#ef4444" />
                  <p>¿Estás seguro de que quieres eliminar este libro?</p>
                  <p className="confirm-warning">Esta acción no se puede deshacer.</p>
                </div>
                <div className="confirm-actions">
                  <button 
                    className="confirm-btn cancel"
                    onClick={cancelDelete}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="confirm-btn delete"
                    onClick={confirmDelete}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de edición */}
        {showEditModal && libroToEdit && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Editar Libro #{libroToEdit.id}</h3>
                <button 
                  className="close-button"
                  onClick={() => setShowEditModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdateSubmit} className="libro-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-controlNumber">Número de Control *</label>
                      <input
                        type="text"
                        id="edit-controlNumber"
                        name="controlNumber"
                        value={editFormData.controlNumber}
                        onChange={handleEditInputChange}
                        placeholder="000128483"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-controlAgency">Agencia de Control</label>
                      <input
                        type="text"
                        id="edit-controlAgency"
                        name="controlAgency"
                        value={editFormData.controlAgency}
                        onChange={handleEditInputChange}
                        placeholder="AR-LpUBP"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-isbn">ISBN</label>
                      <input
                        type="text"
                        id="edit-isbn"
                        name="isbn"
                        value={editFormData.isbn}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-titulo">Título *</label>
                      <input
                        type="text"
                        id="edit-titulo"
                        name="titulo"
                        value={editFormData.titulo}
                        onChange={handleEditInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-mainAuthor">Autor Principal *</label>
                      <input
                        type="text"
                        id="edit-mainAuthor"
                        name="mainAuthor"
                        value={editFormData.mainAuthor}
                        onChange={handleEditInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-coAuthors">Coautores</label>
                      <input
                        type="text"
                        id="edit-coAuthors"
                        name="coAuthors"
                        value={editFormData.coAuthors}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-edition">Edición</label>
                      <input
                        type="text"
                        id="edit-edition"
                        name="edition"
                        value={editFormData.edition}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-publisher">Editorial *</label>
                      <input
                        type="text"
                        id="edit-publisher"
                        name="publisher"
                        value={editFormData.publisher}
                        onChange={handleEditInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-publicationYear">Año de Publicación *</label>
                      <input
                        type="number"
                        id="edit-publicationYear"
                        name="publicationYear"
                        value={editFormData.publicationYear}
                        onChange={handleEditInputChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-publicationPlace">Lugar de Publicación</label>
                      <input
                        type="text"
                        id="edit-publicationPlace"
                        name="publicationPlace"
                        value={editFormData.publicationPlace}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-universalDecimalClassification">CDU (Clasificación Decimal Universal)</label>
                      <input
                        type="text"
                        id="edit-universalDecimalClassification"
                        name="universalDecimalClassification"
                        value={editFormData.universalDecimalClassification}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-subject">Tema/Asunto</label>
                      <input
                        type="text"
                        id="edit-subject"
                        name="subject"
                        value={editFormData.subject}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-series">Serie o Colección</label>
                      <input
                        type="text"
                        id="edit-series"
                        name="series"
                        value={editFormData.series}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-pageCount">Número de Páginas</label>
                      <input
                        type="number"
                        id="edit-pageCount"
                        name="pageCount"
                        value={editFormData.pageCount}
                        onChange={handleEditInputChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-dimensions">Dimensiones</label>
                      <input
                        type="text"
                        id="edit-dimensions"
                        name="dimensions"
                        value={editFormData.dimensions}
                        onChange={handleEditInputChange}
                        placeholder="e.g., 21 x 15 cm"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-physicalDescription">Descripción Física</label>
                      <input
                        type="text"
                        id="edit-physicalDescription"
                        name="physicalDescription"
                        value={editFormData.physicalDescription}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-cataloguingLanguage">Idioma de Catalogación</label>
                      <select
                        id="edit-cataloguingLanguage"
                        name="cataloguingLanguage"
                        value={editFormData.cataloguingLanguage}
                        onChange={handleEditInputChange}
                      >
                        <option value="spa">Español</option>
                        <option value="eng">Inglés</option>
                        <option value="fra">Francés</option>
                        <option value="por">Portugués</option>
                        <option value="deu">Alemán</option>
                        <option value="ita">Italiano</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-cantidad">Cantidad Total</label>
                      <input
                        type="number"
                        id="edit-cantidad"
                        name="cantidad"
                        value={editFormData.cantidad}
                        onChange={handleEditInputChange}
                        min="1"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-estado">Estado</label>
                      <select
                        id="edit-estado"
                        name="estado"
                        value={editFormData.estado}
                        onChange={handleEditInputChange}
                      >
                        <option value="disponible">Disponible</option>
                        <option value="dañado">Dañado</option>
                        <option value="perdido">Perdido</option>
                        <option value="descatalogado">Descatalogado</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label htmlFor="edit-generalNote">Notas Generales</label>
                      <textarea
                        id="edit-generalNote"
                        name="generalNote"
                        value={editFormData.generalNote}
                        onChange={handleEditInputChange}
                        rows="3"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-cabecera">Cabecera</label>
                      <input
                        type="text"
                        id="edit-cabecera"
                        name="cabecera"
                        value={editFormData.cabecera}
                        onChange={handleEditInputChange}
                        placeholder="Ej: Cabecera del libro"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-fechaUltimaTransaccion">Fecha y Hora Última Transacción</label>
                      <input
                        type="datetime-local"
                        id="edit-fechaUltimaTransaccion"
                        name="fechaUltimaTransaccion"
                        value={editFormData.fechaUltimaTransaccion}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button 
                      type="button"
                      className="cancel-btn"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="submit-btn"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 