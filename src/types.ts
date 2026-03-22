export type Assignee = 'Laura' | 'Christian' | 'Ambos';
export type Room = 
  | 'Despacho Laura' 
  | 'Aseo' 
  | 'Porche delantero' 
  | 'Rampa garaje' 
  | 'Garaje' 
  | 'Cuarto limpieza' 
  | 'Cocina' 
  | 'Salón' 
  | 'Recibidor/pasillo' 
  | 'Escaleras interiores' 
  | 'Oficina Chris' 
  | 'Baño Chris' 
  | 'Baño Lau' 
  | 'Dormitorio principal' 
  | 'Vestidor' 
  | 'Pasillo (P+1)' 
  | 'Patio' 
  | 'Trastero' 
  | 'Porche trasero'
  | 'General';

export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export interface Task {
  id: string;
  title: string;
  assignee: Assignee;
  room: Room;
  day: DayOfWeek;
  isCompleted: boolean;
}

export interface LongTermTask {
  id: string;
  title: string;
  assignee: Assignee;
  date: string; // YYYY-MM-DD format
  isCompleted: boolean;
}

