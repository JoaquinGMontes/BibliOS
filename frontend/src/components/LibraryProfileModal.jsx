
import React, { useState, useEffect } from 'react';
import { X, Save, Building, MapPin, Phone, Mail, User, Clock, FileText } from 'lucide-react';
import './Modal.css';
import { useData } from '../context/DataContext';

export default function LibraryProfileModal({ isOpen, onClose }) {
    const [formData, setFormData] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        email: '',
        responsable: '',
        horarios: '',
        descripcion: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadLibraryData();
        }
    }, [isOpen]);

    const loadLibraryData = async () => {
        try {
            setLoading(true);
            setError(null);
            const storedLib = localStorage.getItem('bibliotecaActiva');
            if (storedLib) {
                const lib = JSON.parse(storedLib);
                if (window.electronAPI) {
                    const freshLib = await window.electronAPI.getBibliotecaById(lib.id);
                    if (freshLib) {
                        setFormData({
                            nombre: freshLib.nombre || '',
                            direccion: freshLib.direccion || '',
                            telefono: freshLib.telefono || '',
                            email: freshLib.email || '',
                            responsable: freshLib.responsable || '',
                            horarios: freshLib.horarios || '',
                            descripcion: freshLib.descripcion || ''
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Error loading library data:', err);
            setError('No se pudieron cargar los datos de la biblioteca.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const storedLib = localStorage.getItem('bibliotecaActiva');
            if (!storedLib) throw new Error("No hay biblioteca activa");

            const libId = JSON.parse(storedLib).id;

            if (window.electronAPI) {
                await window.electronAPI.updateBiblioteca(libId, formData);

                const updatedLib = { ...JSON.parse(storedLib), ...formData };
                localStorage.setItem('bibliotecaActiva', JSON.stringify(updatedLib));

                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    onClose();
                    window.location.reload();
                }, 1000);
            }
        } catch (err) {
            console.error('Error updating library:', err);
            // Handle unique constraint error specifically
            if (err.message && (err.message.includes('UNIQUE constraint failed: bibliotecas.nombre') || err.message.includes('SQLITE_CONSTRAINT_UNIQUE'))) {
                setError('El nombre de la biblioteca ya está en uso.');
            } else {
                setError('Error al guardar los cambios: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" onClick={onClose} style={{ zIndex: 1000 }}>
            {/* Modal Container: Matches body background to avoid gaps */}
            <div className="modal-container open" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)' }}>

                {/* Header */}
                <div className="modal-header" style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-card)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                        <Building size={20} style={{ color: 'var(--accent-primary)' }} />
                        Perfil de Biblioteca
                    </h2>
                    <button onClick={onClose} className="close-button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body" style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '70vh', backgroundColor: 'var(--bg-card)' }}>

                    {error && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            borderRadius: '0.5rem',
                            marginBottom: '1rem',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            borderRadius: '0.5rem',
                            marginBottom: '1rem',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                            ¡Cambios guardados correctamente!
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="library-form" className="socio-form">

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Nombre de la Biblioteca</label>
                            <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Building size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 1, pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.75rem 0.75rem 2.25rem', // Left padding for icon
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-input)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Teléfono</label>
                                <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <Phone size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 1, pointerEvents: 'none' }} />
                                    <input
                                        type="text"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 2.25rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email de Contacto</label>
                                <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 1, pointerEvents: 'none' }} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.75rem 0.75rem 2.25rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Dirección</label>
                            <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <MapPin size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 1, pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.75rem 0.75rem 2.25rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-input)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Responsable</label>
                            <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 1, pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    name="responsable"
                                    value={formData.responsable}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.75rem 0.75rem 2.25rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-input)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Horarios de Atención</label>
                            <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <Clock size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', zIndex: 1, pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    name="horarios"
                                    value={formData.horarios}
                                    onChange={handleChange}
                                    placeholder="Ej: Lun-Vie 8:00 - 20:00"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.75rem 0.75rem 2.25rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-input)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Descripción / Notas</label>
                            <div className="input-with-icon" style={{ position: 'relative' }}>
                                <textarea
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={handleChange}
                                    rows="3"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-input)',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'inherit',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="modal-actions" style={{
                    padding: '1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '1rem'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="modal-btn cancel"
                        disabled={loading}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="library-form"
                        className="modal-btn confirm"
                        disabled={loading}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            backgroundColor: 'var(--accent-primary)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>

            </div>
        </div>
    );
}
