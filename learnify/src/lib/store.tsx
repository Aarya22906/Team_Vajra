import * as React from 'react';
import type { CourseContent } from './api';
import { courses as seedCourses, currentUser, notifications as seedNotifications, type Course } from './mock-data';

type Theme = 'light' | 'dark';
interface User { name: string; email: string; initials: string; role: string; institute: string; firstName: string }

interface Store {
  user: User | null;
  login: (email: string, remember: boolean) => void;
  logout: () => void;
  theme: Theme;
  toggleTheme: () => void;
  courses: Course[];
  addCourse: (c: Partial<Course> & { title: string }) => Course;
  updateCourse: (id: string, patch: Partial<Course>) => void;
  duplicateCourse: (id: string) => Course | undefined;
  removeCourse: (id: string) => void;
  archived: Set<string>;
  toggleArchive: (id: string) => void;
  notifications: typeof seedNotifications;
  markAllRead: () => void;
  contents: Record<string, CourseContent>;
  setContent: (id: string, c: CourseContent) => void;
  patchContent: (id: string, patch: Partial<CourseContent>) => void;
}

const Ctx = React.createContext<Store | null>(null);
const read = <T,>(k: string, fallback: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(() => read<User | null>('learnify-auth', null) ?? (sessionStorage.getItem('learnify-session') ? JSON.parse(sessionStorage.getItem('learnify-session')!) : null));
  const [theme, setTheme] = React.useState<Theme>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
  const [courses, setCourses] = React.useState<Course[]>(() => { const mine = read<Course[]>('learnify-created', []); const ids = new Set(mine.map(c => c.id)); return [...mine, ...seedCourses.filter(c => !ids.has(c.id))]; });
  React.useEffect(() => { const seed = new Set(seedCourses.map(c => c.id)); write('learnify-created', courses.filter(c => !seed.has(c.id) || c.version > 1 || c.status !== seedCourses.find(x => x.id === c.id)?.status)); }, [courses]);
  const [archived, setArchived] = React.useState<Set<string>>(new Set());
  const [notifications, setNotifications] = React.useState(seedNotifications);
  const [contents, setContents] = React.useState<Record<string, CourseContent>>(() => read('learnify-contents', {}));
  React.useEffect(() => { write('learnify-contents', contents); }, [contents]);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('learnify-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const value: Store = {
    user,
    login: (email, remember) => {
      const u = { ...currentUser, email: email || currentUser.email };
      setUser(u);
      if (remember) write('learnify-auth', u); else { try { sessionStorage.setItem('learnify-session', JSON.stringify(u)); } catch { /* ignore */ } }
    },
    logout: () => { setUser(null); try { localStorage.removeItem('learnify-auth'); sessionStorage.removeItem('learnify-session'); } catch { /* ignore */ } },
    theme,
    toggleTheme: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')),
    courses,
    addCourse: c => {
      const id = (c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'course') + '-' + Math.random().toString(36).slice(2, 6);
      const course: Course = {
        id, description: '', language: 'Java', runtime: 'Java 21.0.2', level: 'Beginner', durationMin: 60, slides: 12, snippets: { passed: 14, total: 14 },
        status: 'verified', version: 1, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), coverage: 88, tags: [], accent: ['#4F46E5', '#7C3AED'], ...c,
      };
      setCourses(cs => [course, ...cs]);
      return course;
    },
    updateCourse: (id, patch) => setCourses(cs => cs.map(c => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c))),
    duplicateCourse: id => {
      const src = courses.find(c => c.id === id);
      if (!src) return undefined;
      const copy = { ...src, id: `${src.id}-copy-${Math.random().toString(36).slice(2, 5)}`, title: `${src.title} (copy)`, status: 'draft' as const, version: 1, updatedAt: new Date().toISOString() };
      setCourses(cs => [copy, ...cs]);
      return copy;
    },
    removeCourse: id => setCourses(cs => cs.filter(c => c.id !== id)),
    archived,
    toggleArchive: id => setArchived(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    notifications,
    markAllRead: () => setNotifications(ns => ns.map(n => ({ ...n, unread: false }))),
    contents,
    setContent: (id, c) => setContents(x => ({ ...x, [id]: c })),
    patchContent: (id, patch) => setContents(x => (x[id] ? { ...x, [id]: { ...x[id], ...patch } } : x)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = React.useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

export function useCourse(id?: string) {
  const { courses } = useStore();
  return courses.find(c => c.id === id) ?? courses[0];
}
