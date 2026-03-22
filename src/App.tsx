import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, Calendar as CalendarIcon, ListTodo, User, MapPin, RotateCcw, Home, Moon, Sun, ArrowRight, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Umbrella, CalendarDays, Plus, X, ChevronLeft, ChevronRight, Settings, LogOut } from 'lucide-react';
import { Task, DayOfWeek, Assignee, LongTermTask, Room } from './types';
import { motion, AnimatePresence } from 'motion/react';

const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const JS_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ROOM_FLOORS: Record<string, 'Alta' | 'Baja' | 'Sótano'> = {
  'Despacho Laura': 'Alta',
  'Oficina Chris': 'Alta',
  'Baño Chris': 'Alta',
  'Baño Lau': 'Alta',
  'Dormitorio principal': 'Alta',
  'Vestidor': 'Alta',
  'Pasillo (P+1)': 'Alta',
  'Cocina': 'Baja',
  'Salón': 'Baja',
  'Recibidor/pasillo': 'Baja',
  'Escaleras interiores': 'Baja',
  'Aseo': 'Baja',
  'Porche delantero': 'Baja',
  'Porche trasero': 'Baja',
  'Garaje': 'Sótano',
  'Rampa garaje': 'Sótano',
  'Trastero': 'Sótano',
  'Cuarto limpieza': 'Sótano',
  'Patio': 'Sótano',
  'General': 'Baja'
};

