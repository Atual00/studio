import {Button} from '@/components/ui/button';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Table, TableHeader, TableRow, TableHead, TableBody, TableCell} from '@/components/ui/table';
import {PlusCircle, Edit, Eye} from 'lucide-react';
import Link from 'next/link';

// Mock data for demonstration
const mockClients = [
  {
    id: '1',
    razaoSocial: 'Empresa Exemplo Ltda',
    nomeFantasia: 'Exemplo Corp',
    cnpj: '00.000.000/0001-00',
    cidade: 'São Paulo',
    status: 'Ativo', // Example status
  },
  {
    id: '2',
    razaoSocial: 'Soluções Inovadoras S.A.',
    nomeFantasia: 'Inova Soluções',
    cnpj: '11.111.111/0001-11',
    cidade: 'Rio de Janeiro',
    status: 'Ativo',
  },
  {
    id: '3',
    razaoSocial: 'Comércio Varejista XYZ EIRELI',
    nomeFantasia: 'Varejo XYZ',
    cnpj: '22.222.222/0001-22',
    cidade: 'Belo Horizonte',
    status: 'Inativo', // Example status
  },
];

export default function ClientesPage() {
  // In a real app, fetch clients from your data source
  const clients = mockClients;

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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length > 0 ? (
                clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.razaoSocial}</TableCell>
                    <TableCell>{client.nomeFantasia}</TableCell>
                    <TableCell>{client.cnpj}</TableCell>
                    <TableCell>{client.cidade}</TableCell>
                    <TableCell>{client.status}</TableCell>
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
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum cliente cadastrado ainda.
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
