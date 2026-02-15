export default function VoterHelpPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ayuda</h2>
        <p className="text-muted-foreground">Resuelve dudas sobre cómo votar.</p>
      </div>
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground space-y-2">
        <p>1. Verifica que estés asignado a un punto de votación.</p>
        <p>2. Si no puedes votar, revisa el estado de la elección o contacta al administrador.</p>
        <p>3. El voto es anónimo; solo puedes votar una vez por elección.</p>
      </div>
    </div>
  );
}
