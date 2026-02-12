import React, { createContext, useState, useEffect, useContext } from 'react';

export const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [library, setLibrary] = useState(null);
    const [libros, setLibros] = useState([]);
    const [socios, setSocios] = useState([]);
    const [prestamos, setPrestamos] = useState([]);
    const [stats, setStats] = useState({
        totalLibros: 0,
        totalSocios: 0,
        prestamosActivos: 0,
        prestamosVencidos: 0,
        prestamosCompletados: 0
    });

    // Chart Data
    const [charts, setCharts] = useState({
        prestamosPorMes: [],
        librosPorCategoria: [],
        sociosActivos: [],
        prestamosProximosAVencer: 0
    });

    const [loading, setLoading] = useState(true);

    // Load library from local storage on mount
    useEffect(() => {
        const storedLibrary = localStorage.getItem('bibliotecaActiva');
        if (storedLibrary) {
            setLibrary(JSON.parse(storedLibrary));
        }
        setLoading(false);
    }, []);

    // Fetch all data when library changes or on request
    useEffect(() => {
        if (library?.id && window.electronAPI) {
            refreshAll();
        }
    }, [library]);

    const refreshAll = async () => {
        if (!library?.id || !window.electronAPI) return;

        try {
            // Parallelize fetches for speed
            const [
                librosData,
                sociosData,
                prestamosData,
                statsData,
                prestamosMesData,
                librosCatData,
                sociosMesData
            ] = await Promise.all([
                window.electronAPI.getLibros(library.id, {}),
                window.electronAPI.getSocios(library.id, {}),
                window.electronAPI.getPrestamos(library.id, {}),
                window.electronAPI.getBibliotecaStats(library.id),
                window.electronAPI.getPrestamosPorMes(library.id, 6),
                window.electronAPI.getLibrosPorCategoria(library.id),
                window.electronAPI.getSociosPorMes(library.id, 6)
            ]);

            setLibros(librosData || []);
            setSocios(sociosData || []);
            setPrestamos(prestamosData || []);

            if (statsData) {
                setStats({
                    totalLibros: statsData.totalLibros || 0,
                    totalSocios: statsData.totalSocios || 0,
                    prestamosActivos: statsData.prestamosActivos || 0,
                    prestamosVencidos: statsData.prestamosVencidos || 0,
                    prestamosCompletados: statsData.prestamosCompletados || 0
                });
            }

            // Process Chart Data
            const prestamosFormateados = (prestamosMesData || []).map(item => ({
                mes: item.mes,
                prestamos: item.prestamos || 0,
                devoluciones: item.devoluciones || 0
            }));

            const categoriasFormateadas = (librosCatData || []).map((item, index) => ({
                name: item.categoria || 'Sin categoría',
                value: item.cantidad || 0,
                color: ['#8DA9C4', '#134074', '#c9a368', '#4a5568', '#e8e8e8', '#2a4365'][index % 6]
            }));

            const sociosActivosFormateados = (sociosMesData || []).map(item => ({
                mes: item.mes,
                activos: item.totalAcumulado || 0
            }));

            // Calculate proximos a vencer
            const hoy = new Date();
            const en3Dias = new Date();
            en3Dias.setDate(hoy.getDate() + 3);

            const proximosAVencer = (prestamosData || []).filter(prestamo => {
                if (!prestamo.fechaDevolucion || prestamo.estado !== 'activo') return false;
                const fechaDevolucion = new Date(prestamo.fechaDevolucion);
                return fechaDevolucion >= hoy && fechaDevolucion <= en3Dias;
            }).length;

            setCharts({
                prestamosPorMes: prestamosFormateados,
                librosPorCategoria: categoriasFormateadas,
                sociosActivos: sociosActivosFormateados,
                prestamosProximosAVencer: proximosAVencer
            });

        } catch (error) {
            console.error("Error refreshing global data:", error);
        }
    };

    // Granular refresh functions
    const refreshLibros = async () => {
        if (!library?.id || !window.electronAPI) return;
        const data = await window.electronAPI.getLibros(library.id, {});
        setLibros(data || []);
        // Implicitly refresh categories/stats as well? For now simplest is refresh all or just this.
        // Ideally we should refresh contextually related data, but refreshAll is safer for consistency.
        refreshAll();
    };

    const refreshSocios = async () => {
        if (!library?.id || !window.electronAPI) return;
        const data = await window.electronAPI.getSocios(library.id, {});
        setSocios(data || []);
        refreshAll();
    };

    const refreshPrestamos = async () => {
        if (!library?.id || !window.electronAPI) return;
        const data = await window.electronAPI.getPrestamos(library.id, {});
        setPrestamos(data || []);
        refreshAll();
    };

    const updateLibrary = (newLibrary) => {
        setLibrary(newLibrary);
        if (newLibrary) {
            localStorage.setItem('bibliotecaActiva', JSON.stringify(newLibrary));
            refreshAll();
        } else {
            localStorage.removeItem('bibliotecaActiva');
            setLibros([]);
            setSocios([]);
            setPrestamos([]);
            setStats({ totalLibros: 0, totalSocios: 0, prestamosActivos: 0, prestamosVencidos: 0, prestamosCompletados: 0 });
        }
    };

    return (
        <DataContext.Provider value={{
            library,
            updateLibrary,
            libros,
            socios,
            prestamos,
            stats,
            charts,
            loading,
            refreshAll,
            refreshLibros,
            refreshSocios,
            refreshPrestamos
        }}>
            {children}
        </DataContext.Provider>
    );
};
