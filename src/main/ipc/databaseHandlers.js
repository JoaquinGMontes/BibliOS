const { ipcMain } = require('electron');
const DatabaseService = require('../database/database');

class DatabaseHandlers {
    constructor() {
        this.db = new DatabaseService();
        this.setupHandlers();
    }

    setupHandlers() {
        // ===== MANEJADORES DE BIBLIOTECAS =====

        ipcMain.handle('database:createBiblioteca', async (event, bibliotecaData) => {
            try {
                return await this.db.createBiblioteca(bibliotecaData);
            } catch (error) {
                console.error('Error en createBiblioteca:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getBibliotecas', async () => {
            try {
                return await this.db.getBibliotecas();
            } catch (error) {
                console.error('Error en getBibliotecas:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getBibliotecaById', async (event, id) => {
            try {
                return await this.db.getBibliotecaById(id);
            } catch (error) {
                console.error('Error en getBibliotecaById:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getBibliotecaActiva', async () => {
            try {
                return await this.db.getBibliotecaActiva();
            } catch (error) {
                console.error('Error en getBibliotecaActiva:', error);
                throw error;
            }
        });

        ipcMain.handle('database:updateBiblioteca', async (event, { id, updates }) => {
            try {
                return await this.db.updateBiblioteca(id, updates);
            } catch (error) {
                console.error('Error en updateBiblioteca:', error);
                throw error;
            }
        });

        ipcMain.handle('database:deleteBiblioteca', async (event, id) => {
            try {
                return await this.db.deleteBiblioteca(id);
            } catch (error) {
                console.error('Error en deleteBiblioteca:', error);
                throw error;
            }
        });

        ipcMain.handle('database:activateBiblioteca', async (event, id) => {
            try {
                return await this.db.activateBiblioteca(id);
            } catch (error) {
                console.error('Error en activateBiblioteca:', error);
                throw error;
            }
        });

        ipcMain.handle('database:loginBiblioteca', async (event, { nombre, password }) => {
            try {
                return await this.db.loginBiblioteca(nombre, password);
            } catch (error) {
                console.error('Error en loginBiblioteca:', error);
                throw error;
            }
        });

        ipcMain.handle('database:createUTNLibrary', async () => {
            try {
                return await this.db.createUTNLibrary();
            } catch (error) {
                console.error('Error en createUTNLibrary:', error);
                throw error;
            }
        });

        // ===== MANEJADORES DE LIBROS =====

        ipcMain.handle('database:createLibro', async (event, libroData) => {
            try {
                return await this.db.createLibro(libroData);
            } catch (error) {
                console.error('Error en createLibro:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getLibros', async (event, { bibliotecaId, filters = {} }) => {
            try {
                return await this.db.getLibros(bibliotecaId, filters);
            } catch (error) {
                console.error('Error en getLibros:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getLibroById', async (event, id) => {
            try {
                return await this.db.getLibroById(id);
            } catch (error) {
                console.error('Error en getLibroById:', error);
                throw error;
            }
        });

        ipcMain.handle('database:updateLibro', async (event, { id, updates }) => {
            try {
                return await this.db.updateLibro(id, updates);
            } catch (error) {
                console.error('Error en updateLibro:', error);
                throw error;
            }
        });

        ipcMain.handle('database:deleteLibro', async (event, id) => {
            try {
                return await this.db.deleteLibro(id);
            } catch (error) {
                console.error('Error en deleteLibro:', error);
                throw error;
            }
        });

        // ===== MANEJADORES DE SOCIOS =====

        ipcMain.handle('database:createSocio', async (event, socioData) => {
            try {
                return await this.db.createSocio(socioData);
            } catch (error) {
                console.error('Error en createSocio:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getSocios', async (event, { bibliotecaId, filters = {} }) => {
            try {
                return await this.db.getSocios(bibliotecaId, filters);
            } catch (error) {
                console.error('Error en getSocios:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getSocioById', async (event, id) => {
            try {
                return await this.db.getSocioById(id);
            } catch (error) {
                console.error('Error en getSocioById:', error);
                throw error;
            }
        });

        ipcMain.handle('database:updateSocio', async (event, { id, updates }) => {
            try {
                return await this.db.updateSocio(id, updates);
            } catch (error) {
                console.error('Error en updateSocio:', error);
                throw error;
            }
        });

        ipcMain.handle('database:deleteSocio', async (event, id) => {
            try {
                return await this.db.deleteSocio(id);
            } catch (error) {
                console.error('Error en deleteSocio:', error);
                throw error;
            }
        });

        // ===== MANEJADORES DE PRÉSTAMOS =====

        ipcMain.handle('database:createPrestamo', async (event, prestamoData) => {
            try {
                return await this.db.createPrestamo(prestamoData);
            } catch (error) {
                console.error('Error en createPrestamo:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getPrestamos', async (event, { bibliotecaId, filters = {} }) => {
            try {
                return await this.db.getPrestamos(bibliotecaId, filters);
            } catch (error) {
                console.error('Error en getPrestamos:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getPrestamoById', async (event, id) => {
            try {
                return await this.db.getPrestamoById(id);
            } catch (error) {
                console.error('Error en getPrestamoById:', error);
                throw error;
            }
        });

        ipcMain.handle('database:devolverLibro', async (event, prestamoId) => {
            try {
                return await this.db.devolverLibro(prestamoId);
            } catch (error) {
                console.error('Error en devolverLibro:', error);
                throw error;
            }
        });

        ipcMain.handle('database:updatePrestamo', async (event, { id, updates }) => {
            try {
                return await this.db.updatePrestamo(id, updates);
            } catch (error) {
                console.error('Error en updatePrestamo:', error);
                throw error;
            }
        });

        ipcMain.handle('database:deletePrestamo', async (event, id) => {
            try {
                return await this.db.deletePrestamo(id);
            } catch (error) {
                console.error('Error en deletePrestamo:', error);
                throw error;
            }
        });

        // ===== MANEJADORES DE ESTADÍSTICAS =====

        ipcMain.handle('database:getBibliotecaStats', async (event, bibliotecaId) => {
            try {
                return await this.db.getBibliotecaStats(bibliotecaId);
            } catch (error) {
                console.error('Error en getBibliotecaStats:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getPrestamosPorMes', async (event, { bibliotecaId, meses = 6 }) => {
            try {
                return await this.db.getPrestamosPorMes(bibliotecaId, meses);
            } catch (error) {
                console.error('Error en getPrestamosPorMes:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getLibrosPorCategoria', async (event, bibliotecaId) => {
            try {
                return await this.db.getLibrosPorCategoria(bibliotecaId);
            } catch (error) {
                console.error('Error en getLibrosPorCategoria:', error);
                throw error;
            }
        });

        ipcMain.handle('database:getSociosPorMes', async (event, { bibliotecaId, meses = 6 }) => {
            try {
                return await this.db.getSociosPorMes(bibliotecaId, meses);
            } catch (error) {
                console.error('Error en getSociosPorMes:', error);
                throw error;
            }
        });

        // ===== MANEJADORES DE UTILIDADES =====

        ipcMain.handle('database:backup', async (event, destinationPath) => {
            try {
                return await this.db.backup(destinationPath);
            } catch (error) {
                console.error('Error en backup:', error);
                throw error;
            }
        });

        ipcMain.handle('database:close', async () => {
            try {
                await this.db.close();
                return true;
            } catch (error) {
                console.error('Error en close:', error);
                throw error;
            }
        });

        // ===== MANEJADORES DE DATOS DE EJEMPLO =====

        ipcMain.handle('database:insertSampleData', async (event, bibliotecaId) => {
            try {
                return await this.db.insertSampleData(bibliotecaId);
            } catch (error) {
                console.error('Error en insertSampleData:', error);
                throw error;
            }
        });

        // ===== MANEJADORES DE VENTANA =====

        ipcMain.handle('window:focus', async () => {
            try {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getFocusedWindow();
                if (mainWindow) {
                    mainWindow.focus();
                    mainWindow.show();
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error en focusWindow:', error);
                throw error;
            }
        });
    }

    // Método para limpiar todos los manejadores
    cleanup() {
        // Remover todos los manejadores IPC
        ipcMain.removeHandler('database:createBiblioteca');
        ipcMain.removeHandler('database:getBibliotecas');
        ipcMain.removeHandler('database:getBibliotecaById');
        ipcMain.removeHandler('database:getBibliotecaActiva');
        ipcMain.removeHandler('database:updateBiblioteca');
        ipcMain.removeHandler('database:deleteBiblioteca');
        ipcMain.removeHandler('database:activateBiblioteca');
        ipcMain.removeHandler('database:loginBiblioteca');

        ipcMain.removeHandler('database:createLibro');
        ipcMain.removeHandler('database:getLibros');
        ipcMain.removeHandler('database:getLibroById');
        ipcMain.removeHandler('database:updateLibro');
        ipcMain.removeHandler('database:deleteLibro');

        ipcMain.removeHandler('database:createSocio');
        ipcMain.removeHandler('database:getSocios');
        ipcMain.removeHandler('database:getSocioById');
        ipcMain.removeHandler('database:updateSocio');
        ipcMain.removeHandler('database:deleteSocio');

        ipcMain.removeHandler('database:createPrestamo');
        ipcMain.removeHandler('database:getPrestamos');
        ipcMain.removeHandler('database:getPrestamoById');
        ipcMain.removeHandler('database:devolverLibro');
        ipcMain.removeHandler('database:updatePrestamo');
        ipcMain.removeHandler('database:deletePrestamo');

        ipcMain.removeHandler('database:getBibliotecaStats');
        ipcMain.removeHandler('database:getPrestamosPorMes');
        ipcMain.removeHandler('database:getLibrosPorCategoria');
        ipcMain.removeHandler('database:getSociosPorMes');

        ipcMain.removeHandler('database:backup');
        ipcMain.removeHandler('database:close');
        ipcMain.removeHandler('database:insertSampleData');

        ipcMain.removeHandler('window:focus');
    }
}

module.exports = DatabaseHandlers;
