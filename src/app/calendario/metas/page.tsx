'use client';

import {useState, useEffect} from 'react';
import {Card, CardHeader, CardTitle, CardDescription, CardContent} from '@/components/ui/card';
import {Calendar} from '@/components/ui/calendar';
import {Badge} from '@/components/ui/badge';
import {Loader2} from 'lucide-react';
import {format, parseISO, isValid} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import Link from 'next/link';
import { fetchLicitacoes, type LicitacaoListItem } from '@/services/licitacaoService';


// --- Types ---
interface LicitacaoMeta {
  id: string; // Licitacao ID
  numero: string;
  clienteNome: string;
  dataMetaAnalise: Date;
}


export default function CalendarioMetasPage() {
  const [metas, setMetas] = useState<LicitacaoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

   // Fetch data
  useEffect(() => {
    const loadMetas = async () => {
      setLoading(true);
      try {
        const licitacoes = await fetchLicitacoes();
        const metasData = licitacoes.map(lic => {
            const dataMetaDate = typeof lic.dataMetaAnalise === 'string' ? parseISO(lic.dataMetaAnalise) : lic.dataMetaAnalise;
            if(isValid(dataMetaDate)) {
                return {
                    id: lic.id,
                    numero: lic.numeroLicitacao,
                    clienteNome: lic.clienteNome,
                    dataMetaAnalise: dataMetaDate,
                }
            }
            return null;
        }).filter((item): item is LicitacaoMeta => item !== null); // Type guard to filter out nulls
        setMetas(metasData);
      } catch (err) {
        console.error('Erro ao buscar datas meta:', err);
        // Add toast notification
      } finally {
        setLoading(false);
      }
    };
    loadMetas();
  }, []);

   // Modifiers for react-day-picker to highlight dates with metas
   const metaDays = metas.map(meta => meta.dataMetaAnalise);
   const modifiers = {
       meta: metaDays,
       // Add more modifiers if needed (e.g., past due)
   };
   const modifierStyles = {
       meta: {
            // Use Tailwind classes via CSS variables defined in globals.css
           backgroundColor: 'hsl(var(--accent))', // Teal background
           color: 'hsl(var(--accent-foreground))', // White text
           borderRadius: '9999px', // Make it a circle
       },
       // Style for selected day (react-day-picker default might be enough)
       selected: {
           backgroundColor: 'hsl(var(--primary))', // Dark blue background
           color: 'hsl(var(--primary-foreground))', // White text
       }
   };


   // Filter metas for the selected date
   const metasForSelectedDate = selectedDate
    ? metas.filter(meta =>
        format(meta.dataMetaAnalise, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
    : [];


  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Calendário - Metas de Análise</h2>
      <Card className="overflow-hidden"> {/* Ensure calendar fits */}
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
                        className="p-0 sm:border rounded-md w-full" // Add border on larger screens
                        classNames={{ // Customize styles further if needed
                           day_selected: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90',
                           day_today: 'bg-accent/20 text-accent-foreground',
                        }}
                     />
                 )}
             </div>
             <div className="md:col-span-1 border-t md:border-t-0 md:border-l p-4 space-y-4 min-h-[300px]">
                  <h3 className="text-lg font-medium mb-2">
                     Metas para {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Data Selecionada'}
                  </h3>
                  {loading ? (
                       <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : metasForSelectedDate.length > 0 ? (
                      <div className="space-y-3">
                          {metasForSelectedDate.map(meta => (
                            <Link href={`/licitacoes/${meta.id}`} key={meta.id} className="block p-3 border rounded-md hover:bg-accent/10 transition-colors">
                               <p className="font-medium text-sm">{meta.numero}</p>
                               <p className="text-xs text-muted-foreground">{meta.clienteNome}</p>
                            </Link>
                          ))}
                      </div>
                  ) : (
                       <p className="text-sm text-muted-foreground">Nenhuma meta de análise para esta data.</p>
                  )}
             </div>
         </CardContent>
      </Card>
    </div>
  );
}
