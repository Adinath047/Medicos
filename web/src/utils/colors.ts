export function getBPColor(systolic: number): string {
  if (systolic < 120) return '#22c55e';
  if (systolic < 140) return '#f59e0b';
  return '#ef4444';
}

export function getHRColor(hr: number): string {
  if (hr >= 60 && hr <= 100) return '#22c55e';
  if (hr >= 50 && hr <= 110) return '#f59e0b';
  return '#ef4444';
}

export function getSPO2Color(spo2: number): string {
  if (spo2 >= 96) return '#22c55e';
  if (spo2 >= 90) return '#f59e0b';
  return '#ef4444';
}

export function getTempColor(temp: number): string {
  if (temp >= 36.0 && temp <= 37.5) return '#22c55e';
  if (temp > 37.5 && temp <= 38.5) return '#f59e0b';
  return '#ef4444';
}

export function getStatusVariant(status: string): string {
  switch (status) {
    case 'Confirmed': case 'Active': case 'Completed': case 'Discharged': case 'PAID':
      return 'success';
    case 'Pending': case 'OPD': case 'IN_PROGRESS':
      return 'info';
    case 'Cancelled': case 'Inactive': case 'Maintenance':
      return 'danger';
    case 'Admitted': case 'READY_FOR_CHECKOUT':
      return 'warning';
    case 'Occupied':
      return 'info';
    case 'Available':
      return 'success';
    default:
      return 'neutral';
  }
}
