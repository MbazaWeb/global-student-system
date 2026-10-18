export default function RoleLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-xl font-bold">Permissions unavailable</h1>
      <p className="mt-2 text-slate-600">We couldn't load your permissions. Check your connection and try again.</p>
      <button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">
        Try again
      </button>
    </main>
  );
}
