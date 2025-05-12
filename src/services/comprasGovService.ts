
'use client';

import { format, parseISO, isValid } from 'date-fns'; // Added parseISO and isValid

const PROXY_URL = process.env.NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL || 
                  'YOUR_FIREBASE_CLOUD_FUNCTION_URL_HERE_REPLACE_ME'; 

if (PROXY_URL === 'YOUR_FIREBASE_CLOUD_FUNCTION_URL_HERE_REPLACE_ME') {
  console.warn(
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
    "WARNING: A URL da Cloud Function para o Compras.gov.br não está configurada!\n" +
    "Por favor, defina NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL no seu arquivo .env\n" +
    "e substitua o valor de placeholder em src/services/comprasGovService.ts.\n" +
    "As consultas à API do Compras.gov.br não funcionarão corretamente.\n" +
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );
}


interface ComprasGovParams {
  [key: string]: string | number | boolean | undefined | null; // Allow null for optional date fields
}

// Interface for the generic API response structure
interface ComprasGovApiResponse<T> {
  resultado?: T[]; // For endpoints that return a 'resultado' array
  _embedded?: { // For endpoints that use HATEOAS _embedded structure
    [key: string]: T[] | any; // Assuming the data array is under some key in _embedded
  };
  totalRegistros?: number;
  totalPaginas?: number;
  // Add other common pagination/response fields
  _pagination?: {
    total?: number;
    totalPages?: number;
    perPage?: number;
    page?: number;
  };
  // For single object responses, the data might be at the root
  [key: string]: any; // Allow other potential root-level fields
}


