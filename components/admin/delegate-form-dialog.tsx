'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

interface DelegateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DelegateCredentials {
  email: string;
  password: string;
  full_name: string;
}

export function DelegateFormDialog({ open, onOpenChange, onSuccess }: DelegateFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<DelegateCredentials | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    document: '',
    email: '',
    password: '',
  });

  const generatePassword = () => {
    // Generar contraseña segura de 12 caracteres
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/delegates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setCredentials({
          email: result.data.credentials.email,
          password: result.data.credentials.password,
          full_name: result.data.full_name,
        });
      } else {
        setError(result.error || 'Error al crear delegado');
      }
    } catch (err) {
      console.error('Error creating delegate:', err);
      setError('Error al crear delegado');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const handleClose = () => {
    if (credentials) {
      onSuccess();
    }
    setFormData({
      full_name: '',
      document: '',
      email: '',
      password: '',
    });
    setCredentials(null);
    setError('');
    setShowPassword(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {credentials ? 'Delegado Creado Exitosamente' : 'Registrar Nuevo Delegado'}
          </DialogTitle>
          <DialogDescription>
            {credentials
              ? 'Guarde estas credenciales de acceso. No se mostrarán nuevamente.'
              : 'Complete los datos del delegado y se generarán sus credenciales de acceso.'}
          </DialogDescription>
        </DialogHeader>

        {!credentials ? (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Ej: Juan Pérez García"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="document">Número de Documento *</Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) => setFormData(prev => ({ ...prev, document: e.target.value }))}
                  placeholder="Ej: 12345678"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Ej: delegado@ejemplo.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña Temporal *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      required
                      disabled={loading}
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                    disabled={loading}
                  >
                    Generar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta contraseña se compartirá con el delegado para su primer acceso
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Delegado'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                El delegado <strong>{credentials.full_name}</strong> ha sido creado exitosamente.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Email de acceso</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border">
                      {credentials.email}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(credentials.email, 'email')}
                    >
                      {copiedField === 'email' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Contraseña temporal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border">
                      {showPassword ? credentials.password : '••••••••••••'}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy(credentials.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Comparta estas credenciales de forma segura con el delegado.
                  Se recomienda que cambie la contraseña en su primer acceso.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
