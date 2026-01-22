import { UserProfile, ShiftLog } from '../types';

const PROFILE_KEY = 'motokm_profile';
const LOGS_KEY = 'motokm_logs';

export const saveProfile = (profile: UserProfile): void => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getProfile = (): UserProfile | null => {
  const data = localStorage.getItem(PROFILE_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveLog = (log: ShiftLog): void => {
  const currentLogs = getLogs();
  // To save space in local storage, we might strip the full base64 image if it's too large in a real app,
  // but for this demo, we'll keep it or assume the user downloads it. 
  // We will store the log.
  const updatedLogs = [log, ...currentLogs];
  localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
};

export const getLogs = (): ShiftLog[] => {
  const data = localStorage.getItem(LOGS_KEY);
  return data ? JSON.parse(data) : [];
};

export const updateLog = (updatedLog: ShiftLog): void => {
  const logs = getLogs();
  const index = logs.findIndex(l => l.id === updatedLog.id);
  if (index !== -1) {
    logs[index] = updatedLog;
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }
};

export const clearData = (): void => {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(LOGS_KEY);
};
