export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  colors: ThemeColors;
  geometry: {
    heightScale: number;
    widthScale: number;
    roofType: 'flat' | 'pitched' | 'pyramid' | 'pagoda';
  };
}

export const themes: Record<string, ThemeConfig> = {
  modern: {
    id: 'modern',
    name: 'Modern Villa',
    colors: {
      primary: '#FFD700',
      secondary: '#FFA500',
      accent: '#00BFFF',
      bg: '#030610',
    },
    geometry: { heightScale: 1.0, widthScale: 1.0, roofType: 'flat' },
  },
  luxury: {
    id: 'luxury',
    name: 'Luxury Mansion',
    colors: {
      primary: '#B76E79',
      secondary: '#E0BFB8',
      accent: '#FFD700',
      bg: '#0a0505',
    },
    geometry: { heightScale: 1.2, widthScale: 1.5, roofType: 'flat' },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Smart House',
    colors: {
      primary: '#00FF41',
      secondary: '#9B59B6',
      accent: '#FF003C',
      bg: '#050010',
    },
    geometry: { heightScale: 1.5, widthScale: 0.8, roofType: 'pitched' },
  },
  cabin: {
    id: 'cabin',
    name: 'Mountain Cabin',
    colors: {
      primary: '#8B4513',
      secondary: '#CD853F',
      accent: '#FFA07A',
      bg: '#0a0805',
    },
    geometry: { heightScale: 0.8, widthScale: 1.0, roofType: 'pitched' },
  },
  beach: {
    id: 'beach',
    name: 'Beach House',
    colors: {
      primary: '#00CED1',
      secondary: '#FFFFFF',
      accent: '#FF7F50',
      bg: '#000a10',
    },
    geometry: { heightScale: 1.0, widthScale: 1.2, roofType: 'pyramid' },
  },
  japanese: {
    id: 'japanese',
    name: 'Japanese House',
    colors: {
      primary: '#FFFFFF',
      secondary: '#FF6B6B',
      accent: '#2F8F8F',
      bg: '#080808',
    },
    geometry: { heightScale: 0.7, widthScale: 1.4, roofType: 'pagoda' },
  },
  scandinavian: {
    id: 'scandinavian',
    name: 'Scandinavian House',
    colors: {
      primary: '#E8E8E8',
      secondary: '#A0B4C0',
      accent: '#5BC8D4',
      bg: '#06080a',
    },
    geometry: { heightScale: 1.0, widthScale: 1.1, roofType: 'pitched' },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Glass House',
    colors: {
      primary: '#AADDFF',
      secondary: '#FFFFFF',
      accent: '#00E5FF',
      bg: '#020408',
    },
    geometry: { heightScale: 0.9, widthScale: 1.3, roofType: 'flat' },
  },
};
