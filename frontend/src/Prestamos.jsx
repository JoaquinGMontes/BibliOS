import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, BookOpen, User, Calendar,
  CheckCircle, AlertTriangle, Clock, Eye, Trash2,
  ArrowUpDown, Book, Users, FileText, Circle, Triangle, CheckCircle2
} from 'lucide-react';
import './prestamos.css';
import Navbar from './Navbar.jsx';

export default function Prestamos() {
  // Estados principales
  const [prestamos, setPrestamos] = useState([]);
  const [libros, setLibros] = useState([]);
  const [socios, setSocios] = useState([]);
  const [showForm, setShowForm] = useState(false);
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

  // Cargar datos REALES desde la base de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        // Obtener biblioteca activa
        const storedLibrary = localStorage.getItem('bibliotecaActiva');
        if (storedLibrary && window.electronAPI) {
          const library = JSON.parse(storedLibrary);

          // Cargar libros REALES de la biblioteca
          const librosReales = await window.electronAPI.getLibros(library.id, {});
          const librosFormateados = librosReales.map(libro => ({
            id: libro.id,
            titulo: libro.titulo,
            autor: libro.autor,
            isbn: libro.isbn || '',
            categoria: libro.categoria || '',
            disponible: libro.disponibles > 0
          }));

          // Cargar socios REALES de la biblioteca
          const sociosReales = await window.electronAPI.getSocios(library.id, {});
          const sociosFormateados = sociosReales.map(socio => ({
            id: socio.numeroDeSocio ?? socio.id,
            numeroDeSocio: socio.numeroDeSocio ?? socio.id,
            nombre: socio.nombre,
            email: socio.email || '',
            telefono: socio.telefono || '',
            activo: socio.estado === 'activo'
          }));

          // Cargar préstamos REALES de la biblioteca
          const prestamosReales = await window.electronAPI.getPrestamos(library.id, {});
          const prestamosFormateados = prestamosReales.map(prestamo => ({
            id: prestamo.id,
            libroId: prestamo.libroId,
            socioId: prestamo.socioId,
            fechaPrestamo: prestamo.fechaPrestamo ? prestamo.fechaPrestamo.split('T')[0] : '',
            fechaDevolucion: prestamo.fechaDevolucion ? prestamo.fechaDevolucion.split('T')[0] : '',
            fechaDevolucionReal: prestamo.fechaDevolucionReal ? prestamo.fechaDevolucionReal.split('T')[0] : null,
            fechaDevuelto: prestamo.fechaDevuelto ? prestamo.fechaDevuelto.split('T')[0] : (prestamo.fechaDevolucionReal ? prestamo.fechaDevolucionReal.split('T')[0] : null),
            estado: prestamo.estado || 'activo',
            observaciones: prestamo.observaciones || ''
          }));

          setLibros(librosFormateados);
          setSocios(sociosFormateados);
          setPrestamos(prestamosFormateados);
        } else {
          // Si no hay biblioteca activa, no mostrar datos
          setLibros([]);
          setSocios([]);
          setPrestamos([]);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setLibros([]);
        setSocios([]);
        setPrestamos([]);
      }
    };

    loadData();
  }, []);

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
    setLibroSearch(`${libro.titulo || ''} - ${libro.autor ?? ''}`);
    setShowLibroResults(false);
    setFormData(prev => ({ ...prev, libroId: libro.id }));
  };

  const selectSocio = (socio) => {
    setSelectedSocio(socio);
    setSocioSearch(`Nº ${socio.numeroDeSocio ?? socio.id} - ${socio.nombre || ''}`);
    setShowSocioResults(false);
    setFormData(prev => ({ ...prev, socioId: socio.id }));
  };

  const filteredLibros = libros.filter(libro => {
    if (!libro.disponible) return false;

    const search = (libroSearch || '').toLowerCase();
    const titulo = (libro.titulo || '').toLowerCase();
    const autor = (libro.autor || '').toLowerCase();

    return titulo.includes(search) || autor.includes(search);
  });

  const filteredSocios = socios.filter(socio => {
    if (!socio.activo) return false;

    const search = (socioSearch || '').toLowerCase().trim();
    const numeroStr = String(socio.numeroDeSocio ?? socio.id ?? '');
    const nombre = (socio.nombre || '').toLowerCase();

    return numeroStr.includes(search) || nombre.includes(search);
  });

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

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

      // Usar IDs del formulario o de la selección actual (por si el estado se desincronizó)
      const libroId = Number(formData.libroId) || selectedLibro?.id;
      const socioId = Number(formData.socioId) || selectedSocio?.id;
      const bibliotecaId = Number(library.id);

      if (!libroId || !socioId || !bibliotecaId) {
        await window.nativeDialog.error({
          message: 'Datos incompletos',
          detail: 'Por favor, selecciona un libro y un socio antes de crear el préstamo.'
        });
        return;
      }

      // Crear préstamo en la base de datos
      if (window.electronAPI) {
        const nuevoPrestamo = await window.electronAPI.createPrestamo({
          libroId,
          socioId,
          bibliotecaId,
          fechaPrestamo: fechaPrestamo,
          fechaDevolucion: fechaDevolucion,
          observaciones: formData.observaciones || null
        });

        // Agregar a la lista local
        setPrestamos([...prestamos, {
          ...nuevoPrestamo,
          fechaPrestamo: nuevoPrestamo.fechaPrestamo ? nuevoPrestamo.fechaPrestamo.split('T')[0] : '',
          fechaDevolucion: nuevoPrestamo.fechaDevolucion ? nuevoPrestamo.fechaDevolucion.split('T')[0] : '',
          fechaDevolucionReal: null,
          fechaDevuelto: null
        }]);

        // Marcar libro como no disponible
        setLibros(libros.map(libro =>
          libro.id === libroId
            ? { ...libro, disponible: false }
            : libro
        ));
      } else {
        // Fallback local
        const nuevoPrestamo = {
          id: prestamos.length + 1,
          ...formData,
          libroId,
          socioId,
          estado: 'activo',
          fechaDevolucionReal: null,
          fechaDevuelto: null
        };

        setPrestamos([...prestamos, nuevoPrestamo]);

        // Marcar libro como no disponible
        setLibros(libros.map(libro =>
          libro.id === libroId
            ? { ...libro, disponible: false }
            : libro
        ));
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

      // Actualizar en la lista local (fechaDevuelto se asigna automáticamente con la fecha actual)
      const fechaActual = new Date().toISOString().split('T')[0];
      setPrestamos(prestamos.map(prestamo => {
        if (prestamo.id === prestamoId) {
          return {
            ...prestamo,
            estado: 'completado',
            fechaDevolucionReal: fechaActual,
            fechaDevuelto: fechaActual
          };
        }
        return prestamo;
      }));

      // Marcar libro como disponible
      const prestamo = prestamos.find(p => p.id === prestamoId);
      setLibros(libros.map(libro =>
        libro.id === prestamo.libroId
          ? { ...libro, disponible: true }
          : libro
      ));
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
        setPrestamos(prestamos.filter(prestamo => prestamo.id !== prestamoToDelete));
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

    const search = (searchTerm || '').toLowerCase();
    const titulo = (libro?.titulo || '').toLowerCase();
    const nombreSocio = (socio?.nombre || '').toLowerCase();

    const matchesSearch = search === '' ||
      titulo.includes(search) ||
      nombreSocio.includes(search);

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
      <Navbar />
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
                  <label htmlFor="libroId">Libro *</label>
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
                  <label htmlFor="socioId">Socio *</label>
                  <div className="search-wrapper">
                    <input
                      type="text"
                      id="socioId"
                      placeholder="Buscar por número o nombre de socio..."
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
                            <div>
                              <strong>Nº {socio.numeroDeSocio ?? socio.id}</strong>
                              <span> — {socio.nombre}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="fechaPrestamo">Fecha Préstamo *</label>
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
                  <label htmlFor="fechaDevolucion">Fecha Devolución *</label>
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
          <div className="filter-box">
            <Filter size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="vencido">Vencidos</option>
              <option value="completado">Completados</option>
            </select>
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
                {(selectedPrestamo.fechaDevuelto || selectedPrestamo.fechaDevolucionReal) && (
                  <div className="detail-row">
                    <span className="label">Fecha devuelto:</span>
                    <span className="value">{selectedPrestamo.fechaDevuelto || selectedPrestamo.fechaDevolucionReal}</span>
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