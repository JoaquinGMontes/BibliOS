import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, LogIn, X, AlertCircle, Lock, Eye, EyeOff, Sparkles, Activity, CheckCircle } from 'lucide-react';
import './Login.css';
import Navbar from './Navbar.jsx';

function Login() {
  const navigate = useNavigate();
  const [libraryName, setLibraryName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [successModal, setSuccessModal] = useState(null);

  // Limpiar formulario al cargar la página
  useEffect(() => {
    setLibraryName('');
    setPassword('');
    setError('');
    setIsLoading(false);

    // Solución específica para el problema de logout: resetear completamente el estado de focus
    const resetFocus = () => {
      // Limpiar cualquier elemento activo
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      // Esperar un momento y luego enfocar el primer input
      setTimeout(() => {
        const firstInput = document.querySelector('#libraryName');
        if (firstInput) {
          firstInput.focus();
          firstInput.click(); // Click adicional para asegurar que funcione
        }
      }, 100);
    };

    // Ejecutar el reset después de un momento
    setTimeout(resetFocus, 200);
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Verificar si estamos en Electron
      if (window.electronAPI) {
        // Usar la base de datos SQLite
        const bibliotecas = await window.electronAPI.getBibliotecas();

        // Buscar la biblioteca por nombre
        const biblioteca = bibliotecas.find(bib =>
          bib.nombre.toLowerCase().includes(libraryName.toLowerCase())
        );

        if (biblioteca) {
          // Activar la biblioteca encontrada
          await window.electronAPI.activateBiblioteca(biblioteca.id);

          // Guardar en localStorage para compatibilidad con el sistema de auth
          localStorage.setItem('bibliotecaActiva', JSON.stringify(biblioteca));
          localStorage.setItem('authData', JSON.stringify({
            libraryId: biblioteca.id,
            authMethod: 'password',
            hashedValue: '123456789', // Por ahora usar un hash simple
            salt: 'mock-salt-1',
            createdAt: new Date().toISOString()
          }));

          // Redirigir al dashboard
          navigate('/dashboard');
        } else {
          setError('Biblioteca no encontrada. Verifica el nombre o crea una nueva biblioteca.');
        }
      } else {
        // Fallback para desarrollo sin Electron
        if (libraryName.toLowerCase().includes('utn') && password === 'UTN') {
          const mockLibrary = {
            id: 'mock-library-1',
            nombre: 'UTN-FRLP',
            direccion: 'Av. Universidad 123, Villa María',
            telefono: '(353) 123-4567',
            email: 'biblioteca@utn.edu.ar',
            responsable: 'Dr. María González',
            horarios: 'Lunes a Viernes 8:00 - 18:00',
            descripcion: 'Biblioteca principal de la Universidad Tecnológica Nacional',
            fechaCreacion: '2024-01-15T10:00:00.000Z',
            activa: true
          };

          localStorage.setItem('bibliotecaActiva', JSON.stringify(mockLibrary));
          localStorage.setItem('authData', JSON.stringify({
            libraryId: 'mock-library-1',
            authMethod: 'password',
            hashedValue: '123456789',
            salt: 'mock-salt-1',
            createdAt: '2024-01-15T10:00:00.000Z'
          }));

          navigate('/dashboard');
        } else {
          setError('Credenciales incorrectas. Usa "UTN-FRLP" y "UTN"');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Error durante la autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAndLoginUTN = async () => {
    setIsCreatingDemo(true);
    setError('');

    try {
      if (window.electronAPI) {
        // Crear la biblioteca UTN-FRLP con datos de muestra
        const result = await window.electronAPI.createUTNLibrary();

        // Obtener la biblioteca activa
        const bibliotecaActiva = await window.electronAPI.getBibliotecaActiva();

        if (bibliotecaActiva) {
          // Guardar en localStorage
          localStorage.setItem('bibliotecaActiva', JSON.stringify(bibliotecaActiva));
          localStorage.setItem('authData', JSON.stringify({
            libraryId: bibliotecaActiva.id,
            authMethod: 'password',
            hashedValue: 'UTN', // Contraseña simple
            salt: 'utn-salt',
            createdAt: new Date().toISOString()
          }));

          // Mostrar modal de éxito
          if (result && result.exists) {
            setSuccessModal({
              title: 'Sesión iniciada',
              message: 'Biblioteca UTN-FRLP cargada correctamente.',
              detail: result.datos && result.datos.librosInsertados
                ? `${result.datos.librosInsertados} libros · ${result.datos.sociosInsertados} socios · ${result.datos.prestamosInsertados} préstamos`
                : null
            });
          } else if (result && result.datos) {
            setSuccessModal({
              title: 'Biblioteca creada',
              message: '¡Biblioteca UTN-FRLP creada exitosamente!',
              detail: `${result.datos.librosInsertados} libros · ${result.datos.sociosInsertados} socios · ${result.datos.prestamosInsertados} préstamos`
            });
          } else {
            navigate('/dashboard');
          }
        } else {
          setError('Error al obtener la biblioteca activa');
        }
      } else {
        // Fallback sin Electron
        const mockLibrary = {
          id: 'mock-library-1',
          nombre: 'UTN-FRLP',
          direccion: 'Av. Universidad 123, Villa María',
          telefono: '(353) 123-4567',
          email: 'biblioteca@utn.edu.ar',
          responsable: 'Dr. María González',
          horarios: 'Lunes a Viernes 8:00 - 18:00',
          descripcion: 'Biblioteca principal de la Universidad Tecnológica Nacional',
          fechaCreacion: '2024-01-15T10:00:00.000Z',
          activa: true
        };

        localStorage.setItem('bibliotecaActiva', JSON.stringify(mockLibrary));
        localStorage.setItem('authData', JSON.stringify({
          libraryId: 'mock-library-1',
          authMethod: 'password',
          hashedValue: 'UTN',
          salt: 'utn-salt',
          createdAt: '2024-01-15T10:00:00.000Z'
        }));

        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error al crear biblioteca UTN:', error);
      setError('Error al crear la biblioteca de demostración: ' + error.message);
    } finally {
      setIsCreatingDemo(false);
    }
  };


  return (
    <div className="full-width-page">
      <Navbar />
      <div className="login-container">
        {/* Success Modal */}
        {successModal && (
          <div className="success-modal-overlay" onClick={() => { setSuccessModal(null); navigate('/dashboard'); }}>
            <div className="success-modal" onClick={(e) => e.stopPropagation()}>
              <CheckCircle size={32} className="success-modal-icon" />
              <h3>{successModal.title}</h3>
              <p>{successModal.message}</p>
              {successModal.detail && (
                <span className="success-modal-detail">{successModal.detail}</span>
              )}
              <button
                className="success-modal-btn"
                onClick={() => { setSuccessModal(null); navigate('/dashboard'); }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        <div className="login-content">
          <button className="close-login-button" onClick={() => navigate('/')}>
            <X size={18} />
          </button>
          <div className="login-header">
            <h1>Iniciar Sesión</h1>
            <p>Ingresa tus credenciales para acceder</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="libraryName" className="form-label">
                Biblioteca
              </label>
              <input
                id="libraryName"
                type="text"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                onClick={handleInputClick}
                placeholder="Ej: UTN-FRLP"
                className="form-input"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onClick={handleInputClick}
                  placeholder="Contraseña"
                  className="form-input"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading || !libraryName.trim() || !password.trim()}
            >
              <LogIn size={15} />
              {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="login-actions">
            <button className="register-btn" onClick={() => navigate('/registro')}>
              Registrar biblioteca
            </button>
            {window.electronAPI && (
              <button
                onClick={handleCreateAndLoginUTN}
                disabled={isCreatingDemo || isLoading}
                className="demo-link"
              >
                {isCreatingDemo ? (
                  <>
                    <Activity className="animate-spin" size={13} />
                    Creando...
                  </>
                ) : (
                  'Probar con demo UTN-FRLP'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

