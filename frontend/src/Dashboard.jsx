import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import {
  BookOpen, Users, CalendarDays, TrendingUp, Clock, AlertTriangle,
  CheckCircle, X, Activity, Library, BarChart3, PieChart as PieChartIcon, LogOut, Menu
} from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import './dashboard.css';
import { useData } from './context/DataContext.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    library: activeLibrary,
    stats,
    charts,
    updateLibrary
  } = useData();

  const {
    prestamosPorMes,
    librosPorCategoria,
    sociosActivos,
    prestamosProximosAVencer
  } = charts;

  const StatCard = ({ icon: Icon, title, value, color, change }) => (
    <div className="stat-card">
      <div className="stat-icon" style={{ color: color, borderColor: 'var(--border-color)' }}>
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div className="stat-content">
        <h3>{title}</h3>
        <p className="stat-value">{value.toLocaleString()}</p>
        {change && (
          <span className={`stat-change ${change > 0 ? 'positive' : 'negative'}`}>
            {change > 0 ? '+' : ''}{change}% vs mes anterior
          </span>
        )}
      </div>
    </div>
  );

  const handleLogout = async () => {
    try {
      // Usar el wrapper de diálogo nativo con reparación automática de foco
      const ok = await window.nativeDialog.confirm({
        type: 'info',
        title: 'biblios',
        message: '¿Seguro que querés cerrar sesión?',
        detail: 'Se cerrará tu sesión actual.',
        buttons: ['Cerrar sesión', 'Cancelar'],
        defaultId: 0,
        cancelId: 1,
        okIndex: 0,
        noLink: true
      });

      if (ok) {
        updateLibrary(null); // Clear context
        localStorage.removeItem('authData');
        navigate('/');

        // Opcional: Asegurar foco después del logout
        await window.nativeDialog.ensureFocus();
      }
    } catch (error) {
      console.error('Error en confirmación de logout:', error);
      // Fallback al confirm nativo si hay error
      if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        updateLibrary(null);
        localStorage.removeItem('authData');
        navigate('/');
      }
    }
  };

  // Mostrar loading si no hay biblioteca activa
  if (!activeLibrary) {
    return (
      <div className="dashboard-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <p style={{ color: 'white', fontSize: '1.2rem' }}>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        className="mobile-menu-toggle"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="dashboard-container">
        <section className="mt-8 mb-4">
          <div className="dashboard-header">
            <div className="header-content">
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                {activeLibrary ? activeLibrary.nombre : 'Biblioteca Demo'}
              </h1>
              <span className="header-separator">|</span>
              <p className="text-gray-400 text-lg max-w-2xl">
                Analizá y visualizá todas las estadísticas de tu biblioteca. Monitoreá préstamos, socios y actividad en tiempo real.
              </p>
            </div>
          </div>
        </section>

        {/* Tarjetas de estadísticas principales */}
        <section className="stats-grid">
          <StatCard
            icon={BookOpen}
            title="Total Libros"
            value={stats.totalLibros}
            color="#8DA9C4"
          />
          <StatCard
            icon={Users}
            title="Socios Registrados"
            value={stats.totalSocios}
            color="#134074"
          />
          <StatCard
            icon={CalendarDays}
            title="Préstamos Activos"
            value={stats.prestamosActivos}
            color="#c9a368"
          />
          <StatCard
            icon={AlertTriangle}
            title="Préstamos Vencidos"
            value={stats.prestamosVencidos}
            color="#ef4444"
          />
        </section>

        {/* Gráficos principales */}
        <section className="charts-grid">
          {/* Gráfico de préstamos por mes */}
          <div className="chart-card">
            <div className="chart-header">
              <BarChart3 size={18} strokeWidth={1.5} color="var(--accent-primary)" />
              <h3>Préstamos y Devoluciones por Mes</h3>
            </div>
            {prestamosPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={prestamosPorMes} barGap={8}>
                  <defs>
                    <linearGradient id="barGradientPrestamos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8DA9C4" />
                      <stop offset="100%" stopColor="#6a8caf" />
                    </linearGradient>
                    <linearGradient id="barGradientDevoluciones" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#134074" />
                      <stop offset="100%" stopColor="#0B2545" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    stroke="var(--text-muted)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    animationDuration={200}
                    animationEasing="ease-out"
                    contentStyle={{
                      backgroundColor: '#0d0d0d',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)'
                    }}
                    labelStyle={{ color: '#e8e8e8', fontWeight: '600', marginBottom: '4px', fontSize: '0.9rem' }}
                    itemStyle={{ color: '#8DA9C4', fontSize: '0.85rem', padding: '2px 0' }}
                    formatter={(value, name) => [
                      <span style={{ color: '#e8e8e8', fontWeight: 'bold' }}>{value}</span>,
                      name
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px', color: '#e8e8e8' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="prestamos"
                    name="Préstamos"
                    fill="url(#barGradientPrestamos)"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                  <Bar
                    dataKey="devoluciones"
                    name="Devoluciones"
                    fill="url(#barGradientDevoluciones)"
                    radius={[4, 4, 0, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#9ca3af' }}>
                <p>No hay datos de préstamos para mostrar</p>
              </div>
            )}
          </div>

          {/* Gráfico de libros por categoría */}
          <div className="chart-card">
            <div className="chart-header">
              <PieChartIcon size={18} strokeWidth={1.5} color="var(--accent-primary)" />
              <h3>Distribución de Libros por Categoría</h3>
            </div>
            {librosPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={librosPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {librosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    animationDuration={200}
                    animationEasing="ease-out"
                    contentStyle={{
                      backgroundColor: '#0d0d0d',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      color: '#e8e8e8',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                      padding: '12px'
                    }}
                    itemStyle={{ color: '#e8e8e8' }}
                    formatter={(value, name) => [`${value} libros`, name]}
                  />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.85rem', color: '#e8e8e8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#9ca3af' }}>
                <p>No hay libros registrados</p>
              </div>
            )}
          </div>

          {/* Gráfico de socios activos */}
          <div className="chart-card">
            <div className="chart-header">
              <TrendingUp size={18} strokeWidth={1.5} color="var(--accent-primary)" />
              <h3>Evolución de Socios Activos</h3>
            </div>
            {sociosActivos.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={sociosActivos}>
                  <defs>
                    <linearGradient id="colorSocios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c9a368" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#c9a368" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="mes" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    animationDuration={200}
                    animationEasing="ease-out"
                    contentStyle={{
                      backgroundColor: '#0d0d0d',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      color: '#e8e8e8'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activos"
                    stroke="#c9a368"
                    fillOpacity={1}
                    fill="url(#colorSocios)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#9ca3af' }}>
                <p>No hay datos de socios para mostrar</p>
              </div>
            )}
          </div>

          {/* Gráfico de tendencia de préstamos */}
          <div className="chart-card">
            <div className="chart-header">
              <Activity size={18} strokeWidth={1.5} color="var(--accent-primary)" />
              <h3>Tendencia de Préstamos</h3>
            </div>
            {prestamosPorMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={prestamosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="mes" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <Tooltip
                    animationDuration={200}
                    animationEasing="ease-out"
                    contentStyle={{
                      backgroundColor: '#0d0d0d',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      color: '#e8e8e8'
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#e8e8e8' }} />
                  <Line
                    type="monotone"
                    dataKey="prestamos"
                    stroke="#8DA9C4"
                    strokeWidth={3}
                    dot={{ fill: '#8DA9C4', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#8DA9C4', strokeWidth: 2, fill: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#9ca3af' }}>
                <p>No hay datos de préstamos para mostrar</p>
              </div>
            )}
          </div>
        </section>

        {/* Sección de alertas y notificaciones */}
        <section className="alerts-section">
          <h3>Alertas y Notificaciones</h3>
          <div className="alerts-grid">
            <div className="alert-card warning">
              <AlertTriangle size={18} strokeWidth={1.5} />
              <div>
                <h4>Préstamos Vencidos</h4>
                <p>{stats.prestamosVencidos} préstamos requieren atención inmediata</p>
              </div>
            </div>
            <div className="alert-card info">
              <Clock size={18} strokeWidth={1.5} />
              <div>
                <h4>Próximos a Vencer</h4>
                <p>{prestamosProximosAVencer} préstamos vencen en los próximos 3 días</p>
              </div>
            </div>
            <div className="alert-card success">
              <CheckCircle size={18} strokeWidth={1.5} />
              <div>
                <h4>Devoluciones Exitosas</h4>
                <p>{stats.prestamosCompletados} préstamos completados este mes</p>
              </div>
            </div>
          </div>
        </section>
      </div>

    </>
  );
} 