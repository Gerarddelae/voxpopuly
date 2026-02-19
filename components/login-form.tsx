"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    try {
      // Resolver el identificador: si contiene '@' es email, si no es documento
      let email = identifier.trim();

      if (!email.includes("@")) {
        // Es un número de documento — resolver al email
        const resolveRes = await fetch("/api/auth/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: email }),
        });
        const resolveData = await resolveRes.json();

        if (!resolveData.success) {
          throw new Error(
            resolveData.error || "No se encontró un usuario con ese documento"
          );
        }
        email = resolveData.email;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        // Traducir errores comunes de Supabase
        if (error.message === "Invalid login credentials") {
          throw new Error("Credenciales inválidas. Verifique su correo/documento y contraseña.");
        }
        throw error;
      }

      // Wait a bit for session to be established
      await new Promise(resolve => setTimeout(resolve, 300));

      // Fetch role from server-side API
      const roleResponse = await fetch("/api/auth/role");
      const roleData = await roleResponse.json();
      const role = roleData.role || "voter";

      // Redirect based on role
      if (role === "admin") router.push("/dashboard/admin");
      else if (role === "delegate") router.push("/dashboard/delegate");
      else router.push("/dashboard/voter");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingrese su correo electrónico o número de documento para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="identifier">Correo o Documento</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="correo@ejemplo.com o 12345678"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                />
                <p className="text-xs text-muted-foreground">
                  Puede ingresar su correo electrónico o su número de documento (cédula)
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña / PIN</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingrese su PIN o contraseña"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
