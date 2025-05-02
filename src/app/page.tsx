import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {CalendarDays, DollarSign, FileWarning, Target} from 'lucide-react';

export default function DashboardPage() {
  // In a real app, these would come from data fetching
  const upcomingDeadlines = 5;
  const pendingPayments = 3;
  const expiringDocuments = 2;
  const activeBids = 12;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prazos Próximos</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{upcomingDeadlines}</div>
          <p className="text-xs text-muted-foreground">Licitações com prazo de análise ou disputa em breve.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingPayments}</div>
          <p className="text-xs text-muted-foreground">Faturas aguardando pagamento ou envio.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documentos Vencendo</CardTitle>
          <FileWarning className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{expiringDocuments}</div>
          <p className="text-xs text-muted-foreground">Certidões e documentos próximos do vencimento.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Licitações Ativas</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeBids}</div>
          <p className="text-xs text-muted-foreground">Processos em andamento.</p>
        </CardContent>
      </Card>

      {/* Add more dashboard components here, like charts or recent activity */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Últimas atualizações nas licitações.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for recent activity feed */}
          <p className="text-sm text-muted-foreground">Nenhuma atividade recente registrada.</p>
        </CardContent>
      </Card>
    </div>
  );
}
