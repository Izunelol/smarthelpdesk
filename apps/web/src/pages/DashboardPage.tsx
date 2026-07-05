import { useEffect, useState } from 'react';
import {
  fetchBottlenecks,
  fetchDashboard,
  fetchForecast,
  type BottlenecksData,
  type DashboardData,
  type ForecastData,
} from '../services/reports';

export function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottlenecksData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchForecast(), fetchBottlenecks()])
      .then(([d, f, b]) => {
        setDashboard(d);
        setForecast(f);
        setBottlenecks(b);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="page-loading">Carregando indicadores...</p>;
  }

  return (
    <div className="page dashboard">
      <h1>Dashboard gerencial</h1>

      {dashboard && (
        <section>
          <h2>Indicadores</h2>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-value">{dashboard.totalTickets}</span>
              <span className="stat-label">Chamados totais</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {dashboard.averageResolutionHours?.toFixed(1) ?? '-'}
              </span>
              <span className="stat-label">Horas médias de resolução</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {dashboard.averageSatisfaction?.toFixed(1) ?? '-'}
              </span>
              <span className="stat-label">Satisfação média</span>
            </div>
          </div>

          <div className="breakdown-grid">
            <div>
              <h3>Por status</h3>
              <ul>
                {dashboard.byStatus.map((item) => (
                  <li key={item.status}>
                    {item.status}: {item.count}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Por nível</h3>
              <ul>
                {dashboard.byLevel.map((item) => (
                  <li key={item.level}>
                    Nível {item.level}: {item.count}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Por prioridade</h3>
              <ul>
                {dashboard.byPriority.map((item) => (
                  <li key={item.priority}>
                    {item.priority}: {item.count}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {forecast && (
        <section>
          <h2>Previsão de demanda</h2>
          {forecast.summary && <p className="ai-summary">{forecast.summary}</p>}
          <ul>
            {forecast.projection.map((item) => (
              <li key={item.category}>
                {item.category}: projeção próxima semana ≈ {item.nextWeekProjection} chamados
              </li>
            ))}
          </ul>
        </section>
      )}

      {bottlenecks && (
        <section>
          <h2>Gargalos por nível</h2>
          {bottlenecks.summary && <p className="ai-summary">{bottlenecks.summary}</p>}
          <ul>
            {bottlenecks.perLevel.map((item) => (
              <li key={item.level}>
                Nível {item.level}: {item.averageHours?.toFixed(1) ?? '-'}h em média,{' '}
                {item.ticketsWaiting} chamados aguardando
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
