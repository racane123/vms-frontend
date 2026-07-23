import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/api';

export default function ElectionSetup({ onElectionActivated }) {
  const [elections, setElections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [positions, setPositions] = useState([]);
  const [error, setError] = useState(null);

  const [newElection, setNewElection] = useState({ title: '', startAt: '', endAt: '' });
  const [newPosition, setNewPosition] = useState({ title: '', eligibleCourseYear: '' });
  const [newCandidate, setNewCandidate] = useState({});

  const refreshElections = useCallback(async () => {
    try {
      const data = await adminApi.listElections();
      setElections(data.elections);
      setSelectedId((prev) => prev ?? data.elections[0]?.id ?? null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const refreshPositions = useCallback(async (electionId) => {
    try {
      const data = await adminApi.listPositions(electionId);
      setPositions(data.positions);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refreshElections();
  }, [refreshElections]);

  useEffect(() => {
    if (selectedId) refreshPositions(selectedId);
  }, [selectedId, refreshPositions]);

  async function createElection(e) {
    e.preventDefault();
    setError(null);
    try {
      // Convert datetime-local values (which lack timezone info) to ISO strings
      // with local timezone offset so PostgreSQL TIMESTAMPTZ stores them correctly.
      const toISOWithTZ = (localDt) => {
        if (!localDt) return localDt;
        // Append local timezone offset to make it unambiguous
        const offset = -new Date().getTimezoneOffset();
        const sign = offset >= 0 ? '+' : '-';
        const pad = (n) => String(Math.abs(n)).padStart(2, '0');
        const hours = pad(Math.floor(Math.abs(offset) / 60));
        const minutes = pad(Math.abs(offset) % 60);
        return `${localDt}:00${sign}${hours}:${minutes}`;
      };

      await adminApi.createElection({
        title: newElection.title,
        startAt: toISOWithTZ(newElection.startAt),
        endAt: toISOWithTZ(newElection.endAt),
      });
      setNewElection({ title: '', startAt: '', endAt: '' });
      await refreshElections();
    } catch (err) {
      setError(err.message);
    }
  }

  async function setStatus(status) {
    setError(null);
    try {
      await adminApi.setElectionStatus(selectedId, status);
      await refreshElections();
      if (status === 'active' && onElectionActivated) onElectionActivated(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addPosition(e) {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.addPosition(selectedId, {
        title: newPosition.title.trim(),
        eligibleCourseYear: newPosition.eligibleCourseYear.trim() || null,
      });
      setNewPosition({ title: '', eligibleCourseYear: '' });
      await refreshPositions(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addCandidate(positionId, e) {
    e.preventDefault();
    setError(null);
    const displayName = newCandidate[positionId]?.displayName;
    const partylist = newCandidate[positionId]?.partylist;
    if (!displayName) return;
    try {
      await adminApi.addCandidate(positionId, { displayName, partylist });
      setNewCandidate((prev) => ({ ...prev, [positionId]: { displayName: '', partylist: '' } }));
      await refreshPositions(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCandidate(candidateId, candidateName) {
    if (!window.confirm(`Delete candidate "${candidateName}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await adminApi.deleteCandidate(candidateId);
      await refreshPositions(selectedId);
    } catch (err) {
      setError(err.message);
    }
  }

  const selectedElection = elections.find((e) => e.id === selectedId);

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Create Election</h2>
        <form onSubmit={createElection} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            placeholder="Election title"
            value={newElection.title}
            onChange={(e) => setNewElection({ ...newElection, title: e.target.value })}
            required
            className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="datetime-local"
            value={newElection.startAt}
            onChange={(e) => setNewElection({ ...newElection, startAt: e.target.value })}
            required
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            type="datetime-local"
            value={newElection.endAt}
            onChange={(e) => setNewElection({ ...newElection, endAt: e.target.value })}
            required
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button type="submit" className="md:col-span-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">
            Create Election
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Manage Election</h2>
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5"
          >
            {elections.map((el) => (
              <option key={el.id} value={el.id}>
                {el.title} ({el.status})
              </option>
            ))}
          </select>
        </div>

        {selectedElection && (
          <div className="flex items-center gap-2 mb-6 text-sm">
            <span className="text-slate-500">
              Status: <b className="text-slate-800">{selectedElection.status}</b>
            </span>
            <button onClick={() => setStatus('active')} className="ml-auto px-3 py-1.5 bg-emerald-600 text-white rounded-lg">
              Activate
            </button>
            <button onClick={() => setStatus('closed')} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg">
              Close
            </button>
          </div>
        )}

        <h3 className="text-sm font-semibold text-slate-700 mb-2">Add Position</h3>
        <form onSubmit={addPosition} className="flex gap-2 mb-6">
          <input
            placeholder="Position title (e.g. President)"
            value={newPosition.title}
            onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
            required
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <input
            placeholder="Eligible course/year (blank = all)"
            value={newPosition.eligibleCourseYear}
            onChange={(e) => setNewPosition({ ...newPosition, eligibleCourseYear: e.target.value })}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">
            Add
          </button>
        </form>

        <div className="space-y-4">
          {positions.map((position) => (
            <div key={position.id} className="border border-slate-200 rounded-lg p-4">
              <div className="font-medium text-slate-800 mb-2">
                {position.title}
                {position.eligible_course_year && (
                  <span className="ml-2 text-xs text-slate-400">({position.eligible_course_year} only)</span>
                )}
              </div>
              <ul className="text-sm text-slate-600 mb-3 space-y-1">
                {position.candidates.map((c) => (
                  <li key={c.id} className="flex items-center justify-between group">
                    <span>
                      • {c.display_name} {c.partylist && <span className="text-slate-400">({c.partylist})</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteCandidate(c.id, c.display_name)}
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5"
                    >
                      Delete
                    </button>
                  </li>
                ))}
                {position.candidates.length === 0 && <li className="text-slate-400">No candidates yet</li>}
              </ul>
              <form onSubmit={(e) => addCandidate(position.id, e)} className="flex gap-2">
                <input
                  placeholder="Candidate name"
                  value={newCandidate[position.id]?.displayName || ''}
                  onChange={(e) =>
                    setNewCandidate((prev) => ({
                      ...prev,
                      [position.id]: { ...prev[position.id], displayName: e.target.value },
                    }))
                  }
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                <input
                  placeholder="Partylist (optional)"
                  value={newCandidate[position.id]?.partylist || ''}
                  onChange={(e) =>
                    setNewCandidate((prev) => ({
                      ...prev,
                      [position.id]: { ...prev[position.id], partylist: e.target.value },
                    }))
                  }
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                />
                <button type="submit" className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                  Add Candidate
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
