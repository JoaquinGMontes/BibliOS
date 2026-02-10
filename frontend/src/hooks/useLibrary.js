import { useState, useEffect } from 'react';
import { getMockLibraryStats } from '../utils/mockData.js';

export const useLibrary = () => {
    const [activeLibrary, setActiveLibrary] = useState(null);
    const [libraries, setLibraries] = useState([]);
    const [loading, setLoading] = useState(true);

    // Cargar bibliotecas al inicializar
    useEffect(() => {
        loadLibraries();
    }, []);

    const loadLibraries = async() => {
        try {
            console.log('📚 useLibrary: Cargando bibliotecas...');
            console.log('🔍 window.electronAPI existe?', Object.keys(window).includes('electronAPI'));
            console.log('🔍 window.electronAPI valor:', window.electronAPI);
            // Verificar si estamos en Electron
            if (window.electronAPI) {
                console.log('✅ electronAPI disponible');
                // Usar la base de datos SQLite
                const savedLibraries = await window.electronAPI.getBibliotecas();
                console.log('📖 Bibliotecas desde BD:', savedLibraries);
                const savedActiveLibrary = await window.electronAPI.getBibliotecaActiva();
                console.log('🏢 Biblioteca activa:', savedActiveLibrary);

                setLibraries(savedLibraries || []);
                setActiveLibrary(savedActiveLibrary);
            } else {
                console.warn('⚠️ electronAPI NO disponible - usando localStorage como fallback');
                // Fallback a localStorage si no estamos en Electron
                const savedLibraries = JSON.parse(localStorage.getItem('bibliotecas') || '[]');
                const savedActiveLibrary = JSON.parse(localStorage.getItem('bibliotecaActiva') || 'null');
                console.log('📦 Bibliotecas desde localStorage:', savedLibraries);
                console.log('📦 Biblioteca activa desde localStorage:', savedActiveLibrary);

                setLibraries(savedLibraries);
                setActiveLibrary(savedActiveLibrary);
            }
        } catch (error) {
            console.error('Error loading libraries:', error);
            // Fallback a localStorage en caso de error
            const savedLibraries = JSON.parse(localStorage.getItem('bibliotecas') || '[]');
            const savedActiveLibrary = JSON.parse(localStorage.getItem('bibliotecaActiva') || 'null');

            setLibraries(savedLibraries);
            setActiveLibrary(savedActiveLibrary);
        } finally {
            setLoading(false);
        }
    };

    const createLibrary = async(libraryData) => {
        try {
            let newLibrary;

            // Verificar si estamos en Electron
            if (window.electronAPI) {
                // Usar la base de datos SQLite
                newLibrary = await window.electronAPI.createBiblioteca(libraryData);
            } else {
                // Fallback a localStorage si no estamos en Electron
                newLibrary = {
                    id: Date.now().toString(),
                    ...libraryData,
                    fechaCreacion: new Date().toISOString(),
                    activa: true
                };

                // Desactivar todas las bibliotecas anteriores
                const updatedLibraries = libraries.map(lib => ({
                    ...lib,
                    activa: false
                }));

                // Agregar la nueva biblioteca
                updatedLibraries.push(newLibrary);

                // Guardar en localStorage
                localStorage.setItem('bibliotecas', JSON.stringify(updatedLibraries));
                localStorage.setItem('bibliotecaActiva', JSON.stringify(newLibrary));
            }

            // Recargar las bibliotecas para actualizar el estado
            await loadLibraries();

            return newLibrary;
        } catch (error) {
            console.error('Error creating library:', error);
            throw error;
        }
    };

    const selectLibrary = async(library) => {
        try {
            // Verificar si estamos en Electron
            if (window.electronAPI) {
                // Usar la base de datos SQLite
                await window.electronAPI.activateBiblioteca(library.id);
            } else {
                // Fallback a localStorage si no estamos en Electron
                // Desactivar todas las bibliotecas
                const updatedLibraries = libraries.map(lib => ({
                    ...lib,
                    activa: lib.id === library.id
                }));

                // Guardar cambios
                localStorage.setItem('bibliotecas', JSON.stringify(updatedLibraries));
                localStorage.setItem('bibliotecaActiva', JSON.stringify(library));
            }

            // Recargar las bibliotecas para actualizar el estado
            await loadLibraries();
        } catch (error) {
            console.error('Error selecting library:', error);
            throw error;
        }
    };

    const deleteLibrary = async(libraryId) => {
        try {
            // Verificar si estamos en Electron
            if (window.electronAPI) {
                // Usar la base de datos SQLite
                await window.electronAPI.deleteBiblioteca(libraryId);
            } else {
                // Fallback a localStorage si no estamos en Electron
                const updatedLibraries = libraries.filter(lib => lib.id !== libraryId);
                localStorage.setItem('bibliotecas', JSON.stringify(updatedLibraries));

                // Si se eliminó la biblioteca activa, limpiar
                if (activeLibrary && activeLibrary.id === libraryId) {
                    localStorage.removeItem('bibliotecaActiva');
                }
            }

            // Recargar las bibliotecas para actualizar el estado
            await loadLibraries();
        } catch (error) {
            console.error('Error deleting library:', error);
            throw error;
        }
    };

    const updateLibrary = async(libraryId, updates) => {
        try {
            // Verificar si estamos en Electron
            if (window.electronAPI) {
                // Usar la base de datos SQLite
                await window.electronAPI.updateBiblioteca(libraryId, updates);
            } else {
                // Fallback a localStorage si no estamos en Electron
                const updatedLibraries = libraries.map(lib =>
                    lib.id === libraryId ? {...lib, ...updates } : lib
                );

                localStorage.setItem('bibliotecas', JSON.stringify(updatedLibraries));

                // Si se actualizó la biblioteca activa, actualizar también
                if (activeLibrary && activeLibrary.id === libraryId) {
                    const updatedActiveLibrary = {...activeLibrary, ...updates };
                    localStorage.setItem('bibliotecaActiva', JSON.stringify(updatedActiveLibrary));
                }
            }

            // Recargar las bibliotecas para actualizar el estado
            await loadLibraries();
        } catch (error) {
            console.error('Error updating library:', error);
            throw error;
        }
    };

    const hasActiveLibrary = () => {
        return activeLibrary !== null;
    };

    const getLibraryStats = async() => {
        if (!activeLibrary) return null;

        // Usar estadísticas mock si es una biblioteca mock
        if (activeLibrary.id.startsWith('mock-library-')) {
            return getMockLibraryStats(activeLibrary.id);
        }

        // Para bibliotecas reales, obtener estadísticas reales desde la base de datos
        if (window.electronAPI && activeLibrary.id) {
            try {
                return await window.electronAPI.getBibliotecaStats(activeLibrary.id);
            } catch (error) {
                console.error('Error al obtener estadísticas:', error);
                // Retornar valores en 0 si hay error
                return {
                    totalLibros: 0,
                    totalSocios: 0,
                    prestamosActivos: 0,
                    prestamosVencidos: 0,
                    prestamosCompletados: 0
                };
            }
        }

        // Fallback: valores en 0
        return {
            totalLibros: 0,
            totalSocios: 0,
            prestamosActivos: 0,
            prestamosVencidos: 0,
            prestamosCompletados: 0
        };
    };

    return {
        activeLibrary,
        libraries,
        loading,
        createLibrary,
        selectLibrary,
        deleteLibrary,
        updateLibrary,
        hasActiveLibrary,
        getLibraryStats,
        loadLibraries
    };
};