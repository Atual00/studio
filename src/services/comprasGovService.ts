
'use client';

import { format } from 'date-fns';

const PROXY_URL = process.env.NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL || 
                  'YOUR_FIREBASE_CLOUD_FUNCTION_URL_HERE_REPLACE_ME'; // Fallback placeholder

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
  [key: string]: string | number | boolean | undefined;
}

interface PaginatedResponse<T> {
  _embedded: T[]; // Assuming data is in _embedded for Compras.gov.br, adjust if different
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
  paginaAtual: number;
  // Add other pagination fields as per API response
}

async function fetchFromComprasGov<T>(
  apiEndpointPath: string,
  params: ComprasGovParams
): Promise<T> { // Return type changed to T, assuming full response structure
  const queryParams = new URLSearchParams();

  // Add specific API params, converting camelCase to snake_case if necessary
  for (const key in params) {
    if (params[key] !== undefined) {
      // Convert camelCase to snake_case for API parameters
      const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      queryParams.append(snakeCaseKey, String(params[key]));
    }
  }

  // Add the Compras.gov.br API endpoint path as a query parameter for the proxy
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
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }
      console.error(`Error fetching from ComprasGov API (${apiEndpointPath}):`, response.status, errorData);
      throw new Error(
        `Falha na consulta à API Compras.gov.br (${response.status}): ${errorData?.message || response.statusText}. Detalhes: ${JSON.stringify(errorData?._embedded?.errors || errorData)}`
      );
    }
    return await response.json() as T;
  } catch (error) {
    console.error('Network or other error in fetchFromComprasGov:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro desconhecido ao conectar com o serviço de consulta.');
  }
}

// --- Specific Endpoint Functions ---

// 1. Consultar Licitação (Lei 8.666/93)
export interface ConsultarLicitacaoParams {
  pagina?: number;
  tamanhoPagina?: number;
  uasg?: number;
  numeroAviso?: number;
  modalidade?: number;
  dataPublicacaoInicial: Date;
  dataPublicacaoFinal: Date;
}
export const consultarLicitacao = async (params: ConsultarLicitacaoParams) => {
  const apiParams = {
    ...params,
    dataPublicacaoInicial: format(params.dataPublicacaoInicial, 'yyyy-MM-dd'),
    dataPublicacaoFinal: format(params.dataPublicacaoFinal, 'yyyy-MM-dd'),
  };
  return fetchFromComprasGov<any>('/modulo-legado/1_consultarLicitacao', apiParams);
};

// 2. Consultar Itens de Licitações
export interface ConsultarItensLicitacaoParams {
  pagina?: number;
  tamanhoPagina?: number;
  uasg?: number;
  numeroAviso?: number;
  modalidade: number; // Obrigatório
  codigoItemMaterial?: number;
  codigoItemServico?: number;
  cnpjFornecedor?: string;
  cpfVencedor?: string;
}
export const consultarItensLicitacao = async (params: ConsultarItensLicitacaoParams) => {
  return fetchFromComprasGov<any>('/modulo-legado/2_consultarItemLicitacao', params);
};

// 3. Consultar Pregão
export interface ConsultarPregoesParams {
  pagina?: number;
  tamanhoPagina?: number;
  coUasg?: number;
  numero?: number;
  dtDataEditalInicial: Date;
  dtDataEditalFinal: Date;
}
export const consultarPregoes = async (params: ConsultarPregoesParams) => {
  const apiParams = {
    ...params,
    dtDataEditalInicial: format(params.dtDataEditalInicial, 'yyyy-MM-dd'),
    dtDataEditalFinal: format(params.dtDataEditalFinal, 'yyyy-MM-dd'),
  };
  return fetchFromComprasGov<any>('/modulo-legado/3_consultarPregoes', apiParams);
};

// 4. Consultar Itens de Pregões
export interface ConsultarItensPregoesParams {
  pagina?: number;
  tamanhoPagina?: number;
  coUasg?: number;
  dtHomInicial: Date;
  dtHomFinal: Date;
}
export const consultarItensPregoes = async (params: ConsultarItensPregoesParams) => {
  const apiParams = {
    ...params,
    dtHomInicial: format(params.dtHomInicial, 'yyyy-MM-dd'),
    dtHomFinal: format(params.dtHomFinal, 'yyyy-MM-dd'),
  };
  return fetchFromComprasGov<any>('/modulo-legado/4_consultarItensPregoes', apiParams);
};

// 5. Consultar Compra sem Licitação
export interface ConsultarComprasSemLicitacaoParams {
  pagina?: number;
  tamanhoPagina?: number;
  dtAnoAviso: number;
  coUasg?: number;
  coModalidadeLicitacao?: 6 | 7; // 6 (Dispensa) ou 7 (Inexigibilidade)
}
export const consultarComprasSemLicitacao = async (params: ConsultarComprasSemLicitacaoParams) => {
  return fetchFromComprasGov<any>('/modulo-legado/5_consultarComprasSemLicitacao', params);
};

// 6. Consultar Itens de Compras sem Licitação
export interface ConsultarItensComprasSemLicitacaoParams {
  pagina?: number;
  tamanhoPagina?: number;
  dtAnoAvisoLicitacao: number;
  coUasg?: number;
  coModalidadeLicitacao?: 6 | 7;
  coConjuntoMateriais?: number;
  coServico?: number;
  nuCpfCnpjFornecedor?: string;
}
export const consultarItensComprasSemLicitacao = async (params: ConsultarItensComprasSemLicitacaoParams) => {
  return fetchFromComprasGov<any>('/modulo-legado/6_consultarCompraItensSemLicitacao', params);
};

// 7. Consultar RDC
export interface ConsultarRdcParams {
  pagina?: number;
  tamanhoPagina?: number;
  dataPublicacaoMin: Date;
  dataPublicacaoMax: Date;
  uasg?: number;
  modalidade?: number; // 3 (Presencial), 4 (Eletrônico)
  numeroAviso?: number;
  objeto?: string;
  // Outros opcionais conforme manual
}
export const consultarRdc = async (params: ConsultarRdcParams) => {
  const apiParams = {
    ...params,
    dataPublicacaoMin: format(params.dataPublicacaoMin, 'yyyy-MM-dd'),
    dataPublicacaoMax: format(params.dataPublicacaoMax, 'yyyy-MM-dd'),
  };
  return fetchFromComprasGov<any>('/modulo-legado/7_consultarRdc', apiParams);
};
