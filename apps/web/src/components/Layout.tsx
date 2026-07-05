import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Layout() {
  const { user, logout } = useAuth();
  const isFrontlineStaff = user && ['TECHNICIAN', 'SPECIALIST'].includes(user.role);
  const isManagement = user && ['MANAGER', 'ADMIN'].includes(user.role);
  const isStaff = isFrontlineStaff || isManagement;

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-brand">SmartHelpDesk</span>
        <nav className="app-nav">
          {!isFrontlineStaff && <NavLink to="/tickets/new">Abrir chamado</NavLink>}
          {!isFrontlineStaff && <NavLink to="/tickets">Meus chamados</NavLink>}
          {isStaff && <NavLink to="/queue">Fila de atendimento</NavLink>}
          {isManagement && <NavLink to="/knowledge">Base de conhecimento</NavLink>}
          {isManagement && <NavLink to="/dashboard">Dashboard</NavLink>}
        </nav>
        <div className="app-user">
          <span>{user?.name}</span>
          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
