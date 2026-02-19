'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VotingPointFormDialog } from '@/components/admin/voting-point-form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Upload,
  X,
  FileText,
  Copy,
  Info,
} from 'lucide-react';

interface VoterBulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  votingPointId?: string;
}

interface Election {
  id: string;
  title: string;
  is_active: boolean;
}

interface VotingPoint {
  id: string;
  name: string;
  location: string | null;
  delegate_id: string | null;
}

interface ParsedVoter {
  full_name: string;
  document: string;
  email: string;
}

interface BulkResultError {
  row: number;
  document: string;
  full_name: string;
  error: string;
}

interface BulkResult {
  created: number;
  skipped: number;
  errors: BulkResultError[];
  createdVoters: Array<{
    full_name: string;
    document: string;
    email: string;
    password: string;
  }>;
}

type Step = 'config' | 'preview' | 'uploading' | 'results';

export function VoterBulkUploadDialog({
  open,
  onOpenChange,
  onSuccess,
  votingPointId: fixedVotingPointId,
}: VoterBulkUploadDialogProps) {
  const [step, setStep] = useState<Step>('config');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Config
  const [elections, setElections] = useState<Election[]>([]);
  const [votingPoints, setVotingPoints] = useState<VotingPoint[]>([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [selectedVotingPoint, setSelectedVotingPoint] = useState('');
  const [loadingElections, setLoadingElections] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [vpFormOpen, setVpFormOpen] = useState(false);

  // CSV
  const [parsedVoters, setParsedVoters] = useState<ParsedVoter[]>([]);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Results
  const [result, setResult] = useState<BulkResult | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (open) {
      if (fixedVotingPointId) {
        // When votingPointId is provided, skip election/point selection
        setSelectedVotingPoint(fixedVotingPointId);
      } else {
        loadElections();
      }
    }
  }, [open, fixedVotingPointId]);

  useEffect(() => {
    if (selectedElection) {
      setSelectedVotingPoint('');
      setVotingPoints([]);
      loadVotingPoints(selectedElection);
    }
  }, [selectedElection]);

  const loadElections = async () => {
    setLoadingElections(true);
    try {
      const res = await fetch('/api/elections');
      const data = await res.json();
      if (data.success) {
        setElections(data.data || []);
      }
    } catch {
      setError('Error al cargar elecciones');
    } finally {
      setLoadingElections(false);
    }
  };

  const loadVotingPoints = async (electionId: string) => {
    setLoadingPoints(true);
    try {
      console.log('[BulkUpload] Loading voting points for election:', electionId);
      const res = await fetch(`/api/elections/${electionId}/voting-points`);
      const data = await res.json();
      console.log('[BulkUpload] Voting points response:', data);
      if (data.success) {
        const points = data.data || [];
        console.log('[BulkUpload] Setting voting points:', points.length, points);
        setVotingPoints(points);
      }
    } catch (err) {
      console.error('[BulkUpload] Error loading voting points:', err);
      setError('Error al cargar puntos de votación');
    } finally {
      setLoadingPoints(false);
    }
  };

  const handleVpCreated = () => {
    setVpFormOpen(false);
    if (selectedElection) loadVotingPoints(selectedElection);
  };

  const parseCSV = useCallback((text: string): ParsedVoter[] => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    // Detect separator
    const header = lines[0];
    const separator = header.includes(';') ? ';' : ',';

    const headers = header.split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ''));

    // Find column indices (flexible matching)
    const nameIdx = headers.findIndex((h) =>
      ['nombre', 'full_name', 'nombre_completo', 'name', 'nombre completo'].includes(h)
    );
    const docIdx = headers.findIndex((h) =>
      ['documento', 'document', 'cedula', 'cédula', 'dni', 'ci', 'doc', 'numero_documento'].includes(h)
    );
    const emailIdx = headers.findIndex((h) =>
      ['email', 'correo', 'correo_electronico', 'mail', 'e-mail', 'correo electronico'].includes(h)
    );

    if (nameIdx === -1 || docIdx === -1 || emailIdx === -1) {
      throw new Error(
        `Columnas no encontradas. Se requieren: nombre/full_name, documento/cedula, email/correo. Encontradas: ${headers.join(', ')}`
      );
    }

    const voters: ParsedVoter[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map((c) => c.trim().replace(/^"|"$/g, ''));

      if (cols.length < Math.max(nameIdx, docIdx, emailIdx) + 1) continue;

      const name = cols[nameIdx];
      const doc = cols[docIdx];
      const email = cols[emailIdx];

      if (!name && !doc && !email) continue; // skip empty rows

      voters.push({
        full_name: name,
        document: doc,
        email: email,
      });
    }

    return voters;
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const voters = parseCSV(text);

        if (voters.length === 0) {
          setError('No se encontraron votantes en el archivo. Verifique el formato.');
          return;
        }

        setParsedVoters(voters);
        setStep('preview');
      } catch (err: any) {
        setError(err.message || 'Error al procesar el archivo CSV');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleUpload = async () => {
    if (!selectedVotingPoint || parsedVoters.length === 0) return;

    setStep('uploading');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/voters/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voters: parsedVoters,
          votingPointId: selectedVotingPoint,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setStep('results');
      } else {
        setError(data.error || 'Error al cargar votantes');
        setStep('preview');
      }
    } catch {
      setError('Error al cargar votantes');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'nombre,documento,email\nJuan Pérez,12345678,juan.perez@ejemplo.com\nMaría López,87654321,maria.lopez@ejemplo.com';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_votantes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCredentials = () => {
    if (!result?.createdVoters.length) return;

    const header = 'nombre,documento,email,contraseña';
    const rows = result.createdVoters.map(
      (v) => `"${v.full_name}","${v.document}","${v.email}","${v.password}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credenciales_votantes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAllCredentials = async () => {
    if (!result?.createdVoters.length) return;

    const text = result.createdVoters
      .map((v) => `${v.full_name} | ${v.email} | ${v.password}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleClose = () => {
    if (step === 'results' && result && result.created > 0) {
      onSuccess();
    }
    // Reset
    setStep('config');
    setError('');
    if (!fixedVotingPointId) {
      setSelectedElection('');
      setSelectedVotingPoint('');
    }
    setParsedVoters([]);
    setFileName('');
    setResult(null);
    setCopiedAll(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onOpenChange(false);
  };

  const selectedElectionTitle = elections.find((e) => e.id === selectedElection)?.title;
  const selectedPointName = votingPoints.find((p) => p.id === selectedVotingPoint)?.name;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'config' && 'Carga Masiva de Votantes'}
            {step === 'preview' && 'Vista Previa de Datos'}
            {step === 'uploading' && 'Procesando Carga...'}
            {step === 'results' && 'Resultado de la Carga'}
          </DialogTitle>
          <DialogDescription>
            {step === 'config' &&
              'Suba un archivo CSV con los datos de los votantes. Se generará un PIN numérico aleatorio de 6 dígitos para cada votante.'}
            {step === 'preview' &&
              `${parsedVoters.length} votantes encontrados en el archivo`}
            {step === 'uploading' && 'Espere mientras se procesan los votantes...'}
            {step === 'results' && result && (
              <span>
                {result.created} creados, {result.skipped} ya existentes
                {result.errors.length > 0 && `, ${result.errors.length} errores`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Config */}
        {step === 'config' && (
          <div className="space-y-4 py-2">
            {/* Election/Point selection - only when no fixedVotingPointId */}
            {!fixedVotingPointId && (
              <>
                {/* Seleccionar elección */}
                <div className="space-y-2">
                  <Label htmlFor="bulk-election">Elección</Label>
                  <Select
                    value={selectedElection}
                    onValueChange={setSelectedElection}
                    disabled={loadingElections}
                  >
                    <SelectTrigger id="bulk-election">
                      <SelectValue
                        placeholder={loadingElections ? 'Cargando...' : 'Seleccionar elección'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {elections.map((election) => (
                        <SelectItem key={election.id} value={election.id}>
                          {election.title}
                          {election.is_active ? ' (Activa)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seleccionar punto de votación */}
                {selectedElection && (
                  <div className="space-y-2">
                    <Label htmlFor="bulk-vp">Punto de Votación</Label>
                    <Select
                      value={selectedVotingPoint}
                      onValueChange={setSelectedVotingPoint}
                      disabled={loadingPoints}
                    >
                      <SelectTrigger id="bulk-vp">
                        <SelectValue
                          placeholder={
                            loadingPoints
                              ? 'Cargando...'
                              : votingPoints.length === 0
                              ? 'No hay puntos creados'
                              : 'Seleccionar punto de votación'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {votingPoints.map((point) => (
                          <SelectItem key={point.id} value={point.id}>
                            {point.name}
                            {point.location ? ` — ${point.location}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {votingPoints.length === 0 && (
                      <div className="pt-2">
                        <Button size="sm" onClick={() => setVpFormOpen(true)}>
                          <FileUp className="mr-2 h-4 w-4" />
                          Crear punto de votación
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Subir CSV */}
            {(selectedVotingPoint || fixedVotingPointId) && (
              <div className="space-y-3">
                <Label>Archivo CSV</Label>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <p className="mb-1">
                      El CSV debe tener columnas: <strong>nombre</strong>,{' '}
                      <strong>documento</strong>, <strong>email</strong>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Separadores aceptados: coma (,) o punto y coma (;). La
                      contraseña se genera automáticamente con los últimos 4
                      dígitos del documento (repetidos).
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTemplate}
                    className="flex-shrink-0"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Plantilla
                  </Button>
                </div>

                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {fileName ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          Click para cambiar archivo
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Click para seleccionar archivo CSV
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos: .csv, .txt
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {!fixedVotingPointId && (
                <>
                  <Badge variant="outline">{selectedElectionTitle}</Badge>
                  <span>→</span>
                </>
              )}
              <Badge variant="outline">{fixedVotingPointId ? 'Punto de votación actual' : selectedPointName}</Badge>
            </div>

            <ScrollArea className="h-[350px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Contraseña</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedVoters.map((voter, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">
                          {voter.full_name || (
                            <span className="text-destructive">Vacío</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {voter.document || (
                            <span className="text-destructive">Vacío</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{voter.email || (
                          <span className="text-destructive">Vacío</span>
                        )}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground italic">
                            PIN aleatorio
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('config');
                  setParsedVoters([]);
                  setFileName('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Volver
              </Button>
              <Button onClick={handleUpload}>
                <FileUp className="h-4 w-4 mr-2" />
                Cargar {parsedVoters.length} votante{parsedVoters.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 3: Uploading */}
        {step === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Procesando {parsedVoters.length} votantes...
            </p>
            <p className="text-xs text-muted-foreground">
              Esto puede tomar unos segundos
            </p>
          </div>
        )}

        {/* STEP 4: Results */}
        {step === 'results' && result && (
          <div className="space-y-4 py-2">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.created}</p>
                <p className="text-xs text-muted-foreground">Creados</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Ya existentes</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
                <p className="text-xs text-muted-foreground">Errores</p>
              </div>
            </div>

            {/* Credentials download */}
            {result.createdVoters.length > 0 && (
              <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-2">
                    <strong>{result.createdVoters.length}</strong> votantes creados
                    exitosamente. Descargue las credenciales antes de cerrar.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-100"
                      onClick={downloadCredentials}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Credenciales CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-700 hover:bg-green-100"
                      onClick={copyAllCredentials}
                    >
                      {copiedAll ? (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copiedAll ? 'Copiado!' : 'Copiar Todo'}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors table */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-destructive">Errores encontrados:</Label>
                <ScrollArea className="h-[150px] border border-destructive/30 rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Fila</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell className="text-xs">{err.full_name}</TableCell>
                          <TableCell className="text-xs">{err.document}</TableCell>
                          <TableCell className="text-xs text-destructive">
                            {err.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
      </Dialog>

      {selectedElection && (
        <VotingPointFormDialog
          open={vpFormOpen}
          onOpenChange={setVpFormOpen}
          electionId={selectedElection}
          assignedDelegateIds={votingPoints.map(p => p.delegate_id).filter(Boolean) as string[]}
          onSuccess={handleVpCreated}
        />
      )}
    </>
  );
}
