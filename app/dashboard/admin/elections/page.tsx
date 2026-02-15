import { Suspense } from 'react';
import { ElectionsManager } from '@/components/admin/elections-manager';

export const dynamic = 'force-dynamic';

export default function ElectionsPage() {
  return (
    <div className="space-y-6">
      <ElectionsManager />
    </div>
  );
}
