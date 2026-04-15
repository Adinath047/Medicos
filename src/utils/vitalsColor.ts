import { Colors } from '../constants/colors';

// Returns color based on vitals reading
export const getBPColor = (sys: number): string => {
  if (sys >= 180) return Colors.danger;
  if (sys >= 140) return Colors.warning;
  return Colors.success;
};

export const getHRColor = (hr: number): string => {
  if (hr > 120 || hr < 50) return Colors.danger;
  if (hr > 100 || hr < 60) return Colors.warning;
  return Colors.success;
};

export const getTempColor = (temp: number): string => {
  if (temp >= 39.5 || temp < 35) return Colors.danger;
  if (temp >= 38.5) return Colors.warning;
  return Colors.success;
};

export const getSPO2Color = (spo2: number): string => {
  if (spo2 < 90) return Colors.danger;
  if (spo2 < 94) return Colors.warning;
  return Colors.success;
};

export const getSugarColor = (sugar: number): string => {
  if (sugar > 250 || sugar < 60) return Colors.danger;
  if (sugar > 180 || sugar < 80) return Colors.warning;
  return Colors.success;
};

export const getRRColor = (rr: number): string => {
  if (rr > 25 || rr < 10) return Colors.danger;
  if (rr > 20) return Colors.warning;
  return Colors.success;
};

export const isCriticalPatient = (vitals: {
  bp_systolic: number; heartRate: number; spo2: number; temperature: number;
}): boolean => {
  return (
    vitals.bp_systolic >= 180 ||
    vitals.heartRate > 130 ||
    vitals.heartRate < 45 ||
    vitals.spo2 < 90 ||
    vitals.temperature >= 40 ||
    vitals.temperature < 35
  );
};
