export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
      <p className="text-sm text-muted-foreground">Welcome, admin — manage elections and users here.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg bg-card">Placeholder: Manage Elections</div>
        <div className="p-4 border rounded-lg bg-card">Placeholder: Audit Logs</div>
        <div className="p-4 border rounded-lg bg-card">Placeholder: Reports</div>
      </div>
    </div>
  );
}
