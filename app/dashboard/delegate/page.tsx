export default function DelegatePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Delegate Dashboard</h2>
      <p className="text-sm text-muted-foreground">Welcome, delegate — view your voting point and voters.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-card">Placeholder: Voting Point</div>
        <div className="p-4 border rounded-lg bg-card">Placeholder: Voters List</div>
      </div>
    </div>
  );
}
