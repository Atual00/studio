
// src/app/anexos/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bot, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import jsPDF from 'jspdf';

import { fetchClients, type ClientListItem, fetchClientDetails, type ClientDetails } from '@/services/clientService';
import { fillDeclaration, type FillDeclarationInput, type FillDeclarationOutput } from '@/ai/flows/fill-declaration-flow';

export default function AnexosPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [declarationTemplate, setDeclarationTemplate] = useState<string>('');
  const [filledDeclaration, setFilledDeclaration] = useState<string>('');

  const [loadingClients, setLoadingClients] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const clientData = await fetchClients();
        setClients(clientData);
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        setError('Falha ao carregar lista de clientes.');
        toast({ title: 'Erro', description: 'Não foi possível carregar os clientes.', variant: 'destructive' });
      } finally {
        setLoadingClients(false);
      }
    };
    loadClients();
  }, [toast]);

  const handleFillDeclaration = async () => {
    if (!selectedClientId) {
      toast({ title: 'Atenção', description: 'Selecione um cliente.', variant: 'destructive' });
      return;
    }
    if (!declarationTemplate.trim()) {
      toast({ title: 'Atenção', description: 'Insira um modelo de declaração.', variant: 'destructive' });
      return;
    }

    setIsProcessingAI(true);
    setError(null);
    setFilledDeclaration('');

    try {
      const clientDetails = await fetchClientDetails(selectedClientId);
      if (!clientDetails) {
        throw new Error('Detalhes do cliente não encontrados.');
      }

      const clientDataForAI = {
        razaoSocial: clientDetails.razaoSocial,
        nomeFantasia: clientDetails.nomeFantasia || '',
        cnpj: clientDetails.cnpj,
        inscricaoEstadual: clientDetails.inscricaoEstadual || '',
        enderecoCompleto: `${clientDetails.enderecoRua}, ${clientDetails.enderecoNumero}${clientDetails.enderecoComplemento ? ` - ${clientDetails.enderecoComplemento}` : ''} - ${clientDetails.enderecoBairro}, ${clientDetails.enderecoCidade} - CEP: ${clientDetails.enderecoCep}`,
        email: clientDetails.email,
        telefone: clientDetails.telefone,
        socioNome: clientDetails.socioNome,
        socioCpf: clientDetails.socioCpf,
        socioRg: clientDetails.socioRg || '',
        socioEnderecoCompleto: clientDetails.copiarEnderecoEmpresa
          ? `${clientDetails.enderecoRua}, ${clientDetails.enderecoNumero}${clientDetails.enderecoComplemento ? ` - ${clientDetails.enderecoComplemento}` : ''} - ${clientDetails.enderecoBairro}, ${clientDetails.enderecoCidade} - CEP: ${clientDetails.enderecoCep}`
          : (clientDetails.socioEnderecoRua ? `${clientDetails.socioEnderecoRua}, ${clientDetails.socioEnderecoNumero || ''}${clientDetails.socioEnderecoComplemento ? ` - ${clientDetails.socioEnderecoComplemento}` : ''} - ${clientDetails.socioEnderecoBairro || ''}, ${clientDetails.socioEnderecoCidade || ''} - CEP: ${clientDetails.socioEnderecoCep || ''}` : ''),
      };

      const input: FillDeclarationInput = {
        clientData: clientDataForAI,
        declarationTemplate: declarationTemplate,
      };

      const result: FillDeclarationOutput = await fillDeclaration(input);
      setFilledDeclaration(result.filledDeclaration);
      toast({ title: 'Sucesso', description: 'Declaração preenchida pela IA.' });

    } catch (err) {
      console.error('Erro ao preencher declaração com IA:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha ao processar com IA: ${errorMessage}`);
      toast({ title: 'Erro de Processamento', description: `Não foi possível preencher a declaração. ${errorMessage}`, variant: 'destructive' });
      setFilledDeclaration(`// Erro ao processar. Modelo original:\n${declarationTemplate}`);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleGeneratePdf = () => {
    if (!filledDeclaration.trim()) {
      toast({ title: 'Atenção', description: 'Não há texto preenchido para gerar o PDF.', variant: 'warning' });
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(11);

      const margin = 15; // Page margin in mm
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - 2 * margin;

      // Split text into lines that fit the usable width
      const lines = doc.splitTextToSize(filledDeclaration, usableWidth);

      let y = margin;
      lines.forEach((line: string) => {
        if (y + 5 > pageHeight - margin) { // Check if new line exceeds page height (5mm per line approx)
          doc.addPage();
          y = margin; // Reset y for new page
        }
        doc.text(line, margin, y);
        y += 5; // Line height
      });

      const client = clients.find(c => c.id === selectedClientId);
      const fileName = `Declaracao_${client?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'Cliente'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({ title: 'PDF Gerado', description: `Arquivo ${fileName} salvo.` });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast({ title: 'Erro de PDF', description: `Não foi possível gerar o PDF. ${err instanceof Error ? err.message : ''}`, variant: 'destructive' });
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Gerador de Anexos e Declarações</CardTitle>
          <CardDescription>
            Selecione um cliente, cole seu modelo de declaração (com placeholders como {'{{razaoSocial}}'}, {'{{cnpj}}'}, {'{{diaAtual}}'}, etc.)
            e use a IA para preenchê-lo. Em seguida, gere o PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="client-select">Selecionar Cliente*</Label>
            <Select
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              disabled={loadingClients || isProcessingAI}
            >
              <SelectTrigger id="client-select">
                <SelectValue placeholder="Escolha um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {loadingClients ? (
                  <SelectItem value="loading" disabled>Carregando clientes...</SelectItem>
                ) : clients.length > 0 ? (
                  clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({client.cnpj})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-clients" disabled>Nenhum cliente cadastrado</SelectItem>
                )}
              </SelectContent>
            </Select>
            {clients.length === 0 && !loadingClients && (
                 <p className="text-sm text-muted-foreground mt-1">Nenhum cliente encontrado. Cadastre clientes primeiro.</p>
            )}
          </div>

          <div>
            <Label htmlFor="declaration-template">Modelo da Declaração (com placeholders)*</Label>
            <Textarea
              id="declaration-template"
              placeholder="Cole aqui o texto da sua declaração. Use placeholders como {{razaoSocial}}, {{cnpj}}, {{enderecoCompleto}}, {{socioNome}}, {{socioCpf}}, {{diaAtual}}, {{mesAtual}}, {{anoAtual}}, {{cidadeEmpresa}}, {{dataExtenso}}."
              value={declarationTemplate}
              onChange={(e) => setDeclarationTemplate(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              disabled={isProcessingAI}
            />
            <p className="text-xs text-muted-foreground mt-1">
                Placeholders comuns: `{{razaoSocial}}`, `{{nomeFantasia}}`, `{{cnpj}}`, `{{inscricaoEstadual}}`, `{{enderecoCompleto}}`, `{{email}}`, `{{telefone}}`, `{{socioNome}}`, `{{socioCpf}}`, `{{socioRg}}`, `{{socioEnderecoCompleto}}`. <br/>
                Para datas: `{{diaAtual}}`, `{{mesAtual}}` (ex: Janeiro), `{{anoAtual}}`, `{{dataExtenso}}` (ex: 12 de Julho de 2024), `{{cidadeEmpresa}}` (local da assinatura).
            </p>
          </div>

          <Button
            onClick={handleFillDeclaration}
            disabled={isProcessingAI || !selectedClientId || !declarationTemplate.trim() || loadingClients}
            className="w-full sm:w-auto"
          >
            {isProcessingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
            {isProcessingAI ? 'Processando com IA...' : 'Preencher com IA'}
          </Button>

          {filledDeclaration && (
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="filled-declaration">Declaração Preenchida pela IA</Label>
              <Textarea
                id="filled-declaration"
                value={filledDeclaration}
                readOnly
                className="min-h-[200px] font-mono text-sm bg-muted/30"
              />
              <Button
                onClick={handleGeneratePdf}
                disabled={!filledDeclaration.trim()}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                Gerar PDF
              </Button>
            </div>
          )}
        </CardContent>
         <CardFooter>
             <p className="text-xs text-muted-foreground">
                Dica: Para melhores resultados, use placeholders claros no seu modelo. A IA tentará identificar e substituir os dados do cliente e as informações de data.
                Revise sempre o texto gerado antes de usar.
             </p>
         </CardFooter>
      </Card>
    </div>
  );
}
