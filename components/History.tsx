import React, { useState, useMemo } from 'react';
import { ShiftLog, UserProfile } from '../types';
import { Button } from './Button';
import { FileSpreadsheet, Mail, Edit2, Save, X, Calculator, Calendar, ImageIcon, Search, Filter } from 'lucide-react';
import { updateLog } from '../services/storageService';

interface HistoryProps {
  logs: ShiftLog[];
  profile: UserProfile;
  onDataChange: () => void;
}

interface ShiftPair {
  id: string; // Composite ID
  start: ShiftLog | null;
  end: ShiftLog | null;
  date: string; // ISO date of start or end
}

export const History: React.FC<HistoryProps> = ({ logs, profile, onDataChange }) => {
  const [editingPairId, setEditingPairId] = useState<string | null>(null);
  const [editStartKm, setEditStartKm] = useState<string>('');
  const [editEndKm, setEditEndKm] = useState<string>('');
  
  // Image Modal State
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Filter State
  const [filterType, setFilterType] = useState<'MONTH' | 'DAY'>('MONTH');
  // Default to current month (YYYY-MM) or current day (YYYY-MM-DD)
  const [filterValue, setFilterValue] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Group logs into pairs (Start + End)
  const allShifts = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    const pairs: ShiftPair[] = [];
    let currentStart: ShiftLog | null = null;

    sorted.forEach(log => {
      if (log.type === 'START') {
        if (currentStart) {
             pairs.push({ 
               id: `inc_${currentStart.id}`, 
               start: currentStart, 
               end: null, 
               date: currentStart.date 
             });
        }
        currentStart = log;
      } else {
        if (currentStart) {
          pairs.push({ 
            id: `pair_${currentStart.id}_${log.id}`, 
            start: currentStart, 
            end: log, 
            date: currentStart.date 
          });
          currentStart = null;
        } else {
          pairs.push({ 
            id: `orphan_${log.id}`, 
            start: null, 
            end: log, 
            date: log.date 
          });
        }
      }
    });

    if (currentStart) {
      pairs.push({ 
        id: `open_${currentStart.id}`, 
        start: currentStart, 
        end: null, 
        date: currentStart.date 
      });
    }

    // Sort descending (newest first)
    return pairs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs]);

  // Apply Filter
  const filteredShifts = useMemo(() => {
    if (!filterValue) return allShifts;

    return allShifts.filter(shift => {
      // Convert shift date to local YYYY-MM-DD or YYYY-MM string to match input value
      const shiftDate = new Date(shift.date);
      // Adjust for local timezone to ensure "today" matches correctly visually
      const year = shiftDate.getFullYear();
      const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
      const day = String(shiftDate.getDate()).padStart(2, '0');
      
      if (filterType === 'MONTH') {
        return `${year}-${month}` === filterValue;
      } else {
        return `${year}-${month}-${day}` === filterValue;
      }
    });
  }, [allShifts, filterValue, filterType]);

  // Calculate Stats based on FILTERED view
  const stats = useMemo(() => {
    let totalKm = 0;
    let count = 0;

    filteredShifts.forEach(s => {
      if (s.start && s.end) {
        const dist = s.end.odometer - s.start.odometer;
        totalKm += dist;
        count++;
      }
    });
    return { totalKm, count };
  }, [filteredShifts]);

  const handleFilterTypeChange = (type: 'MONTH' | 'DAY') => {
    setFilterType(type);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    if (type === 'MONTH') {
      setFilterValue(`${year}-${month}`);
    } else {
      const day = String(now.getDate()).padStart(2, '0');
      setFilterValue(`${year}-${month}-${day}`);
    }
  };

  const exportExcel = () => {
    if (filteredShifts.length === 0) {
      alert("Nenhum registro encontrado para o período selecionado.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Nome;Empresa;Data;Hora Entrada;KM Inicial;Hora Saida;KM Final;Total KM\n";

    filteredShifts.forEach(p => {
       const date = new Date(p.date).toLocaleDateString('pt-BR');
       const startTime = p.start ? new Date(p.start.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '-';
       const startKm = p.start ? p.start.odometer : '-';
       const endTime = p.end ? new Date(p.end.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '-';
       const endKm = p.end ? p.end.odometer : '-';
       const total = (p.start && p.end) ? (p.end.odometer - p.start.odometer) : 0;

       const row = [
         profile.name,
         profile.company,
         date,
         startTime,
         startKm,
         endTime,
         endKm,
         total
       ].join(';');

       csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Filename based on filter
    const filename = `Relatorio_KM_${filterValue}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = (pair: ShiftPair) => {
    setEditingPairId(pair.id);
    setEditStartKm(pair.start?.odometer.toString() || '');
    setEditEndKm(pair.end?.odometer.toString() || '');
  };

  const cancelEdit = () => {
    setEditingPairId(null);
    setEditStartKm('');
    setEditEndKm('');
  };

  const saveEdit = (pair: ShiftPair) => {
    let changed = false;
    if (pair.start && editStartKm) {
      const newStart = parseInt(editStartKm);
      if (!isNaN(newStart) && newStart !== pair.start.odometer) {
        updateLog({ ...pair.start, odometer: newStart });
        changed = true;
      }
    }
    if (pair.end && editEndKm) {
      const newEnd = parseInt(editEndKm);
      if (!isNaN(newEnd) && newEnd !== pair.end.odometer) {
         updateLog({ ...pair.end, odometer: newEnd });
         changed = true;
      }
    }
    if (changed) onDataChange();
    cancelEdit();
  };

  const sendEmail = () => {
     const body = `Relatório de KM - ${profile.name}\nEmpresa: ${profile.company}\nPeríodo: ${filterValue}\n\n` + 
       filteredShifts.map(s => {
         const date = new Date(s.date).toLocaleDateString('pt-BR');
         const start = s.start ? `${s.start.odometer}km` : '?';
         const end = s.end ? `${s.end.odometer}km` : '?';
         const total = (s.start && s.end) ? `${s.end.odometer - s.start.odometer}km` : '-';
         return `${date}: ${start} -> ${end} (= ${total})`;
       }).join('\n');

    window.location.href = `mailto:?subject=Relatório KM ${filterValue}&body=${encodeURIComponent(body)}`;
  };

  return (
    <>
      <div className="bg-urban-800 rounded-xl p-4 shadow-lg border border-urban-700 space-y-6">
        
        {/* Header & Filter Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-urban-blue" />
              Histórico
            </h2>
            <div className="flex gap-2">
               <Button variant="secondary" onClick={sendEmail} className="p-2" title="Enviar E-mail">
                 <Mail className="w-5 h-5" />
               </Button>
               <Button variant="primary" onClick={exportExcel} className="p-2" title="Exportar Excel">
                 <FileSpreadsheet className="w-5 h-5" />
               </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-urban-900/80 p-3 rounded-lg border border-urban-700 flex flex-col sm:flex-row gap-3">
             <div className="flex bg-urban-800 rounded-md p-1 border border-urban-700 shrink-0">
                <button 
                  onClick={() => handleFilterTypeChange('MONTH')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${filterType === 'MONTH' ? 'bg-urban-blue text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                  Mensal
                </button>
                <button 
                  onClick={() => handleFilterTypeChange('DAY')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${filterType === 'DAY' ? 'bg-urban-blue text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                  Diário
                </button>
             </div>
             
             <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-500" />
                </div>
                <input 
                  type={filterType === 'MONTH' ? 'month' : 'date'}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full bg-urban-800 border border-urban-700 text-white text-sm rounded-lg focus:ring-urban-blue focus:border-urban-blue block pl-10 p-2.5 [color-scheme:dark]"
                />
             </div>
          </div>

          {/* Stats Summary (Dynamic) */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-urban-900/50 p-3 rounded-lg border border-urban-700 flex flex-col items-center">
                <span className="text-xs text-gray-400 uppercase font-semibold">Total Filtrado</span>
                <span className="text-xl font-bold text-urban-neon flex items-center gap-1">
                   <Calculator className="w-4 h-4" />
                   {stats.totalKm} km
                </span>
             </div>
             <div className="bg-urban-900/50 p-3 rounded-lg border border-urban-700 flex flex-col items-center">
                <span className="text-xs text-gray-400 uppercase font-semibold">Registros</span>
                <span className="text-xl font-bold text-white flex items-center gap-1">
                   <Filter className="w-4 h-4" />
                   {stats.count}
                </span>
             </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-urban-700">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-urban-900 text-urban-blue uppercase text-xs">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">KM Inicial</th>
                <th className="p-3">KM Final</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Fotos</th>
                <th className="p-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-urban-700 bg-urban-800">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    Nenhum registro encontrado para {filterValue}.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((pair) => {
                  const isEditing = editingPairId === pair.id;
                  const total = (pair.start && pair.end) ? (pair.end.odometer - pair.start.odometer) : 0;
                  
                  return (
                    <tr key={pair.id} className="hover:bg-urban-700/50 transition-colors">
                      {/* DATE & TIME */}
                      <td className="p-3">
                        <div className="font-bold text-white whitespace-nowrap">
                           {new Date(pair.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                           {pair.start ? new Date(pair.start.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--'} - 
                           {pair.end ? new Date(pair.end.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : ' --:--'}
                        </div>
                      </td>

                      {/* START KM */}
                      <td className="p-3">
                         {isEditing && pair.start ? (
                           <input 
                             type="number" 
                             className="w-20 bg-black border border-urban-blue rounded p-1 text-center text-white"
                             value={editStartKm}
                             onChange={e => setEditStartKm(e.target.value)}
                           />
                         ) : (
                           <span className="text-gray-300 font-mono">{pair.start?.odometer || '-'}</span>
                         )}
                      </td>

                      {/* END KM */}
                      <td className="p-3">
                         {isEditing && pair.end ? (
                           <input 
                             type="number" 
                             className="w-20 bg-black border border-urban-blue rounded p-1 text-center text-white"
                             value={editEndKm}
                             onChange={e => setEditEndKm(e.target.value)}
                           />
                         ) : (
                           <span className="text-gray-300 font-mono">{pair.end?.odometer || '-'}</span>
                         )}
                      </td>

                      {/* TOTAL */}
                      <td className="p-3 text-right font-bold text-white">
                        {pair.start && pair.end ? `${total} km` : <span className="text-yellow-500 text-xs font-normal">--</span>}
                      </td>

                      {/* PHOTOS */}
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                           {pair.start?.photoUrl && (
                             <button onClick={() => setViewingImage(pair.start!.photoUrl)} className="text-urban-blue hover:text-white" title="Foto Inicial">
                               <ImageIcon className="w-4 h-4" />
                             </button>
                           )}
                           {pair.end?.photoUrl && (
                             <button onClick={() => setViewingImage(pair.end!.photoUrl)} className="text-urban-blue hover:text-white" title="Foto Final">
                               <ImageIcon className="w-4 h-4" />
                             </button>
                           )}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => saveEdit(pair)} className="text-green-500 hover:text-green-400">
                              <Save className="w-5 h-5" />
                            </button>
                            <button onClick={cancelEdit} className="text-red-500 hover:text-red-400">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEdit(pair)} className="text-gray-500 hover:text-white p-1">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal */}
      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setViewingImage(null)}>
           <div className="relative max-w-lg w-full">
              <button onClick={() => setViewingImage(null)} className="absolute -top-10 right-0 text-white p-2">
                 <X className="w-8 h-8" />
              </button>
              <img src={viewingImage} alt="Comprovante" className="w-full rounded-lg border border-gray-700 shadow-2xl" />
           </div>
        </div>
      )}
    </>
  );
};