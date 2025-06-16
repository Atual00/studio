
'use client';

import { format, parseISO, isValid, formatISO } from 'date-fns';

// IMPORTANT: REPLACE THIS WITH YOUR ACTUAL CLOUD FUNCTION URL for LEGACY calls
const PLACEHOLDER_PROXY_URL = 'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/consultarApiComprasGov';
const PROXY_URL = process.env.NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL || PLACEHOLDER_PROXY_URL;

if (PROXY_URL === PLACEHOLDER_PROXY_URL && process.env.NODE_ENV !== 'test') {
  console.warn( // Changed to warn to avoid breaking dev server on initial setup
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n" +
    "AVISO DE CONFIGURAÇÃO: A URL da Cloud Function para o Compras.gov.br (LEGACY) NÃO ESTÁ CONFIGURADA!\n" +
    `Por favor, defina a variável de ambiente NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL no seu arquivo .env (ou similar).\n` +
    `O valor atual é o placeholder: "${PLACEHOLDER_PROXY_URL}".\n` +
    "As consultas à API do Compras.gov.br (LEGACY) NÃO FUNCIONARÃO até que isso seja corrigido.\n" +
    "Você deve substituir o valor acima pela URL da sua Cloud Function implantada.\n" +
    "Exemplo: https://southamerica-east1-meuprojeto-12345.cloudfunctions.net/consultarApiComprasGov\n"+
    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  );
}

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta';


interface ComprasGovParams {
  [key: string]: string | number | boolean | undefined | null;
}

interface ComprasGovApiResponse<T> {
  resultado?: T[];
  _embedded?: {
    [key: string]: T[] | any;
  };
  totalRegistros?: number;
  totalPaginas?: number;
  _pagination?: {
    total?: number;
    totalPages?: number;
    perPage?: number;
    page?: number;
  };
  data?: T[]; // For new PNCP API structure
  numeroPagina?: number; // For new PNCP API structure
  [key: string]: any;
}


