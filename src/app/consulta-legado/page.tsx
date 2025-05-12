
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FileSearch, FileText, LandPlot, Hammer, ListFilter, Building } from 'lucide-react'; // Updated icons

interface ConsultaLink {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

// This list is now empty as legacy consultations are not implemented.
// Add links here if you implement any of the /modulo-legado endpoints.
const consultaLinks: ConsultaLink[] = [
  // {
  //   href: '/consulta-legado/licitacoes-8666',
  //   title: 'Consultar Licitações (Lei 8.666/93)',
  //   description: 'Busque licitações (Convite, Tomada de Preços, Concorrência).',
  //   icon: FileSearch,
  // },
  // {
  //   href: '/consulta-legado/itens-licitacoes-8666',
  //   title: 'Consultar Itens de Licitações (Lei 8.666/93)',
  //   description: 'Detalhes dos itens de licitações da Lei 8.666/93.',
  //   icon: ListFilter,
  // },
  // {
  //   href: '/consulta-legado/pregoes',
  //   title: 'Consultar Pregões',
  //   description: 'Obtenha dados gerais sobre pregões realizados.',
  //   icon: Hammer,
  // },
  // {
  //   href: '/consulta-legado/itens-pregoes',
  //   title: 'Consultar Itens de Pregões',
  //   description: 'Acesse informações sobre itens de pregões.',
  //   icon: ListFilter,
  // },
  // {
  //   href: '/consulta-legado/compras-sem-licitacao',
  //   title: 'Consultar Compras sem Licitação',
  //   description: 'Dados de dispensas e inexigibilidades.',
  //   icon: LandPlot,
  // },
  // {
  //   href: '/consulta-legado/itens-compras-sem-licitacao',
  //   title: 'Itens de Compras sem Licitação',
  //   description: 'Detalhes dos itens de dispensas e inexigibilidades.',
  //   icon: ListFilter,
  // },
  // {
  //   href: '/consulta-legado/rdc',
  //   title: 'Consultar RDC',
  //   description: 'Dados sobre licitações no Regime Diferenciado de Contratações.',
  //   icon: Building, // Using Gavel for RDC, similar to licitações
  // },
];

export default function ConsultaLegadoPage() {
  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-2xl font-semibold">Módulo de Consultas API Compras.gov.br</CardTitle>
        <CardDescription>
          Selecione um tipo de consulta para interagir com os dados abertos do Compras.gov.br.
          Atualmente, apenas consultas ao Módulo Contratações (Lei 14.133/2021 - PNCP) estão disponíveis.
          Consultas ao Módulo Legado (Lei 8.666/93) não estão implementadas.
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
                    Nenhuma consulta específica do Módulo Legado está implementada no momento.
                    Navegue para <Link href="/consulta-pncp" className="text-primary hover:underline">Consultas PNCP (Lei 14.133/2021)</Link> para ver as opções disponíveis.
                </p>
            </CardContent>
        </Card>
      )}

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
