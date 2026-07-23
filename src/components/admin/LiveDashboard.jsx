import { useState, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { adminApi } from '../../lib/api';
import { usePolling } from '../../hooks/usePolling';

const POLL_INTERVAL_MS = 8000;

export default function LiveDashboard({ electionId }) {
  const [turnout, setTurnout] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!electionId) return;
    try {
      const [turnoutData, resultsData] = await Promise.all([
        adminApi.turnout(electionId),
        adminApi.results(electionId),
      ]);
      setTurnout(turnoutData);
      setResults(resultsData);


      setSelectedPosition((prev) => {
        if (prev && resultsData.positions.some((p) => Number(p.positionId) === Number(prev))) {
          return prev;
        }
        return resultsData.positions[0]?.positionId ?? null;
      });

      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [electionId]);


  usePolling(fetchData, POLL_INTERVAL_MS, [fetchData]);

  const activePosition = useMemo(
    () => results?.positions.find((p) => Number(p.positionId) === Number(selectedPosition)) || null,
    [results, selectedPosition]
  );

  if (!electionId) {
    return (
      <div className="text-slate-500 bg-white rounded-xl border border-slate-200 p-6">
        Select an election to view its dashboard.
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 text-sm rounded-lg p-4">{error}</div>;
  }

  if (!turnout || !results) {
    return <div className="text-slate-500 p-6">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Registered Voters" value={turnout.totalRegistered} />
        <MetricCard label="Votes Cast" value={turnout.totalVoted} />
        <MetricCard label="Turnout" value={`${turnout.turnoutPercent}%`} highlight />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-slate-800">Overall Turnout</h3>
          <span className="text-xs text-slate-400">Auto-refreshes every {POLL_INTERVAL_MS / 1000}s while this tab is active</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${turnout.turnoutPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Turnout by Course/Year</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={turnout.breakdown}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="course_year" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="voted_count" fill="#10b981" name="Voted" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="total_students" fill="#e2e8f0" name="Total" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Live Results</h3>
          {results.positions.length > 0 && (
            <select
              value={selectedPosition || ''}
              onChange={(e) => setSelectedPosition(Number(e.target.value))}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
            >
              {results.positions.map((p) => (
                <option key={p.positionId} value={p.positionId}>
                  {p.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {activePosition ? (
          <ResponsiveContainer width="100%" height={Math.max(200, activePosition.candidates.length * 60)}>
            <BarChart data={activePosition.candidates} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="votes" fill="#0f172a" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-400">No positions configured yet.</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, highlight }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200'}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className={`text-sm mt-1 ${highlight ? 'text-slate-300' : 'text-slate-500'}`}>{label}</div>
    </div>
  );
}