interface GroupedTask {
  id: string;
  title: string;
  room: Room;
  assignee: Assignee;
  days: DayOfWeek[];
  taskIds: string[];
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [view, setView] = useState<'home' | 'tasks' | 'house' | 'calendar' | 'manage'>('home');
  const [currentUser, setCurrentUser] = useState<'Laura' | 'Christian'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('checkhome-user');
      if (saved === 'Laura' || saved === 'Christian') return saved;
    }
    return 'Laura';
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [longTermTasks, setLongTermTasks] = useState<LongTermTask[]>([]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      console.log('App: checkAuth result:', data);
      setIsAuthenticated(data.authenticated);
      return data.authenticated;
    } catch (err) {
      console.error('App: checkAuth error:', err);
      setIsAuthenticated(false);
      return false;
    }
  };

  useEffect(() => {
    console.log('App: Initial auth check');
    checkAuth();

    const handleMessage = (event: MessageEvent) => {
      console.log('App: Received message from event:', event.data);
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        console.log('App: Auth success message received, re-checking auth');
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (isAuthenticated === true) {
      const fetchData = async () => {
        try {
          const [tasksRes, longTermRes] = await Promise.all([
            fetch('/api/tasks'),
            fetch('/api/long-term-tasks')
          ]);
          if (tasksRes.ok && longTermRes.ok) {
            const tasksData = await tasksRes.json();
            const longTermData = await longTermRes.json();
            setTasks(tasksData);
            setLongTermTasks(longTermData);
          } else if (tasksRes.status === 401) {
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.error("Error fetching data:", err);
        }
      };
      fetchData();
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.open(url, 'google_login', 'width=500,height=600');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setTasks([]);
      setLongTermTasks([]);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const [isAddingLongTerm, setIsAddingLongTerm] = useState(false);
  const [newLongTermTask, setNewLongTermTask] = useState({ title: '', assignee: 'Ambos' as Assignee, date: '' });
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingGroupedTask, setEditingGroupedTask] = useState<GroupedTask | null>(null);
  const [editingLongTermTask, setEditingLongTermTask] = useState<LongTermTask | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState<{ title: string, assignee: Assignee, room: Room, days: DayOfWeek[] }>({ title: '', assignee: 'Ambos', room: 'General' as any, days: ['Lunes'] });

  const currentUserTasks = useMemo(() => {
    return tasks.filter(t => t.assignee === currentUser);
  }, [tasks, currentUser]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, GroupedTask> = {};
    tasks.forEach(task => {
      const key = `${task.title}-${task.room}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          title: task.title,
          room: task.room,
          assignee: task.assignee,
          days: [],
          taskIds: []
        };
      }
      if (!groups[key].days.includes(task.day)) {
        groups[key].days.push(task.day);
      }
      groups[key].taskIds.push(task.id);
    });
    return Object.values(groups);
  }, [tasks]);

  const roomProgress = useMemo(() => {
    const rooms: Record<string, { total: number, completed: number }> = {};
    tasks.forEach(task => {
      if (!rooms[task.room]) {
        rooms[task.room] = { total: 0, completed: 0 };
      }
      rooms[task.room].total++;
      if (task.isCompleted) {
        rooms[task.room].completed++;
      }
    });
    return rooms;
  }, [tasks]);

  const stats = useMemo(() => {
    const s = {
      Laura: { total: 0, completed: 0 },
      Christian: { total: 0, completed: 0 },
      Ambos: { total: 0, completed: 0 }
    };
    tasks.forEach(t => {
      if (s[t.assignee]) {
        s[t.assignee].total++;
        if (t.isCompleted) s[t.assignee].completed++;
      }
    });
    return s;
  }, [tasks]);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('checkhome-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [weather, setWeather] = useState<{ temp: number, code: number, precipProb: number } | null>(null);

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=40.1219&longitude=-3.8483&current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=Europe%2FMadrid')
      .then(res => res.json())
      .then(data => {
        if (data.current && data.daily) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
            precipProb: data.daily.precipitation_probability_max[0]
          });
        }
      })
      .catch(err => console.error("Error fetching weather:", err));
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('checkhome-user', currentUser);
    } else {
      localStorage.removeItem('checkhome-user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('checkhome-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('checkhome-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const updatedTask = { ...task, isCompleted: !task.isCompleted };
    setTasks(tasks.map(t => t.id === id ? updatedTask : t));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const toggleLongTermTask = async (id: string) => {
    const task = longTermTasks.find(t => t.id === id);
    if (!task) return;
    const updatedTask = { ...task, isCompleted: !task.isCompleted };
    setLongTermTasks(longTermTasks.map(t => t.id === id ? updatedTask : t));
    try {
      await fetch(`/api/long-term-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });
    } catch (err) {
      console.error("Error updating long term task:", err);
    }
  };

  const addLongTermTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLongTermTask.title || !newLongTermTask.date) return;

    const newTaskObj: LongTermTask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newLongTermTask.title,
      assignee: newLongTermTask.assignee,
      date: newLongTermTask.date,
      isCompleted: false
    };

    setLongTermTasks([...longTermTasks, newTaskObj]);
    setNewLongTermTask({ title: '', assignee: 'Ambos', date: '' });
    setIsAddingLongTerm(false);

    try {
      await fetch('/api/long-term-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskObj)
      });
    } catch (err) {
      console.error("Error adding long term task:", err);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || newTask.days.length === 0) return;

    const newTasksObj: Task[] = newTask.days.map(day => ({
      id: Math.random().toString(36).substring(2, 9),
      title: newTask.title,
      assignee: newTask.assignee,
      room: newTask.room,
      day: day,
      isCompleted: false
    }));

    setTasks([...tasks, ...newTasksObj]);
    setNewTask({ title: '', assignee: 'Ambos', room: 'General' as any, days: ['Lunes'] });
    setIsAddingTask(false);

    try {
      await Promise.all(newTasksObj.map(task => 
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        })
      ));
    } catch (err) {
      console.error("Error adding tasks:", err);
    }
  };

  const saveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title) return;
    
    setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t));
    setEditingTask(null);

    try {
      await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTask)
      });
    } catch (err) {
      console.error("Error saving edited task:", err);
    }
  };

  const saveEditedGroupedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupedTask || !editingGroupedTask.title || editingGroupedTask.days.length === 0) return;
    
    const taskIdsToDelete = editingGroupedTask.taskIds;
    const remainingTasks = tasks.filter(t => !taskIdsToDelete.includes(t.id));
    
    const newTasksObj: Task[] = editingGroupedTask.days.map(day => {
      const existingTask = tasks.find(t => taskIdsToDelete.includes(t.id) && t.day === day);
      return {
        id: existingTask ? existingTask.id : Math.random().toString(36).substring(2, 9),
        title: editingGroupedTask.title,
        room: editingGroupedTask.room,
        assignee: editingGroupedTask.assignee,
        day: day,
        isCompleted: existingTask ? existingTask.isCompleted : false
      };
    });
    
    setTasks([...remainingTasks, ...newTasksObj]);
    setEditingGroupedTask(null);

    try {
      // Delete old tasks
      await Promise.all(taskIdsToDelete.map(id => 
        fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      ));
      // Add new tasks
      await Promise.all(newTasksObj.map(task => 
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        })
      ));
    } catch (err) {
      console.error("Error saving edited grouped task:", err);
    }
  };

  const deleteGroupedTask = async (taskIds: string[]) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      setTasks(tasks.filter(t => !taskIds.includes(t.id)));
      setEditingGroupedTask(null);

      try {
        await Promise.all(taskIds.map(id => 
          fetch(`/api/tasks/${id}`, { method: 'DELETE' })
        ));
      } catch (err) {
        console.error("Error deleting tasks:", err);
      }
    }
  };

  const saveEditedLongTermTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLongTermTask || !editingLongTermTask.title) return;
    
    setLongTermTasks(longTermTasks.map(t => t.id === editingLongTermTask.id ? editingLongTermTask : t));
    setEditingLongTermTask(null);

    try {
      await fetch(`/api/long-term-tasks/${editingLongTermTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLongTermTask)
      });
    } catch (err) {
      console.error("Error saving edited long term task:", err);
    }
  };

  const deleteTask = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      setTasks(tasks.filter(t => t.id !== id));
      setEditingTask(null);

      try {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };

  const deleteLongTermTask = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      setLongTermTasks(longTermTasks.filter(t => t.id !== id));
      setEditingLongTermTask(null);

      try {
        await fetch(`/api/long-term-tasks/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error("Error deleting long term task:", err);
      }
    }
  };

  const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };
  
  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const resetWeek = async () => {
    if (window.confirm('¿Estás seguro de que quieres reiniciar todas las tareas?')) {
      const updatedTasks = tasks.map(t => ({ ...t, isCompleted: false }));
      setTasks(updatedTasks);
      try {
        await Promise.all(updatedTasks.map(task => 
          fetch(`/api/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
          })
        ));
      } catch (err) {
        console.error("Error resetting week:", err);
      }
    }
  };

  const getWeatherInfo = (code: number) => {
    if (code === 0) return { icon: Sun, text: 'Despejado' };
    if (code === 1 || code === 2) return { icon: Cloud, text: 'Poco nublado' };
    if (code === 3) return { icon: Cloud, text: 'Nublado' };
    if (code === 45 || code === 48) return { icon: CloudFog, text: 'Niebla' };
    if (code >= 51 && code <= 67) return { icon: CloudRain, text: 'Lluvia' };
    if (code >= 71 && code <= 77) return { icon: CloudSnow, text: 'Nieve' };
    if (code >= 80 && code <= 82) return { icon: CloudRain, text: 'Chubascos' };
    if (code >= 85 && code <= 86) return { icon: CloudSnow, text: 'Chubascos de nieve' };
    if (code >= 95) return { icon: CloudLightning, text: 'Tormenta' };
    return { icon: Sun, text: 'Despejado' };
  };

  const progress = Math.round((currentUserTasks.filter(t => t.isCompleted).length / currentUserTasks.length) * 100) || 0;

  const today = new Date();
  const currentDayName = JS_DAYS[today.getDay()];
  
  const todayTasks = currentUserTasks.filter(t => t.day === currentDayName);
  const pendingToday = todayTasks.filter(t => !t.isCompleted).length;

  const dateString = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-greige-200 dark:bg-black flex items-center justify-center">
        <div className="text-tortola-900 dark:text-greige-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-tortola-900 dark:border-greige-100 border-t-transparent rounded-full animate-spin" />
          <p className="font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-greige-200 dark:bg-black flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-greige-100 dark:bg-greige-900 rounded-[2.5rem] p-10 shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-tortola-900 dark:bg-greige-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg rotate-3">
            <Home className="w-10 h-10 text-white dark:text-tortola-900" />
          </div>
          
          <h1 className="text-3xl font-bold text-tortola-900 dark:text-greige-100 mb-4 tracking-tight">Check home</h1>
          <p className="text-tortola-500 dark:text-greige-400 mb-10 leading-relaxed">
            Gestor de tareas de limpieza minimalista.<br />
            Tus datos se guardarán de forma segura en tu Google Drive.
          </p>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-white dark:bg-tortola-950 text-tortola-900 dark:text-greige-100 font-semibold py-4 px-6 rounded-2xl shadow-sm border border-greige-200 dark:border-tortola-800 flex items-center justify-center gap-3 hover:bg-greige-50 dark:hover:bg-tortola-900 transition-all active:scale-[0.98]"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Iniciar sesión con Google
          </button>
          
          <p className="mt-8 text-xs text-tortola-400 dark:text-greige-500">
            Al iniciar sesión, concedes permiso para gestionar el archivo de base de datos en tu Google Drive.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-greige-200 dark:bg-black flex justify-center selection:bg-greige-200 dark:selection:bg-tortola-800 transition-colors duration-200">
      <div className="w-full max-w-md bg-greige-100 dark:bg-greige-900 min-h-screen shadow-2xl relative pb-20 flex flex-col overflow-x-hidden">
        <header className="px-5 h-16 flex items-center justify-between shrink-0 sticky top-0 z-40 bg-greige-100/90 dark:bg-greige-900/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative inline-flex">
              <Home className="w-6 h-6 text-tortola-900 dark:text-greige-100" />
              <div className="absolute -bottom-1 -right-1 bg-greige-100 dark:bg-greige-900 rounded-full p-[1px] transition-colors duration-200">
                <CheckCircle2 className="w-3 h-3 text-tortola-900 dark:text-greige-100" />
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Check home</h1>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={handleLogout}
              className="p-2 text-tortola-400 dark:text-greige-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-greige-200 dark:hover:bg-tortola-800 rounded-full transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-tortola-400 dark:text-greige-500 hover:text-tortola-900 dark:hover:text-greige-100 hover:bg-greige-200 dark:hover:bg-tortola-800 rounded-full transition-colors"
              title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {view === 'tasks' && (
              <button 
                onClick={resetWeek}
                className="p-2 text-tortola-400 dark:text-greige-500 hover:text-tortola-900 dark:hover:text-greige-100 hover:bg-greige-200 dark:hover:bg-tortola-800 rounded-full transition-colors"
                title="Reiniciar semana"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-5 py-6">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative flex w-40 bg-greige-200 dark:bg-tortola-800 rounded-full p-1 mb-6">
                  <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-tortola-900 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${currentUser === 'Christian' ? 'translate-x-full' : 'translate-x-0'}`}
                  />
                  <button
                    onClick={() => setCurrentUser('Laura')}
                    className={`relative flex-1 py-1.5 text-sm font-medium rounded-full transition-colors z-10 ${currentUser === 'Laura' ? 'text-tortola-900 dark:text-greige-100' : 'text-tortola-500 dark:text-greige-400'}`}
                  >
                    Lau
                  </button>
                  <button
                    onClick={() => setCurrentUser('Christian')}
                    className={`relative flex-1 py-1.5 text-sm font-medium rounded-full transition-colors z-10 ${currentUser === 'Christian' ? 'text-tortola-900 dark:text-greige-100' : 'text-tortola-500 dark:text-greige-400'}`}
                  >
                    Chris
                  </button>
                </div>

                <h2 className="text-xl font-light text-tortola-400 dark:text-greige-500 mb-1">
                  Hola, {currentUser === 'Laura' ? 'Lau' : 'Chris'} 👋
                </h2>
                <h1 className="text-4xl font-semibold tracking-tight text-tortola-900 dark:text-greige-100 mb-6 capitalize leading-tight">
                  {dateString}
                </h1>
                
                {weather && (
                  <div className="flex flex-col items-center justify-center gap-2 mb-8 w-full">
                    <div className="flex items-center gap-2 text-tortola-600 dark:text-greige-300 bg-white dark:bg-tortola-950 px-4 py-2.5 rounded-2xl shadow-sm w-full justify-center">
                      {(() => {
                        const { icon: WeatherIcon, text } = getWeatherInfo(weather.code);
                        return (
                          <>
                            <WeatherIcon className="w-4 h-4 text-tortola-500 dark:text-greige-400" />
                            <span className="text-xl font-semibold">{weather.temp}°</span>
                            <span className="text-xs font-light mx-1 text-tortola-300 dark:text-tortola-600">|</span>
                            <span className="text-sm font-medium">{text}</span>
                          </>
                        );
                      })()}
                    </div>
                    
                    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium transition-colors w-full ${
                      weather.precipProb > 30 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50' 
                        : 'bg-white text-tortola-600 dark:bg-tortola-950 dark:text-greige-300 shadow-sm'
                    }`}>
                      <Umbrella className="w-4 h-4" />
                      <span>{weather.precipProb}% lluvia</span>
                      {weather.precipProb > 30 && (
                        <span className="ml-1 text-xs opacity-80">(¡Ojo exterior!)</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="bg-white dark:bg-tortola-950 rounded-3xl p-5 shadow-sm w-full text-left mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-tortola-900 dark:text-greige-100">Tareas de hoy</h3>
                    <span className="bg-greige-100 dark:bg-tortola-800 text-tortola-600 dark:text-greige-300 text-xs font-bold px-2.5 py-1 rounded-full">
                      {pendingToday} pendientes
                    </span>
                  </div>
                  
                  {todayTasks.length === 0 ? (
                    <p className="text-center text-tortola-400 dark:text-greige-500 py-4">No hay tareas para hoy.</p>
                  ) : pendingToday === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-12 h-12 mb-2 opacity-80" />
                      <p className="font-medium text-center">¡Todo listo para hoy! 🎉</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayTasks.map(task => (
                        <div 
                          key={task.id} 
                          onClick={() => toggleTask(task.id)}
                          className={`group flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${
                            task.isCompleted 
                              ? 'bg-greige-50 dark:bg-tortola-900/30 opacity-70' 
                              : 'bg-greige-100 dark:bg-tortola-800/50 hover:bg-greige-200 dark:hover:bg-tortola-800'
                          }`}
                        >
                          <button className="mt-0.5 shrink-0 text-tortola-400 dark:text-greige-500 transition-colors">
                            {task.isCompleted ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <Circle className="w-6 h-6" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-base font-medium leading-tight transition-colors mb-1.5 ${task.isCompleted ? 'text-tortola-400 dark:text-greige-600 line-through' : 'text-tortola-800 dark:text-greige-200'}`}>
                              {task.title}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-white dark:bg-tortola-900 text-tortola-500 dark:text-greige-400 shadow-sm">
                                {task.room}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            
            {view === 'tasks' && (
              <motion.div 
                key="tasks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col w-full pb-6"
              >
                <div className="bg-white dark:bg-tortola-950 rounded-3xl p-5 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-semibold text-tortola-900 dark:text-greige-100">Progreso Semanal</h2>
                    <span className="text-lg font-bold text-tortola-600 dark:text-greige-300">{progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-greige-100 dark:bg-tortola-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-tortola-900 dark:bg-greige-100 transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  {(() => {
                    const currentDayIndex = DAYS.indexOf(currentDayName as DayOfWeek);
                    const orderedDays = [...DAYS.slice(currentDayIndex), ...DAYS.slice(0, currentDayIndex)];
                    
                    return orderedDays.map(day => {
                      const dayTasks = currentUserTasks.filter(t => t.day === day);
                      if (dayTasks.length === 0) return null;
                      
                      const isToday = day === currentDayName;
                      const dayProgress = Math.round((dayTasks.filter(t => t.isCompleted).length / dayTasks.length) * 100) || 0;
                      const isFullyCompleted = dayProgress === 100;

                      return (
                      <div key={day} className={`bg-white dark:bg-tortola-950 rounded-3xl p-5 shadow-sm border-2 transition-colors ${isToday ? 'border-tortola-300 dark:border-tortola-600' : 'border-transparent'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-tortola-900 dark:text-greige-100">
                              {day}
                            </h3>
                            {isToday && (
                              <span className="bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">
                                Hoy
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isFullyCompleted ? (
                              <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Completado</span>
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-tortola-400 dark:text-greige-500">
                                {dayProgress}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {dayTasks.map(task => (
                            <div 
                              key={task.id}
                              onClick={() => toggleTask(task.id)}
                              className={`group flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98] ${
                                task.isCompleted 
                                  ? 'bg-greige-50 dark:bg-tortola-900/30 opacity-70' 
                                  : 'bg-greige-100 dark:bg-tortola-800/50 hover:bg-greige-200 dark:hover:bg-tortola-800'
                              }`}
                            >
                              <button className="mt-0.5 shrink-0 text-tortola-400 dark:text-greige-500 transition-colors">
                                {task.isCompleted ? (
                                  <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                                ) : (
                                  <Circle className="w-6 h-6" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-base font-medium leading-tight transition-colors mb-2 ${task.isCompleted ? 'text-tortola-400 dark:text-greige-600 line-through' : 'text-tortola-800 dark:text-greige-200'}`}>
                                  {task.title}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-white dark:bg-tortola-900 text-tortola-500 dark:text-greige-400 shadow-sm">
                                    {task.room}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
            )}

            {view === 'house' && (
              <motion.div 
                key="house"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col w-full pb-6"
              >
                <div className="bg-white dark:bg-tortola-950 rounded-3xl p-5 shadow-sm mb-6">
                  <h2 className="text-xl font-semibold text-tortola-900 dark:text-greige-100 mb-4">Estado de la casa</h2>
                  <p className="text-sm text-tortola-500 dark:text-greige-400 mb-6">
                    Progreso de limpieza por estancias y plantas.
                  </p>
                  
                  <div className="space-y-8">
                    {(['Alta', 'Baja', 'Sótano'] as const).map(floor => {
                      const floorRooms = Object.keys(ROOM_FLOORS).filter(r => ROOM_FLOORS[r] === floor);
                      const floorTasks = tasks.filter(t => floorRooms.includes(t.room));
                      const floorProgress = Math.round((floorTasks.filter(t => t.isCompleted).length / floorTasks.length) * 100) || 0;

                      return (
                        <div key={floor} className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-tortola-800 dark:text-greige-200 flex items-center gap-2">
                              <Home className="w-5 h-5" />
                              Planta {floor}
                            </h3>
                            <span className="text-sm font-bold text-tortola-500 dark:text-greige-400">{floorProgress}%</span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {floorRooms.map(room => {
                              const progress = roomProgress[room];
                              if (!progress) return null;
                              const percent = Math.round((progress.completed / progress.total) * 100);
                              
                              return (
                                <div 
                                  key={room}
                                  className="bg-greige-50 dark:bg-tortola-900/30 rounded-2xl p-4 border border-greige-200 dark:border-tortola-800"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-tortola-900 dark:text-greige-100">{room}</span>
                                    <span className="text-xs font-bold text-tortola-500 dark:text-greige-400">{percent}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-greige-200 dark:bg-tortola-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-tortola-400 dark:bg-greige-500'}`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <div className="mt-2 flex justify-between items-center">
                                    <span className="text-[10px] text-tortola-400 dark:text-greige-500 uppercase tracking-wider">
                                      {progress.completed}/{progress.total} tareas
                                    </span>
                                    {percent === 100 && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'calendar' && (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col w-full pb-6"
              >
                <div className="bg-white dark:bg-tortola-950 rounded-3xl p-5 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-tortola-900 dark:text-greige-100">Calendario 2026</h2>
                    <button 
                      onClick={() => setIsAddingLongTerm(true)}
                      className="bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 p-2 rounded-full shadow-sm"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-tortola-500 dark:text-greige-400 mb-6">
                    Tareas a largo plazo (cada varios meses o anuales).
                  </p>

                  {isAddingLongTerm && (
                    <div className="mb-6 bg-greige-50 dark:bg-tortola-900/50 p-4 rounded-2xl border border-greige-200 dark:border-tortola-800">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-tortola-900 dark:text-greige-100">Nueva tarea</h3>
                        <button onClick={() => setIsAddingLongTerm(false)} className="text-tortola-400">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <form onSubmit={addLongTermTask} className="space-y-3">
                        <div>
                          <input 
                            type="text" 
                            placeholder="Ej. Limpiar trastero" 
                            value={newLongTermTask.title}
                            onChange={e => setNewLongTermTask({...newLongTermTask, title: e.target.value})}
                            className="w-full bg-white dark:bg-tortola-950 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                            required
                          />
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="date" 
                            value={newLongTermTask.date}
                            min="2026-01-01"
                            max="2026-12-31"
                            onChange={e => setNewLongTermTask({...newLongTermTask, date: e.target.value})}
                            className="flex-1 bg-white dark:bg-tortola-950 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                            required
                          />
                          <select 
                            value={newLongTermTask.assignee}
                            onChange={e => setNewLongTermTask({...newLongTermTask, assignee: e.target.value as Assignee})}
                            className="flex-1 bg-white dark:bg-tortola-950 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                          >
                            <option value="Laura">Laura</option>
                            <option value="Christian">Christian</option>
                            <option value="Ambos">Ambos</option>
                          </select>
                        </div>
                        <button 
                          type="submit"
                          className="w-full bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 font-medium rounded-xl py-2 text-sm"
                        >
                          Añadir
                        </button>
                      </form>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between bg-greige-50 dark:bg-tortola-900/30 rounded-2xl p-4 mb-6">
                    <button 
                      onClick={prevMonth} 
                      className="p-2 text-tortola-500 hover:text-tortola-900 dark:text-greige-400 dark:hover:text-greige-100 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-tortola-900 dark:text-greige-100 capitalize">
                        {MONTHS[selectedMonth]} {selectedYear}
                      </h3>
                      <p className="text-xs text-tortola-500 dark:text-greige-400 font-medium mt-1">
                        {longTermTasks.filter(t => new Date(t.date).getMonth() === selectedMonth && new Date(t.date).getFullYear() === selectedYear).length} tareas
                      </p>
                    </div>
                    <button 
                      onClick={nextMonth} 
                      className="p-2 text-tortola-500 hover:text-tortola-900 dark:text-greige-400 dark:hover:text-greige-100 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>

                  {(() => {
                    const firstDay = (new Date(selectedYear, selectedMonth, 1).getDay() + 6) % 7;
                    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                    
                    const days = [];
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<div key={`empty-${i}`} className="h-10"></div>);
                    }
                    
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const dayOfWeek = JS_DAYS[new Date(selectedYear, selectedMonth, d).getDay()];
                      const hasLongTermTask = longTermTasks.some(t => t.date === dateStr);
                      const hasRegularTask = tasks.some(t => t.day === dayOfWeek);
                      const hasTask = hasLongTermTask || hasRegularTask;
                      
                      // Use local timezone for today's date to avoid UTC mismatch
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const isToday = todayStr === dateStr;
                      
                      days.push(
                        <button 
                          key={d} 
                          onClick={() => setSelectedCalendarDate(dateStr)}
                          className={`relative flex items-center justify-center h-10 rounded-xl transition-colors hover:bg-greige-100 dark:hover:bg-tortola-800/50 ${isToday ? 'bg-tortola-100 dark:bg-tortola-800' : ''}`}
                        >
                          <span className={`text-sm ${isToday ? 'font-bold text-tortola-900 dark:text-greige-100' : 'text-tortola-700 dark:text-greige-300'}`}>{d}</span>
                          {hasTask && (
                            <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-tortola-900 dark:bg-tortola-400"></div>
                          )}
                        </button>
                      );
                    }

                    return (
                      <div className="mb-6 bg-white dark:bg-tortola-950 rounded-3xl p-5 shadow-sm border border-greige-100 dark:border-tortola-800">
                        <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                            <div key={day} className="text-xs font-semibold text-tortola-400 dark:text-greige-500">{day}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {days}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-4">
                    {longTermTasks.filter(t => new Date(t.date).getMonth() === selectedMonth && new Date(t.date).getFullYear() === selectedYear).length === 0 ? (
                      <div className="text-center py-10 bg-greige-50/50 dark:bg-tortola-900/20 rounded-2xl border-2 border-dashed border-greige-200 dark:border-tortola-800">
                        <CalendarDays className="w-10 h-10 mx-auto text-tortola-300 dark:text-tortola-600 mb-3" />
                        <p className="text-sm text-tortola-500 dark:text-greige-400">
                          No hay tareas para este mes.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {longTermTasks
                          .filter(t => new Date(t.date).getMonth() === selectedMonth && new Date(t.date).getFullYear() === selectedYear)
                          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                          .map(task => (
                          <div 
                            key={task.id}
                            className={`flex items-start p-3 rounded-2xl border transition-all ${
                              task.isCompleted 
                                ? 'bg-greige-50/50 dark:bg-tortola-900/20 border-transparent' 
                                : 'bg-white dark:bg-tortola-900 border-greige-200 dark:border-tortola-800 shadow-sm'
                            }`}
                          >
                            <button 
                              onClick={() => toggleLongTermTask(task.id)}
                              className="mt-0.5 mr-3 flex-shrink-0 focus:outline-none"
                            >
                              {task.isCompleted ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-tortola-300 dark:text-tortola-600" />
                              )}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${
                                task.isCompleted 
                                  ? 'text-tortola-400 dark:text-greige-500 line-through' 
                                  : 'text-tortola-900 dark:text-greige-100'
                              }`}>
                                {task.title}
                              </p>
                              <div className="flex items-center mt-1.5 space-x-2">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-greige-100 dark:bg-tortola-800 text-tortola-600 dark:text-greige-300">
                                  {new Date(task.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-tortola-100 dark:bg-tortola-800/80 text-tortola-700 dark:text-greige-300">
                                  <User className="w-3 h-3 mr-1" />
                                  {task.assignee}
                                </span>
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => deleteLongTermTask(task.id)}
                              className="ml-2 p-1 text-tortola-300 hover:text-red-500 dark:text-tortola-600 dark:hover:text-red-400 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'manage' && (
              <motion.div 
                key="manage"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col w-full pb-24"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-tortola-900 dark:text-greige-100">Gestión de Tareas</h2>
                  <button 
                    onClick={() => setIsAddingTask(true)}
                    className="p-2 bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 rounded-full shadow-md hover:scale-105 transition-transform"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                  {(['Laura', 'Christian', 'Ambos'] as const).map(user => (
                    <div key={user} className="bg-white dark:bg-tortola-950 p-3 rounded-2xl shadow-sm border border-greige-100 dark:border-tortola-800 text-center">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-tortola-400 dark:text-greige-500 mb-1">{user}</p>
                      <p className="text-lg font-bold text-tortola-900 dark:text-greige-100">{stats[user].completed}/{stats[user].total}</p>
                      <div className="w-full h-1 bg-greige-100 dark:bg-tortola-800 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="h-full bg-tortola-900 dark:bg-greige-100"
                          style={{ width: `${Math.round((stats[user].completed / stats[user].total) * 100) || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {isAddingTask && (
                  <div className="mb-6 bg-greige-50 dark:bg-tortola-900/50 p-4 rounded-2xl border border-greige-200 dark:border-tortola-800">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-tortola-900 dark:text-greige-100">Nueva tarea</h3>
                      <button onClick={() => setIsAddingTask(false)} className="text-tortola-400">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={addTask} className="space-y-3">
                      <input 
                        type="text"
                        placeholder="Título de la tarea"
                        value={newTask.title}
                        onChange={e => setNewTask({...newTask, title: e.target.value})}
                        className="w-full bg-white dark:bg-tortola-950 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                        required
                      />
                      <div className="flex gap-2">
                        <select 
                          value={newTask.days.length === 7 ? 'Diario' : newTask.days[0]}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'Diario') {
                              setNewTask({...newTask, days: [...DAYS]});
                            } else {
                              setNewTask({...newTask, days: [val as DayOfWeek]});
                            }
                          }}
                          className="flex-1 bg-white dark:bg-tortola-950 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                        >
                          <option value="Diario">Diario</option>
                          {DAYS.map(d => <option key={d} value={d}>Semanal ({d})</option>)}
                        </select>
                        <select 
                          value={newTask.assignee}
                          onChange={e => setNewTask({...newTask, assignee: e.target.value as Assignee})}
                          className="flex-1 bg-white dark:bg-tortola-950 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                        >
                          <option value="Laura">Laura</option>
                          <option value="Christian">Christian</option>
                          <option value="Ambos">Ambos</option>
                        </select>
                      </div>
                      <select 
                        value={newTask.room}
                        onChange={e => setNewTask({...newTask, room: e.target.value as Room})}
                        className="w-full bg-white dark:bg-tortola-950 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                        required
                      >
                        <option value="" disabled>Seleccionar estancia</option>
                        {Object.keys(ROOM_FLOORS).sort().map(room => (
                          <option key={room} value={room}>{room}</option>
                        ))}
                      </select>
                      <button 
                        type="submit"
                        className="w-full bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 font-medium rounded-xl py-2 text-sm"
                      >
                        Añadir
                      </button>
                    </form>
                  </div>
                )}

                <div className="space-y-3">
                  {groupedTasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={() => setEditingGroupedTask(task)}
                      className="bg-white dark:bg-tortola-950 rounded-2xl p-4 shadow-sm border border-greige-100 dark:border-tortola-800 cursor-pointer hover:border-tortola-300 dark:hover:border-tortola-600 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                          <h4 className="font-medium text-tortola-900 dark:text-greige-100 mb-1">{task.title}</h4>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-tortola-500 dark:text-greige-400 font-medium">
                              Frecuencia: {task.days.length === 7 ? 'Diario' : task.days.length === 1 ? `Semanal (${task.days[0]})` : `${task.days.length} días/semana`}
                            </span>
                            <span className="text-tortola-300 dark:text-tortola-600">•</span>
                            <span className="text-tortola-500 dark:text-greige-400">{task.room}</span>
                            <span className="text-tortola-300 dark:text-tortola-600">•</span>
                            <span className="text-tortola-500 dark:text-greige-400">{task.assignee}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-tortola-300 dark:text-tortola-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Day Details Modal */}
        <AnimatePresence>
          {selectedCalendarDate && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[55] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-tortola-950 rounded-3xl p-6 w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-tortola-900 dark:text-greige-100 capitalize">
                    {new Date(selectedCalendarDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <button onClick={() => setSelectedCalendarDate(null)} className="text-tortola-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Tareas Semanales */}
                  <div>
                    <h4 className="text-sm font-semibold text-tortola-500 dark:text-greige-400 mb-3 uppercase tracking-wider">Tareas Semanales</h4>
                    <div className="space-y-2">
                      {tasks.filter(t => t.day === JS_DAYS[new Date(selectedCalendarDate).getDay()]).map(task => (
                        <div 
                          key={task.id}
                          onClick={() => setEditingTask(task)}
                          className="bg-greige-50 dark:bg-tortola-900/50 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-greige-100 dark:hover:bg-tortola-800/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-tortola-900 dark:text-greige-100 text-sm">{task.title}</p>
                            <p className="text-xs text-tortola-500 dark:text-greige-400">{task.room} • {task.assignee}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-tortola-400" />
                        </div>
                      ))}
                      {tasks.filter(t => t.day === JS_DAYS[new Date(selectedCalendarDate).getDay()]).length === 0 && (
                        <p className="text-sm text-tortola-400 dark:text-greige-500 italic">No hay tareas semanales para este día.</p>
                      )}
                    </div>
                  </div>

                  {/* Tareas Puntuales */}
                  <div>
                    <h4 className="text-sm font-semibold text-tortola-500 dark:text-greige-400 mb-3 uppercase tracking-wider">Tareas Puntuales</h4>
                    <div className="space-y-2">
                      {longTermTasks.filter(t => t.date === selectedCalendarDate).map(task => (
                        <div 
                          key={task.id}
                          onClick={() => setEditingLongTermTask(task)}
                          className="bg-greige-50 dark:bg-tortola-900/50 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-greige-100 dark:hover:bg-tortola-800/50 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-tortola-900 dark:text-greige-100 text-sm">{task.title}</p>
                            <p className="text-xs text-tortola-500 dark:text-greige-400">{task.assignee}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-tortola-400" />
                        </div>
                      ))}
                      {longTermTasks.filter(t => t.date === selectedCalendarDate).length === 0 && (
                        <p className="text-sm text-tortola-400 dark:text-greige-500 italic">No hay tareas puntuales para este día.</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => {
                        setNewTask({ ...newTask, day: JS_DAYS[new Date(selectedCalendarDate).getDay()] as DayOfWeek });
                        setIsAddingTask(true);
                        setSelectedCalendarDate(null);
                        setView('manage');
                      }}
                      className="flex-1 bg-tortola-100 dark:bg-tortola-800 text-tortola-900 dark:text-greige-100 font-medium rounded-xl py-2.5 text-sm text-center transition-colors hover:bg-tortola-200 dark:hover:bg-tortola-700"
                    >
                      + Semanal
                    </button>
                    <button 
                      onClick={() => {
                        setNewLongTermTask({ ...newLongTermTask, date: selectedCalendarDate });
                        setIsAddingLongTerm(true);
                        setSelectedCalendarDate(null);
                      }}
                      className="flex-1 bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 font-medium rounded-xl py-2.5 text-sm text-center transition-transform hover:scale-105"
                    >
                      + Puntual
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Grouped Task Modal */}
        <AnimatePresence>
          {editingGroupedTask && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-tortola-950 rounded-3xl p-6 w-full max-w-sm shadow-xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-tortola-900 dark:text-greige-100">Editar Tarea</h3>
                  <button onClick={() => setEditingGroupedTask(null)} className="text-tortola-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={saveEditedGroupedTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Título</label>
                    <input 
                      type="text"
                      value={editingGroupedTask.title}
                      onChange={e => setEditingGroupedTask({...editingGroupedTask, title: e.target.value})}
                      className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Frecuencia / Día</label>
                      <select 
                        value={editingGroupedTask.days.length === 7 ? 'Diario' : editingGroupedTask.days[0]}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === 'Diario') {
                            setEditingGroupedTask({...editingGroupedTask, days: [...DAYS]});
                          } else {
                            setEditingGroupedTask({...editingGroupedTask, days: [val as DayOfWeek]});
                          }
                        }}
                        className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                      >
                        <option value="Diario">Diario</option>
                        {DAYS.map(d => <option key={d} value={d}>Semanal ({d})</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Asignado a</label>
                      <select 
                        value={editingGroupedTask.assignee}
                        onChange={e => setEditingGroupedTask({...editingGroupedTask, assignee: e.target.value as Assignee})}
                        className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                      >
                        <option value="Laura">Laura</option>
                        <option value="Christian">Christian</option>
                        <option value="Ambos">Ambos</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Estancia</label>
                    <select 
                      value={editingGroupedTask.room}
                      onChange={e => setEditingGroupedTask({...editingGroupedTask, room: e.target.value as Room})}
                      className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                      required
                    >
                      {Object.keys(ROOM_FLOORS).sort().map(room => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => deleteGroupedTask(editingGroupedTask.taskIds)}
                      className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl py-2 text-sm"
                    >
                      Eliminar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 font-medium rounded-xl py-2 text-sm"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Task Modal */}
        <AnimatePresence>
          {editingTask && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-tortola-950 rounded-3xl p-6 w-full max-w-sm shadow-xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-tortola-900 dark:text-greige-100">Editar Tarea</h3>
                  <button onClick={() => setEditingTask(null)} className="text-tortola-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={saveEditedTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Título</label>
                    <input 
                      type="text"
                      value={editingTask.title}
                      onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                      className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Frecuencia / Día</label>
                    <select 
                      value={editingTask.day}
                      onChange={e => setEditingTask({...editingTask, day: e.target.value as DayOfWeek})}
                      className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                    >
                      {DAYS.map(d => <option key={d} value={d}>Semanal ({d})</option>)}
                    </select>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Asignado a</label>
                      <select 
                        value={editingTask.assignee}
                        onChange={e => setEditingTask({...editingTask, assignee: e.target.value as Assignee})}
                        className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                      >
                        <option value="Laura">Laura</option>
                        <option value="Christian">Christian</option>
                        <option value="Ambos">Ambos</option>
                      </select>
                    </div>
                    
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Estancia</label>
                      <select 
                        value={editingTask.room}
                        onChange={e => setEditingTask({...editingTask, room: e.target.value as Room})}
                        className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                        required
                      >
                        {Object.keys(ROOM_FLOORS).sort().map(room => (
                          <option key={room} value={room}>{room}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => deleteTask(editingTask.id)}
                      className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl py-2 text-sm"
                    >
                      Eliminar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 font-medium rounded-xl py-2 text-sm"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Long Term Task Modal */}
        <AnimatePresence>
          {editingLongTermTask && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-tortola-950 rounded-3xl p-6 w-full max-w-sm shadow-xl"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-tortola-900 dark:text-greige-100">Editar Tarea Puntual</h3>
                  <button onClick={() => setEditingLongTermTask(null)} className="text-tortola-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={saveEditedLongTermTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Título</label>
                    <input 
                      type="text"
                      value={editingLongTermTask.title}
                      onChange={e => setEditingLongTermTask({...editingLongTermTask, title: e.target.value})}
                      className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Fecha</label>
                    <input 
                      type="date"
                      value={editingLongTermTask.date}
                      onChange={e => setEditingLongTermTask({...editingLongTermTask, date: e.target.value})}
                      className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-tortola-500 dark:text-greige-400 mb-1">Asignado a</label>
                    <select 
                      value={editingLongTermTask.assignee}
                      onChange={e => setEditingLongTermTask({...editingLongTermTask, assignee: e.target.value as Assignee})}
                      className="w-full bg-greige-50 dark:bg-tortola-900 border border-greige-200 dark:border-tortola-800 rounded-xl px-3 py-2 text-sm text-tortola-900 dark:text-greige-100 focus:outline-none focus:ring-2 focus:ring-tortola-500"
                    >
                      <option value="Laura">Laura</option>
                      <option value="Christian">Christian</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => deleteLongTermTask(editingLongTermTask.id)}
                      className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl py-2 text-sm"
                    >
                      Eliminar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-tortola-900 dark:bg-greige-100 text-white dark:text-tortola-900 font-medium rounded-xl py-2 text-sm"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white/90 dark:bg-tortola-950/90 backdrop-blur-lg border-t border-greige-200 dark:border-tortola-800 flex items-center justify-around h-16 z-50 pb-safe px-2">
          <button 
            onClick={() => setView('home')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'home' ? 'text-tortola-900 dark:text-greige-100' : 'text-tortola-400 dark:text-greige-500'}`}
          >
            <ListTodo className={`w-6 h-6 mb-1 ${view === 'home' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">Hoy</span>
          </button>
          <button 
            onClick={() => setView('tasks')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'tasks' ? 'text-tortola-900 dark:text-greige-100' : 'text-tortola-400 dark:text-greige-500'}`}
          >
            <CalendarIcon className={`w-6 h-6 mb-1 ${view === 'tasks' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">Plan</span>
          </button>
          <button 
            onClick={() => setView('house')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'house' ? 'text-tortola-900 dark:text-greige-100' : 'text-tortola-400 dark:text-greige-500'}`}
          >
            <Home className={`w-6 h-6 mb-1 ${view === 'house' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'calendar' ? 'text-tortola-900 dark:text-greige-100' : 'text-tortola-400 dark:text-greige-500'}`}
          >
            <CalendarDays className={`w-6 h-6 mb-1 ${view === 'calendar' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">Calend.</span>
          </button>
          <button 
            onClick={() => setView('manage')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${view === 'manage' ? 'text-tortola-900 dark:text-greige-100' : 'text-tortola-400 dark:text-greige-500'}`}
          >
            <Settings className={`w-6 h-6 mb-1 ${view === 'manage' ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">Gestión</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
