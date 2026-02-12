
import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import './Modal.css';

/**
 * Modal Component
 * @param {boolean} isOpen - Controls visibility
 * @param {function} onClose - Function to call on close
 * @param {string} title - Modal title
 * @param {string} message - Modal body message
 * @param {string} type - 'error', 'warning', 'success', 'info' (default: 'info')
 * @param {string} confirmText - Text for the primary button (default: 'Aceptar')
 * @param {function} onConfirm - Optional callback for primary button
 * @param {boolean} showCancel - Show cancel button? (default: false)
 * @param {string} cancelText - Text for cancel button
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    confirmText = 'Aceptar',
    onConfirm,
    showCancel = false,
    cancelText = 'Cancelar'
}) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'error': return <AlertCircle size={32} color="#ef4444" />; // Red
            case 'warning': return <AlertTriangle size={32} color="#f59e0b" />; // Amber
            case 'success': return <CheckCircle size={32} color="#10b981" />; // Emerald
            default: return <Info size={32} color="#3b82f6" />; // Blue
        }
    };

    const getHeaderClass = () => {
        return `modal-header ${type}`;
    };

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    return (
        <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className={`modal-container ${isOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
                <div className="modal-content">
                    <div className="modal-icon-wrapper">
                        {getIcon()}
                    </div>

                    <div className="modal-body">
                        <h3 className="modal-title">{title}</h3>
                        <p className="modal-message">{message}</p>
                    </div>

                    <div className="modal-actions">
                        {showCancel && (
                            <button className="modal-btn cancel" onClick={onClose}>
                                {cancelText}
                            </button>
                        )}
                        <button className={`modal-btn confirm ${type}`} onClick={handleConfirm}>
                            {confirmText}
                        </button>
                    </div>

                    <button className="modal-close-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
