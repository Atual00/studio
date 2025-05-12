
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ListChecks, Search, FileText, Package, FileArchive, Users, Gavel } from 'lucide-react'; // Added Gavel

interface ConsultaLink {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const consultaLinks: ConsultaLink[] = [
  {
    href: '/consulta-legado/licitacoes',
    title: 'Consultar Licitações (Lei 8.666/93)',
    description: 'Obtenha dados sobre Convites, Tomadas de Preços e Concorrências.',
    icon: ListChecks,
  },
  {
    href: '/consulta-legado/itens-licitacoes',
    title: 'Consultar Itens de Licitações',
    description: 'Detalhes dos itens das licitações (Convite, TP, Concorrência).',
    icon: Package,
  },
  {
    href: '/consulta-legado/pregoes',
    title: 'Consultar Pregões',
    description: 'Acesse informações gerais sobre pregões realizados.',
    icon: Search,
  },
  {
    href: '/consulta-legado/itens-pregoes',
    title: 'Consultar Itens de Pregões',
    description: 'Detalhes dos itens de pregões, incluindo informações de homologação.',
    icon: FileArchive,
  },
  {
    href: '/consulta-legado/compras-sem-licitacao',
    title: 'Consultar Compras Sem Licitação',
    description: 'Informações sobre Dispensas e Inexigibilidades.',
    icon: FileText,
  },
  {
    href: '/consulta-legado/itens-compras-sem-licitacao',
    title: 'Consultar Itens de Compras Sem Licitação',
    description: 'Detalhes dos itens de Dispensas e Inexigibilidades.',
    icon: Users, // Using Users icon as a placeholder for items
  },
  {
    href: '/consulta-legado/rdc',
    title: 'Consultar RDC',
    description: 'Dados sobre licitações no Regime Diferenciado de Contratações.',
    icon: Gavel, // Using Gavel for RDC, similar to licitações
  },
];

export default function ConsultaLegadoPage() {
  return (
    <div className="space-y-6">
      <CardHeader className="px-0">
        <CardTitle className="text-2xl font-semibold">Consulta ao Módulo Legado - Compras.gov.br</CardTitle>
        <CardDescription>
          Acesse dados abertos de licitações, pregões e compras diretas do sistema legado do Compras.gov.br.
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

