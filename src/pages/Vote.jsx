import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentApi } from '../lib/api';
import VotingBallot from '../components/VotingBallot';

export default function Vote() {
  const navigate = useNavigate();
  const [electionId, setElectionId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const data = await studentApi.activeElection(controller.signal);
        if (!data.election) {
          setError('There is no active election at this time. Please check back later.');
        } else {
          setElectionId(data.election.id);
        }
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
  }, [navigate]);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-slate-500">Checking for active elections…</div>;
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center bg-white border border-slate-200 rounded-2xl p-8">
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <VotingBallot electionId={electionId} />
    </div>
  );
}
