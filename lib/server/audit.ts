import type { NextRequest } from 'next/server';

type SupabaseClientAny = any;

function anonymizeIp(ip?: string | null): string | null {
  if (!ip) return null;
  // In case of multiple ips (X-Forwarded-For), take the first
  const raw = ip.split(',')[0].trim();

  // IPv6 -> keep first 4 hextets and append :: to indicate truncation
  if (raw.includes(':')) {
    const noZone = raw.split('%')[0];
    const parts = noZone.split(':').filter(Boolean);
    const first = parts.slice(0, 4);
    // pad if needed
    while (first.length < 4) first.push('0');
    return first.join(':') + '::';
  }

  // IPv4 -> mask last octet
  const octets = raw.split('.');
  if (octets.length === 4) {
    octets[3] = '0';
    return octets.join('.');
  }

  return null;
}

export async function recordAudit(
  client: SupabaseClientAny,
  opts: {
    request?: NextRequest;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: any;
  }
) {
  const { request, userId, action, entityType, entityId, metadata } = opts;

  let ip: string | null = null;
  try {
    if (request?.headers) {
      const xf = request.headers.get('x-forwarded-for');
      const xr = request.headers.get('x-real-ip');
      ip = (xf && xf.split(',')[0].trim()) || xr || null;
      
      // Fallback para desarrollo local
      if (!ip && process.env.NODE_ENV === 'development') {
        ip = '127.0.0.1';
      }
      
      console.log('[recordAudit] IP capturada:', ip, 'X-Forwarded-For:', xf, 'X-Real-IP:', xr);
    }
  } catch (e) {
    console.error('[recordAudit] Error capturando IP:', e);
    ip = null;
  }

  const anon = anonymizeIp(ip);
  console.log('[recordAudit] IP anonimizada:', anon);

  try {
    await client.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      ip_address: anon,
    });
    console.log('[recordAudit] Auditoría registrada exitosamente');
  } catch (e) {
    // Do not throw - auditing must not break main flow
    // Surface to server logs if available
    // eslint-disable-next-line no-console
    console.error('recordAudit error:', e);
  }
}
