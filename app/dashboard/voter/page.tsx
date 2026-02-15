export default function VoterPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Voter Dashboard</h2>
      <p className="text-sm text-muted-foreground">Welcome — cast your vote and view active elections.</p>

      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 border rounded-lg bg-card">Placeholder: Active Elections</div>
      </div>
    </div>
  );
}
