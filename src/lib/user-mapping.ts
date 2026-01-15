/**
 * User nickname to full name mapping
 * This file contains the mapping between user nicknames and their full names
 */

export interface UserNameMapping {
  nickname: string;
  fullName: string;
}

/**
 * Mapping of user nicknames to full names
 */
export const USER_NAME_MAPPINGS: UserNameMapping[] = [
  { nickname: 'tirtha', fullName: 'Tirthankar Dasgupta' },
  { nickname: 'suko', fullName: 'Sukomal Debnath' },
  { nickname: 'arpan', fullName: 'Arpan Bairagi' },
  { nickname: 'sagnik', fullName: 'Sagnik Mondal' },
];

/**
 * Get full name from nickname (case-insensitive)
 * @param nickname - The user's nickname
 * @returns The full name if found, otherwise returns the original nickname with proper capitalization
 */
export function getFullNameFromNickname(nickname: string): string {
  if (!nickname) return '';
  
  const normalizedNickname = nickname.toLowerCase().trim();
  const mapping = USER_NAME_MAPPINGS.find(
    m => m.nickname.toLowerCase() === normalizedNickname
  );
  
  if (mapping) {
    return mapping.fullName;
  }
  
  // If no mapping found, return the nickname with first letter capitalized and rest in lowercase
  const trimmed = nickname.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

/**
 * Get nickname from full name (case-insensitive)
 * @param fullName - The user's full name
 * @returns The nickname if found, otherwise returns the first word of the full name in lowercase
 */
export function getNicknameFromFullName(fullName: string): string {
  if (!fullName) return '';
  
  const normalizedFullName = fullName.toLowerCase().trim();
  const mapping = USER_NAME_MAPPINGS.find(
    m => m.fullName.toLowerCase() === normalizedFullName
  );
  
  if (mapping) {
    return mapping.nickname;
  }
  
  // If no mapping found, return the first word of the full name in lowercase
  // Filter out empty strings from split to handle multiple consecutive spaces
  const words = fullName.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length > 0 ? words[0].toLowerCase() : '';
}

/**
 * Check if a name is a known nickname
 * @param name - The name to check
 * @returns true if the name is a known nickname, false otherwise
 */
export function isKnownNickname(name: string): boolean {
  if (!name) return false;
  
  const normalizedName = name.toLowerCase().trim();
  return USER_NAME_MAPPINGS.some(
    m => m.nickname.toLowerCase() === normalizedName
  );
}
