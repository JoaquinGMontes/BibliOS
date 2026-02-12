import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, MapPin, Phone, Mail, User, Building, Save, X, Lock, Eye, EyeOff } from 'lucide-react';
import './register.css';
import Navbar from './Navbar.jsx';
import { useLibrary } from './hooks/useLibrary.js';
import { useAuth } from './hooks/useAuth.js';

function Register() {
  const navigate = useNavigate();
  const { libraries, createLibrary, selectLibrary, deleteLibrary } = useLibrary();
  const { createLibraryAuth } = useAuth();
  const [formData, setFormData] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    email: '',
    responsable: '',
    horarios: '',
    descripcion: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para autenticación
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');


  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre de la biblioteca es requerido';
    }

    if (!formData.direccion.trim()) {
      newErrors.direccion = 'La dirección es requerida';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (formData.telefono && !/^[\d\s\-\+\(\)]+$/.test(formData.telefono)) {
      newErrors.telefono = 'El teléfono no es válido';
    }

    // Validar contraseña
    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      return false;
    }

    if (password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    setErrors(newErrors);
    setPasswordError('');
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Función para restaurar focus en inputs (solución para Windows/Electron)
  const handleInputClick = (e) => {
    const target = e.target;

    // Método 1: Focus directo
    target.focus();
    target.select();

    // Método 2: Si no funciona, intentar con click programático
    setTimeout(() => {
      if (document.activeElement !== target) {
        target.click();
        target.focus();
        target.select();
      }
    }, 10);
  };

  const clearForm = () => {
    setFormData({
      nombre: '',
      direccion: '',
      telefono: '',
      email: '',
      responsable: '',
      horarios: '',
      descripcion: ''
    });
    setPassword('');
    setErrors({});
    setPasswordError('');
    setIsSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Crear nueva biblioteca usando el hook
      const newLibrary = await createLibrary(formData);

      // Configurar autenticación para la biblioteca (solo contraseña)
      createLibraryAuth(newLibrary, 'password', password);

      // Limpiar el formulario COMPLETAMENTE
      clearForm();

      // FORZAR LIMPIEZA ADICIONAL DEL ESTADO
      setFormData({
        nombre: '',
        direccion: '',
        telefono: '',
        email: '',
        responsable: '',
        horarios: '',
        descripcion: ''
      });
      setPassword('');
      setErrors({});
      setPasswordError('');
      setIsSubmitting(false);

      // LOG PARA VERIFICAR LIMPIEZA
      console.log('FORMULARIO LIMPIADO COMPLETAMENTE');

      // SOLUCIÓN DEFINITIVA: NO usar diálogos nativos que roben el focus
      // En su lugar, mostrar un mensaje temporal en pantalla
      const successMessage = document.createElement('div');
      successMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
      `;
      successMessage.textContent = '¡Biblioteca registrada exitosamente!';
      document.body.appendChild(successMessage);

      // Remover el mensaje después de 3 segundos
      setTimeout(() => {
        if (successMessage.parentNode) {
          successMessage.parentNode.removeChild(successMessage);
        }
      }, 3000);

      // SOLUCIÓN DEFINITIVA: NO navegar automáticamente, dejar al usuario en la página
      // Y usar un enfoque diferente para el focus

      // Crear un input temporal invisible para capturar el focus
      const tempInput = document.createElement('input');
      tempInput.style.cssText = 'position: absolute; left: -9999px; opacity: 0;';
      document.body.appendChild(tempInput);

      // Forzar focus en el input temporal primero
      tempInput.focus();

      // Luego mover el focus al input real
      setTimeout(() => {
        const firstInput = document.querySelector('input[name="nombre"]');
        if (firstInput) {
          firstInput.focus();
          firstInput.select(); // Seleccionar todo el texto
        }

        // Remover el input temporal
        document.body.removeChild(tempInput);
      }, 100);

      // NO navegar automáticamente - dejar al usuario en la página para seguir usando
      // setTimeout(() => {
      //   navigate('/dashboard');
      // }, 1000);

    } catch (error) {
      console.error('Error al registrar biblioteca:', error);

      // Mostrar mensaje de error más específico SIN usar alert
      const errorMessage = document.createElement('div');
      errorMessage.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: Arial, sans-serif;
        font-size: 14px;
        max-width: 300px;
      `;

      if (error.message && error.message.includes('Ya existe una biblioteca')) {
        errorMessage.textContent = `Error: ${error.message}`;
        // Limpiar solo el nombre para que pueda cambiarlo
        setFormData(prev => ({ ...prev, nombre: '' }));
        setErrors(prev => ({ ...prev, nombre: '' }));
      } else {
        errorMessage.textContent = 'Error al registrar la biblioteca. Inténtalo de nuevo.';
        // Limpiar todo el formulario en caso de otros errores
        clearForm();
        // FORZAR LIMPIEZA ADICIONAL DEL ESTADO
        setFormData({
          nombre: '',
          direccion: '',
          telefono: '',
          email: '',
          responsable: '',
          horarios: '',
          descripcion: ''
        });
        setPassword('');
        setErrors({});
        setPasswordError('');
        setIsSubmitting(false);

        // LOG PARA VERIFICAR LIMPIEZA
        console.log('FORMULARIO LIMPIADO COMPLETAMENTE (ERROR)');
      }

      document.body.appendChild(errorMessage);

      // Remover el mensaje después de 4 segundos
      setTimeout(() => {
        if (errorMessage.parentNode) {
          errorMessage.parentNode.removeChild(errorMessage);
        }
      }, 4000);

      // SOLUCIÓN DEFINITIVA: Usar input temporal para capturar el focus
      const tempInput = document.createElement('input');
      tempInput.style.cssText = 'position: absolute; left: -9999px; opacity: 0;';
      document.body.appendChild(tempInput);

      // Forzar focus en el input temporal primero
      tempInput.focus();

      // Luego mover el focus al input real
      setTimeout(() => {
        const targetInput = document.querySelector('input[name="nombre"]');
        if (targetInput) {
          targetInput.focus();
          targetInput.select(); // Seleccionar todo el texto
        }

        // Remover el input temporal
        document.body.removeChild(tempInput);
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectLibrary = async (biblioteca) => {
    try {
      await selectLibrary(biblioteca);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error selecting library:', error);
      await window.nativeDialog.error({
        message: 'Error al seleccionar la biblioteca.',
        detail: 'No se pudo seleccionar la biblioteca. Inténtalo de nuevo.'
      });
    }
  };

  const handleDeleteLibrary = async (bibliotecaId) => {
    const confirmed = await window.nativeDialog.confirm({
      message: '¿Estás seguro de que quieres eliminar esta biblioteca?',
      detail: 'Esta acción no se puede deshacer.',
      buttons: ['Cancelar', 'Eliminar'],
      defaultId: 1,
      cancelId: 0,
      okIndex: 1
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteLibrary(bibliotecaId);
    } catch (error) {
      console.error('Error deleting library:', error);
      await window.nativeDialog.error({
        message: 'Error al eliminar la biblioteca.',
        detail: 'No se pudo eliminar la biblioteca. Inténtalo de nuevo.'
      });
    }
  };

  return (
    <>
      <Navbar />


      <div className="register-container">
        <div className="register-content">
          <div className="register-header">
            <button
              className="back-button"
              onClick={() => navigate('/')}
            >
              <X size={20} />
            </button>
            <div className="header-content">
              <h1>Registro de Biblioteca</h1>
              <span className="header-separator">|</span>
              <p>Registrá tu biblioteca para comenzar a gestionar libros, socios y préstamos</p>
            </div>
          </div>

          <div className="register-sections">
            {/* Formulario de registro */}
            <section className="register-form-section">
              <h2>Nueva Biblioteca</h2>
              <form onSubmit={handleSubmit} className="register-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="nombre">
                      <Building size={16} />
                      Nombre de la biblioteca <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      onClick={handleInputClick}
                      placeholder="Ej: Biblioteca Central"
                      className={errors.nombre ? 'error' : ''}
                    />
                    {errors.nombre && <span className="error-message">{errors.nombre}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="direccion">
                      <MapPin size={16} />
                      Dirección <span className="required-asterisk">*</span>
                    </label>
                    <input
                      type="text"
                      id="direccion"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleInputChange}
                      onClick={handleInputClick}
                      placeholder="Ej: Av. San Martín 123"
                      className={errors.direccion ? 'error' : ''}
                    />
                    {errors.direccion && <span className="error-message">{errors.direccion}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="telefono">
                      <Phone size={16} />
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      id="telefono"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      onClick={handleInputClick}
                      placeholder="Ej: (123) 456-7890"
                      className={errors.telefono ? 'error' : ''}
                    />
                    {errors.telefono && <span className="error-message">{errors.telefono}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">
                      <Mail size={16} />
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onClick={handleInputClick}
                      placeholder="Ej: info@biblioteca.com"
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                  </div>
                </div>

                <div className="form-row form-row-2">
                  <div className="form-group">
                    <label htmlFor="responsable">
                      <User size={16} />
                      Responsable
                    </label>
                    <input
                      type="text"
                      id="responsable"
                      name="responsable"
                      value={formData.responsable}
                      onChange={handleInputChange}
                      onClick={handleInputClick}
                      placeholder="Ej: María González"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="horarios">
                      <Library size={16} />
                      Horarios de atención
                    </label>
                    <input
                      type="text"
                      id="horarios"
                      name="horarios"
                      value={formData.horarios}
                      onChange={handleInputChange}
                      onClick={handleInputClick}
                      placeholder="Ej: Lunes a Viernes 8:00 - 18:00"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="descripcion">
                    <Library size={16} />
                    Descripción
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    placeholder="Breve descripción de la biblioteca..."
                    rows="3"
                  />
                </div>

                {/* Campo de contraseña */}
                <div className="form-group">
                  <label htmlFor="password">
                    <Lock size={16} />
                    Contraseña de acceso <span className="required-asterisk">*</span>
                  </label>
                  <div className="password-input-container">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) {
                          setPasswordError('');
                        }
                      }}
                      onClick={handleInputClick}
                      placeholder="Ingresa una contraseña segura"
                      className={passwordError ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordError && <span className="error-message">{passwordError}</span>}
                  <p className="password-hint">Usa al menos 6 caracteres con letras y números</p>
                </div>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  <Save size={18} />
                  {isSubmitting ? 'Registrando...' : 'Registrar Biblioteca'}
                </button>

                {/* Debug info */}
              </form>
            </section>


          </div>
        </div>
      </div>
    </>
  );
}

export default Register; 