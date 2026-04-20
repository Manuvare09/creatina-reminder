import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  lastTaken:       'lastTakenDate',
  streak:          'streak',
  reminderHour:    'reminderHour',
  reminderMinute:  'reminderMinute',
  reminderEnabled: 'reminderEnabled',
};

export async function getLastTaken(): Promise<Date | null> {
  const val = await AsyncStorage.getItem(KEYS.lastTaken);
  return val ? new Date(val) : null;
}
export async function setLastTaken(date: Date) {
  await AsyncStorage.setItem(KEYS.lastTaken, date.toISOString());
}

export async function getStreak(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.streak);
  return val ? parseInt(val, 10) : 0;
}
export async function setStreak(n: number) {
  await AsyncStorage.setItem(KEYS.streak, String(n));
}

export async function getReminderTime(): Promise<{ hour: number; minute: number }> {
  const h = await AsyncStorage.getItem(KEYS.reminderHour);
  const m = await AsyncStorage.getItem(KEYS.reminderMinute);
  return { hour: h ? parseInt(h, 10) : 9, minute: m ? parseInt(m, 10) : 0 };
}
export async function setReminderTime(hour: number, minute: number) {
  await AsyncStorage.setItem(KEYS.reminderHour, String(hour));
  await AsyncStorage.setItem(KEYS.reminderMinute, String(minute));
}

export async function getReminderEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.reminderEnabled);
  return val === 'true';
}
export async function setReminderEnabled(v: boolean) {
  await AsyncStorage.setItem(KEYS.reminderEnabled, String(v));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}
export function isYesterday(date: Date): boolean {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return isSameDay(date, y);
}
