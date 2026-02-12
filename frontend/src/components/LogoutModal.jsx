import React from 'react';
import { LogOut, X, AlertCircle } from 'lucide-react';
import './AuthModal.css'; // Reusing AuthModal styles for consistency

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="auth-modal-overlay">
            <div className="auth-modal" style={{ maxWidth: '400px', background: '#0a0a0a', border: '1px solid #262626' }}>
                <div className="auth-modal-header" style={{ padding: '15px 20px', borderBottom: 'none' }}>
                    <div className="auth-modal-title" style={{ color: '#e5e7eb' }}>
                        <LogOut size={16} />
                        <h2 style={{ fontSize: '0.95rem' }}>Cerrar Sesión</h2>
                    </div>
                    <button className="auth-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="auth-modal-content">
                    <div className="auth-method-info" style={{ marginBottom: '20px' }}>

                        <p className="auth-method-text">
                            ¿Estás seguro que querés cerrar sesión?
                            <br />
                            <span style={{ fontSize: '0.9em', opacity: 0.7, display: 'block', marginTop: '5px' }}>
                                Se cerrará tu sesión actual en BibliOS.
                            </span>
                        </p>
                    </div>

                    <div className="auth-actions">
                        <button
                            type="button"
                            className="auth-cancel-btn"
                            onClick={onClose}
                            style={{ borderColor: '#4b5563' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            className="auth-submit-btn"
                            onClick={onConfirm}
                            style={{
                                backgroundColor: '#134074',
                                border: '1px solid #134074',
                                color: 'white'
                            }}
                        >
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
