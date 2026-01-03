import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { UnifiedDiaryEntry } from '@/hooks/useUnifiedDiary';

interface ExportEntry {
  id: string;
  date: string;
  workout_type?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
  exercises?: Array<{
    exercise_name: string;
    sets?: number | null;
    reps?: number | null;
    weight_kg?: number | null;
    duration_seconds?: number | null;
    is_personal_record?: boolean;
    is_pr?: boolean;
  }>;
  is_coached: boolean;
}

const getWorkoutTypeLabel = (type: string | null | undefined): string => {
  const types: Record<string, string> = {
    strength: 'Síla',
    cardio: 'Kardio',
    run: 'Běh',
    hiit: 'HIIT',
    conditioning: 'Kondice',
    mobility: 'Mobilita',
    recovery: 'Regenerace',
    other: 'Ostatní',
  };
  return type ? types[type] || type : 'Trénink';
};

export function exportWorkoutDiaryToPDF(entries: ExportEntry[], clientName?: string) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Tréninkový deník', 14, 20);
  
  if (clientName) {
    doc.setFontSize(12);
    doc.text(clientName, 14, 28);
  }
  
  doc.setFontSize(10);
  doc.text(`Exportováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, clientName ? 35 : 28);
  
  // Summary stats
  const totalWorkouts = entries.length;
  const totalDuration = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const totalExercises = entries.reduce((sum, e) => sum + (e.exercises?.length || 0), 0);
  const totalPRs = entries.reduce((sum, e) => 
    sum + (e.exercises?.filter(ex => ex.is_personal_record || ex.is_pr).length || 0), 0
  );
  
  doc.setFontSize(11);
  const summaryY = clientName ? 45 : 38;
  doc.text(`Celkem tréninků: ${totalWorkouts}`, 14, summaryY);
  doc.text(`Celkový čas: ${totalDuration} min`, 80, summaryY);
  doc.text(`Celkem cviků: ${totalExercises}`, 14, summaryY + 6);
  doc.text(`Osobní rekordy: ${totalPRs}`, 80, summaryY + 6);
  
  // Workouts table
  const tableData = entries.map(entry => [
    format(parseISO(entry.date), 'd.M.yyyy'),
    getWorkoutTypeLabel(entry.workout_type),
    entry.is_coached ? 'S trenérem' : 'Samostatně',
    entry.duration_minutes ? `${entry.duration_minutes} min` : '-',
    entry.exercises?.length?.toString() || '0',
    entry.exercises?.filter(ex => ex.is_personal_record || ex.is_pr).length?.toString() || '0',
  ]);
  
  autoTable(doc, {
    startY: summaryY + 15,
    head: [['Datum', 'Typ', 'Zdroj', 'Délka', 'Cviků', 'PR']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Detailed exercises on new pages
  let currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 100;
  
  entries.forEach((entry, idx) => {
    if (!entry.exercises || entry.exercises.length === 0) return;
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    currentY += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${format(parseISO(entry.date), 'd.M.yyyy')} - ${getWorkoutTypeLabel(entry.workout_type)}`,
      14,
      currentY
    );
    doc.setFont('helvetica', 'normal');
    
    const exerciseData = entry.exercises.map(ex => [
      ex.exercise_name,
      ex.sets?.toString() || '-',
      ex.reps?.toString() || '-',
      ex.weight_kg ? `${ex.weight_kg} kg` : '-',
      ex.duration_seconds ? `${Math.round(ex.duration_seconds / 60)} min` : '-',
      (ex.is_personal_record || ex.is_pr) ? '🏆' : '',
    ]);
    
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Cvik', 'Série', 'Opak.', 'Váha', 'Čas', 'PR']],
      body: exerciseData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 116, 139] },
      margin: { left: 14 },
    });
    
    currentY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || currentY + 30;
  });
  
  // Save
  const fileName = `treninkovy-denik-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

export function exportWorkoutDiaryToCSV(entries: ExportEntry[], clientName?: string) {
  // Flatten data for CSV
  const rows: Array<Record<string, string | number>> = [];
  
  entries.forEach(entry => {
    if (entry.exercises && entry.exercises.length > 0) {
      entry.exercises.forEach(ex => {
        rows.push({
          'Datum': format(parseISO(entry.date), 'd.M.yyyy'),
          'Typ tréninku': getWorkoutTypeLabel(entry.workout_type),
          'Zdroj': entry.is_coached ? 'S trenérem' : 'Samostatně',
          'Délka (min)': entry.duration_minutes || '',
          'Poznámky': entry.notes || '',
          'Cvik': ex.exercise_name,
          'Série': ex.sets || '',
          'Opakování': ex.reps || '',
          'Váha (kg)': ex.weight_kg || '',
          'Čas (s)': ex.duration_seconds || '',
          'PR': (ex.is_personal_record || ex.is_pr) ? 'Ano' : '',
        });
      });
    } else {
      rows.push({
        'Datum': format(parseISO(entry.date), 'd.M.yyyy'),
        'Typ tréninku': getWorkoutTypeLabel(entry.workout_type),
        'Zdroj': entry.is_coached ? 'S trenérem' : 'Samostatně',
        'Délka (min)': entry.duration_minutes || '',
        'Poznámky': entry.notes || '',
        'Cvik': '',
        'Série': '',
        'Opakování': '',
        'Váha (kg)': '',
        'Čas (s)': '',
        'PR': '',
      });
    }
  });
  
  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tréninkový deník');
  
  // Save
  const fileName = `treninkovy-denik-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
}
