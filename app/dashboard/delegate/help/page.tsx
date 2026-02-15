export default function DelegateHelpPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Ayuda</h2>
      <p className="text-muted-foreground">Guía rápida para delegados.</p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
        <li>Solo puedes ver datos de tu punto asignado.</li>
        <li>Las estadísticas se actualizan en tiempo real.</li>
        <li>Si no ves resultados, confirma que la elección está activa.</li>
      </ul>
    </div>
  );
}
