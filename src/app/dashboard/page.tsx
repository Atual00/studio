
'use client'; // Need client-side hooks

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CalendarDays, DollarSign, FileWarning, Target, Loader2, Briefcase, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { fetchLicitacoes } from '@/services/licitacaoService';
import { fetchDebitos } from '@/services/licitacaoService'; // Assuming fetchDebitos is here
import { fetchDocumentos, Documento } from '@/services/documentoService';
import { differenceInDays, isBefore, startOfDay, parseISO, isValid } from 'date-fns';

// Helper to check if document is expiring soon
const isDocumentExpiringSoon = (doc: Documento, daysThreshold: number = 30): boolean => {
  if (!doc.dataVencimento) return false;
  try {
    const vencDate = doc.dataVencimento instanceof Date ? doc.dataVencimento : parseISO(doc.dataVencimento);
    if (!isValid(vencDate)) return false; // Skip invalid dates

    const today = startOfDay(new Date());
    const expirationDay = startOfDay(vencDate);
    const daysDiff = differenceInDays(expirationDay, today);
    return daysDiff >= 0 && daysDiff <= daysThreshold; // Expiring within threshold or today
  } catch {
    return false; // Handle potential parsing errors
  }
};

// Helper to check if licitacao deadline (meta or inicio) is near
const isLicitacaoDeadlineNear = (lic: { dataInicio: Date | string, dataMetaAnalise: Date | string }, daysThreshold: number = 7): boolean => {
    const today = startOfDay(new Date());
    try {
        const inicioDate = lic.dataInicio instanceof Date ? lic.dataInicio : parseISO(lic.dataInicio);
        const metaDate = lic.dataMetaAnalise instanceof Date ? lic.dataMetaAnalise : parseISO(lic.dataMetaAnalise);

        if (isValid(inicioDate)) {
            const daysDiffInicio = differenceInDays(startOfDay(inicioDate), today);
            if (daysDiffInicio >= 0 && daysDiffInicio <= daysThreshold) return true;
        }
        if (isValid(metaDate)) {
            const daysDiffMeta = differenceInDays(startOfDay(metaDate), today);
            if (daysDiffMeta >= 0 && daysDiffMeta <= daysThreshold) return true;
        }
    } catch {
        // Ignore parsing errors
    }
    return false;
};


export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    upcomingDeadlines: 0,
    pendingPayments: 0,
    expiringDocuments: 0,
    activeBids: 0,
    homologatedBids: 0,
    analysisBids: 0,
  });
  const [recentActivity, setRecentActivity] = useState<string[]>([]); // Placeholder for activity

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [licitacoes, debitos, documentos] = await Promise.all([
          fetchLicitacoes(),
          fetchDebitos(),
          fetchDocumentos(),
        ]);

        const today = startOfDay(new Date());

        // Calculate Stats
        const upcomingDeadlinesCount = licitacoes.filter(lic => isLicitacaoDeadlineNear(lic)).length;
        const pendingPaymentsCount = debitos.filter(d => d.status === 'PENDENTE').length;
        const expiringDocumentsCount = documentos.filter(doc => isDocumentExpiringSoon(doc)).length; // Check within 30 days
        const activeBidsCount = licitacoes.filter(lic =>
            lic.status !== 'PROCESSO_HOMOLOGADO' && lic.status !== 'PROCESSO_ENCERRADO'
        ).length;
        const homologatedBidsCount = licitacoes.filter(lic => lic.status === 'PROCESSO_HOMOLOGADO').length;
        const analysisBidsCount = licitacoes.filter(lic => lic.status === 'AGUARDANDO_ANALISE' || lic.status === 'EM_ANALISE').length;


        setStats({
          upcomingDeadlines: upcomingDeadlinesCount,
          pendingPayments: pendingPaymentsCount,
          expiringDocuments: expiringDocumentsCount,
          activeBids: activeBidsCount,
          homologatedBids: homologatedBidsCount,
          analysisBids: analysisBidsCount,
        });

        // Placeholder for recent activity logic
        const recent = licitacoes
           .sort((a, b) => {
               // Sort by start date descending (newest first)
               try {
                    const dateA = a.dataInicio instanceof Date ? a.dataInicio : parseISO(a.dataInicio);
                    const dateB = b.dataInicio instanceof Date ? b.dataInicio : parseISO(b.dataInicio);
                    if (!isValid(dateA)) return 1;
                    if (!isValid(dateB)) return -1;
                    return dateB.getTime() - dateA.getTime();
               } catch { return 0;}
            })
           .slice(0, 5) // Get latest 5
           .map(l => `Licitação ${l.numeroLicitacao} (${l.clienteNome}) iniciada em ${l.dataInicio instanceof Date ? l.dataInicio.toLocaleDateString('pt-BR') : 'Data Inválida'}`);
        setRecentActivity(recent);


      } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);
        // Handle error state if needed
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {loading ? (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                     <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Carregando...</CardTitle>
                            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                        </CardHeader>
                        <CardContent>
                             <div className="h-8 w-1/2 bg-muted rounded animate-pulse mb-1"></div>
                             <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3"> {/* Adjusted grid for 3 main cards */}
                <Link href="/calendario/metas" className="block hover:shadow-lg transition-shadow rounded-lg">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Prazos Próximos (7d)</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.upcomingDeadlines}</div>
                        <p className="text-xs text-muted-foreground">Metas de análise ou início de disputa.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/financeiro?tab=pendentes" className="block hover:shadow-lg transition-shadow rounded-lg">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingPayments}</div>
                        <p className="text-xs text-muted-foreground">Faturas aguardando ação financeira.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/documentos?status=vence_30d" className="block hover:shadow-lg transition-shadow rounded-lg">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Documentos Vencendo (30d)</CardTitle>
                        <FileWarning className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.expiringDocuments}</div>
                        <p className="text-xs text-muted-foreground">Certidões e documentos próximos do vencimento.</p>
                        </CardContent>
                    </Card>
                 </Link>
            </div>
        )}

       {/* Second row for other stats */}
        {!loading && (
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <Link href="/licitacoes?status=AGUARDANDO_ANALISE,EM_ANALISE" className="block hover:shadow-lg transition-shadow rounded-lg">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.analysisBids}</div>
                        <p className="text-xs text-muted-foreground">Licitações aguardando ou em análise.</p>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/licitacoes" className="block hover:shadow-lg transition-shadow rounded-lg">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Licitações Ativas</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.activeBids}</div>
                        <p className="text-xs text-muted-foreground">Processos em andamento (não encerrados).</p>
                        </CardContent>
                    </Card>
                </Link>
                 <Link href="/licitacoes?status=PROCESSO_HOMOLOGADO" className="block hover:shadow-lg transition-shadow rounded-lg">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Homologadas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className="text-2xl font-bold">{stats.homologatedBids}</div>
                        <p className="text-xs text-muted-foreground">Licitações com resultado homologado.</p>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        )}


      {/* Add more dashboard components here, like charts or recent activity */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-3"> {/* Adjust span to fit layout */}
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Últimas licitações adicionadas.</CardDescription>
        </CardHeader>
        <CardContent>
           {loading ? (
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-muted rounded animate-pulse"></div>)}
                </div>
            ) : recentActivity.length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {recentActivity.map((activity, index) => (
                        <li key={index}>{activity}</li>
                    ))}
                </ul>
             ) : (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente registrada.</p>
             )}
        </CardContent>
      </Card>
    </div>
  );
}
