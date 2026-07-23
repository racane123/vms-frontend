import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi } from '../lib/api';

export default function VotingBallot({ electionId }) {
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!electionId) return;
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await studentApi.ballot(electionId, controller.signal);
        if (data.alreadyVoted) {
          setAlreadyVoted(true);
          setElection(data.election);
          return;
        }
        setElection(data.election);
        setPositions(data.positions);
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (err.status === 401) {
          navigate('/login');
          return;
        }
        // If student hasn't changed their default password, redirect them
        if (err.status === 403 && err.message && err.message.toLowerCase().includes('password')) {
          navigate('/change-password');
          return;
        }
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [electionId, navigate]);


  const selectCandidate = useCallback((positionId, candidateId) => {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  }, []);


  const { unfilledCount, allFilled, completedCount } = useMemo(() => {
    const unfilled = positions.filter((p) => selections[p.positionId] === undefined);
    return {
      unfilledCount: unfilled.length,
      allFilled: unfilled.length === 0,
      completedCount: Object.keys(selections).length,
    };
  }, [positions, selections]);

  const submitVote = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = positions.map((p) => ({
        positionId: p.positionId,
        candidateId: selections[p.positionId] || null,
      }));
      await studentApi.submitVote(electionId, payload);
      navigate('/vote-success');
    } catch (err) {
      setError(err.message);
      setShowConfirm(false);
      if (err.status === 409) setAlreadyVoted(true);
    } finally {
      setSubmitting(false);
    }
  }, [positions, selections, electionId, navigate]);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-slate-500">Loading ballot…</div>;
  }

  if (alreadyVoted) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-xl font-semibold text-slate-800">You've already voted</h2>
        <p className="text-slate-500 mt-2">
          Your ballot for <span className="font-medium">{election?.title}</span> has been recorded. Thank you for
          participating.
        </p>
      </div>
    );
  }

  if (error && positions.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center bg-red-50 border border-red-200 rounded-2xl p-8">
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-32 px-4">
      <header className="mb-8 sticky top-0 bg-slate-50/95 backdrop-blur pt-6 pb-4 z-10">
        <h1 className="text-2xl font-bold text-slate-900">{election?.title}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Select one candidate per position. Your vote is anonymous and cannot be changed once submitted.
        </p>
        <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${positions.length ? (completedCount / positions.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {completedCount} of {positions.length} positions completed
        </p>
      </header>

      {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <div className="space-y-6">
        {positions.map((position) => (
          <PositionCard
            key={position.positionId}
            position={position}
            selected={selections[position.positionId]}
            onSelect={selectCandidate}
          />
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {allFilled ? 'Ready to submit' : `${unfilledCount} position(s) left blank (counted as abstain)`}
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition"
          >
            Review & Submit
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          positions={positions}
          selections={selections}
          onCancel={() => setShowConfirm(false)}
          onConfirm={submitVote}
          submitting={submitting}
        />
      )}
    </div>
  );
}


const PositionCard = memo(function PositionCard({ position, selected, onSelect }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold text-slate-800 mb-3">{position.title}</h3>
      <div className="space-y-2">
        {position.candidates.map((candidate) => {
          const isSelected = selected === candidate.id;
          return (
            <button
              key={candidate.id}
              onClick={() => onSelect(position.positionId, candidate.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition flex items-center gap-3 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                  isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                }`}
              />
              <div>
                <div className="font-medium text-slate-800">{candidate.display_name}</div>
                {candidate.partylist && <div className="text-xs text-slate-500">{candidate.partylist}</div>}
              </div>
            </button>
          );
        })}
        <button
          onClick={() => onSelect(position.positionId, null)}
          className={`w-full text-left px-4 py-2 rounded-lg text-sm transition ${
            selected === null ? 'text-slate-700 bg-slate-100 font-medium' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Abstain for this position
        </button>
      </div>
    </div>
  );
});

function ConfirmModal({ positions, selections, onCancel, onConfirm, submitting }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Confirm your ballot</h3>
        <p className="text-sm text-slate-500 mb-4">This cannot be undone. Please review carefully.</p>
        <div className="space-y-3 mb-6">
          {positions.map((p) => {
            const cand = p.candidates.find((c) => c.id === selections[p.positionId]);
            return (
              <div key={p.positionId} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-500">{p.title}</span>
                <span className="font-medium text-slate-800">{cand ? cand.display_name : 'Abstain'}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Confirm Vote'}
          </button>
        </div>
      </div>
    </div>
  );
}
