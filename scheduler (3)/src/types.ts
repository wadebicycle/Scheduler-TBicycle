export type PlanColor = 'default' | 'green' | 'yellow' | 'gray' | 'red' | 'blue';

export interface Plan {
  id: string;
  title: string;
  date: string;
  startHour: number;
  duration: number;
  color: PlanColor;
  notes?: string;
  appliedFrom?: string;
  appliedTo?: string;
  repeatWeekly?: boolean;
  sourcePlanId?: string;
}

export interface WeekMetadata {
  weekStarting: string;
  color?: string;
  note?: string;
  isImportant?: boolean;
}

export type Language = 'en' | 'vi';
export type Theme = 'light' | 'dark';
export type NotificationSound = 'bird' | 'wind' | 'bell' | 'chime';
export type CatMood = 'idle' | 'work' | 'gym' | 'medical' | 'shortBreak' | 'longBreak' | 'celebrating' | 'tired' | 'happy';
export type BackgroundType = 'color' | 'gradient' | 'image';

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
}

export interface BackgroundConfig {
  type: BackgroundType;
  value: string;
  opacity?: number;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  musicEnabled: boolean;
  musicVolume: number;
  musicTrackId: string;
  customMusicDataUrl: string;
  customMusicName: string;
  notificationsEnabled: boolean;
  notificationSound: NotificationSound;
  startHour: number;
  endHour: number;
  backgroundConfig?: BackgroundConfig;
  catEnabled?: boolean;
  gymRestEnabled?: boolean;
  gymRestDurationSeconds?: number;
  gymRestSoundEnabled?: boolean;
  gymRestVibrationEnabled?: boolean;
}

export interface WeeklySchedule {
  weekStarting: string;
  plans: Plan[];
}