async function fetchFromComprasGovProxy<T>(
  apiEndpointPath: string,
  params: ComprasGovParams
): Promise<ComprasGovApiResponse<T>> {
  if (PROXY_URL === PLACEHOLDER_PROXY_URL && process.env.NODE_ENV !== 'test') {
    const configErrorMsg = "CONFIGURAÇÃO NECESSÁRIA: A URL do proxy (NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL) não está configurada. " +
                           "Por favor, defina esta variável no seu arquivo .env com a URL da sua Cloud Function. " +
                           "As consultas à API do Compras.gov.br (LEGACY) não podem continuar sem esta configuração.";
    console.error("fetchFromComprasGovProxy aborted due to missing proxy URL configuration.");
    throw new Error(configErrorMsg);
  }

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
  console.log(`Consultando API Compras.gov.br via Proxy: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      let errorData;
      let errorBodyText = "Nenhum detalhe adicional do corpo da resposta.";
      try { errorData = await response.json(); errorBodyText = JSON.stringify(errorData); }
      catch (e) {
        try { errorBodyText = await response.text(); if (errorBodyText.length > 200) errorBodyText = errorBodyText.substring(0, 200) + "... (truncated)"; }
        catch (textError) { errorBodyText = "Não foi possível ler o corpo da resposta."; }
        errorData = { message: response.statusText || "Status code indicated error" };
      }
      console.error(`Error from proxy/API for target endpoint ${apiEndpointPath}: Status ${response.status}`, "Raw body sample:", errorBodyText, "Parsed error data:", errorData);
      let detailedMessage = `Falha na consulta via proxy para o endpoint '${apiEndpointPath}' (Status: ${response.status}).`;
      if (response.status === 404 && PROXY_URL === PLACEHOLDER_PROXY_URL && process.env.NODE_ENV !== 'test') {
        detailedMessage += ` A URL do proxy (NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL) está configurada com o valor placeholder. Verifique a configuração no seu arquivo .env.`;
      } else if (response.status === 404) {
         detailedMessage += ` Verifique se a URL do proxy (NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL=${PROXY_URL}) está correta e se a Cloud Function está implantada e acessível no caminho esperado ('${new URL(PROXY_URL).pathname}'). URL completa da requisição ao proxy: ${url}. O endpoint de destino na API do Compras.gov.br ('${apiEndpointPath}') pode não existir ou a Cloud Function não conseguiu encontrá-lo.`;
      }
      const serviceErrorMessage = errorData?.message || errorData?.fault?.faultstring || errorData?.errors?.[0]?.message || errorData?._embedded?.errors?.[0]?.message || response.statusText || "Erro desconhecido do serviço.";
      const bodyDetails = errorBodyText === JSON.stringify(errorData) && Object.keys(errorData).length > 0 ? '(corpo JSON já logado no console)' : errorBodyText;
      detailedMessage += ` Detalhes do erro: ${serviceErrorMessage}. Corpo da resposta (amostra): ${bodyDetails}`;
      throw new Error(detailedMessage);
    }
    return await response.json() as ComprasGovApiResponse<T>;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CONFIGURAÇÃO NECESSÁRIA")) throw error;
    console.error('Network or other error in fetchFromComprasGovProxy for endpoint', apiEndpointPath, 'using proxy URL', PROXY_URL, 'Full URL attempted:', url, 'Error:', error);
    if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
      let additionalInfo = "";
      if (PROXY_URL === PLACEHOLDER_PROXY_URL && process.env.NODE_ENV !== 'test') {
        additionalInfo = "A URL do proxy (NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL) está configurada com o valor placeholder. Configure NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL no seu arquivo .env.";
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
      if (error.message.startsWith('Falha na consulta via proxy para o endpoint')) throw error;
      throw new Error(`Erro ao processar consulta para '${apiEndpointPath}': ${error.message}`);
    }
    throw new Error(`Erro desconhecido ao conectar com o serviço de consulta para '${apiEndpointPath}'.`);
  }
}

async function fetchDirectPNCP<T>(
  endpointPath: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<ComprasGovApiResponse<T>> {
  const queryParams = new URLSearchParams();
  for (const key in params) {
    const value = params[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      queryParams.append(key, String(value));
    }
  }

  const url = `${PNCP_BASE_URL}${endpointPath}?${queryParams.toString()}`;
  console.log(`Consultando API PNCP Direto: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      let errorBodyText = "Nenhum detalhe adicional do corpo da resposta.";
      let errorData = null;
      try {
        errorData = await response.json();
        errorBodyText = JSON.stringify(errorData);
      } catch (e) {
        try { errorBodyText = await response.text(); if (errorBodyText.length > 200) errorBodyText = errorBodyText.substring(0,200) + "...";}
        catch (textErr) { errorBodyText = "Não foi possível ler o corpo da resposta.";}
      }
      // Log the error details
      console.error(`Erro na API PNCP (Status: ${response.status} ${response.statusText}):`, errorData || errorBodyText);

      // Construct a more user-friendly error message if possible
      let message = `Erro na API PNCP: ${response.status} ${response.statusText}.`;
      if (errorData && errorData.message) { // Check if the JSON error object has a 'message' field
        message += ` Detalhes: ${errorData.message}`;
      } else if (errorBodyText) {
         message += ` Detalhes: ${errorBodyText}`;
      }
      throw new Error(message);
    }
    return await response.json() as ComprasGovApiResponse<T>;
  } catch (error) {
    console.error('Erro na chamada direta à API PNCP:', error);
    throw error; 
  }
}

// --- PNCP MODULE ENDPOINTS (Lei 14.133/2021) ---

export interface ConsultarContratacoesPNCPParams {
  pagina?: number;
  tamanhoPagina?: number;
  dataInicial: Date;
  dataFinal: Date;
  codigoModalidadeContratacao: number;
  uf?: string;
  termoBusca?: string;
}

