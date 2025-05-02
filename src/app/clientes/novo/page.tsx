import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import ClientForm from '@/components/clientes/client-form';

export default function NovoClientePage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Novo Cliente</h2>
      <Card>
        <CardHeader>
          <CardTitle>Dados do Cliente</CardTitle>
          <CardDescription>Preencha as informações abaixo para cadastrar um novo cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
