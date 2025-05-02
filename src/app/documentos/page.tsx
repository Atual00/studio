'use client'; // For state and effects

import {useState, useEffect} from 'react';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell} from '@/components/ui/table';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {AlertCircle, CalendarClock, CheckCircle, Filter, Loader2} from 'lucide-react';
import {format, differenceInDays, isBefore, addDays} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Button} from '@/components/ui/button'; // Added for potential actions
import Link from 'next/link'; // For linking to client

// --- Mock Data and Types ---
interface Documento {
  id: string; // Unique ID for the document instance
  clienteId: string;
  clienteNome: string;
  tipoDocumento: string; // e.g., CND Federal, Contrato Social
  dataVencimento: Date | null; // Null if not applicable or not set
  // Could add file link/reference here later
}

// Mock fetch function (replace with actual API call)
const fetchDocumentos = async (): Promise<Documento[]> => {
  console.log('Fetching documentos...');
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay
  const today = new Date();
  return [
    {
      id: 'doc-001',
      clienteId: '1',
      clienteNome: 'Empresa Exemplo Ltda',
      tipoDocumento: 'CND Federal',
      dataVencimento: addDays(today, 5), // Expires in 5 days
    },
     {
      id: 'doc-002',
      clienteId: '1',
      clienteNome: 'Empresa Exemplo Ltda',
      tipoDocumento: 'CND FGTS',
      dataVencimento: addDays(today, 25), // Expires in 25 days
    },
     {
      id: 'doc-003',
      clienteId: '2',
      clienteNome: 'Soluções Inovadoras S.A.',
      tipoDocumento: 'Certidão Falência',
      dataVencimento: addDays(today, 80), // Expires in 80 days
    },
     {
      id: 'doc-004',
      clienteId: '3',
      clienteNome: 'Comércio Varejista XYZ EIRELI',
      tipoDocumento: 'CND Municipal',
      dataVencimento: addDays(today, -10), // Expired 10 days ago
    },
      {
      id: 'doc-005',
      clienteId: '2',
      clienteNome: 'Soluções Inovadoras S.A.',
      tipoDocumento: 'CND Estadual',
      dataVencimento: addDays(today, 15), // Expires in 15 days
    },
    {
      id: 'doc-006',
      clienteId: '1',
      clienteNome: 'Empresa Exemplo Ltda',
      tipoDocumento: 'Contrato Social', // No expiration
      dataVencimento: null,
    },
  ];
};


// --- Helper Function for Status ---
const getDocumentStatus = (vencimento: Date | null): { label: string; color: 'destructive' | 'warning' | 'success' | 'default'; icon: React.ElementType } => {
  if (!vencimento) {
    return { label: 'Não Aplicável', color: 'default', icon: CheckCircle }; // Or maybe a different icon/label
  }
  const today = new Date();
  const daysDiff = differenceInDays(vencimento, today);

  if (isBefore(vencimento, today)) {
    return { label: `Vencido (${Math.abs(daysDiff)}d atrás)`, color: 'destructive', icon: AlertCircle };
  } else if (daysDiff <= 15) {
    return { label: `Vence em ${daysDiff}d`, color: 'destructive', icon: AlertCircle }; // Urgent
  } else if (daysDiff <= 30) {
     return { label: `Vence em ${daysDiff}d`, color: 'warning', icon: CalendarClock }; // Warning
  } else {
    return { label: 'Válido', color: 'success', icon: CheckCircle };
  }
};

const getBadgeVariantDoc = (color: 'destructive' | 'warning' | 'success' | 'default'): 'destructive' | 'default' | 'outline' | 'secondary' => {
   switch (color) {
       case 'destructive': return 'destructive';
       case 'warning': return 'default'; // Using primary/default for warning state for visibility
       case 'success': return 'secondary'; // Using secondary for valid/ok state
       case 'default': return 'outline'; // Using outline for N/A
   }
}


