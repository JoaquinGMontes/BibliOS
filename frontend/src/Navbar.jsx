import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LogOut, LogIn, Menu, X, Sun, Moon, 
  LayoutDashboard, Repeat, Users, Book 
} from 'lucide-react';
import './sidebar.css';
import { useAuth } from './hooks/useAuth.js';
import { useLibrary } from './hooks/useLibrary.js';
import { useTheme } from './hooks/useTheme.js';
import { useState, useEffect } from 'react';
import AppModal from './components/AppModal.jsx';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const { libraries } = useLibrary();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    closeMenu();
    localStorage.removeItem('bibliotecaActiva');
    localStorage.removeItem('authData');
    logout();
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  // Cerrar menú al cambiar de ruta en móvil
  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  // Páginas que requieren navbar simple (sin autenticación o Landing)
  const isSimplePage = location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/registro';

  const isActive = (path) => location.pathname === path ? 'active' : '';

  if (isSimplePage) {
    return (
      <header className="navbar-simple">
        <Link to="/" className="logo">
          <span className="logo-text">BibliOS</span>
        </Link>
        
        {/* Mobile Toggle para Simple Navbar */}
        <button
          className="menu-toggle" // Clase definida en welcome.css o global para mobile simple
          style={{ display: 'none', background: 'transparent', border: 'none', color: 'white' }}
          onClick={toggleMenu}
        >
           {/* Por ahora oculto en desktop, visible en mobile si agregamos media queries especificas */}
           {/* Para simplicidad en este refactor, mantenemos enlaces directos */}
        </button>

        <nav>
          <ul className="nav-links">
            <li>
              <button
                onClick={toggleTheme}
                className="footer-btn"
                style={{ width: 'auto', padding: '0.5rem' }}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </li>
            <li>
              <button
                onClick={handleLogin}
                className="footer-btn"
                style={{ width: 'auto', border: '1px solid currentColor' }}
              >
                <LogIn size={18} />
                Iniciar Sesión
              </button>
            </li>
          </ul>
        </nav>
      </header>
    );
  }

  // Sidebar completo para aplicación (Dashboard, etc)
  return (
    <>
      {/* Boton Toggle Móvil Externo */}
      <button 
        className="mobile-menu-toggle"
        onClick={toggleMenu}
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* Overlay para cerrar en móvil */}
      {isMenuOpen && (
        <div className="sidebar-overlay" onClick={closeMenu} />
      )}

      <aside className={`sidebar ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/dashboard" className="logo" onClick={closeMenu}>
          <span className="logo-text">BibliOS</span>
        </Link>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link to="/prestamos" className={`nav-item ${isActive('/prestamos')}`}>
            <Repeat size={20} />
            Préstamos
          </Link>
          <Link to="/socios" className={`nav-item ${isActive('/socios')}`}>
            <Users size={20} />
            Socios
          </Link>
          <Link to="/libros" className={`nav-item ${isActive('/libros')}`}>
            <Book size={20} />
            Libros
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={toggleTheme}
            className="footer-btn"
            title="Cambiar tema"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          </button>
          
          <button
            onClick={handleLogoutClick}
            className="footer-btn logout"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <AppModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        type="confirm"
        title="Cerrar sesión"
        message="¿Seguro que querés cerrar sesión?"
        detail="Se cerrará tu sesión actual."
        secondaryButtonText="Cancelar"
        primaryButtonText="Cerrar sesión"
        onPrimaryClick={handleLogoutConfirm}
      />
    </>
  );
} 