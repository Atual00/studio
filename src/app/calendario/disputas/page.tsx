'use client';

import {useState, useEffect} from 'react';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Calendar} from '@/components/ui/calendar';
import {Badge} from '@/components/ui/badge';
import {Loader2} from 'lucide-react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import Link from 'next/link';

// --- Mock Data and Types ---
interface LicitacaoDisputa {
  id: string; // Licitacao ID
  numero: string;
  clienteNome: string;
  dataInicio: Date; // This is the dispute date/time
  plataforma: string;
}

// Mock fetch function
const fetchDisputas = async (): Promise<LicitacaoDisputa[]> => {
  console.log('Fetching disputas...');
  await new Promise(resolve => setTimeout(resolve, 450));
  return [
    {
      id: 'LIC-001',
      numero: 'PE 123/2024',
      clienteNome: 'Empresa Exemplo Ltda',
      dataInicio: new Date(2024, 6, 25, 9, 0),
      plataforma: 'ComprasNet',
    },
    {
      id: 'LIC-002',
      numero: 'TP 005/2024',
      clienteNome: 'Soluções Inovadoras S.A.',
      dataInicio: new Date(2024, 7, 1, 14, 30),
      plataforma: 'Portal da Cidade',
    },
    {
      id: 'LIC-003',
      numero: 'PE 456/2024',
      clienteNome: 'Comércio Varejista XYZ EIRELI',
      dataInicio: new Date(2024, 7, 5, 10, 0),
      plataforma: 'Licitações-e',
    },
     { // Add another one for the same day
      id: 'LIC-008',
      numero: 'PE 111/2024',
      clienteNome: 'Soluções Inovadoras S.A.',
      dataInicio: new Date(2024, 7, 5, 15, 0),
       plataforma: 'ComprasNet',
    },
  ];
};


export default function CalendarioDisputasPage() {
  const [disputas, setDisputas] = useState<LicitacaoDisputa[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

   // Fetch data
  useEffect(() => {
    const loadDisputas = async () => {
      setLoading(true);
      try {
        const data = await fetchDisputas();
        setDisputas(data);
      } catch (err) {
        console.error('Erro ao buscar datas de disputa:', err);
        // Add toast notification
      } finally {
        setLoading(false);
      }
    };
    loadDisputas();
  }, []);

   // Modifiers for react-day-picker
   const disputaDays = disputas.map(d => d.dataInicio);
   const modifiers = {
       disputa: disputaDays,
   };
   const modifierStyles = {
       disputa: {
           backgroundColor: 'hsl(var(--primary))', // Dark blue background for dispute days
           color: 'hsl(var(--primary-foreground))', // White text
           borderRadius: '9999px',
       },
       selected: { // Ensure selected overrides disputa style if needed
           backgroundColor: 'hsl(var(--accent))', // Teal background for selection
           color: 'hsl(var(--accent-foreground))', // White text
       }
   };


   // Filter disputas for the selected date
   const disputasForSelectedDate = selectedDate
    ? disputas.filter(d =>
        format(d.dataInicio, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      ).sort((a,b) => a.dataInicio.getTime() - b.dataInicio.getTime()) // Sort by time
    : [];


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Calendário - Datas de Disputa</h2>
      <Card className="overflow-hidden">
         <CardContent className="p-0 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="md:col-span-2 flex justify-center items-start pt-4 md:pt-0">
                 {loading ? (
                     <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 ) : (
                     <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        locale={ptBR}
                        modifiers={modifiers}
                        modifiersStyles={modifierStyles}
                        className="p-0 sm:border rounded-md w-full"
                         classNames={{
                           day_selected: 'bg-accent text-accent-foreground hover:bg-accent/90 focus:bg-accent/90',
                           day_today: 'bg-primary/20 text-primary-foreground',
                        }}
                     />
                 )}
             </div>
             <div className="md:col-span-1 border-t md:border-t-0 md:border-l p-4 space-y-4 min-h-[300px]">
                  <h3 className="text-lg font-medium mb-2">
                     Disputas para {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data Selecionada'}
                  </h3>
                  {loading ? (
                       <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : disputasForSelectedDate.length > 0 ? (
                      <div className="space-y-3">
                          {disputasForSelectedDate.map(d => (
                            <Link href={`/licitacoes/${d.id}`} key={d.id} className="block p-3 border rounded-md hover:bg-primary/10 transition-colors">
                               <p className="font-medium text-sm">{format(d.dataInicio, "HH:mm")} - {d.numero}</p>
                               <p className="text-xs text-muted-foreground">{d.clienteNome}</p>
                               <p className="text-xs text-muted-foreground">Plataforma: {d.plataforma}</p>
                            </Link>
                          ))}
                      </div>
                  ) : (
                       <p className="text-sm text-muted-foreground">Nenhuma disputa agendada para esta data.</p>
                  )}
             </div>
         </CardContent>
      </Card>
    </div>
  );
}
