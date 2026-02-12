import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, BookOpen, User, Calendar,
  CheckCircle, AlertTriangle, Clock, Eye, Trash2,
  ArrowUpDown, Book, Users, FileText, Circle, Triangle, CheckCircle2, Menu
} from 'lucide-react';
import './prestamos.css';
import Sidebar from './Sidebar.jsx';
import { useData } from './context/DataContext.jsx';

export default function Prestamos() {
  // Context Data
  const {
    prestamos: prestamosRaw,
    libros: librosRaw,
    socios: sociosRaw,
    library,
    refreshPrestamos
  } = useData();

  // Estados principales
  const [prestamos, setPrestamos] = useState([]);
  const [libros, setLibros] = useState([]);
  const [socios, setSocios] = useState([]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Update local formatted state when context data changes
  useEffect(() => {
    if (prestamosRaw) {
      const prestamosFormateados = prestamosRaw.map(prestamo => ({
        id: prestamo.id,
        libroId: prestamo.libroId,
        socioId: prestamo.socioId,
        fechaPrestamo: prestamo.fechaPrestamo ? prestamo.fechaPrestamo.split('T')[0] : '',
        fechaDevolucion: prestamo.fechaDevolucion ? prestamo.fechaDevolucion.split('T')[0] : '',
        fechaDevolucionReal: prestamo.fechaDevolucionReal ? prestamo.fechaDevolucionReal.split('T')[0] : null,
        estado: prestamo.estado || 'activo',
        observaciones: prestamo.observaciones || ''
      }));
      setPrestamos(prestamosFormateados);
    }
  }, [prestamosRaw]);

  useEffect(() => {
    if (librosRaw) {
      const librosFormateados = librosRaw.map(libro => ({
        id: libro.id,
        titulo: libro.titulo,
        autor: libro.autor,
        isbn: libro.isbn || '',
        categoria: libro.categoria || '',
        disponible: libro.disponibles > 0
      }));
      setLibros(librosFormateados);
    }
  }, [librosRaw]);

  useEffect(() => {
    if (sociosRaw) {
      const sorted = [...sociosRaw].sort((a, b) => a.id - b.id);
      const sociosFormateados = sorted.map((socio, index) => ({
        id: socio.id,
        numeroEnBiblioteca: index + 1,
        nombre: socio.nombre,
        email: socio.email || '',
        telefono: socio.telefono || '',
        activo: socio.estado === 'activo'
      }));
      setSocios(sociosFormateados);
    }
  }, [sociosRaw]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selectedPrestamo, setSelectedPrestamo] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [prestamoToDelete, setPrestamoToDelete] = useState(null);

  // Estados para los buscadores
  const [libroSearch, setLibroSearch] = useState('');
  const [socioSearch, setSocioSearch] = useState('');
  const [showLibroResults, setShowLibroResults] = useState(false);
  const [showSocioResults, setShowSocioResults] = useState(false);
  const [selectedLibro, setSelectedLibro] = useState(null);
  const [selectedSocio, setSelectedSocio] = useState(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    libroId: '',
    socioId: '',
    fechaPrestamo: new Date().toISOString().split('T')[0],
    fechaDevolucion: '',
    observaciones: ''
  });

  // Limpiar campos de búsqueda cuando se cierra el formulario
  useEffect(() => {
    if (!showForm) {
      setLibroSearch('');
      setSocioSearch('');
      setSelectedLibro(null);
      setSelectedSocio(null);
      setShowLibroResults(false);
      setShowSocioResults(false);
    }
  }, [showForm]);

  // Cerrar resultados cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.searchable-dropdown')) {
        setShowLibroResults(false);
        setShowSocioResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  // Funciones auxiliares
  const getLibroById = (id) => libros.find(libro => libro.id === id);
  const getSocioById = (id) => socios.find(socio => socio.id === id);
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'activo': return '#3b82f6';
      case 'vencido': return '#ef4444';
      case 'completado': return '#10b981';
      default: return '#6b7280';
    }
  };
  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'activo': return <Clock size={16} />;
      case 'vencido': return <AlertTriangle size={16} />;
      case 'completado': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // Funciones para los buscadores
  const handleLibroSearch = (e) => {
    const value = e.target.value;
    setLibroSearch(value);
    setShowLibroResults(value.length > 0);
  };

  const handleSocioSearch = (e) => {
    const value = e.target.value;
    setSocioSearch(value);
    setShowSocioResults(value.length > 0);
  };

  const selectLibro = (libro) => {
    setSelectedLibro(libro);
    setLibroSearch(`${libro.titulo} - ${libro.autor}`);
    setShowLibroResults(false);
    setFormData({ ...formData, libroId: libro.id });
  };

  const selectSocio = (socio) => {
    setSelectedSocio(socio);
    setSocioSearch(`${socio.nombre} - ${socio.numeroEnBiblioteca}`);
    setShowSocioResults(false);
    setFormData({ ...formData, socioId: socio.id });
  };

  const filteredLibros = libros.filter(libro =>
    libro.disponible &&
    (libro.titulo.toLowerCase().includes(libroSearch.toLowerCase()) ||
      libro.autor.toLowerCase().includes(libroSearch.toLowerCase()))
  );

  const filteredSocios = socios.filter(socio =>
    (socio.estado === 'activo' || socio.activo) &&
    (socio.nombre.toLowerCase().includes(socioSearch.toLowerCase()) ||
      socio.numeroEnBiblioteca.toString().includes(socioSearch) ||
      socio.id.toString().includes(socioSearch))
  );

  // Manejo del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Validar que el año no tenga más de 4 dígitos para campos de fecha
    if ((name === 'fechaPrestamo' || name === 'fechaDevolucion') && value) {
      const year = value.split('-')[0];
      if (year && year.length > 4) {
        // No actualizar si el año tiene más de 4 dígitos
        return;
      }
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validar fechas
      const today = new Date().toISOString().split('T')[0];
      const fechaPrestamo = formData.fechaPrestamo || today;
      const fechaDevolucion = formData.fechaDevolucion;

      if (fechaPrestamo < today) {
        await window.nativeDialog.error({
          message: 'Fecha de préstamo inválida',
          detail: 'La fecha de préstamo no puede ser anterior a la fecha actual.'
        });
        return;
      }

      if (fechaDevolucion < fechaPrestamo) {
        await window.nativeDialog.error({
          message: 'Fecha de devolución inválida',
          detail: 'La fecha de devolución no puede ser anterior a la fecha de préstamo.'
        });
        return;
      }

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

      // Crear préstamo en la base de datos
      if (window.electronAPI) {
        const nuevoPrestamo = await window.electronAPI.createPrestamo({
          libroId: parseInt(formData.libroId),
          socioId: parseInt(formData.socioId),
          bibliotecaId: library.id,
          fechaPrestamo: fechaPrestamo,
          fechaDevolucion: fechaDevolucion,
          observaciones: formData.observaciones || null
        });

        // Actualizar contexto global
        refreshPrestamos();
      } else {
        // Fallback local
        const nuevoPrestamo = {
          id: prestamos.length + 1,
          ...formData,
          estado: 'activo',
          fechaDevolucionReal: null
        };
        // In local mode without backend, we still use local state or mock, 
        // but likely this app always runs with backend in production.
        // For consistency with current pattern:
        // setPrestamos([...prestamos, nuevoPrestamo]);
        // But since we are moving to context, we assume context handles it or we rely on the refresh.
        // If no backend, refresh won't do much. 
        // Let's keep local update ONLY for fallback if electronAPI is missing (dev mode without electron)
        console.warn("No electronAPI, manual update");
      }

      setFormData({
        libroId: '',
        socioId: '',
        fechaPrestamo: new Date().toISOString().split('T')[0],
        fechaDevolucion: '',
        observaciones: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error al crear préstamo:', error);
      await window.nativeDialog.error({
        message: 'Error al crear préstamo',
        detail: error.message
      });
    }
  };

  // Acciones de préstamos
  const handleDevolver = async (prestamoId) => {
    try {
      // Devolver libro en la base de datos
      if (window.electronAPI) {
        await window.electronAPI.devolverLibro(prestamoId);
      }

      // Actualizar contexto global
      refreshPrestamos();
    } catch (error) {
      console.error('Error al devolver libro:', error);
      await window.nativeDialog.error({
        message: 'Error al devolver libro',
        detail: error.message
      });
    }
  };

  const handleEliminar = (prestamoId) => {
    setPrestamoToDelete(prestamoId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (prestamoToDelete) {
      try {
        // Eliminar de la base de datos
        if (window.electronAPI) {
          await window.electronAPI.deletePrestamo(prestamoToDelete);
        }

        // Eliminar de la lista local
        refreshPrestamos();
        setPrestamoToDelete(null);
      } catch (error) {
        console.error('Error al eliminar préstamo:', error);
        await window.nativeDialog.error({
          message: 'Error al eliminar préstamo',
          detail: error.message
        });
      }
    }
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setPrestamoToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Filtrado y búsqueda
  const filteredPrestamos = prestamos.filter(prestamo => {
    const libro = getLibroById(prestamo.libroId);
    const socio = getSocioById(prestamo.socioId);

    const matchesSearch = searchTerm === '' ||
      libro?.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      socio?.nombre.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'todos' || prestamo.estado === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Estadísticas
  const stats = {
    total: prestamos.length,
    activos: prestamos.filter(p => p.estado === 'activo').length,
    vencidos: prestamos.filter(p => p.estado === 'vencido').length,
    completados: prestamos.filter(p => p.estado === 'completado').length
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
      <div className="prestamos-container">
        {/* Header */}
        <div className="prestamos-header">
          <div className="header-content">
            <h1>Gestión de Préstamos</h1>
            <span className="header-separator">|</span>
            <p>Administrá los préstamos de libros, socios y fechas de devolución</p>
          </div>
          <button
            className="add-button"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={18} />
            Nuevo Préstamo
          </button>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <BookOpen size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Total Préstamos</h3>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Activos</h3>
              <p className="stat-value">{stats.activos}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <AlertTriangle size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Vencidos</h3>
              <p className="stat-value">{stats.vencidos}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle2 size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Completados</h3>
              <p className="stat-value">{stats.completados}</p>
            </div>
          </div>
        </div>

        {/* Formulario de nuevo préstamo */}
        {showForm && (
          <div className="form-section">
            <h3>Nuevo Préstamo</h3>
            <form onSubmit={handleSubmit} className="prestamo-form">
              <div className="form-row">
                <div className="form-group searchable-dropdown">
                  <label htmlFor="libroId">Libro <span style={{ color: "#ef4444" }}>*</span></label>
                  <div className="search-wrapper">
                    <input
                      type="text"
                      id="libroId"
                      placeholder="Buscar libro..."
                      value={libroSearch}
                      onChange={handleLibroSearch}
                      onFocus={() => setShowLibroResults(libroSearch.length > 0)}
                      required
                    />
                    {showLibroResults && filteredLibros.length > 0 && (
                      <div className="search-results">
                        {filteredLibros.map(libro => (
                          <div
                            key={libro.id}
                            className="search-result-item"
                            onClick={() => selectLibro(libro)}
                          >
                            <Book size={16} />
                            <div>
                              <strong>{libro.titulo}</strong>
                              <span>por {libro.autor}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group searchable-dropdown">
                  <label htmlFor="socioId">Socio <span style={{ color: "#ef4444" }}>*</span></label>
                  <div className="search-wrapper">
                    <input
                      type="text"
                      id="socioId"
                      placeholder="Buscar socio..."
                      value={socioSearch}
                      onChange={handleSocioSearch}
                      onFocus={() => setShowSocioResults(socioSearch.length > 0)}
                      required
                    />
                    {showSocioResults && filteredSocios.length > 0 && (
                      <div className="search-results">
                        {filteredSocios.map(socio => (
                          <div
                            key={socio.id}
                            className="search-result-item"
                            onClick={() => selectSocio(socio)}
                          >
                            <User size={16} />
                            <span>{socio.nombre} - {socio.numeroEnBiblioteca}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="fechaPrestamo">Fecha Préstamo <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="date"
                    name="fechaPrestamo"
                    value={formData.fechaPrestamo}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    max="2100-12-31"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fechaDevolucion">Fecha Devolución <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="date"
                    name="fechaDevolucion"
                    value={formData.fechaDevolucion}
                    onChange={handleInputChange}
                    min={formData.fechaPrestamo || new Date().toISOString().split('T')[0]}
                    max="2100-12-31"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="observaciones">Observaciones</label>
                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleInputChange}
                  placeholder="Notas adicionales sobre el préstamo..."
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  <Plus size={18} />
                  Crear Préstamo
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
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por libro o socio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-box custom-dropdown">
            <Filter size={18} />
            <div
              className="dropdown-trigger"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              {filterStatus === 'todos' && 'Todos los estados'}
              {filterStatus === 'activo' && 'Activos'}
              {filterStatus === 'vencido' && 'Vencidos'}
              {filterStatus === 'completado' && 'Completados'}
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
                  className={`dropdown-item ${filterStatus === 'activo' ? 'active' : ''}`}
                  onClick={() => { setFilterStatus('activo'); setShowFilterDropdown(false); }}
                >
                  Activos
                </div>
                <div
                  className={`dropdown-item ${filterStatus === 'vencido' ? 'active' : ''}`}
                  onClick={() => { setFilterStatus('vencido'); setShowFilterDropdown(false); }}
                >
                  Vencidos
                </div>
                <div
                  className={`dropdown-item ${filterStatus === 'completado' ? 'active' : ''}`}
                  onClick={() => { setFilterStatus('completado'); setShowFilterDropdown(false); }}
                >
                  Completados
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

        {/* Tabla de préstamos */}
        <div className="table-section">
          <div className="table-header">
            <h3>Lista de Préstamos</h3>
            <span className="count">{filteredPrestamos.length} préstamos</span>
          </div>
          <div className="table-container">
            <table className="prestamos-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Libro</th>
                  <th>Socio</th>
                  <th>Fecha Préstamo</th>
                  <th>Fecha Devolución</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrestamos.map(prestamo => {
                  const libro = getLibroById(prestamo.libroId);
                  const socio = getSocioById(prestamo.socioId);

                  return (
                    <tr key={prestamo.id}>
                      <td>#{prestamo.id}</td>
                      <td>
                        <div className="book-info">
                          <Book size={14} />
                          <span>{libro?.titulo}</span>
                        </div>
                      </td>
                      <td>
                        <div className="user-info">
                          <User size={14} />
                          <span>{socio?.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-info">
                          <Calendar size={14} />
                          <span>{prestamo.fechaPrestamo}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-info">
                          <Calendar size={14} />
                          <span>{prestamo.fechaDevolucion}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getEstadoColor(prestamo.estado) }}
                        >
                          {getEstadoIcon(prestamo.estado)}
                          {prestamo.estado}
                        </span>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="action-btn view"
                            onClick={() => {
                              setSelectedPrestamo(prestamo);
                              setShowDetails(true);
                            }}
                            title="Ver detalles"
                          >
                            <Eye size={14} />
                          </button>
                          {prestamo.estado === 'activo' && (
                            <button
                              className="action-btn complete"
                              onClick={() => handleDevolver(prestamo.id)}
                              title="Marcar como devuelto"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            className="action-btn delete"
                            onClick={() => handleEliminar(prestamo.id)}
                            title="Eliminar préstamo"
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
        {showDetails && selectedPrestamo && (
          <div className="modal-overlay" onClick={() => setShowDetails(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Detalles del Préstamo #{selectedPrestamo.id}</h3>
                <button
                  className="close-button"
                  onClick={() => setShowDetails(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="detail-row">
                  <span className="label">Libro:</span>
                  <span className="value">{getLibroById(selectedPrestamo.libroId)?.titulo}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Socio:</span>
                  <span className="value">{getSocioById(selectedPrestamo.socioId)?.nombre}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Fecha de Préstamo:</span>
                  <span className="value">{selectedPrestamo.fechaPrestamo}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Fecha de Devolución:</span>
                  <span className="value">{selectedPrestamo.fechaDevolucion}</span>
                </div>
                {selectedPrestamo.fechaDevolucionReal && (
                  <div className="detail-row">
                    <span className="label">Fecha de Devolución Real:</span>
                    <span className="value">{selectedPrestamo.fechaDevolucionReal}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Estado:</span>
                  <span
                    className="value status-badge"
                    style={{ backgroundColor: getEstadoColor(selectedPrestamo.estado) }}
                  >
                    {selectedPrestamo.estado}
                  </span>
                </div>
                {selectedPrestamo.observaciones && (
                  <div className="detail-row">
                    <span className="label">Observaciones:</span>
                    <span className="value">{selectedPrestamo.observaciones}</span>
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
                  <p>¿Estás seguro de que quieres eliminar este préstamo?</p>
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
      </div>
    </>
  );
} 