import { format, parseISO, addDays, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  NutritionLogSession, 
  NutritionFoodEntry, 
  NutritionDrinkEntry, 
  NutritionCoffeeEntry,
  calculateDrinkMl 
} from '@/hooks/useNutritionLog';

interface ExportOptions {
  clientName: string;
  session: NutritionLogSession;
  food: NutritionFoodEntry[];
  drinks: NutritionDrinkEntry[];
  coffee: NutritionCoffeeEntry[];
}

const drinkTypes: Record<string, string> = {
  water: 'Voda', mineral: 'Minerálka', cola: 'Cola', juice: 'Džus',
  sports: 'Ionťák', tea: 'Čaj', alcohol: 'Alkohol', other: 'Jiné'
};

const coffeeTypes: Record<string, string> = {
  espresso: 'Espresso', lungo: 'Lungo', cappuccino: 'Cappuccino',
  latte: 'Latte', filter: 'Filtrovaná', other: 'Jiné'
};

const portionSizes: Record<string, string> = {
  small: 'malá', medium: 'střední', large: 'velká'
};

const milkLabels: Record<string, string> = {
  none: 'bez mléka', little: 'trochu', normal: 'mléko', much: 'hodně'
};

function getPortionText(entry: NutritionFoodEntry): string {
  if (entry.portion_mode === 'grams' && entry.grams) return `${entry.grams}g`;
  if (entry.portion_mode === 'portion_size' && entry.portion_size) {
    return portionSizes[entry.portion_size] || entry.portion_size;
  }
  if (entry.portion_mode === 'units' && entry.units_count) {
    return `${entry.units_count} ${entry.units_label || 'ks'}`;
  }
  return '-';
}

