
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileSearch, FileCheck2, ListFilter } from 'lucide-react';

interface ConsultaLink {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const consultaLinks: ConsultaLink[] = [
  {
    href: '/consulta-pncp/itens-contratacoes',
    title: 'Consultar Itens de Contratações (PNCP Lei 14.133/2021)',
    description: 'Obtenha dados sobre itens de contratações publicados no PNCP.',
    icon: FileSearch,
  },
  {
    href: '/consulta-pncp/resultado-itens',
    title: 'Consultar Resultado dos Itens (PNCP Lei 14.133/2021)',
    description: 'Acesse os resultados associados aos itens contratados via PNCP.',
    icon: FileCheck2,
  },
];

export default function ConsultaPncpPage() {
  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-2xl font-semibold">Consulta de Licitações (Lei 14.133/2021)</CardTitle>
        <CardDescription>
          Acesse dados abertos de contratações (PNCP) do Compras.gov.br regidas pela nova Lei de Licitações.
        </CardDescription>
      </CardHeader>

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
       <Card className="mt-6 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/50">
        <CardHeader>
          <CardTitle className="text-amber-700 dark:text-amber-300 text-lg">Nota Importante</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Este módulo utiliza uma Cloud Function (Firebase) como proxy para acessar a API pública do Compras.gov.br.
            Certifique-se de que a URL da sua Cloud Function está corretamente configurada na variável de ambiente <code className="bg-amber-100 dark:bg-amber-800 px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL</code> no arquivo <code className="bg-amber-100 dark:bg-amber-800 px-1 py-0.5 rounded text-xs">.env</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
