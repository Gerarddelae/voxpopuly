import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

type StatSlate = {
  id: string;
  name: string;
  description?: string | null;
  vote_count: number;
};

type StatVotingPoint = {
  id: string;
  name: string;
  location?: string | null;
  election: {
    id: string;
    title: string;
    is_active: boolean;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  delegate: {
    id: string;
    full_name: string;
    document: string;
  } | null;
  slates: StatSlate[];
  totalVoters: number;
  votedCount: number;
  totalVotes: number;
};

type StatsPayload = {
  totals: {
    elections: number;
    activeElections: number;
    votingPoints: number;
    voters: number;
    votes: number;
    participation: number;
  };
  votingPoints: StatVotingPoint[];
  generatedAt: string;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json<ApiResponse>({ success: false, error: 'Error de configuración del servidor' }, { status: 500 });
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: rows, error: vpError } = await service
      .from('voting_points')
      .select(`
        id,
        name,
        location,
        election:elections (id, title, is_active, start_date, end_date),
        delegate:profiles (id, full_name, document),
        slates:slates (id, name, description, vote_count),
        voters:voters (id, has_voted)
      `)
      .order('name');

    if (vpError) {
      console.error('Error fetching admin stats:', vpError);
      return NextResponse.json<ApiResponse>({ success: false, error: 'No se pudieron obtener las estadísticas' }, { status: 500 });
    }

    const votingPoints: StatVotingPoint[] = (rows || []).map((vp) => {
      const slates: StatSlate[] = (vp.slates || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        vote_count: s.vote_count ?? 0,
      }));

      const voters = vp.voters || [];
      const totalVoters = voters.length;
      const votedCount = voters.filter((v: any) => v.has_voted).length;
      const totalVotes = slates.reduce((acc, s) => acc + (s.vote_count || 0), 0);

      return {
        id: vp.id,
        name: vp.name,
        location: vp.location,
        election: Array.isArray(vp.election) ? vp.election[0] ?? null : vp.election || null,
        delegate: Array.isArray(vp.delegate) ? vp.delegate[0] ?? null : vp.delegate || null,
        slates,
        totalVoters,
        votedCount,
        totalVotes,
      };
    });

    const electionIds = new Set<string>();
    let totalVotes = 0;
    let totalVoters = 0;
    let totalVoted = 0;

    votingPoints.forEach((vp) => {
      if (vp.election?.id) electionIds.add(vp.election.id);
      totalVotes += vp.totalVotes;
      totalVoters += vp.totalVoters;
      totalVoted += vp.votedCount;
    });

    const payload: StatsPayload = {
      totals: {
        elections: electionIds.size,
        activeElections: 0,
        votingPoints: votingPoints.length,
        voters: totalVoters,
        votes: totalVotes,
        participation: totalVoters > 0 ? Number(((totalVoted / totalVoters) * 100).toFixed(2)) : 0,
      },
      votingPoints,
      generatedAt: new Date().toISOString(),
    };

      // Count active elections directly from the elections table
      const { data: allElections } = await service
        .from('elections')
        .select('id, is_active')
        .eq('is_active', true);

      const activeElectionsCount = allElections?.length ?? 0;

      // Also update total elections count from the elections table directly
      const { count: totalElectionsCount } = await service
        .from('elections')
        .select('id', { count: 'exact', head: true });

      payload.totals = {
        ...payload.totals,
        elections: totalElectionsCount ?? electionIds.size,
        activeElections: activeElectionsCount,
      };

    const format = request.nextUrl.searchParams.get('format');
    if (format === 'csv') {
      const lines: string[] = [];
      lines.push('election_title,voting_point,location,delegate,total_voters,voters_voted,participation_pct,slate,slate_votes');
      votingPoints.forEach((vp) => {
        const participation = vp.totalVoters > 0 ? ((vp.votedCount / vp.totalVoters) * 100).toFixed(2) : '0.00';
        if (vp.slates.length === 0) {
          lines.push([
            escapeCsv(vp.election?.title || 'Sin elección'),
            escapeCsv(vp.name),
            escapeCsv(vp.location || ''),
            escapeCsv(vp.delegate?.full_name || 'Sin delegado'),
            vp.totalVoters,
            vp.votedCount,
            participation,
            'Sin planchas',
            0,
          ].join(','));
          return;
        }
        vp.slates.forEach((slate) => {
          lines.push([
            escapeCsv(vp.election?.title || 'Sin elección'),
            escapeCsv(vp.name),
            escapeCsv(vp.location || ''),
            escapeCsv(vp.delegate?.full_name || 'Sin delegado'),
            vp.totalVoters,
            vp.votedCount,
            participation,
            escapeCsv(slate.name),
            slate.vote_count ?? 0,
          ].join(','));
        });
      });

      const csv = lines.join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="voxpopuly-stats.csv"',
        },
      });
    }

    return NextResponse.json<ApiResponse<StatsPayload>>({
      success: true,
      data: payload,
    });
  } catch (error) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

function escapeCsv(value: string) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}