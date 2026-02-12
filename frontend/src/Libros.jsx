import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, BookOpen, User, Calendar,
  CheckCircle, AlertTriangle, Clock, Eye, Edit, Trash2,
  ArrowUpDown, Book, FileText, Circle, Triangle, CheckCircle2,
  MapPin, Hash, Tag, Star, Users, Zap, Menu
} from 'lucide-react';
import './libros.css';
import Sidebar from './Sidebar.jsx';
import { buscarLibroPorTitulo, buscarLibroPorISBN } from './utils/openLibraryAPI.js';
import { useData } from './context/DataContext.jsx';

export default function Libros() {
  // Context Data
  const {
    libros: librosRaw,
    prestamos,
    library,
    refreshLibros
  } = useData();

  // Estados principales
  const [libros, setLibros] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedLibro, setSelectedLibro] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [libroToDelete, setLibroToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [libroToEdit, setLibroToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSearching, setIsSearching] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    titulo: '',
    autor: '',
    isbn: '',
    categoria: '',
    cabecera: '',
    numeroControl: '',
    editorial: '',
    lugarPublicacion: '',
    anioPublicacion: '',
    edicion: '',
    cantidad: '',
    paginas: '',
    clasificacion: '', // CDU/Dewey
    ubicacion: '',
    descripcion: ''
  });

  // Update local formatted state when context data changes
  useEffect(() => {
    if (librosRaw && prestamos) {
      const librosFormateados = librosRaw.map(libro => {
        // Calculate total loans for this book
        const prestamosLibro = prestamos.filter(p => p.libroId === libro.id);

        return {
          id: libro.id,
          titulo: libro.titulo,
          autor: libro.autor,
          isbn: libro.isbn || '',
          categoria: libro.categoria || '',
          editorial: libro.editorial || '',
          lugarPublicacion: libro.lugarPublicacion || '',
          anioPublicacion: libro.anioPublicacion || '',
          edicion: libro.edicion || '',
          cantidad: libro.cantidad || 1,
          paginas: libro.paginas || '',
          clasificacion: libro.clasificacion || '',
          disponibles: libro.disponibles || 0,
          prestamosTotales: prestamosLibro.length,
          ubicacion: libro.ubicacion || '',
          estado: libro.estado || 'disponible',
          descripcion: libro.descripcion || '',
          cabecera: libro.cabecera || '',
          numeroControl: libro.numeroControl || ''
        };
      });
      setLibros(librosFormateados);
    }
  }, [librosRaw, prestamos]);

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
          categoria: libroEncontrado.categoria || prev.categoria,
          editorial: libroEncontrado.editorial || prev.editorial,
          lugarPublicacion: libroEncontrado.publish_places?.[0] || prev.lugarPublicacion,
          anioPublicacion: libroEncontrado.anioPublicacion || prev.anioPublicacion,
          paginas: libroEncontrado.number_of_pages?.toString() || prev.paginas,
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
          titulo: formData.titulo,
          autor: formData.autor,
          isbn: formData.isbn || null,
          categoria: formData.categoria || null,
          cabecera: formData.cabecera || null,
          numeroControl: formData.numeroControl || null,
          editorial: formData.editorial || null,
          lugarPublicacion: formData.lugarPublicacion || null,
          anioPublicacion: formData.anioPublicacion ? parseInt(formData.anioPublicacion) : null,
          edicion: formData.edicion || null,
          cantidad: parseInt(formData.cantidad) || 1,
          paginas: formData.paginas ? parseInt(formData.paginas) : null,
          clasificacion: formData.clasificacion || null,
          ubicacion: formData.ubicacion || null,
          descripcion: formData.descripcion || null,
          bibliotecaId: library.id
        });

        // Actualizar contexto global
        refreshLibros();
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
        // Local fallback (optional)
        console.warn("No electronAPI, manual update");
      }

      // Limpiar formulario
      setFormData({
        titulo: '',
        autor: '',
        isbn: '',
        categoria: '',
        cabecera: '',
        numeroControl: '',
        editorial: '',
        lugarPublicacion: '',
        anioPublicacion: '',
        edicion: '',
        cantidad: '',
        paginas: '',
        clasificacion: '',
        ubicacion: '',
        descripcion: ''
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
        refreshLibros();
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
      titulo: libro.titulo,
      autor: libro.autor,
      isbn: libro.isbn || '',
      categoria: libro.categoria || '',
      cabecera: libro.cabecera || '',
      numeroControl: libro.numeroControl || '',
      editorial: libro.editorial || '',
      lugarPublicacion: libro.lugarPublicacion || '',
      anioPublicacion: libro.anioPublicacion || '',
      edicion: libro.edicion || '',
      cantidad: libro.cantidad || 1,
      paginas: libro.paginas || '',
      clasificacion: libro.clasificacion || '',
      ubicacion: libro.ubicacion || '',
      descripcion: libro.descripcion || ''
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
          titulo: editFormData.titulo,
          autor: editFormData.autor,
          isbn: editFormData.isbn || null,
          categoria: editFormData.categoria || null,
          cabecera: editFormData.cabecera || null,
          numeroControl: editFormData.numeroControl || null,
          editorial: editFormData.editorial || null,
          lugarPublicacion: editFormData.lugarPublicacion || null,
          anioPublicacion: editFormData.anioPublicacion ? parseInt(editFormData.anioPublicacion) : null,
          edicion: editFormData.edicion || null,
          cantidad: parseInt(editFormData.cantidad) || 1,
          paginas: editFormData.paginas ? parseInt(editFormData.paginas) : null,
          clasificacion: editFormData.clasificacion || null,
          ubicacion: editFormData.ubicacion || null,
          descripcion: editFormData.descripcion || null
        });

        // Actualizar lista local
        refreshLibros();
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
      libro.autor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      libro.isbn.toLowerCase().includes(searchTerm.toLowerCase());

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
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
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
            <h3>Nuevo Libro</h3>
            <form onSubmit={handleSubmit} className="libro-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="titulo">Título <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    id="titulo"
                    name="titulo"
                    value={formData.titulo}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="autor">Autor <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    id="autor"
                    name="autor"
                    value={formData.autor}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    required
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
                    onClick={handleInputClick}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="categoria">Categoría</label>
                  <input
                    type="text"
                    id="categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cabecera">Cabecera</label>
                  <input
                    type="text"
                    id="cabecera"
                    name="cabecera"
                    value={formData.cabecera}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="numeroControl">Número de control</label>
                  <input
                    type="text"
                    id="numeroControl"
                    name="numeroControl"
                    value={formData.numeroControl}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="editorial">Editorial</label>
                  <input
                    type="text"
                    id="editorial"
                    name="editorial"
                    value={formData.editorial}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lugarPublicacion">Lugar de Pub.</label>
                  <input
                    type="text"
                    id="lugarPublicacion"
                    name="lugarPublicacion"
                    value={formData.lugarPublicacion}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder="Ej: Madrid"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="anioPublicacion">Año</label>
                  <input
                    type="number"
                    id="anioPublicacion"
                    name="anioPublicacion"
                    value={formData.anioPublicacion}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    min="1000"
                    max={new Date().getFullYear()}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edicion">Edición</label>
                  <input
                    type="text"
                    id="edicion"
                    name="edicion"
                    value={formData.edicion}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder="Ej: 3a. ed."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cantidad">Cantidad <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="number"
                    id="cantidad"
                    name="cantidad"
                    value={formData.cantidad}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    required
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="paginas">Páginas</label>
                  <input
                    type="text"
                    id="paginas"
                    name="paginas"
                    value={formData.paginas}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder="Ej: 350 p."
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="clasificacion">Clasificación</label>
                  <input
                    type="text"
                    id="clasificacion"
                    name="clasificacion"
                    value={formData.clasificacion}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder="CDU / Dewey"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ubicacion">Ubicación</label>
                  <input
                    type="text"
                    id="ubicacion"
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder="Ej: Estante A-1"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="descripcion">Observaciones</label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    rows="6"
                  />
                </div>
              </div>

              {/* Botón de búsqueda automática moved here */}
              <div className="auto-search-section" style={{ marginTop: '1rem', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="auto-search-button"
                  onClick={handleAutoSearch}
                  disabled={isSearching}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Zap size={16} />
                  {isSearching ? 'Buscando...' : 'Buscar datos por ISBN'}
                </button>
                <p className="auto-search-hint" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  Si ingresaste un ISBN, haz clic aquí para completar los datos automáticamente.
                </p>
              </div>

              <div className="libros-form-actions">
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
          </div >
        )
        }

        {/* Filtros y búsqueda */}
        <div className="filters-section">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar por título, autor o ISBN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-box custom-dropdown">
            <Filter size={16} />
            <div
              className="dropdown-trigger"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              {filterStatus === 'todos' && 'Todos los estados'}
              {filterStatus === 'disponible' && 'Disponibles'}
              {filterStatus === 'prestado' && 'Prestados'}
              {filterStatus === 'mantenimiento' && 'En mantenimiento'}
              <span className="dropdown-arrow">▼</span>
            </div>

            {showFilterDropdown && (
              <div className="dropdown-menu">
                <div
                  className={`dropdown-item ${filterStatus === 'todos' ? 'active' : ''}`}
                  onClick={() => { setFilterStatus('todos'); setShowFilterDropdown(false); }}
                >
                  Todos los estados
                </div>
                <div
                  className={`dropdown-item ${filterStatus === 'disponible' ? 'active' : ''}`}
                  onClick={() => { setFilterStatus('disponible'); setShowFilterDropdown(false); }}
                >
                  Disponibles
                </div>
                <div
                  className={`dropdown-item ${filterStatus === 'prestado' ? 'active' : ''}`}
                  onClick={() => { setFilterStatus('prestado'); setShowFilterDropdown(false); }}
                >
                  Prestados
                </div>
                <div
                  className={`dropdown-item ${filterStatus === 'mantenimiento' ? 'active' : ''}`}
                  onClick={() => { setFilterStatus('mantenimiento'); setShowFilterDropdown(false); }}
                >
                  En mantenimiento
                </div>
              </div>
            )}
            {/* Backdrop to close dropdown */}
            {showFilterDropdown && (
              <div
                className="dropdown-backdrop"
                onClick={() => setShowFilterDropdown(false)}
              />
            )}
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
                              {libro.autor}
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
                          <div className="detail-item">
                            <Tag size={12} />
                            {libro.categoria}
                          </div>
                          {libro.editorial && (
                            <div className="detail-item">
                              <FileText size={12} />
                              {libro.editorial} ({libro.anioPublicacion})
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
                        {libro.ubicacion && (
                          <div className="ubicacion-info">
                            <MapPin size={12} />
                            {libro.ubicacion}
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
        {
          showDetails && selectedLibro && (
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
                    <span className="label">Título:</span>
                    <span className="value">{selectedLibro.titulo}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Autor:</span>
                    <span className="value">{selectedLibro.autor}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">ISBN:</span>
                    <span className="value">{selectedLibro.isbn || 'No especificado'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Categoría:</span>
                    <span className="value">{selectedLibro.categoria || 'No especificada'}</span>
                  </div>
                  {(selectedLibro.cabecera || selectedLibro.numeroControl) && (
                    <>
                      {selectedLibro.cabecera && (
                        <div className="detail-row">
                          <span className="label">Cabecera:</span>
                          <span className="value">{selectedLibro.cabecera}</span>
                        </div>
                      )}
                      {selectedLibro.numeroControl && (
                        <div className="detail-row">
                          <span className="label">Número de control:</span>
                          <span className="value">{selectedLibro.numeroControl}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="detail-row">
                    <span className="label">Editorial:</span>
                    <span className="value">{selectedLibro.editorial || 'No especificada'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Año de Publicación:</span>
                    <span className="value">{selectedLibro.anioPublicacion}</span>
                  </div>
                  {selectedLibro.lugarPublicacion && (
                    <div className="detail-row">
                      <span className="label">Lugar de Pub.:</span>
                      <span className="value">{selectedLibro.lugarPublicacion}</span>
                    </div>
                  )}
                  {selectedLibro.edicion && (
                    <div className="detail-row">
                      <span className="label">Edición:</span>
                      <span className="value">{selectedLibro.edicion}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Cantidad Total:</span>
                    <span className="value">{selectedLibro.cantidad} ejemplares</span>
                  </div>
                  {selectedLibro.paginas && (
                    <div className="detail-row">
                      <span className="label">Páginas:</span>
                      <span className="value">{selectedLibro.paginas}</span>
                    </div>
                  )}
                  {selectedLibro.clasificacion && (
                    <div className="detail-row">
                      <span className="label">Clasificación:</span>
                      <span className="value">{selectedLibro.clasificacion}</span>
                    </div>
                  )}
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
                  <div className="detail-row">
                    <span className="label">Ubicación:</span>
                    <span className="value">{selectedLibro.ubicacion || 'No especificada'}</span>
                  </div>
                  {selectedLibro.descripcion && (
                    <div className="detail-row">
                      <span className="label">Descripción:</span>
                      <span className="value">{selectedLibro.descripcion}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        {/* Modal de confirmación de eliminación */}
        {
          showDeleteConfirm && (
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
          )
        }

        {/* Modal de edición */}
        {
          showEditModal && libroToEdit && (
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
                        <label htmlFor="edit-titulo">Título *</label>
                        <input
                          type="text"
                          id="edit-titulo"
                          name="titulo"
                          value={editFormData.titulo}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-autor">Autor *</label>
                        <input
                          type="text"
                          id="edit-autor"
                          name="autor"
                          value={editFormData.autor}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                          required
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
                          onClick={handleEditInputClick}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-categoria">Categoría</label>
                        <input
                          type="text"
                          id="edit-categoria"
                          name="categoria"
                          value={editFormData.categoria}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
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
                          onClick={handleEditInputClick}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-numeroControl">Número de control</label>
                        <input
                          type="text"
                          id="edit-numeroControl"
                          name="numeroControl"
                          value={editFormData.numeroControl}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit-editorial">Editorial</label>
                        <input
                          type="text"
                          id="edit-editorial"
                          name="editorial"
                          value={editFormData.editorial}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-lugarPublicacion">Lugar Pub.</label>
                        <input
                          type="text"
                          id="edit-lugarPublicacion"
                          name="lugarPublicacion"
                          value={editFormData.lugarPublicacion}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-anioPublicacion">Año</label>
                        <input
                          type="number"
                          id="edit-anioPublicacion"
                          name="anioPublicacion"
                          value={editFormData.anioPublicacion}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-edicion">Edición</label>
                        <input
                          type="text"
                          id="edit-edicion"
                          name="edicion"
                          value={editFormData.edicion}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="edit-cantidad">Cantidad *</label>
                        <input
                          type="number"
                          id="edit-cantidad"
                          name="cantidad"
                          value={editFormData.cantidad}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                          required
                          min="1"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-paginas">Páginas</label>
                        <input
                          type="text"
                          id="edit-paginas"
                          name="paginas"
                          value={editFormData.paginas}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-clasificacion">Clasificación</label>
                        <input
                          type="text"
                          id="edit-clasificacion"
                          name="clasificacion"
                          value={editFormData.clasificacion}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="edit-ubicacion">Ubicación</label>
                        <input
                          type="text"
                          id="edit-ubicacion"
                          name="ubicacion"
                          value={editFormData.ubicacion}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label htmlFor="edit-descripcion">Descripción</label>
                        <textarea
                          id="edit-descripcion"
                          name="descripcion"
                          value={editFormData.descripcion}
                          onChange={handleEditInputChange}
                          onClick={handleEditInputClick}
                          rows="3"
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
          )
        }
      </div >
    </>
  );
} 