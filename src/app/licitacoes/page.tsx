import {Button} from '@/components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell} from '@/components/ui/table';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {PlusCircle, Edit, Eye, Filter} from 'lucide-react';
import Link from 'next/link';
import {Badge} from '@/components/ui/badge';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';

// Mock data for demonstration
const mockLicitacoes = [
  {
    id: 'LIC-001',
    cliente: 'Empresa Exemplo Ltda',
    modalidade: 'Pregão Eletrônico',
    numero: 'PE 123/2024',
    plataforma: 'ComprasNet',
    dataInicio: new Date(2024, 6, 25, 9, 0), // Month is 0-indexed
    dataMetaAnalise: new Date(2024, 6, 20),
    valor: 500.0,
    status: 'AGUARDANDO_ANALISE',
  },
  {
    id: 'LIC-002',
    cliente: 'Soluções Inovadoras S.A.',
    modalidade: 'Tomada de Preços',
    numero: 'TP 005/2024',
    plataforma: 'Portal da Cidade',
    dataInicio: new Date(2024, 7, 1, 14, 30),
    dataMetaAnalise: new Date(2024, 6, 28),
    valor: 1200.5,
    status: 'EM_ANALISE',
  },
   {
    id: 'LIC-003',
    cliente: 'Comércio Varejista XYZ EIRELI',
    modalidade: 'Pregão Eletrônico',
    numero: 'PE 456/2024',
    plataforma: 'Licitações-e',
    dataInicio: new Date(2024, 7, 5, 10, 0),
    dataMetaAnalise: new Date(2024, 7, 1),
    valor: 850.00,
    status: 'DOCUMENTACAO_CONCLUIDA',
  },
];

// Status mapping for display and filtering
const statusMap: {[key: string]: {label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'info' | 'accent'}} = {
  AGUARDANDO_ANALISE: {label: 'Aguardando Análise', color: 'secondary'},
  EM_ANALISE: {label: 'Em Análise', color: 'info'},
  DOCUMENTACAO_CONCLUIDA: {label: 'Documentação Concluída', color: 'success'},
  FALTA_DOCUMENTACAO: {label: 'Falta Documentação', color: 'warning'},
  AGUARDANDO_DISPUTA: {label: 'Aguardando Disputa', color: 'accent'},
  EM_HOMOLOGACAO: {label: 'Em Homologação', color: 'default'}, // Using 'default' (primary) for this stage
  AGUARDANDO_RECURSO: {label: 'Aguardando Recurso', color: 'outline'},
  EM_PRAZO_CONTRARRAZAO: {label: 'Prazo Contrarrazão', color: 'outline'},
  PROCESSO_HOMOLOGADO: {label: 'Processo Homologado', color: 'success'},
};

// Helper to get badge variant based on custom color mapping
const getBadgeVariant = (color: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (color) {
    case 'secondary': return 'secondary';
    case 'destructive':
    case 'warning': // Map warning to destructive for visibility
      return 'destructive';
    case 'success': return 'default'; // Map success to default (primary)
    case 'info':
    case 'accent':
    case 'outline':
    default:
      return 'outline';
  }
};


export default function LicitacoesPage() {
  // In a real app, fetch licitacoes from your data source with filtering/pagination
  const licitacoes = mockLicitacoes;

  // TODO: Implement filtering state and logic

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-2xl font-semibold">Gerenciamento de Licitações</h2>
         <Link href="/licitacoes/nova" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Licitação
          </Button>
        </Link>
      </div>

       {/* Filter Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
             <Filter className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input placeholder="Filtrar por Cliente ou CNPJ..." />
            <Input placeholder="Filtrar por Protocolo..." />
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                {Object.entries(statusMap).map(([key, {label}]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" placeholder="Filtrar por Data..." />
            {/* Consider adding platform, modality filters */}
             <Button variant="outline" className="sm:col-span-2 lg:col-span-1">Aplicar Filtros</Button>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Licitações Registradas</CardTitle>
          <CardDescription>Acompanhe o status e detalhes das licitações.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Data Início</TableHead>
                 <TableHead>Data Meta Análise</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licitacoes.length > 0 ? (
                licitacoes.map(lic => (
                  <TableRow key={lic.id}>
                    <TableCell className="font-medium">{lic.id}</TableCell>
                    <TableCell>{lic.cliente}</TableCell>
                    <TableCell>{lic.modalidade}</TableCell>
                    <TableCell>{lic.numero}</TableCell>
                    <TableCell>{lic.plataforma}</TableCell>
                     <TableCell>
                        {format(lic.dataInicio, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                     </TableCell>
                     <TableCell>
                        {format(lic.dataMetaAnalise, "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                       <Badge variant={getBadgeVariant(statusMap[lic.status]?.color || 'outline')}>
                        {statusMap[lic.status]?.label || lic.status}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/licitacoes/${lic.id}`} passHref>
                        <Button variant="ghost" size="icon" title="Visualizar/Gerenciar">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {/* Keep Edit separate for main data, details page handles status/docs */}
                      {/* <Link href={`/licitacoes/${lic.id}/editar`} passHref>
                        <Button variant="ghost" size="icon" title="Editar Dados Principais">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link> */}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Nenhuma licitação encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {/* Add Pagination component here later */}
        </CardContent>
      </Card>
    </div>
  );
}


// Extend Badge variants type if using custom colors extensively (not needed for this mapping)
declare module "@/components/ui/badge" {
  interface BadgeProps {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' | 'info' | 'accent';
  }
}
