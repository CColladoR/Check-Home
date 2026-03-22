import { Task, DayOfWeek } from './types';

const daysOfWeek: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const dailyTasksBase = [
  { title: 'Hacer la cama y ventilar', assignee: 'Ambos', room: 'Dormitorio principal' },
  { title: 'Recoger encimeras y lavavajillas', assignee: 'Ambos', room: 'Cocina' },
  { title: 'Repaso rápido de mesas y cojines', assignee: 'Ambos', room: 'Salón' },
] as const;

const generatedDailyTasks: Task[] = daysOfWeek.flatMap(day => 
  dailyTasksBase.map((task, index) => ({
    id: `daily-${day.toLowerCase()}-${index}`,
    title: task.title,
    assignee: task.assignee,
    room: task.room,
    day: day,
    isCompleted: false
  }))
);

export const initialTasks: Task[] = [
  ...generatedDailyTasks,
  // Lunes
  { id: 'l1', title: 'Limpieza a fondo de encimeras y electrodomésticos', assignee: 'Laura', room: 'Cocina', day: 'Lunes', isCompleted: false },
  { id: 'l2', title: 'Limpiar polvo, ordenar mesa y aspirar', assignee: 'Laura', room: 'Despacho Laura', day: 'Lunes', isCompleted: false },
  { id: 'l3', title: 'Limpiar polvo, ordenar mesa y aspirar', assignee: 'Christian', room: 'Oficina Chris', day: 'Lunes', isCompleted: false },
  { id: 'l4', title: 'Limpieza de sanitarios, lavabo y espejo', assignee: 'Christian', room: 'Aseo', day: 'Lunes', isCompleted: false },

  // Martes
  { id: 'm1', title: 'Limpieza profunda (ducha, sanitarios, espejos)', assignee: 'Laura', room: 'Baño Lau', day: 'Martes', isCompleted: false },
  { id: 'm2', title: 'Limpieza profunda (ducha, sanitarios, espejos)', assignee: 'Christian', room: 'Baño Chris', day: 'Martes', isCompleted: false },
  { id: 'm3', title: 'Aspirar y fregar suelo', assignee: 'Laura', room: 'Dormitorio principal', day: 'Martes', isCompleted: false },
  { id: 'm4', title: 'Ordenar ropa, limpiar polvo y aspirar', assignee: 'Christian', room: 'Vestidor', day: 'Martes', isCompleted: false },

  // Miércoles
  { id: 'x1', title: 'Poner lavadoras, tender y doblar', assignee: 'Laura', room: 'Cuarto limpieza', day: 'Miércoles', isCompleted: false },
  { id: 'x2', title: 'Limpiar cristales y quitar polvo a fondo', assignee: 'Christian', room: 'Salón', day: 'Miércoles', isCompleted: false },
  { id: 'x3', title: 'Aspirar y fregar suelo', assignee: 'Laura', room: 'Pasillo (P+1)', day: 'Miércoles', isCompleted: false },
  { id: 'x4', title: 'Aspirar y fregar peldaños', assignee: 'Christian', room: 'Escaleras interiores', day: 'Miércoles', isCompleted: false },

  // Jueves
  { id: 'j1', title: 'Barrer y limpiar mobiliario exterior', assignee: 'Laura', room: 'Porche delantero', day: 'Jueves', isCompleted: false },
  { id: 'j2', title: 'Barrer y limpiar mobiliario exterior', assignee: 'Christian', room: 'Porche trasero', day: 'Jueves', isCompleted: false },
  { id: 'j3', title: 'Aspirar y fregar suelo a fondo', assignee: 'Laura', room: 'Cocina', day: 'Jueves', isCompleted: false },
  { id: 'j4', title: 'Aspirar y fregar suelo a fondo', assignee: 'Christian', room: 'Salón', day: 'Jueves', isCompleted: false },

  // Viernes
  { id: 'v1', title: 'Revisar caducidades, limpiar nevera y despensa', assignee: 'Laura', room: 'Cocina', day: 'Viernes', isCompleted: false },
  { id: 'v2', title: 'Barrer, regar plantas y ordenar', assignee: 'Christian', room: 'Patio', day: 'Viernes', isCompleted: false },
  { id: 'v3', title: 'Limpiar y organizar productos', assignee: 'Ambos', room: 'Cuarto limpieza', day: 'Viernes', isCompleted: false },
  { id: 'v4', title: 'Aspirar y fregar suelo', assignee: 'Ambos', room: 'Recibidor/pasillo', day: 'Viernes', isCompleted: false },

  // Sábado
  { id: 's1', title: 'Barrer y organizar herramientas/cajas', assignee: 'Christian', room: 'Garaje', day: 'Sábado', isCompleted: false },
  { id: 's2', title: 'Barrer o limpiar con manguera', assignee: 'Christian', room: 'Rampa garaje', day: 'Sábado', isCompleted: false },
  { id: 's3', title: 'Organizar cajas y limpiar polvo', assignee: 'Laura', room: 'Trastero', day: 'Sábado', isCompleted: false },
  { id: 's4', title: 'Mantenimiento general de plantas', assignee: 'Laura', room: 'Patio', day: 'Sábado', isCompleted: false },

  // Domingo
  { id: 'd5', title: 'Preparar menú semanal (Batch cooking)', assignee: 'Laura', room: 'Cocina', day: 'Domingo', isCompleted: false },
  { id: 'd6', title: 'Sacar basuras y organizar reciclaje', assignee: 'Christian', room: 'Cuarto limpieza', day: 'Domingo', isCompleted: false },
  { id: 'd7', title: 'Cambiar sábanas', assignee: 'Ambos', room: 'Dormitorio principal', day: 'Domingo', isCompleted: false },
];