export function exportNutritionLogToPDF(options: ExportOptions) {
  const { clientName, session, food, drinks, coffee } = options;
  const doc = new jsPDF();
  
  const startDate = parseISO(session.start_date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  
  // Title
  doc.setFontSize(18);
  doc.text(`Jídelní log - ${clientName}`, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Období: ${format(startDate, 'd.M.', { locale: cs })} - ${format(parseISO(session.end_date), 'd.M.yyyy', { locale: cs })}`, 14, 28);
  doc.text(`Vygenerováno: ${format(new Date(), 'd. MMMM yyyy', { locale: cs })}`, 14, 34);
  
  // Summary
  const totalDrinksMl = drinks.reduce((sum, d) => sum + calculateDrinkMl(d), 0);
  const totalCoffees = coffee.reduce((sum, c) => sum + c.count, 0);
  const daysWithEntries = new Set([
    ...food.map(e => e.entry_date),
    ...drinks.map(e => e.entry_date),
    ...coffee.map(e => e.entry_date),
  ]).size;
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Souhrn týdne', 14, 46);
  
  const summaryData = [
    ['Celkem záznamů', `${food.length + drinks.length + coffee.length}`],
    ['Dní se záznamy', `${daysWithEntries}/7`],
    ['Průměr tekutin/den', `${daysWithEntries > 0 ? Math.round(totalDrinksMl / daysWithEntries) : 0} ml`],
    ['Průměr káv/den', `${daysWithEntries > 0 ? (totalCoffees / daysWithEntries).toFixed(1) : 0}`],
  ];
  
  autoTable(doc, {
    body: summaryData,
    startY: 52,
    styles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 }, 1: { halign: 'right' } },
    theme: 'plain',
  });
  
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  
  // Daily entries
  days.forEach((day, dayIndex) => {
    const dayFood = food.filter(e => isSameDay(parseISO(e.entry_date), day));
    const dayDrinks = drinks.filter(e => isSameDay(parseISO(e.entry_date), day));
    const dayCoffee = coffee.filter(e => isSameDay(parseISO(e.entry_date), day));
    
    if (dayFood.length === 0 && dayDrinks.length === 0 && dayCoffee.length === 0) return;
    
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    const dayNames = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`${dayNames[day.getDay()]} ${format(day, 'd.M.yyyy', { locale: cs })}`, 14, currentY);
    currentY += 6;
    
    // Food table
    if (dayFood.length > 0) {
      const foodData = dayFood.map(e => [
        e.entry_time.slice(0, 5),
        e.description,
        getPortionText(e),
        e.note || '-'
      ]);
      
      autoTable(doc, {
        head: [['Čas', 'Jídlo', 'Porce', 'Poznámka']],
        body: foodData,
        startY: currentY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [255, 153, 51] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;
    }
    
    // Drinks table
    if (dayDrinks.length > 0) {
      const drinkData = dayDrinks.map(e => [
        e.entry_time.slice(0, 5),
        `${drinkTypes[e.drink_type] || e.drink_type}${e.drink_name ? ` (${e.drink_name})` : ''}`,
        `${calculateDrinkMl(e)} ml`,
        e.note || '-'
      ]);
      
      autoTable(doc, {
        head: [['Čas', 'Nápoj', 'Množství', 'Poznámka']],
        body: drinkData,
        startY: currentY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 153, 255] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 5;
    }
    
    // Coffee table
    if (dayCoffee.length > 0) {
      const coffeeData = dayCoffee.map(e => [
        e.entry_time.slice(0, 5),
        `${coffeeTypes[e.coffee_type] || e.coffee_type}${e.count > 1 ? ` ×${e.count}` : ''}`,
        e.sugar ? `${e.sugar_spoons} lžičky` : 'ne',
        milkLabels[e.milk] || e.milk,
      ]);
      
      autoTable(doc, {
        head: [['Čas', 'Káva', 'Cukr', 'Mléko']],
        body: coffeeData,
        startY: currentY,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [139, 90, 43] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
  });
  
  doc.save(`jidelni-log_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export function generateNutritionSummaryText(options: ExportOptions): string {
  const { clientName, session, food, drinks, coffee } = options;
  const startDate = parseISO(session.start_date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  
  const totalDrinksMl = drinks.reduce((sum, d) => sum + calculateDrinkMl(d), 0);
  const totalCoffees = coffee.reduce((sum, c) => sum + c.count, 0);
  const daysWithEntries = new Set([
    ...food.map(e => e.entry_date),
    ...drinks.map(e => e.entry_date),
    ...coffee.map(e => e.entry_date),
  ]).size;
  
  let text = `JÍDELNÍ LOG - ${clientName}\n`;
  text += `Období: ${format(startDate, 'd.M.', { locale: cs })} - ${format(parseISO(session.end_date), 'd.M.yyyy', { locale: cs })}\n`;
  text += `Vygenerováno: ${format(new Date(), 'd.M.yyyy', { locale: cs })}\n\n`;
  
  text += `=== SOUHRN ===\n`;
  text += `Celkem záznamů: ${food.length + drinks.length + coffee.length}\n`;
  text += `Dní se záznamy: ${daysWithEntries}/7\n`;
  text += `Průměr tekutin/den: ${daysWithEntries > 0 ? Math.round(totalDrinksMl / daysWithEntries) : 0} ml\n`;
  text += `Průměr káv/den: ${daysWithEntries > 0 ? (totalCoffees / daysWithEntries).toFixed(1) : 0}\n\n`;
  
  const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  
  days.forEach((day) => {
    const dayFood = food.filter(e => isSameDay(parseISO(e.entry_date), day));
    const dayDrinks = drinks.filter(e => isSameDay(parseISO(e.entry_date), day));
    const dayCoffee = coffee.filter(e => isSameDay(parseISO(e.entry_date), day));
    
    if (dayFood.length === 0 && dayDrinks.length === 0 && dayCoffee.length === 0) return;
    
    text += `=== ${dayNames[day.getDay()]} ${format(day, 'd.M.', { locale: cs })} ===\n`;
    
    if (dayFood.length > 0) {
      text += `JÍDLO:\n`;
      dayFood.forEach(e => {
        text += `  ${e.entry_time.slice(0, 5)} - ${e.description} (${getPortionText(e)})`;
        if (e.note) text += ` | ${e.note}`;
        text += '\n';
      });
    }
    
    if (dayDrinks.length > 0) {
      text += `PITÍ:\n`;
      dayDrinks.forEach(e => {
        const name = `${drinkTypes[e.drink_type] || e.drink_type}${e.drink_name ? ` (${e.drink_name})` : ''}`;
        text += `  ${e.entry_time.slice(0, 5)} - ${name} (${calculateDrinkMl(e)} ml)`;
        if (e.note) text += ` | ${e.note}`;
        text += '\n';
      });
    }
    
    if (dayCoffee.length > 0) {
      text += `KÁVA:\n`;
      dayCoffee.forEach(e => {
        const name = `${coffeeTypes[e.coffee_type] || e.coffee_type}${e.count > 1 ? ` ×${e.count}` : ''}`;
        const details: string[] = [];
        if (e.sugar) details.push(`${e.sugar_spoons} lžičky cukru`);
        if (e.milk !== 'none') details.push(milkLabels[e.milk]);
        text += `  ${e.entry_time.slice(0, 5)} - ${name}`;
        if (details.length > 0) text += ` (${details.join(', ')})`;
        if (e.note) text += ` | ${e.note}`;
        text += '\n';
      });
    }
    
    text += '\n';
  });
  
  return text;
}
