import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OpenTicketPage } from './pages/OpenTicketPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { QueuePage } from './pages/QueuePage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { DashboardPage } from './pages/DashboardPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/tickets" replace />} />
            <Route path="/tickets/new" element={<OpenTicketPage />} />
            <Route path="/tickets" element={<MyTicketsPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/knowledge" element={<KnowledgeBasePage />} />

            <Route
              element={
                <ProtectedRoute roles={['TECHNICIAN', 'SPECIALIST', 'MANAGER', 'ADMIN']} />
              }
            >
              <Route path="/queue" element={<QueuePage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['MANAGER', 'ADMIN']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
