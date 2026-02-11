import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, LogIn, X, AlertCircle, Lock, Eye, EyeOff, Sparkles, Activity } from 'lucide-react';
import './Login.css';
import Navbar from './Navbar.jsx';
import AppModal from './components/AppModal.jsx';

function Login() {
  const navigate = useNavigate();
  const [libraryName, setLibraryName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentText, setCurrentText] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    type: 'success',
    title: '',
    message: '',
    detail: '',
    action: null
  });

  const inspirationTexts = [
    "Trabajamos para nosotros",
    "El conocimiento es poder",
    "Los libros cambian vidas",
    "El aprendizaje nunca termina",
    "La educación es libertad",
    "Lee, aprende, crece",
    "El conocimiento compartido se multiplica",
    "Cada libro es un viaje",
    "Las bibliotecas son el futuro",
    "La lectura abre mentes"
  ];

  // Efecto para cambiar el texto cada 3 segundos con transición
  useEffect(() => {
    const interval = setInterval(() => {
      setIsChanging(true);

      setTimeout(() => {
        setCurrentText((prev) => (prev + 1) % inspirationTexts.length);
        setIsChanging(false);
      }, 300); // Mitad de la duración de la transición
    }, 3000);

    return () => clearInterval(interval);
  }, [inspirationTexts.length]);

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
        // Validar nombre + contraseña en el backend (SQLite)
        const biblioteca = await window.electronAPI.validateBibliotecaLogin(libraryName.trim(), password);

        // Activar la biblioteca encontrada
        await window.electronAPI.activateBiblioteca(biblioteca.id);

        // Guardar en localStorage para compatibilidad con el sistema de auth
        localStorage.setItem('bibliotecaActiva', JSON.stringify(biblioteca));
        localStorage.setItem('authData', JSON.stringify({
          libraryId: biblioteca.id,
          authMethod: 'password',
          hashedValue: '123456789',
          salt: 'mock-salt-1',
          createdAt: new Date().toISOString()
        }));

        // Redirigir al dashboard
        navigate('/dashboard');
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
          setModal({
            open: true,
            type: 'error',
            title: 'Credenciales incorrectas',
            message: 'Usa "UTN-FRLP" y "UTN" para el entorno de prueba.',
            detail: '',
            action: null
          });
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      const raw = err?.message || '';
      let friendlyMessage = 'Error durante la autenticación';
      if (raw.includes('Contraseña incorrecta')) friendlyMessage = 'Contraseña incorrecta.';
      else if (raw.includes('Biblioteca no encontrada')) friendlyMessage = 'Biblioteca no encontrada. Verifica el nombre.';
      else if (raw.includes('re-registr')) friendlyMessage = 'Esta biblioteca debe registrarse de nuevo para usar contraseña.';
      setModal({
        open: true,
        type: 'error',
        title: 'Error al iniciar sesión',
        message: friendlyMessage,
        detail: '',
        action: null
      });
      setError('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (modal.action === 'navigate_dashboard') {
      navigate('/dashboard');
    }
    setModal(prev => ({ ...prev, open: false, action: null }));
  };

  const handleCreateAndLoginUTN = async () => {
    setIsCreatingDemo(true);
    setError('');

    try {
      if (window.electronAPI) {
        // Crear la biblioteca UTN-FRLP con datos de muestra
        console.log('📖 CREANDO BIBLIOTECA UTN-FRLP...');
        const result = await window.electronAPI.createUTNLibrary();
        console.log('✅ Resultado de createUTNLibrary:', result);

        // Obtener la biblioteca activa
        console.log('🔍 Buscando biblioteca activa...');
        const bibliotecaActiva = await window.electronAPI.getBibliotecaActiva();
        console.log('🏢 Biblioteca activa:', bibliotecaActiva);

        if (bibliotecaActiva) {
          // Guardar en localStorage
          localStorage.setItem('bibliotecaActiva', JSON.stringify(bibliotecaActiva));
          localStorage.setItem('authData', JSON.stringify({
            libraryId: bibliotecaActiva.id,
            authMethod: 'password',
            hashedValue: 'UTN',
            salt: 'utn-salt',
            createdAt: new Date().toISOString()
          }));

          // Mostrar modal de éxito (estilo BibliOS) y al aceptar ir al dashboard
          if (result && result.exists) {
            setModal({
              open: true,
              type: 'success',
              title: 'Sesión iniciada',
              message: 'Sesión iniciada con la biblioteca UTN-FRLP existente.',
              detail: result.datos && result.datos.librosInsertados
                ? `${result.datos.librosInsertados} libros · ${result.datos.sociosInsertados} socios · ${result.datos.prestamosInsertados} préstamos`
                : 'La biblioteca ya estaba creada con todos sus datos.',
              action: 'navigate_dashboard'
            });
          } else if (result && result.datos) {
            setModal({
              open: true,
              type: 'success',
              title: 'Biblioteca creada',
              message: 'Biblioteca UTN-FRLP creada e iniciada correctamente.',
              detail: `${result.datos.librosInsertados} libros · ${result.datos.sociosInsertados} socios · ${result.datos.prestamosInsertados} préstamos`,
              action: 'navigate_dashboard'
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
        <div className="login-wrapper">
          <button
            className="close-login-button"
            onClick={() => navigate('/')}
          >
            <X size={24} />
          </button>
          <div className="login-form-section">
            <div className="login-content">
              <div className="login-header">
                <div className="header-content">
                  <h1>Iniciar Sesión</h1>
                  <span className="header-separator">|</span>
                  <p>Ingresa el nombre de la biblioteca y tu contraseña</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="libraryName" className="form-label">
                    <Library size={16} />
                    Nombre de la Biblioteca
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
                    <Lock size={16} />
                    Contraseña
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onClick={handleInputClick}
                      placeholder="Ingresa tu contraseña"
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
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="login-error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={isLoading || !libraryName.trim() || !password.trim()}
                >
                  <LogIn size={16} />
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="login-footer">
                <p>¿No tienes una biblioteca registrada?</p>
                <button
                  className="register-link-btn"
                  onClick={() => navigate('/registro')}
                >
                  <Library size={16} />
                  Registrar Nueva Biblioteca
                </button>
              </div>

              {/* Botón de acceso rápido UTN-FRLP */}
              {window.electronAPI && (
                <div className="utn-quick-access">
                  <div className="utn-divider">
                    <span>Acceso Rápido</span>
                  </div>
                  <button
                    onClick={handleCreateAndLoginUTN}
                    disabled={isCreatingDemo || isLoading}
                    className="utn-quick-btn"
                  >
                    {isCreatingDemo ? (
                      <>
                        <Activity className="animate-spin" size={18} />
                        Creando biblioteca...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Crear e Iniciar con UTN-FRLP
                      </>
                    )}
                  </button>
                  <p className="utn-description">
                    Crea automáticamente una biblioteca de demostración completa con datos de prueba y accede inmediatamente.
                  </p>
                </div>
              )}

              <div className="login-help">
                <h4>🔑 Credenciales de Prueba</h4>
                <p><strong>Biblioteca:</strong> UTN-FRLP</p>
                <p><strong>Contraseña:</strong> UTN</p>
              </div>
            </div>
          </div>

          <div className="login-inspiration-section">
            <div className="inspiration-content">
              <h1 className={`inspiration-text ${isChanging ? 'changing' : ''}`}>
                {inspirationTexts[currentText]}
              </h1>
              <p className={`inspiration-subtitle ${isChanging ? 'changing' : ''}`}>
                Transformando la gestión bibliotecaria
              </p>
            </div>
          </div>
        </div>
      </div>

      <AppModal
        open={modal.open}
        onClose={handleCloseModal}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        detail={modal.detail}
        buttonText="Aceptar"
      />
    </div>
  );
}

export default Login;