// --- Component ---
export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [filteredDocumentos, setFilteredDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCliente, setFilterCliente] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'vencido' | 'vence_15d' | 'vence_30d' | 'valido'>('todos');

   // Fetch data on mount
  useEffect(() => {
    const loadDocumentos = async () => {
      setLoading(true);
      try {
        const data = await fetchDocumentos();
        setDocumentos(data);
      } catch (err) {
        console.error('Erro ao buscar documentos:', err);
        // Add toast notification for error
      } finally {
        setLoading(false);
      }
    };
    loadDocumentos();
  }, []);


   // Filter logic
  useEffect(() => {
    let result = documentos;

    if (filterCliente) {
       result = result.filter(d =>
        d.clienteNome.toLowerCase().includes(filterCliente.toLowerCase())
      );
    }
    if (filterTipo) {
       result = result.filter(d =>
        d.tipoDocumento.toLowerCase().includes(filterTipo.toLowerCase())
      );
    }

     if (filterStatus !== 'todos') {
        result = result.filter(d => {
            const statusInfo = getDocumentStatus(d.dataVencimento);
            const today = new Date();
            const venc = d.dataVencimento;

            switch (filterStatus) {
                case 'vencido':
                    return venc ? isBefore(venc, today) : false;
                case 'vence_15d':
                     return venc ? !isBefore(venc, today) && differenceInDays(venc, today) <= 15 : false;
                case 'vence_30d':
                     return venc ? !isBefore(venc, today) && differenceInDays(venc, today) > 15 && differenceInDays(venc, today) <= 30 : false;
                 case 'valido':
                     return venc ? !isBefore(venc, today) && differenceInDays(venc, today) > 30 : (statusInfo.label === 'Não Aplicável');
                default:
                    return true;
            }
        });
    }


    // Sort by expiration date (soonest first, then N/A, then already expired)
    result.sort((a, b) => {
        const statusA = getDocumentStatus(a.dataVencimento);
        const statusB = getDocumentStatus(b.dataVencimento);
        const dateA = a.dataVencimento;
        const dateB = b.dataVencimento;

        if (!dateA && !dateB) return 0; // Both N/A
        if (!dateA) return 1; // N/A comes after dates
        if (!dateB) return -1; // N/A comes after dates

        const today = new Date();
        const isAExpired = isBefore(dateA, today);
        const isBExpired = isBefore(dateB, today);

        if (isAExpired && isBExpired) return dateA.getTime() - dateB.getTime(); // Sort expired by date
        if (isAExpired) return 1; // Expired come last
        if (isBExpired) return -1; // Expired come last

        // Both are valid, sort by closest expiration
        return dateA.getTime() - dateB.getTime();
    });


    setFilteredDocumentos(result);
  }, [documentos, filterCliente, filterTipo, filterStatus]);


   // Get unique document types for filtering
   const uniqueTipos = Array.from(new Set(documentos.map(d => d.tipoDocumento)));


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Controle de Vencimento de Documentos</h2>

        {/* Filter Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
             <Filter className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
                placeholder="Filtrar por Cliente..."
                value={filterCliente}
                onChange={(e) => setFilterCliente(e.target.value)}
            />
             <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Tipo..." />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="">Todos os Tipos</SelectItem>
                 {uniqueTipos.sort().map(tipo => (
                   <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                 ))}
              </SelectContent>
            </Select>
             <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por Status..." />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="todos">Todos Status</SelectItem>
                 <SelectItem value="vencido">Vencido</SelectItem>
                 <SelectItem value="vence_15d">Vence em até 15 dias</SelectItem>
                  <SelectItem value="vence_30d">Vence em até 30 dias</SelectItem>
                 <SelectItem value="valido">Válido (&gt;30d ou N/A)</SelectItem>
              </SelectContent>
            </Select>
             {/* <Button variant="outline" >Aplicar Filtros</Button> // Filtering is real-time */}
          </div>
        </CardContent>
      </Card>


      <Card>
         <CardHeader>
            <CardTitle>Documentos Monitorados</CardTitle>
             <CardDescription>Acompanhe a validade dos documentos dos seus clientes.</CardDescription>
         </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo de Documento</TableHead>
                    <TableHead>Data de Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                            </TableCell>
                        </TableRow>
                    ) : filteredDocumentos.length > 0 ? (
                       filteredDocumentos.map(doc => {
                            const statusInfo = getDocumentStatus(doc.dataVencimento);
                            return (
                                <TableRow key={doc.id}>
                                    <TableCell className="font-medium">
                                       <Link href={`/clientes/${doc.clienteId}`} className="hover:underline text-primary">
                                          {doc.clienteNome}
                                       </Link>
                                    </TableCell>
                                    <TableCell>{doc.tipoDocumento}</TableCell>
                                    <TableCell>
                                       {doc.dataVencimento ? format(doc.dataVencimento, "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getBadgeVariantDoc(statusInfo.color)} className="flex items-center gap-1 w-fit">
                                            <statusInfo.icon className="h-3 w-3" />
                                            {statusInfo.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                       {/* Add buttons for actions like: Upload New, View File, Request Update */}
                                       {/* Example: */}
                                        {/* <Button variant="outline" size="sm" title="Upload Novo Documento">
                                           <Upload className="h-4 w-4" />
                                        </Button> */}
                                        {/* <Button variant="ghost" size="sm" title="Ver Arquivo">
                                           <FileText className="h-4 w-4" />
                                        </Button> */}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                Nenhum documento encontrado com os filtros aplicados.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
             </Table>
              {/* Add Pagination */}
          </CardContent>
      </Card>

    </div>
  );
}
