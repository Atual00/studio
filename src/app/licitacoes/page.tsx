
'use client'; // Required for client-side hooks

import React, { useState, useEffect } from 'react'; // Import React
import {Button} from '@/components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell} from '@/components/ui/table';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'; // Import Popover
import {Calendar} from '@/components/ui/calendar'; // Import Calendar
import {PlusCircle, Edit, Eye, Filter, Loader2, AlertCircle, CalendarIcon, X } from 'lucide-react'; // Import icons
import Link from 'next/link';
import {Badge} from '@/components/ui/badge';
import {format, parseISO, startOfDay, endOfDay, isWithinInterval, isValid} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import { fetchLicitacoes, type LicitacaoListItem, statusMap } from '@/services/licitacaoService'; // Import service
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils'; // Import cn utility
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Import Tabs

// Helper to get badge variant based on custom color mapping from service
const getBadgeVariant = (color: string | undefined): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'accent' => {
  switch (color) {
    case 'secondary': return 'secondary';
    case 'destructive': return 'destructive';
    case 'warning': return 'warning';
    case 'success': return 'success';
    case 'info': return 'info';
    case 'accent': return 'accent';
    case 'default': return 'default';
    case 'outline':
    default:
      return 'outline';
  }
};

const finalizedStatuses = ['PROCESSO_HOMOLOGADO', 'PROCESSO_ENCERRADO'];


