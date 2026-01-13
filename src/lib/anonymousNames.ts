// Utility for generating anonymous display names from client IDs
// Used across leaderboards, gamification, and peer challenges

const adjectives = [
  'Rychlý', 'Silný', 'Vytrvalý', 'Odhodlaný', 'Aktivní', 
  'Energický', 'Fit', 'Sportovní', 'Houževnatý', 'Motivovaný',
  'Dynamický', 'Neúnavný', 'Bojovný', 'Soutěživý', 'Cílevědomý'
];

const animals = [
  'Lev', 'Orel', 'Vlk', 'Tygr', 'Medvěd', 
  'Sokol', 'Jelen', 'Panter', 'Gepard', 'Kondor',
  'Bizon', 'Jestřáb', 'Rys', 'Kůň', 'Býk'
];

/**
 * Generate a consistent anonymous name from a client ID.
 * The same clientId will always produce the same name.
 */
export function generateAnonymousName(clientId: string): string {
  // Create a simple hash from the ID
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    const char = clientId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const adjIndex = Math.abs(hash) % adjectives.length;
  const animalIndex = Math.abs(hash >> 4) % animals.length;
  const number = (Math.abs(hash) % 99) + 1;
  
  return `${adjectives[adjIndex]} ${animals[animalIndex]} #${number}`;
}

/**
 * Get display name for a client based on their privacy settings.
 * @param clientId - The client's ID
 * @param isVisible - Whether the client has opted to be visible
 * @param nickname - The client's chosen nickname (if visible)
 * @returns The appropriate display name
 */
export function getClientDisplayName(
  clientId: string, 
  isVisible: boolean, 
  nickname?: string | null
): string {
  if (isVisible && nickname) {
    return nickname;
  }
  return generateAnonymousName(clientId);
}
