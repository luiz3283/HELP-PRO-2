export interface UserProfile {
  name: string;
  bikeModel: string;
  plate: string;
  company: string;
}

export interface ShiftLog {
  id: string;
  date: string; // ISO string
  type: 'START' | 'END';
  odometer: number;
  photoUrl: string | null; // Data URL or reference
  locationText: string;
  timestamp: number;
}

export interface DailyReport {
  date: string;
  startKm: number;
  endKm: number;
  startTime: string;
  endTime: string;
  totalKm: number;
}