export default function LicitacoesPage() {
  const [licitacoes, setLicitacoes] = useState<LicitacaoListItem[]>([]);
  const [filteredLicitacoes, setFilteredLicitacoes] = useState<LicitacaoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ativas' | 'finalizadas'>('ativas');

  // Filtering state
  const [filterCliente, setFilterCliente] = useState('');
  const [filterProtocolo, setFilterProtocolo] = useState('');
  const [filterStatus, setFilterStatus] = useState('all_status');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);


  // Fetch data
  useEffect(() => {
    const loadLicitacoes = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLicitacoes();
        setLicitacoes(data);
        setFilteredLicitacoes(data); // Initialize filtered list
      } catch (err) {
        console.error('Erro ao buscar licitações:', err);
        setError(`Falha ao carregar a lista de licitações. ${err instanceof Error ? err.message : ''}`);
      } finally {
        setLoading(false);
      }
    };
    loadLicitacoes();
  }, []);


   // Apply filters whenever filter states or original data change
  useEffect(() => {
    let result = licitacoes;

     // 1. Filter by Tab (Active/Finalized)
     if (activeTab === 'ativas') {
        result = result.filter(lic => !finalizedStatuses.includes(lic.status));
     } else { // finalizadas
        result = result.filter(lic => finalizedStatuses.includes(lic.status));
     }


    // 2. Apply other filters
    if (filterCliente) {
       result = result.filter(lic =>
         lic.clienteNome.toLowerCase().includes(filterCliente.toLowerCase())
       );
    }

    if (filterProtocolo) {
       result = result.filter(lic =>
         lic.id.toLowerCase().includes(filterProtocolo.toLowerCase()) ||
         lic.numeroLicitacao.toLowerCase().includes(filterProtocolo.toLowerCase())
       );
    }

    if (filterStatus !== 'all_status') {
       result = result.filter(lic => lic.status === filterStatus);
    }

    if (filterDate) {
       const start = startOfDay(filterDate);
       const end = endOfDay(filterDate);
       result = result.filter(lic => {
           try {
               // Handle both Date objects and ISO strings
               const dataInicio = typeof lic.dataInicio === 'string' ? parseISO(lic.dataInicio) : lic.dataInicio;
               const dataMeta = typeof lic.dataMetaAnalise === 'string' ? parseISO(lic.dataMetaAnalise) : lic.dataMetaAnalise;
               // Check if dates are valid before comparison
                if (!(dataInicio instanceof Date) || !isValid(dataInicio)) return false;
                if (!(dataMeta instanceof Date) || !isValid(dataMeta)) return false; // Ensure meta date is also valid for check
               return isWithinInterval(dataInicio, { start, end }) || isWithinInterval(dataMeta, { start, end });
           } catch (e) {
               console.error("Error parsing date during filtering:", lic.id, e);
               return false; // Exclude if date parsing fails
           }
       });
    }

    // Sort by start date descending (newest first)
    result.sort((a, b) => {
        try {
             const dateA = a.dataInicio instanceof Date ? a.dataInicio : parseISO(a.dataInicio);
             const dateB = b.dataInicio instanceof Date ? b.dataInicio : parseISO(b.dataInicio);
             if (!(dateA instanceof Date) || !isValid(dateA)) return 1; // Invalid dates last
             if (!(dateB instanceof Date) || !isValid(dateB)) return -1;
             return dateB.getTime() - dateA.getTime();
        } catch { return 0;}
    });


    setFilteredLicitacoes(result);
  }, [licitacoes, filterCliente, filterProtocolo, filterStatus, filterDate, activeTab]); // Added activeTab dependency

    // Safely format dates
    const formatDate = (date: Date | string | undefined | null, time = false): string => {
        if (!date) return 'N/A';
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
             if (!(dateObj instanceof Date) || !isValid(dateObj)) return 'Inválida';
            const formatString = time ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy";
            return format(dateObj, formatString, { locale: ptBR });
        } catch (e) {
            console.error("Error formatting date:", date, e);
            return 'Inválida';
        }
    };

    const clearFilters = () => {
        setFilterCliente('');
        setFilterProtocolo('');
        setFilterStatus('all_status');
        setFilterDate(undefined);
    }


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

       {/* Error Display */}
       {error && (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Erro</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
           </Alert>
       )}

       {/* Filter Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
             <Filter className="h-5 w-5" /> Filtros ({activeTab === 'ativas' ? 'Ativas' : 'Finalizadas'})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <Input
              placeholder="Filtrar por Cliente..."
              value={filterCliente}
              onChange={(e) => setFilterCliente(e.target.value)}
            />
            <Input
              placeholder="Filtrar por Protocolo/Número..."
              value={filterProtocolo}
              onChange={(e) => setFilterProtocolo(e.target.value)}
            />
            <Select
              value={filterStatus}
              onValueChange={setFilterStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_status">Todos Status</SelectItem>
                 {/* Filter status options based on the current tab */}
                 {Object.entries(statusMap)
                    .filter(([key]) =>
                        activeTab === 'ativas'
                            ? !finalizedStatuses.includes(key)
                            : finalizedStatuses.includes(key)
                    )
                    .map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
             {/* Date Filter with Popover Calendar */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filterDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterDate ? format(filterDate, "dd/MM/yyyy") : <span>Filtrar por Data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={setFilterDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
             {/* Clear Filters Button */}
             <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground hover:text-primary">
                 <X className="mr-2 h-4 w-4"/> Limpar Filtros
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Active/Finalized */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ativas' | 'finalizadas')} className="w-full">
         <TabsList className="mb-4">
           <TabsTrigger value="ativas">Ativas</TabsTrigger>
           <TabsTrigger value="finalizadas">Finalizadas</TabsTrigger>
         </TabsList>

         {/* Content for both tabs uses the same table structure, filtered by useEffect */}
         <TabsContent value="ativas">
            <LicitacaoTable loading={loading} error={error} filteredLicitacoes={filteredLicitacoes} formatDate={formatDate}/>
         </TabsContent>
         <TabsContent value="finalizadas">
             <LicitacaoTable loading={loading} error={error} filteredLicitacoes={filteredLicitacoes} formatDate={formatDate}/>
         </TabsContent>
      </Tabs>

    </div>
  );
}


// --- Reusable Table Component ---
interface LicitacaoTableProps {
    loading: boolean;
    error: string | null;
    filteredLicitacoes: LicitacaoListItem[];
    formatDate: (date: Date | string | undefined | null, time?: boolean) => string;
}

function LicitacaoTable({ loading, error, filteredLicitacoes, formatDate }: LicitacaoTableProps) {
    return (
        <Card>
            {/* Removed CardHeader as title is implied by the Tab */}
            <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Protocolo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Plataforma</TableHead>
                        <TableHead>Data Início</TableHead>
                        <TableHead>Data Meta</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-[80px]">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {loading ? (
                        <TableRow>
                        <TableCell colSpan={9} className="text-center h-24">
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        </TableCell>
                        </TableRow>
                    ) : !error && filteredLicitacoes.length > 0 ? (
                        filteredLicitacoes.map(lic => {
                             const statusInfo = statusMap[lic.status];
                             const badgeVariant = statusInfo ? getBadgeVariant(statusInfo.color) : 'outline';
                            return (
                                <TableRow key={lic.id}>
                                <TableCell className="font-medium">{lic.id}</TableCell>
                                <TableCell>{lic.clienteNome}</TableCell>
                                <TableCell>{lic.modalidade}</TableCell>
                                <TableCell>{lic.numeroLicitacao}</TableCell>
                                <TableCell>{lic.plataforma}</TableCell>
                                <TableCell>
                                    {formatDate(lic.dataInicio, true)}
                                </TableCell>
                                <TableCell>
                                    {formatDate(lic.dataMetaAnalise)}
                                </TableCell>
                                <TableCell>
                                <Badge variant={badgeVariant} className="whitespace-nowrap">
                                    {statusInfo?.icon && React.createElement(statusInfo.icon, {className:"h-3 w-3 mr-1 inline"})}
                                    {statusInfo?.label || lic.status}
                                </Badge>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                <Link href={`/licitacoes/${lic.id}`} passHref>
                                    <Button variant="ghost" size="icon" title="Visualizar/Gerenciar">
                                    <Eye className="h-4 w-4" />
                                    </Button>
                                </Link>
                                </TableCell>
                            </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                            {error ? 'Não foi possível carregar as licitações.' : 'Nenhuma licitação encontrada com os filtros aplicados.'}
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                {/* Add Pagination component here later */}
            </CardContent>
        </Card>
    );
}
