import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import StudentImport from '../../components/admin/StudentImport';
import ElectionSetup from '../../components/admin/ElectionSetup';

// Split out separately: recharts is a sizeable dependency, and most admin
// visits are for setup/import, not the charts. This keeps the initial
// /admin chunk small and only fetches the "charts" chunk (see
// vite.config.js manualChunks) the moment the committee clicks this tab.
const LiveDashboard = lazy(() => import('../../components/admin/LiveDashboard'));

const TABS = ['Election Setup', 'Student Roster', 'Live Dashboard'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(TABS[0]);
  const [checked, setChecked] = useState(false);
  const [dashboardElectionId, setDashboardElectionId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    setChecked(true);

    adminApi
      .listElections()
      .then((data) => {
        const active = data.elections.find((e) => e.status === 'active');
        if (active) setDashboardElectionId(active.id);
        else if (data.elections.length > 0) setDashboardElectionId(data.elections[0].id);
      })
      .catch(() => {});
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  }, [navigate]);

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold text-slate-900">SSC Election Committee Dashboard</h1>
          <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-800">
            Log out
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-6 flex gap-6 -mb-px">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition ${
                tab === t ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {tab === 'Election Setup' && <ElectionSetup onElectionActivated={setDashboardElectionId} />}
        {tab === 'Student Roster' && <StudentImport />}
        {tab === 'Live Dashboard' && (
          <Suspense fallback={<div className="text-slate-400 text-sm p-6">Loading charts…</div>}>
            <LiveDashboard electionId={dashboardElectionId} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
