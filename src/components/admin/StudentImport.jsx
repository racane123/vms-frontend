import { useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';

function StudentImport() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await adminApi.bulkImport(formData);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [file]);

  const downloadCredentialsCSV = useCallback(() => {
    if (!result?.credentialsReport?.length) return;
    const header = 'Student ID,Name,Course/Year,Username,Default Password\n';
    const rows = result.credentialsReport
      .map((r) => `${r.studentId},"${r.name}",${r.courseYear},${r.username},${r.defaultPassword}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credentials-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="font-semibold text-slate-800 mb-1">Bulk Student Import</h2>
      <p className="text-sm text-slate-500 mb-4">
        Upload an Excel/CSV with columns: Student ID, First Name, Last Name, Course/Year, Email.
      </p>

      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center mb-4">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
        {file && <p className="text-xs text-slate-500 mt-2">{file.name}</p>}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-medium disabled:opacity-50"
      >
        {uploading ? 'Importing…' : 'Import Roster'}
      </button>

      {error && <div className="mt-4 bg-red-50 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      {result && (
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Created" value={result.summary.created} color="emerald" />
            <Stat label="Updated" value={result.summary.updated} color="blue" />
            <Stat label="Failed" value={result.summary.failed} color="red" />
          </div>

          {result.credentialsReport.length > 0 && (
            <button
              onClick={downloadCredentialsCSV}
              className="w-full py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Download Default Credentials ({result.credentialsReport.length})
            </button>
          )}

          {result.errors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-red-600 font-medium">
                {result.errors.length} row(s) failed — click to view
              </summary>
              <ul className="mt-2 space-y-1 text-slate-600 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`rounded-lg py-3 ${colors[color]}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

export default StudentImport;
