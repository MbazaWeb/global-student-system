import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { fetchDirectory, type DirectoryRow } from "../services/admissionService";

const csvQuote = (v: string) => {
  const safe = /^[ \t]*[=+@-]/.test(v) ? "'" + v : v;
  return '"' + safe.replaceAll('"', '""') + '"';
};

export default function StudentExport() {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchDirectory());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function download() {
    const cols = ["Student name", "Global Student ID", "Admission number", "Verification status", "Submitted at"];
    const lines = [
      cols.map(csvQuote).join(","),
      ...rows.map((r) =>
        [r.student_name, r.global_student_id ?? "", r.admission_number, r.verification_status, new Date(r.submitted_at).toISOString()]
          .map((v) => csvQuote(String(v))).join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `institution-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><FileSpreadsheet size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Export students</h1>
          <p className="mt-1 text-sm text-slate-500">Download your institution's student directory as a CSV.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">Up to 500 most recent enrollment records will be exported.</p>
            <p className="mt-2 text-2xl font-bold">{rows.length} records ready</p>
          </section>

          <button
            type="button"
            onClick={download}
            disabled={rows.length === 0}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-40"
          >
            <Download size={18} aria-hidden="true" /> Download CSV
          </button>

          <p className="text-xs text-slate-500">
            CSV includes student names, Global Student IDs and admission numbers. Share it only with trusted recipients.
            Cells that could be interpreted as formulas are prefixed with a single quote to prevent injection.
          </p>
        </>
      )}
    </main>
  );
}
