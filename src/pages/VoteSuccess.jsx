export default function VoteSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-10">
        <div className="text-6xl mb-4">🗳️</div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Your vote has been recorded</h1>
        <p className="text-slate-500 text-sm">
          Thank you for participating in the SSC election. Your ballot was submitted anonymously and cannot be
          traced back to your account.
        </p>
      </div>
    </div>
  );
}
