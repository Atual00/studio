
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Building } from 'lucide-react'; // Using Building icon for Contratações

interface ConsultaLink {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const consultaLinks: ConsultaLink[] = [
  {
    href: '/consulta-pncp/contratacoes',
    title: 'Consultar Contratações por Data de Publicação (PNCP)',
    description: 'Busque informações sobre contratações publicadas no PNCP, conforme a Lei 14.133/2021.',
    icon: Building,
  },
  // Links para 'Itens de Contratações' e 'Resultado dos Itens' removidos,
  // pois a refatoração atual foca no endpoint de 'Consultar Contratações por Data de Publicação'
  // conforme o guia fornecido.
];

export default function ConsultaPncpPage() {
  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-2xl font-semibold">Consulta de Contratações (PNCP - Lei 14.133/2021)</CardTitle>
        <CardDescription>
          Acesse dados abertos de contratações do Portal Nacional de Contratações Públicas (PNCP) regidas pela nova Lei de Licitações.
          Atualmente, a consulta disponível é por data de publicação.
        </CardDescription>
      </CardHeader>

      {consultaLinks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {consultaLinks.map((link) => (
            <Link href={link.href} key={link.href} passHref legacyBehavior>
              <a className="block hover:no-underline">
                <Card className="h-full hover:shadow-lg transition-shadow duration-200 flex flex-col">
                  <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <link.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      ) : (
         <Card>
            <CardContent className="pt-6">
                <p className="text-muted-foreground">
                    Nenhuma consulta PNCP está configurada no momento.
                </p>
            </CardContent>
        </Card>
      )}

      <Card className="mt-6 bg-sky-50 border-sky-200 dark:bg-sky-900/30 dark:border-sky-700/50">
        <CardHeader>
          <CardTitle className="text-sky-700 dark:text-sky-300 text-lg">Nota sobre a API PNCP</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-sky-600 dark:text-sky-400">
            Este módulo agora conecta-se diretamente à API pública do PNCP (`https://pncp.gov.br/api/consulta`).
            Não é mais necessário um proxy (Cloud Function) para estas consultas específicas do PNCP.
            Certifique-se de que sua aplicação tem acesso à internet para alcançar a API do PNCP.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
