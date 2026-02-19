import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="rounded-xl border bg-card p-6">
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">📣</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold">VoxPopuly</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Haz que tu voz cuente — sistema de votación electrónica.</p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