async function fetchFromComprasGov<T>(
  apiEndpointPath: string,
  params: ComprasGovParams
): Promise<ComprasGovApiResponse<T>> { 
  const queryParams = new URLSearchParams();

  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null) {
      const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (value instanceof Date && isValid(value)) {
        queryParams.append(snakeCaseKey, format(value, 'yyyy-MM-dd'));
      } else {
        queryParams.append(snakeCaseKey, String(value));
      }
    }
  }

  queryParams.set('endpoint', apiEndpointPath);

  const url = `${PROXY_URL}?${queryParams.toString()}`;
  console.log(`Fetching from ComprasGov proxy: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      let errorData;
      let errorBodyText = "Nenhum detalhe adicional do corpo da resposta.";
      try {
        errorData = await response.json();
        errorBodyText = JSON.stringify(errorData);
      } catch (e) {
        try {
            errorBodyText = await response.text();
            if (errorBodyText.length > 200) errorBodyText = errorBodyText.substring(0, 200) + "... (truncated)";
        } catch (textError) {
            errorBodyText = "Não foi possível ler o corpo da resposta.";
        }
        errorData = { message: response.statusText || "Status code indicated error" };
      }
      console.error(`Error from proxy/API for target endpoint ${apiEndpointPath}: Status ${response.status}`, "Raw body sample:", errorBodyText, "Parsed error data:", errorData);

      let detailedMessage = `Falha na consulta via proxy para o endpoint '${apiEndpointPath}' (Status: ${response.status}).`;
      if (response.status === 404 && PROXY_URL === 'YOUR_FIREBASE_CLOUD_FUNCTION_URL_HERE_REPLACE_ME') {
        detailedMessage += ` A URL do proxy está configurada com o valor placeholder. Verifique a configuração de NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL no seu arquivo .env.`;
      } else if (response.status === 404) {
         detailedMessage += ` Verifique se a URL do proxy (NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL) está correta e se a função/serviço no proxy (${PROXY_URL}) está implantada e acessível no caminho esperado. URL completa da requisição ao proxy: ${url}.`;
      }
      
      const serviceErrorMessage = errorData?.message || errorData?.fault?.faultstring || errorData?.errors?.[0]?.message || errorData?._embedded?.errors?.[0]?.message || response.statusText || "Erro desconhecido do serviço.";
      const bodyDetails = errorBodyText === JSON.stringify(errorData) && Object.keys(errorData).length > 0 ? '(corpo JSON já logado no console)' : errorBodyText;
      detailedMessage += ` Detalhes do erro: ${serviceErrorMessage}. Corpo da resposta (amostra): ${bodyDetails}`;

      throw new Error(detailedMessage);
    }
    return await response.json() as ComprasGovApiResponse<T>;
  } catch (error) {
    console.error('Network or other error in fetchFromComprasGov for endpoint', apiEndpointPath, 'using proxy URL', PROXY_URL, 'Full URL attempted:', url, 'Error:', error);
    if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
      let additionalInfo = "";
      if (PROXY_URL === 'YOUR_FIREBASE_CLOUD_FUNCTION_URL_HERE_REPLACE_ME') {
        additionalInfo = "A URL do proxy está configurada com o valor placeholder. Configure NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL no seu arquivo .env.";
      }
      throw new Error(
        `Falha ao buscar dados do proxy em ${PROXY_URL} para o endpoint '${apiEndpointPath}'. ` +
        `Isso pode ocorrer devido a: \n` +
        `1. A URL do proxy (NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL) está incorreta, o serviço de proxy está offline ou não foi implantado corretamente. \n` +
        `2. Problemas de rede local ou CORS (verifique o console do navegador para mais detalhes de CORS). \n` +
        `${additionalInfo ? `3. ${additionalInfo}\n` : ''}` +
        `Erro original: ${error.message}`
      );
    } else if (error instanceof Error) {
      if (error.message.startsWith('Falha na consulta via proxy')) {
        throw error;
      }
      throw new Error(`Erro ao processar consulta para '${apiEndpointPath}': ${error.message}`);
    }
    throw new Error(`Erro desconhecido ao conectar com o serviço de consulta para '${apiEndpointPath}'.`);
  }
}


// --- PNCP MODULE ENDPOINTS (Lei 14.133/2021) ---

// 2. Consultar Itens de Contratações PNCP (Lei 14.133/2021)
export interface ConsultarItensContratacoesPNCPParams {
  pagina?: number;
  tamanhoPagina?: number;
  unidadeOrgaoCodigoUnidade?: number;
  orgaoEntidadeCnpj?: string;
  situacaoCompraItem?: string;
  materialOuServico: 'M' | 'S'; // Obrigatório
  codigoClasse: number; // Obrigatório
  codigoGrupo: number; // Obrigatório
  codItemCatalogo?: number;
  temResultado?: boolean; // true, false
  codFornecedor?: string;
  dataInclusaoPncpInicial?: Date | null;
  dataInclusaoPncpFinal?: Date | null;
  dataAtualizacaoPncp?: Date | null;
  bps?: boolean; // true, false
  margemPreferenciaNormal?: boolean; // true, false
  codigoNCM?: string;
}
export const consultarItensContratacoesPNCP = async (params: ConsultarItensContratacoesPNCPParams) => {
  // Ensure boolean params are sent as 'true' or 'false' strings if API expects that, or actual booleans
  // The fetchFromComprasGov handles Date objects.
  const apiParams = { ...params };
  if (params.temResultado !== undefined) apiParams.temResultado = params.temResultado;
  if (params.bps !== undefined) apiParams.bps = params.bps;
  if (params.margemPreferenciaNormal !== undefined) apiParams.margemPreferenciaNormal = params.margemPreferenciaNormal;
  
  return fetchFromComprasGov<any>('/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133', apiParams);
};

// 3. Consultar Resultado dos Itens das Contratações PNCP (Lei 14.133/2021)
export interface ConsultarResultadoItensPNCPParams {
  pagina?: number;
  tamanhoPagina?: number;
  dataResultadoPncpInicial: Date; // Obrigatório
  dataResultadoPncpFinal: Date; // Obrigatório
  unidadeOrgaoCodigoUnidade?: string;
  niFornecedor?: string;
  codigoPais?: string;
  porteFornecedorId?: number;
  naturezaJuridicaId?: string;
  situacaoCompraItemResultadoId?: number;
  valorUnitarioHomologadoInicial?: number;
  valorUnitarioHomologadoFinal?: number;
  valorTotalHomologadoInicial?: number;
  valorTotalHomologadoFinal?: number;
  aplicacaoMargemPreferencia?: boolean; // true, false
  aplicacaoBeneficioMeepp?: boolean; // true, false
  aplicacaoCriterioDesempate?: boolean; // true, false
}
export const consultarResultadoItensPNCP = async (params: ConsultarResultadoItensPNCPParams) => {
  const apiParams = { ...params };
  if (params.aplicacaoMargemPreferencia !== undefined) apiParams.aplicacaoMargemPreferencia = params.aplicacaoMargemPreferencia;
  if (params.aplicacaoBeneficioMeepp !== undefined) apiParams.aplicacaoBeneficioMeepp = params.aplicacaoBeneficioMeepp;
  if (params.aplicacaoCriterioDesempate !== undefined) apiParams.aplicacaoCriterioDesempate = params.aplicacaoCriterioDesempate;

  return fetchFromComprasGov<any>('/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133', apiParams);
};

