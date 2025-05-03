'use client'; // Required for client-side interactions

import { useState, useEffect } from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell} from '@/components/ui/table';
import {PlusCircle, Edit, Eye, Loader2, AlertCircle} from 'lucide-react';
import Link from 'next/link';
import { fetchClients, type ClientListItem } from '@/services/clientService'; // Import service
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


export default function ClientesPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClients = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchClients();
        setClients(data);
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        setError('Falha ao carregar a lista de clientes.');
        // Optionally add a toast notification here
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Cadastro de Clientes</h2>
        <Link href="/clientes/novo" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

       {error && (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Erro</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
           </Alert>
       )}

      <Card>
        <CardHeader>
          <CardTitle>Clientes Cadastrados</CardTitle>
          <CardDescription>Visualize e gerencie os clientes da sua assessoria.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade</TableHead>
                {/* <TableHead>Status</TableHead> */}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
               ) : !error && clients.length > 0 ? (
                clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.razaoSocial}</TableCell>
                    <TableCell>{client.nomeFantasia || '-'}</TableCell>
                    <TableCell>{client.cnpj}</TableCell>
                    <TableCell>{client.cidade}</TableCell>
                    {/* <TableCell>{client.status}</TableCell> */}
                    <TableCell className="text-right space-x-2">
                      <Link href={`/clientes/${client.id}`} passHref>
                        <Button variant="ghost" size="icon" title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/clientes/${client.id}/editar`} passHref>
                        <Button variant="ghost" size="icon" title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {error ? 'Não foi possível carregar os clientes.' : 'Nenhum cliente cadastrado ainda.'}
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
