export type ScheduleCategory = 'BALITA' | 'IBU_HAMIL' | 'LANSIA' | 'UMUM';

export const scheduleCategoryLabels: Record<ScheduleCategory, string> = {
  BALITA: 'Balita & Anak',
  IBU_HAMIL: 'Ibu Hamil',
  LANSIA: 'Lansia',
  UMUM: 'Umum',
};

export const scheduleCategoryKeys = Object.keys(scheduleCategoryLabels) as ScheduleCategory[];

export const agendaCode = (id: string) => `JDW-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