export const consultarContratacoesPNCP = async (params: ConsultarContratacoesPNCPParams) => {
  const apiParams: Record<string, string | number | undefined> = {
    dataInicial: format(params.dataInicial, 'yyyyMMdd'),
    dataFinal: format(params.dataFinal, 'yyyyMMdd'),
    codigoModalidadeContratacao: params.codigoModalidadeContratacao,
    pagina: params.pagina || 1,
  };
  if (params.tamanhoPagina) {
    apiParams.tamanhoPagina = params.tamanhoPagina;
  }
  if (params.uf) {
    apiParams.uf = params.uf;
  }
  if (params.termoBusca && params.termoBusca.trim() !== '') {
    apiParams.termoBusca = params.termoBusca.trim();
  }

  return fetchDirectPNCP<any>('/v1/contratacoes/publicacao', apiParams);
};


// --- MÓDULO LEGADO ENDPOINTS (Using Proxy) ---

export interface ConsultarLicitacaoLegadoParams {
  pagina?: number;
  tamanhoPagina?: number;
  uasg?: number;
  numero_aviso?: number;
  modalidade?: number;
  data_publicacao_inicial: Date;
  data_publicacao_final: Date;
}
// export const consultarLicitacaoLegado = (params: ConsultarLicitacaoLegadoParams) =>
//   fetchFromComprasGovProxy<any>('/modulo-legado/1_consultarLicitacao', params);

export interface ConsultarItemLicitacaoLegadoParams {
  pagina?: number;
  tamanhoPagina?: number;
  uasg?: number;
  numero_aviso?: number;
  modalidade: number;
  codigo_item_material?: number;
  codigo_item_servico?: number;
  cnpj_fornecedor?: string;
  cpfVencedor?: string;
}
// export const consultarItemLicitacaoLegado = (params: ConsultarItemLicitacaoLegadoParams) =>
//   fetchFromComprasGovProxy<any>('/modulo-legado/2_consultarItemLicitacao', params);

export interface ConsultarPregoesLegadoParams {
  pagina?: number;
  tamanhoPagina?: number;
  co_uasg?: number;
  numero?: number;
  dt_data_edital_inicial: Date;
  dt_data_edital_final: Date;
}
// export const consultarPregoesLegado = (params: ConsultarPregoesLegadoParams) =>
//   fetchFromComprasGovProxy<any>('/modulo-legado/3_consultarPregoes', params);

export interface ConsultarItensPregoesLegadoParams {
  pagina?: number;
  tamanhoPagina?: number;
  co_uasg?: number;
  dt_hom_inicial: Date;
  dt_hom_final: Date;
}
// export const consultarItensPregoesLegado = (params: ConsultarItensPregoesLegadoParams) =>
//   fetchFromComprasGovProxy<any>('/modulo-legado/4_consultarItensPregoes', params);

export interface ConsultarComprasSemLicitacaoLegadoParams {
  pagina?: number;
  tamanhoPagina?: number;
  dt_ano_aviso: number;
  co_uasg?: number;
  co_modalidade_licitacao?: 6 | 7;
}
// export const consultarComprasSemLicitacaoLegado = (params: ConsultarComprasSemLicitacaoLegadoParams) =>
//   fetchFromComprasGovProxy<any>('/modulo-legado/5_consultarComprasSemLicitacao', params);

export interface ConsultarCompraItensSemLicitacaoLegadoParams {
  pagina?: number;
  tamanhoPagina?: number;
  dt_ano_aviso_licitacao: number;
  co_uasg?: number;
  co_modalidade_licitacao?: number;
  co_conjunto_materiais?: number;
  co_servico?: number;
  nu_cpf_cnpj_fornecedor?: string;
}
// export const consultarCompraItensSemLicitacaoLegado = (params: ConsultarCompraItensSemLicitacaoLegadoParams) =>
//   fetchFromComprasGovProxy<any>('/modulo-legado/6_consultarCompraItensSemLicitacao', params);

export interface ConsultarRdcLegadoParams {
  pagina?: number;
  tamanhoPagina?: number;
  data_publicacao_min: Date;
  data_publicacao_max: Date;
}
// export const consultarRdcLegado = (params: ConsultarRdcLegadoParams) =>
//   fetchFromComprasGovProxy<any>('/modulo-legado/7_consultarRdc', params);
