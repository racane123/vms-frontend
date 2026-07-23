import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { studentApi, saveToken } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        const data = await studentApi.login(studentNumber.trim(), password);
        saveToken('student', data.token);
        navigate(data.mustChangePassword ? '/change-password' : '/vote');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [studentNumber, password, navigate]
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-1">SSC Elections</h1>
        <p className="text-sm text-slate-500 mb-6">Sign in with your student number to vote.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Student Number</label>
            <input
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="2024-00123"
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <p className="text-xs text-slate-400 mt-1">
              First time logging in? Your default password is on the credentials sheet from the election committee.
            </p>
          </div>

          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <Link to="/admin/login" className="block text-center text-xs text-slate-400 mt-6 hover:text-slate-600">
          Election committee login →
        </Link>
      </div>
    </div>
  );
}
