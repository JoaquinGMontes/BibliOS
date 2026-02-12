import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, User, Mail, Phone, Calendar,
  CheckCircle, AlertTriangle, Clock, Eye, Edit, Trash2,
  ArrowUpDown, Users, FileText, Circle, Triangle, CheckCircle2, MapPin, Menu
} from 'lucide-react';
import './socios.css';
import Sidebar from './Sidebar.jsx';
import { useData } from './context/DataContext.jsx';

export default function Socios() {
  // Context Data
  const {
    socios: sociosRaw,
    prestamos,
    library,
    refreshSocios
  } = useData();

  // Estados principales
  const [socios, setSocios] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedSocio, setSelectedSocio] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [socioToEdit, setSocioToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    fechaRegistro: '',
    observaciones: ''
  });

  // Sync with DataContext: numeración de socio por biblioteca (orden de creación)
  useEffect(() => {
    if (sociosRaw && prestamos) {
      const sorted = [...sociosRaw].sort((a, b) => a.id - b.id);
      const sociosWithStats = sorted.map((socio, index) => {
        const socioPrestamos = prestamos.filter(p => p.socioId === socio.id);
        const activos = socioPrestamos.filter(p => p.estado === 'activo' || p.estado === 'vencido').length;
        const totales = socioPrestamos.length;

        return {
          ...socio,
          numeroEnBiblioteca: index + 1,
          prestamosActivos: activos,
          prestamosTotales: totales
        };
      });
      setSocios(sociosWithStats);
    }
  }, [sociosRaw, prestamos]);




  // Funciones auxiliares
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'activo': return '#10b981';
      case 'inactivo': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'activo': return <CheckCircle size={14} />;
      case 'inactivo': return <Circle size={14} />;
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

      // Crear socio en la base de datos
      if (window.electronAPI) {
        const socioData = {
          nombre: formData.nombre,
          email: formData.email,
          telefono: formData.telefono,
          direccion: formData.direccion,
          observaciones: formData.observaciones,
          bibliotecaId: library.id
        };

        await window.electronAPI.createSocio(socioData);
        refreshSocios(); // Refresh global state
      }

      // Limpiar formulario

      // Limpiar formulario
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        direccion: '',
        fechaRegistro: '',
        observaciones: ''
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error al crear socio:', error);
      await window.nativeDialog.error({
        message: 'Error al crear socio',
        detail: error.message
      });
    }
  };

  const handleEliminar = (socioId) => {
    setSocioToDelete(socioId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (socioToDelete) {
      try {
        // Eliminar de la base de datos
        if (window.electronAPI) {
          await window.electronAPI.deleteSocio(socioToDelete);
        }

        // Eliminar de la lista local
        refreshSocios(); // Refresh global state
        setSocioToDelete(null);
      } catch (error) {
        console.error('Error al eliminar socio:', error);
        await window.nativeDialog.error({
          message: 'Error al eliminar socio',
          detail: error.message
        });
      }
    }
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setSocioToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Funciones de edición
  const handleEditClick = (socio) => {
    setSocioToEdit(socio);
    setEditFormData({
      nombre: socio.nombre,
      email: socio.email,
      telefono: socio.telefono || '',
      direccion: socio.direccion || '',
      observaciones: socio.observaciones || ''
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
      if (window.electronAPI && socioToEdit) {
        await window.electronAPI.updateSocio(socioToEdit.id, {
          nombre: editFormData.nombre,
          email: editFormData.email,
          telefono: editFormData.telefono || null,
          direccion: editFormData.direccion || null,
          observaciones: editFormData.observaciones || null
        });

        // Actualizar lista local
        refreshSocios(); // Refresh global state
      }

      setShowEditModal(false);
      setSocioToEdit(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error al actualizar socio:', error);
      await window.nativeDialog.error({
        message: 'Error al actualizar socio',
        detail: error.message
      });
    }
  };

  // Filtrado y búsqueda
  const filteredSocios = socios.filter(socio => {
    const matchesSearch = searchTerm === '' ||
      socio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      socio.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === 'todos' || socio.estado === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Estadísticas
  const stats = {
    total: socios.length,
    activos: socios.filter(s => s.estado === 'activo').length,
    inactivos: socios.filter(s => s.estado === 'inactivo').length,
    nuevos: socios.filter(s => {
      const fechaRegistro = new Date(s.fechaRegistro);
      const unMesAtras = new Date();
      unMesAtras.setMonth(unMesAtras.getMonth() - 1);
      return fechaRegistro > unMesAtras;
    }).length
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
      <div className="socios-container">
        {/* Header */}
        <div className="socios-header">
          <div className="header-content">
            <h1>Gestión de Socios</h1>
            <span className="header-separator">|</span>
            <p>Administrá los socios de la biblioteca, sus datos y estado de membresía</p>
          </div>
          <button
            className="add-button"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={18} />
            Nuevo Socio
          </button>
        </div>

        {/* Estadísticas */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Total Socios</h3>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle2 size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Activos</h3>
              <p className="stat-value">{stats.activos}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Circle size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Inactivos</h3>
              <p className="stat-value">{stats.inactivos}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={20} strokeWidth={1.5} />
            </div>
            <div className="stat-content">
              <h3>Nuevos (1 mes)</h3>
              <p className="stat-value">{stats.nuevos}</p>
            </div>
          </div>
        </div>

        {/* Formulario de nuevo socio */}
        {showForm && (
          <div className="form-section">
            <h3>Nuevo Socio</h3>
            <form onSubmit={handleSubmit} className="socio-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre Completo <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefono">Teléfono</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="direccion">Dirección</label>
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="observaciones">Observaciones</label>
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    rows="6"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="submit-button">
                  <Plus size={16} />
                  Registrar Socio
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
              placeholder="Buscar por nombre o email..."
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
              {filterStatus === 'activo' && 'Activos'}
              {filterStatus === 'inactivo' && 'Inactivos'}
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
                  className={`dropdown-item ${filterStatus === 'inactivo' ? 'active' : ''}`}
                  onClick={() => { setFilterStatus('inactivo'); setShowFilterDropdown(false); }}
                >
                  Inactivos
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

        {/* Tabla de socios */}
        <div className="table-section">
          <div className="table-header">
            <h3>Lista de Socios</h3>
            <span className="count">{filteredSocios.length} socios</span>
          </div>
          <div className="table-container">
            <table className="socios-table">
              <thead>
                <tr>
                  <th>Nº Socio</th>
                  <th>Socio</th>
                  <th>Contacto</th>
                  <th>Fecha Registro</th>
                  <th>Estado</th>
                  <th>Préstamos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSocios.map(socio => {
                  return (
                    <tr key={socio.id}>
                      <td className="id-cell">#{socio.numeroEnBiblioteca}</td>
                      <td>
                        <div className="socio-info">
                          <div className="socio-avatar">
                            <User size={16} />
                          </div>
                          <div>
                            <strong>{socio.nombre}</strong>
                            {socio.direccion && (
                              <div className="socio-address">
                                <MapPin size={12} />
                                {socio.direccion}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="contact-info">
                          <div className="contact-item">
                            <Mail size={12} />
                            {socio.email}
                          </div>
                          {socio.telefono && (
                            <div className="contact-item">
                              <Phone size={12} />
                              {socio.telefono}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{socio.fechaRegistro}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getEstadoColor(socio.estado) }}
                        >
                          {getEstadoIcon(socio.estado)}
                          {socio.estado}
                        </span>
                      </td>
                      <td>
                        <div className="prestamos-info">
                          <div className="prestamos-activos">
                            <Clock size={12} />
                            {socio.prestamosActivos} activos
                          </div>
                          <div className="prestamos-totales">
                            <FileText size={12} />
                            {socio.prestamosTotales} total
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="action-btn view"
                            onClick={() => {
                              setSelectedSocio(socio);
                              setShowDetails(true);
                            }}
                            title="Ver detalles"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="action-btn edit"
                            onClick={() => handleEditClick(socio)}
                            title="Editar socio"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleEliminar(socio.id)}
                            title="Eliminar socio"
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
        {showDetails && selectedSocio && (
          <div className="modal-overlay" onClick={() => setShowDetails(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Detalles del Socio #{selectedSocio.numeroEnBiblioteca}</h3>
                <button
                  className="close-button"
                  onClick={() => setShowDetails(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="detail-row">
                  <span className="label">Nombre:</span>
                  <span className="value">{selectedSocio.nombre}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{selectedSocio.email}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Teléfono:</span>
                  <span className="value">{selectedSocio.telefono || 'No especificado'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Dirección:</span>
                  <span className="value">{selectedSocio.direccion || 'No especificada'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Fecha de Registro:</span>
                  <span className="value">{selectedSocio.fechaRegistro}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Estado:</span>
                  <span
                    className="value status-badge"
                    style={{ backgroundColor: getEstadoColor(selectedSocio.estado) }}
                  >
                    {selectedSocio.estado}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Préstamos Activos:</span>
                  <span className="value">{selectedSocio.prestamosActivos}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Total de Préstamos:</span>
                  <span className="value">{selectedSocio.prestamosTotales}</span>
                </div>
                {selectedSocio.observaciones && (
                  <div className="detail-row">
                    <span className="label">Observaciones:</span>
                    <span className="value">{selectedSocio.observaciones}</span>
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
                  <p>¿Estás seguro de que quieres eliminar este socio?</p>
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
        {showEditModal && socioToEdit && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Editar Socio #{socioToEdit.numeroEnBiblioteca}</h3>
                <button
                  className="close-button"
                  onClick={() => setShowEditModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdateSubmit} className="socio-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="edit-nombre">Nombre Completo <span style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="text"
                        id="edit-nombre"
                        name="nombre"
                        value={editFormData.nombre}
                        onChange={handleEditInputChange}
                        onClick={handleEditInputClick}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-email">Email <span style={{ color: "#ef4444" }}>*</span></label>
                      <input
                        type="email"
                        id="edit-email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                        onClick={handleEditInputClick}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-telefono">Teléfono</label>
                      <input
                        type="tel"
                        id="edit-telefono"
                        name="telefono"
                        value={editFormData.telefono}
                        onChange={handleEditInputChange}
                        onClick={handleEditInputClick}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-direccion">Dirección</label>
                      <input
                        type="text"
                        id="edit-direccion"
                        name="direccion"
                        value={editFormData.direccion}
                        onChange={handleEditInputChange}
                        onClick={handleEditInputClick}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group full-width">
                      <label htmlFor="edit-observaciones">Observaciones</label>
                      <textarea
                        id="edit-observaciones"
                        name="observaciones"
                        value={editFormData.observaciones}
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
        )}
      </div>
    </>
  );
} 