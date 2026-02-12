import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut, Sun, Moon, LayoutDashboard, Repeat, Users, Book
} from 'lucide-react';
import './sidebar.css';
import { useAuth } from './hooks/useAuth.js';
import { useTheme } from './hooks/useTheme.js';
import { useState } from 'react';
import LogoutModal from './components/LogoutModal';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    if (window.innerWidth < 1024) onClose();
  };

  const confirmLogout = async () => {
    setIsLogoutModalOpen(false);
    onClose();
    localStorage.removeItem('bibliotecaActiva');
    localStorage.removeItem('authData');
    logout();
    navigate('/');
  };



  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <>
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
      />
      {/* Overlay para cerrar en móvil */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <Link to="/dashboard" className="sidebar-logo" onClick={onClose}>
          <span className="logo-text">BibliOS</span>
        </Link>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/prestamos" className={`nav-item ${isActive('/prestamos')}`}>
            <Repeat size={20} />
            <span>Préstamos</span>
          </Link>
          <Link to="/socios" className={`nav-item ${isActive('/socios')}`}>
            <Users size={20} />
            <span>Socios</span>
          </Link>
          <Link to="/libros" className={`nav-item ${isActive('/libros')}`}>
            <Book size={20} />
            <span>Libros</span>
          </Link>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={toggleTheme}
            className="footer-btn theme-toggle-btn"
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
    </>
  );
}
