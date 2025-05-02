import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import LicitacaoForm from '@/components/licitacoes/licitacao-form';

export default function NovaLicitacaoPage() {
  // In a real app, fetch necessary data like clients list
  const mockClients = [
    { id: '1', name: 'Empresa Exemplo Ltda' },
    { id: '2', name: 'Soluções Inovadoras S.A.' },
    { id: '3', name: 'Comércio Varejista XYZ EIRELI' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Nova Licitação</h2>
      <Card>
        <CardHeader>
          <CardTitle>Dados da Licitação</CardTitle>
          <CardDescription>Preencha as informações abaixo para cadastrar uma nova licitação.</CardDescription>
        </CardHeader>
        <CardContent>
          <LicitacaoForm clients={mockClients} />
        </CardContent>
      </Card>
    </div>
  );
}
