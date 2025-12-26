/**
 * Czech vocative case conversion for first names
 * Transforms names for greeting: "Ahoj, Dominiku!" instead of "Ahoj, Dominik!"
 */

export function toVocative(firstName: string): string {
  if (!firstName || firstName.length < 2) return firstName;
  
  const name = firstName.trim();
  const lowerName = name.toLowerCase();
  
  // Female names ending in -a (most common)
  if (lowerName.endsWith('ka')) {
    return name.slice(0, -1) + 'o'; // Hanka → Hanko
  }
  if (lowerName.endsWith('na')) {
    return name.slice(0, -1) + 'o'; // Martina → Martino
  }
  if (lowerName.endsWith('la')) {
    return name.slice(0, -1) + 'o'; // Jitka → Jitko, Anděla → Andělo
  }
  if (lowerName.endsWith('ra')) {
    return name.slice(0, -1) + 'o'; // Klára → Kláro
  }
  if (lowerName.endsWith('da')) {
    return name.slice(0, -1) + 'o'; // Magda → Magdo
  }
  if (lowerName.endsWith('ta')) {
    return name.slice(0, -1) + 'o'; // Renata → Renato
  }
  if (lowerName.endsWith('sa') || lowerName.endsWith('za')) {
    return name.slice(0, -1) + 'o'; // Tereza → Terezo
  }
  if (lowerName.endsWith('ča') || lowerName.endsWith('ša')) {
    return name.slice(0, -1) + 'o'; // Míša → Mišo
  }
  if (lowerName.endsWith('a')) {
    return name.slice(0, -1) + 'o'; // Generic female: Eva → Evo
  }
  
  // Male names
  if (lowerName.endsWith('ek')) {
    return name.slice(0, -2) + 'ku'; // Zbyšek → Zbyšku, Marek → Marku
  }
  if (lowerName.endsWith('ík') || lowerName.endsWith('ik')) {
    return name.slice(0, -1) + 'u'; // Dominik → Dominiku
  }
  if (lowerName.endsWith('k')) {
    return name + 'u'; // Patrik → Patriku
  }
  if (lowerName.endsWith('r')) {
    return name.slice(0, -1) + 'ře'; // Petr → Petře, Viktor → Viktore? Actually Petře
  }
  if (lowerName.endsWith('l')) {
    return name + 'e'; // Pavel → Pavle, Karel → Karle
  }
  if (lowerName.endsWith('n')) {
    return name + 'e'; // Martin → Martine, Jan → Jane
  }
  if (lowerName.endsWith('s')) {
    return name + 'i'; // Tomáš → Tomáši (but ends in š)
  }
  if (lowerName.endsWith('š')) {
    return name + 'i'; // Tomáš → Tomáši, Lukáš → Lukáši
  }
  if (lowerName.endsWith('č')) {
    return name + 'i'; // Vojtěch → Vojtěchu (actually ends in ch)
  }
  if (lowerName.endsWith('ch')) {
    return name + 'u'; // Vojtěch → Vojtěchu
  }
  if (lowerName.endsWith('m')) {
    return name + 'e'; // Adam → Adame, Jakub... no, that's b
  }
  if (lowerName.endsWith('b')) {
    return name + 'e'; // Jakub → Jakube
  }
  if (lowerName.endsWith('v')) {
    return name + 'e'; // Gustav → Gustave
  }
  if (lowerName.endsWith('ž')) {
    return name + 'i'; // Jiří... no that's í
  }
  if (lowerName.endsWith('í') || lowerName.endsWith('ý')) {
    return name; // Jiří → Jiří (doesn't change)
  }
  if (lowerName.endsWith('d') || lowerName.endsWith('t')) {
    return name + 'e'; // David → Davide
  }
  if (lowerName.endsWith('c')) {
    return name + 'i'; // Franc → Franci
  }
  if (lowerName.endsWith('o')) {
    return name; // Hugo → Hugo (doesn't change)
  }
  if (lowerName.endsWith('e')) {
    return name; // René → René (doesn't change)  
  }
  if (lowerName.endsWith('i') || lowerName.endsWith('y')) {
    return name; // Tony → Tony (doesn't change)
  }
  
  // Fallback - return original
  return name;
}
