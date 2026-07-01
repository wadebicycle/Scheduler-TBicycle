/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  format, 
  startOfWeek, 
  addWeeks, 
  addDays,
  subWeeks, 
  isSameDay,
  isSameWeek,
  endOfMonth,
  startOfMonth,
  isWithinInterval,
  differenceInDays,
  subMonths
} from 'date-fns';
import { Plan, NotificationSound } from './types';
import { storage } from './lib/storage';
import { auth, db, signInWithGoogle, signOutUser, clearAuthState, onAuthChanged, cloudStorage, subscribePlans, settleRedirectAuth } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { PRESET_TRACKS } from './lib/musicTracks';
import { playNotificationSound, playMusicalNote, playMeow } from './lib/sounds';
import { healthTipsManager } from './lib/healthTips';
import { User } from 'firebase/auth';
import { ScheduleGrid } from './components/ScheduleGrid';
import { Toaster } from '@/components/ui/sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Trophy, 
  CheckCircle2,
  Settings,
  Moon,
  Sun,
  Volume2,
  LogIn,
  LogOut,
  CloudIcon,
  Loader2,
  Bell,
  BellOff,
  Music,
  Plus,
  Minus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Download,
  X,
  Timer,
  Dumbbell,
  Zap,
  BookOpen,
  Move,
} from 'lucide-react';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { translations, TranslationKey } from './lib/i18n';
import { AppSettings, Language, Theme, CatMood, BackgroundConfig } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { DynamicCat } from './components/DynamicCat';
import { BackgroundCustomizer } from './components/BackgroundCustomizer';
import { CelebrationEffect } from './components/CelebrationEffect';

import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function WeekNoteEditor({ weekStart, initialNote, theme, placeholder, onSave, btnSaveText, btnSavedText }: {
  weekStart: Date;
  initialNote: string;
  theme: Theme;
  placeholder: string;
  onSave: (note: string) => void;
  btnSaveText: string;
  btnSavedText: string;
}) {
  const [note, setNote] = React.useState(initialNote);
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => { setNote(initialNote); }, [weekStart.toISOString()]);
  const handleSave = () => {
    onSave(note);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="space-y-1.5">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="text-xs resize-none w-full bg-muted/50 border-border"
      />
      <Button
        size="sm"
        className={cn("w-full h-6 text-[10px]", saved ? "bg-[#107C41]" : "bg-muted-foreground hover:bg-muted-foreground/80")}
        onClick={() => { playMusicalNote(); handleSave(); }}
      >
        {saved ? `✓ ${btnSavedText}` : btnSaveText}
      </Button>
    </div>
  );
}

function HealthTipPanel({ theme, isSettingsOpen, t, lang, onActivate }: { theme: Theme; isSettingsOpen: boolean; t: (k: TranslationKey) => string; lang: Language; onActivate?: (m: CatMood) => void }) {
  const [open, setOpen] = React.useState(false);
  const [tip, setTip] = React.useState('');
  const [allTips, setAllTips] = React.useState<string[]>([]);

  React.useEffect(() => {
    setAllTips(healthTipsManager.getAllTips(lang));
  }, [lang]);

  const pickTip = React.useCallback(() => {
    if (allTips.length > 0) {
      setTip(allTips[Math.floor(Math.random() * allTips.length)]);
    }
  }, [allTips]);

  React.useEffect(() => {
    if (!open) return;
    pickTip();
    const interval = setInterval(pickTip, 10000);
    return () => clearInterval(interval);
  }, [open, pickTip]);

  React.useEffect(() => {
    if (isSettingsOpen) setOpen(false);
  }, [isSettingsOpen]);

  return (
    <div className="relative inline-block pointer-events-auto">
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => {
          playMusicalNote();
          setOpen((v) => { const next = !v; if (next && onActivate) onActivate('medical'); return next; });
        }}
        className="h-12 w-12 rounded-full shadow-2xl flex items-center justify-center border transition-all hover:scale-110 active:scale-95 group bg-background text-foreground border-border"
        title={t('healthTips')}
      >
        <div className="relative flex items-center justify-center">
          <BookOpen className="w-6 h-6" />
          <div className="absolute inset-0 flex items-center justify-center pt-0.5">
             <Plus className="w-2.5 h-2.5 text-red-600 font-black" strokeWidth={5} />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
               "absolute z-40 w-[20rem] right-0 bottom-14 border shadow-2xl rounded-xl overflow-hidden cursor-move bg-card border-border"
            )}
          >
            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted">
                   <span className="text-[10px] font-bold uppercase tracking-wider">{t('healthTips')}</span>
                   <X className="w-3.5 h-3.5 cursor-pointer hover:text-red-500 transition-colors" onClick={() => { playMusicalNote(); setOpen(false); }} />
                </div>
                <div className="p-4 space-y-3">
                   <p className="text-xs leading-relaxed opacity-90">{tip}</p>
                   <Button variant="secondary" size="xs" onClick={() => { playMusicalNote(); pickTip(); }} className="w-full text-[10px] h-7">
                     {t('nextTip')}
                   </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const WEEK_COLORS = [
  { name: 'Default', value: 'bg-muted' },
  { name: 'Red', value: 'bg-red-500/10 border-red-500/20' },
  { name: 'Green', value: 'bg-green-500/10 border-green-500/20' },
  { name: 'Blue', value: 'bg-blue-500/10 border-blue-500/20' },
  { name: 'Yellow', value: 'bg-yellow-500/10 border-yellow-500/20' },
  { name: 'Purple', value: 'bg-purple-500/10 border-purple-500/20' },
  { name: 'Orange', value: 'bg-orange-500/10 border-orange-500/20' },
];

const Logo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1024 1024" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" rx="192" fill="#107C41"/>
    
    {/* Horizontal Bar */}
    <rect x="64" y="176" width="896" height="240" rx="40" fill="white"/>
    <circle cx="500" cy="200" r="60" fill="white"/>
    <circle cx="500" cy="392" r="60" fill="white"/>
    
    {/* Stem */}
    <rect x="478" y="416" width="64" height="88" fill="white"/>
    
    {/* Clock Circle */}
    <circle cx="510" cy="740" r="236" fill="white"/>
    
    {/* Ticks */}
    <rect x="498" y="540" width="24" height="60" rx="12" fill="#107C41"/>
    <rect x="666" y="728" width="56" height="24" rx="12" fill="#107C41"/>
    <rect x="498" y="890" width="24" height="50" rx="12" fill="#107C41"/>
    <rect x="300" y="728" width="54" height="24" rx="12" fill="#107C41"/>
    
    {/* Hands */}
    <rect x="495" y="560" width="30" height="180" rx="15" fill="#107C41"/>
    <rect x="495" y="620" width="30" height="120" rx="15" fill="#107C41" transform="rotate(-60 510 740)"/>
    <circle cx="510" cy="740" r="36" fill="#107C41"/>

    {/* Details on book */}
    <rect x="120" y="260" width="300" height="24" rx="12" fill="#75B891"/>
    <rect x="120" y="320" width="300" height="24" rx="12" fill="#75B891"/>
    <rect x="614" y="260" width="300" height="24" rx="12" fill="#75B891"/>
    <rect x="614" y="320" width="300" height="24" rx="12" fill="#75B891"/>
  </svg>
);

export default function App() {
  const [plans, setPlans] = React.useState<Plan[]>(() => storage.getPlans());
  const [weekMetas, setWeekMetas] = React.useState<Record<string, any>>(() => storage.getWeekMetas());
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [isSummaryOpen, setIsSummaryOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [gymRestOpen, setGymRestOpen] = React.useState(false);
  const [gymRestRunning, setGymRestRunning] = React.useState(false);
  const [gymRestRemaining, setGymRestRemaining] = React.useState(60);
  const [gymRestEndAt, setGymRestEndAt] = React.useState<number | null>(null);
  const [gymRestRound, setGymRestRound] = React.useState(1);
  const [gymRestSets, setGymRestSets] = React.useState(4);
  const [gymRestMessage, setGymRestMessage] = React.useState('');
  const [gymRestCustomOpen, setGymRestCustomOpen] = React.useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = React.useState('general');
  const [mobileExpanded, setMobileExpanded] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [hasMonthlyPdfPrompted, setHasMonthlyPdfPrompted] = React.useState(false);
  const [settings, setSettings] = React.useState<AppSettings>(() => storage.getSettings());

  React.useEffect(() => {
    if (!gymRestRunning) {
      setGymRestRemaining(settings.gymRestDurationSeconds ?? 60);
    }
  }, [settings.gymRestDurationSeconds, gymRestRunning]);

  type PomodoroMode = 'work' | 'short' | 'long';
  const POMODORO_DURATIONS: Record<PomodoroMode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const [isPomodoroOpen, setIsPomodoroOpen] = React.useState(false);
  const [pomodoroMode, setPomodoroMode] = React.useState<PomodoroMode>('work');
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = React.useState(POMODORO_DURATIONS.work);
  const [pomodoroRunning, setPomodoroRunning] = React.useState(false);
  const [pomodoroSessions, setPomodoroSessions] = React.useState(0);
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [catMoodOverride, setCatMoodOverride] = React.useState<CatMood | null>(null);
  const [catPosition, setCatPosition] = React.useState<{ left: number; top: number } | null>(null);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomodoroRunning && pomodoroSecondsLeft > 0) {
      interval = setInterval(() => {
        setPomodoroSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (pomodoroSecondsLeft === 0) {
      setPomodoroRunning(false);
      playNotificationSound(settings.notificationSound);
      if (pomodoroMode === 'work') setPomodoroSessions(v => v + 1);
      toast.success(t(pomodoroMode === 'work' ? 'workCompleted' : 'breakOver'));
    }
    return () => clearInterval(interval);
  }, [pomodoroRunning, pomodoroSecondsLeft, pomodoroMode, settings.notificationSound]);

  const togglePomodoro = () => setPomodoroRunning(!pomodoroRunning);
  const resetPomodoro = () => {
    setPomodoroRunning(false);
    setPomodoroSecondsLeft(POMODORO_DURATIONS[pomodoroMode]);
  };
  const switchPomodoroMode = (mode: PomodoroMode) => {
    setPomodoroMode(mode);
    setPomodoroSecondsLeft(POMODORO_DURATIONS[mode]);
    setPomodoroRunning(false);
  };

  const [selectedMusicId, setSelectedMusicId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = React.useState(false);

  React.useEffect(() => {
    if (selectedMusicId) {
      const track = PRESET_TRACKS.find(t => t.id === selectedMusicId);
      if (track) {
        if (!audioRef.current) {
          audioRef.current = new Audio(track.url);
          audioRef.current.loop = true;
        } else {
          audioRef.current.src = track.url;
        }
        if (isMusicPlaying) audioRef.current.play();
      }
    } else {
      audioRef.current?.pause();
    }
  }, [selectedMusicId]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  const t = (key: keyof typeof translations.en, params: Record<string, string> = {}) => {
    let text = translations[settings.language][key];
    if (!text) return key;
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
    return text;
  };

  const [selectedWeekStart, setSelectedWeekStart] = React.useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const [loginLoading, setLoginLoading] = React.useState(false);

  // Data Migration / Initial Fetch
  React.useEffect(() => {
     settleRedirectAuth()
       .then(res => { if (res?.user) setUser(res.user); })
       .catch(err => {
         console.error("Initial redirect result error:", err);
         toast.error(t('loginFailed'));
       });
       
     const unsub = onAuthChanged(async (firebaseUser) => {
        setUser(firebaseUser);
        setAuthLoading(false);
        if (firebaseUser) {
           setSyncing(true);
           
           try {
             console.log("Starting cloud sync for user:", firebaseUser.uid);
             
             if (!auth.currentUser) {
               await new Promise(r => setTimeout(r, 500));
             }

             if (!auth.currentUser) {
               throw new Error("Authentication state not ready.");
             }

             const [cloudPlans, cloudWeekMetas, cloudSettings] = await Promise.all([
               cloudStorage.getPlans(firebaseUser.uid).catch(() => [] as Plan[]),
               cloudStorage.getWeekMetas(firebaseUser.uid).catch(() => ({})),
               cloudStorage.getSettings(firebaseUser.uid).catch(() => ({}))
             ]);

             const localPlansForUid = storage.getPlans(firebaseUser.uid);
             const anonymousPlans = storage.getPlans();
             
             if (cloudPlans.length === 0) {
               const plansToMigrate = localPlansForUid.length > 0 ? localPlansForUid : anonymousPlans;
               if (plansToMigrate.length > 0) {
                 await cloudStorage.savePlans(firebaseUser.uid, plansToMigrate);
                 toast.success(t('dataSynced'));
               }
             }

             const localMetasForUid = storage.getWeekMetas(firebaseUser.uid);
             const anonymousMetas = storage.getWeekMetas();
             if (Object.keys(cloudWeekMetas).length === 0) {
               const metasToMigrate = Object.keys(localMetasForUid).length > 0 ? localMetasForUid : anonymousMetas;
               if (Object.keys(metasToMigrate).length > 0) {
                 await setDoc(doc(db, "users", firebaseUser.uid, "meta", "weekMetas"), metasToMigrate);
               }
             }

             const initialPlans = cloudPlans.length > 0 ? cloudPlans : (localPlansForUid.length > 0 ? localPlansForUid : anonymousPlans);
             setPlans(initialPlans);
             
             const initialMetas = Object.keys(cloudWeekMetas).length > 0 ? cloudWeekMetas : (Object.keys(localMetasForUid).length > 0 ? localMetasForUid : anonymousMetas);
             setWeekMetas(initialMetas);

             if (Object.keys(cloudSettings).length > 0) {
               setSettings(prev => ({ ...prev, ...cloudSettings }));
             }

             const unsubPlans = subscribePlans(firebaseUser.uid, p => { 
                if (p.length > 0 || initialPlans.length === 0) {
                  setPlans(p); 
                  storage.savePlans(p, firebaseUser.uid);
                }
                setSyncing(false); 
             });
             
             return () => { unsubPlans(); };
           } catch (e) {
             console.error("Failed to sync/migrate data:", e);
             setSyncing(false);
           }
        } else {
           setPlans(storage.getPlans());
           setWeekMetas(storage.getWeekMetas());
           setSettings(storage.getSettings());
           setSyncing(false);
        }
     });
     return unsub;
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return () => clearInterval(timer);
  }, [settings.theme]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    storage.saveSettings(newSettings, user?.uid);
    if (user) cloudStorage.saveSettings(user.uid, newSettings);
  };

  const formatMonthLabel = (date: Date) => {
    return new Intl.DateTimeFormat(settings.language, { month: 'long', year: 'numeric' }).format(date);
  };

  const formatDayLabel = (date: Date) => {
    return new Intl.DateTimeFormat(settings.language, { weekday: 'short' }).format(date);
  };

  const formatFullDateLabel = (date: Date) => {
    return new Intl.DateTimeFormat(settings.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const isEndOfMonthPeriod = React.useMemo(() => {
    const now = currentTime;
    return differenceInDays(endOfMonth(now), now) <= 3;
  }, [currentTime]);

  const getMonthlyPdfTargetDate = () => {
    return currentTime.getDate() <= 3 ? subMonths(currentTime, 1) : currentTime;
  };

  const createPdfFromPages = React.useCallback(async (
    pages: Array<{ title: string; subtitle?: string; lines: string[] }>,
    filename: string
  ) => {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = pageWidth * scale;
    canvas.height = pageHeight * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      toast.error(t('pdfGenerationError'));
      return;
    }

    const drawWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const words = text.split(' ');
      let current = '';
      let offsetY = y;

      for (const word of words) {
        const testLine = current ? `${current} ${word}` : word;
        const width = ctx.measureText(testLine).width;

        if (width <= maxWidth || current === '') {
          current = testLine;
        } else {
          ctx.fillText(current, x, offsetY);
          offsetY += lineHeight;
          current = word;
        }
      }

      if (current) {
        ctx.fillText(current, x, offsetY);
        offsetY += lineHeight;
      }

      return offsetY;
    };

    pages.forEach((page, pageIndex) => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageWidth, pageHeight);

      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';
      ctx.font = `bold 18px "Noto Sans", "Times New Roman", serif`;
      const titleWidth = ctx.measureText(page.title).width;
      ctx.fillText(page.title, (pageWidth - titleWidth) / 2, 40);

      let y = 74;
      if (page.subtitle) {
        ctx.font = `normal 12px "Noto Sans", "Times New Roman", serif`;
        const subtitleWidth = ctx.measureText(page.subtitle).width;
        ctx.fillText(page.subtitle, (pageWidth - subtitleWidth) / 2, y);
        y += 28;
      }

      ctx.font = `normal 12px "Noto Sans", "Times New Roman", serif`;
      const textX = 40;
      const textMaxWidth = pageWidth - 80;
      const lineHeight = 18;

      page.lines.forEach(line => {
        y = drawWrappedText(line, textX, y, textMaxWidth, lineHeight);
        y += 10;
      });

      const imageData = canvas.toDataURL('image/png');
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, pageHeight);
    });

    pdf.save(filename);
  }, [t]);

  const scheduleGridRef = React.useRef<HTMLDivElement | null>(null);

  const captureWeeklyScheduleImage = React.useCallback(async () => {
    if (!scheduleGridRef.current) {
      toast.error(t('pdfGenerationError'));
      return;
    }

    const element = scheduleGridRef.current;
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `Scheduler-week-${format(selectedWeekStart, 'yyyy-ww')}.png`;
    link.click();
  }, [selectedWeekStart, t]);

  const generateMonthlyPdf = React.useCallback(async (monthDate: Date) => {
    const targetDate = monthDate;
    const monthStart = startOfMonth(targetDate);
    const monthLabel = formatMonthLabel(targetDate);

    const monthPlans = plans.filter(plan => {
      const planDate = new Date(plan.date);
      return isWithinInterval(planDate, { start: monthStart, end: endOfMonth(targetDate) });
    });

    const title = t('monthlyPdfHeader');
    const pages = Array.from({ length: 4 }, (_, index) => {
      const weekStart = addWeeks(startOfWeek(monthStart, { weekStartsOn: 1 }), index);
      const weekPlans = monthPlans
        .filter(plan => isSameWeek(new Date(plan.date), weekStart, { weekStartsOn: 1 }))
        .sort((a, b) => {
          if (a.date === b.date) return a.startHour - b.startHour;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

      const weekEnd = addDays(weekStart, 6);
      const subtitle = `${monthLabel} • ${t('week')} ${format(weekStart, 'w')} (${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')})`;
      const lines: string[] = [];

      const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      daysOfWeek.forEach(dayDate => {
        const dayPlans = weekPlans.filter(plan => format(new Date(plan.date), 'yyyy-MM-dd') === format(dayDate, 'yyyy-MM-dd'));
        lines.push(formatFullDateLabel(dayDate));
        if (dayPlans.length === 0) {
          lines.push(`  ${t('weeklyPdfNoPlans')}`);
        } else {
          dayPlans.forEach(plan => {
            const planTitle = plan.title || t('enterTask');
            const durationLabel = `${t('duration')}: ${plan.duration}h`;
            lines.push(`  ${plan.startHour}:00 - ${planTitle} (${durationLabel})`);
            if (plan.notes) {
              lines.push(`    ${t('notes')}: ${plan.notes}`);
            }
          });
        }
        lines.push('');
      });

      return { title, subtitle, lines };
    });

    await createPdfFromPages(pages, `Scheduler-${format(monthStart, 'MMMM-yyyy')}.pdf`);
    toast.success(t('monthlyPdfSaved', { message: monthLabel }));
  }, [plans, settings.language, createPdfFromPages]);

  React.useEffect(() => {
    if (!hasMonthlyPdfPrompted && isEndOfMonthPeriod) {
      toast(t('monthlyPdfPrompt'));
      setHasMonthlyPdfPrompted(true);
    }
  }, [hasMonthlyPdfPrompted, isEndOfMonthPeriod, settings.language]);

  const formatSeconds = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const settingsTabs = [
    { value: 'general', label: t('general'), icon: <Settings className="w-4 h-4" /> },
    { value: 'schedule', label: t('schedule'), icon: <CalendarIcon className="w-4 h-4" /> },
    { value: 'sound', label: t('sound'), icon: <Volume2 className="w-4 h-4" /> },
    { value: 'appearance', label: t('appearance'), icon: <Sun className="w-4 h-4" /> },
    { value: 'account', label: t('account'), icon: <CloudIcon className="w-4 h-4" /> },
  ];

  const startGymRest = () => {
    const duration = settings.gymRestDurationSeconds ?? 60;
    // Resume from paused remaining if available
    if (!gymRestRunning && gymRestEndAt === null && gymRestRemaining && gymRestRemaining < duration) {
      setGymRestEndAt(Date.now() + gymRestRemaining * 1000);
      setGymRestRunning(true);
      setGymRestMessage(t('gymRestNextRound', { nextRound: String(Math.min(gymRestRound + 1, gymRestSets)) }));
      return;
    }
    // Fresh start
    setGymRestRound(1);
    setGymRestEndAt(Date.now() + duration * 1000);
    setGymRestRemaining(duration);
    setGymRestRunning(true);
    setGymRestMessage(t('gymRestNextRound', { nextRound: '2' }));
  };

  const pauseGymRest = () => {
    if (gymRestEndAt === null) return;
    setGymRestRunning(false);
    const remaining = Math.max(0, Math.round((gymRestEndAt - Date.now()) / 1000));
    setGymRestRemaining(remaining);
    setGymRestEndAt(null);
  };

  const resetGymRest = () => {
    setGymRestRunning(false);
    setGymRestEndAt(null);
    setGymRestRound(1);
    setGymRestMessage('');
    setGymRestRemaining(settings.gymRestDurationSeconds ?? 60);
  };

  React.useEffect(() => {
    if (!gymRestRunning || gymRestEndAt === null) return;
    const duration = settings.gymRestDurationSeconds ?? 60;

    const tick = () => {
      const remaining = Math.max(0, Math.round((gymRestEndAt - Date.now()) / 1000));
      setGymRestRemaining(remaining);
      if (remaining <= 0) {
        if (gymRestRound < gymRestSets) {
          const nextRound = gymRestRound + 1;
          setGymRestRound(nextRound);
          setGymRestRemaining(duration);
          setGymRestEndAt(Date.now() + duration * 1000);
          setGymRestMessage(t('gymRestNextRound', { nextRound: String(nextRound) }));
        } else {
          setGymRestRunning(false);
          setGymRestEndAt(null);
          setGymRestMessage(t('gymRestComplete'));
        }
        if (settings.gymRestSoundEnabled) {
          playNotificationSound(settings.notificationSound);
        }
        if (settings.gymRestVibrationEnabled && navigator.vibrate) {
          navigator.vibrate(300);
        }
      }
    };
    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [gymRestRunning, gymRestEndAt, gymRestRound, gymRestSets, settings.gymRestSoundEnabled, settings.gymRestVibrationEnabled, settings.notificationSound, t]);

  const currentWeekPlans = React.useMemo(() => {
    return plans.filter(p => isSameWeek(new Date(p.date), selectedWeekStart, { weekStartsOn: 1 }));
  }, [plans, selectedWeekStart]);

  // Cat auto-move: find empty schedule cells and teleport the cat there periodically
  React.useEffect(() => {
    let running = true;
    const moveCatToRandomEmptyCell = () => {
      try {
        const tds = Array.from(document.querySelectorAll('table tbody td')) as HTMLElement[];
        const empty = tds.filter(td => !td.classList.contains('sticky') && td.innerText.trim() === '');
        if (empty.length === 0) return;
        const choice = empty[Math.floor(Math.random() * empty.length)];
        const rect = choice.getBoundingClientRect();
        const left = rect.left + rect.width / 2 - 48; // center minus half cat
        const top = rect.top + rect.height / 2 - 48;
        setCatPosition({ left: Math.max(8, left), top: Math.max(8, top) });
      } catch (e) {
        // ignore
      }
    };

    const id = window.setInterval(() => { if (!running) return; moveCatToRandomEmptyCell(); }, 8000);
    // initial placement
    setTimeout(moveCatToRandomEmptyCell, 300);
    const onResize = () => { moveCatToRandomEmptyCell(); };
    window.addEventListener('resize', onResize);
    return () => { running = false; window.clearInterval(id); window.removeEventListener('resize', onResize); };
  }, [currentWeekPlans]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const activeTab = document.getElementById('active-week-tab');
      const container = document.getElementById('week-tabs-container');
      if (activeTab && container) {
        const scrollPos = activeTab.offsetLeft - (container.offsetWidth / 2) + (activeTab.offsetWidth / 2);
        container.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedWeekStart]);

  const handleUpdatePlan = (p: Plan) => {
    const oldPlan = plans.find(x => x.id === p.id);
    if (oldPlan && oldPlan.color !== 'green' && p.color === 'green') {
      playNotificationSound(settings.notificationSound);
      const motivators = [t('motivate1'), t('motivate2'), t('motivate3'), t('motivate4'), t('motivate5')];
      const message = motivators[Math.floor(Math.random() * motivators.length)];
      toast.success(message, {
        icon: <Trophy className="w-4 h-4 text-yellow-500" />,
        duration: 3000
      });
      setShowCelebration(true);
    }
    setPlans((currentPlans) => currentPlans.map(x => x.id === p.id ? p : x));
    if (user) {
      cloudStorage.savePlan(user.uid, p);
    }
  };
  const totalPlansCount = currentWeekPlans.length;
  const completedPlansCount = currentWeekPlans.filter(p => p.color === 'green').length;

  const weekTabs = React.useMemo(() => {
    const today = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 21 }, (_, i) => addWeeks(today, i - 10));
  }, []);

  // Determine cat mood based on current state
  const getCatMood = React.useCallback((): CatMood => {
    if (pomodoroRunning) {
      if (pomodoroMode === 'work') return 'gym';
      if (pomodoroMode === 'short') return 'shortBreak';
      if (pomodoroMode === 'long') return 'longBreak';
    }
    
    if (isSettingsOpen) return 'work';
    if (isSummaryOpen) return 'celebrating';
    
    if (completedPlansCount === totalPlansCount && totalPlansCount > 0) {
      return 'celebrating';
    }
    
    if (completedPlansCount > totalPlansCount * 0.7 && totalPlansCount > 0) {
      return 'happy';
    }
    
    if (completedPlansCount === 0 && totalPlansCount > 0) {
      return 'tired';
    }
    
    return 'idle';
  }, [pomodoroRunning, pomodoroMode, isSettingsOpen, isSummaryOpen, completedPlansCount, totalPlansCount]);

  const catMood = getCatMood();

  // Build background style
  const getBackgroundStyle = React.useCallback((): React.CSSProperties => {
    if (!settings.backgroundConfig) {
      return {};
    }

    const { type, value, opacity = 1 } = settings.backgroundConfig;

    if (type === 'color') {
      return { backgroundColor: value, opacity };
    } else if (type === 'gradient') {
      return { background: value, opacity };
    } else if (type === 'image') {
      return {
        backgroundImage: `url(${value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity,
      };
    }

    return {};
  }, [settings.backgroundConfig]);

  return (
    <div 
      className={cn(
        "h-screen flex flex-col transition-colors duration-300 overflow-hidden relative",
        settings.theme === 'dark' && "dark",
        "bg-background text-foreground",
        settings.language === 'vi' ? 'font-vietnamese' : 'font-sans'
      )}
      style={getBackgroundStyle()}
    >
      {/* Background overlay for better text readability */}
      {settings.backgroundConfig && (
        <div className="absolute inset-0 bg-background/40 dark:bg-background/60 pointer-events-none" />
      )}

      <header className="border-b sticky top-0 z-50 bg-background/95 dark:bg-background/95 backdrop-blur border-border relative">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <Logo className="w-8 h-8" />
             <h1 className="text-lg font-black">{t('appName')}</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
             {!user && !authLoading && (
               <Button 
                 variant="outline" 
                 size="sm" 
                 className="flex border-[#107C41] text-[#107C41] hover:bg-[#107C41]/5 font-bold h-9 px-2 sm:px-3"
                 onClick={async () => {
                   playMusicalNote();
                   setLoginLoading(true);
                   try {
                     await signInWithGoogle();
                   } catch (e) {
                     console.error(e);
                   } finally {
                     setLoginLoading(false);
                   }
                 }}
                 disabled={loginLoading}
               >
                 {loginLoading ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <LogIn className="w-4 h-4 sm:mr-2" />}
                 <span className="hidden sm:inline">{t('signIn')}</span>
                 <span className="sm:hidden text-[11px] font-bold">{t('login')}</span>
               </Button>
             )}
             <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => {
                playMusicalNote();
                handleUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled });
              }}>
                {settings.notificationsEnabled ? <Bell className="w-4 h-4 text-[#107C41]" /> : <BellOff className="w-4 h-4" />}
             </Button>

             <Popover>
               <PopoverTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => playMusicalNote()}>
                    <Music className={cn("w-4 h-4 transition-all", isMusicPlaying && "text-[#107C41] animate-spin-slow")} />
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-64 p-4" align="end">
                 <div className="space-y-4">
                   <h3 className="font-bold text-sm uppercase tracking-wider">{t('music')}</h3>
                   <div className="grid gap-1">
                     {PRESET_TRACKS.map(track => (
                       <Button 
                         key={track.id}
                         variant={selectedMusicId === track.id ? "secondary" : "ghost"} 
                         size="sm"
                         className="w-full justify-start text-left text-xs h-8"
                         onClick={() => {
                           if (selectedMusicId === track.id) {
                             toggleMusic();
                           } else {
                             setSelectedMusicId(track.id);
                             setIsMusicPlaying(true);
                           }
                         }}
                       >
                         {selectedMusicId === track.id && isMusicPlaying ? <Pause className="w-3 h-3 mr-2" /> : <Play className="w-3 h-3 mr-2" />}
                         <span className="truncate">{track.name}</span>
                       </Button>
                     ))}
                   </div>
                   {selectedMusicId && (
                     <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { setSelectedMusicId(null); setIsMusicPlaying(false); }}>
                       Stop Music
                     </Button>
                   )}
                 </div>
               </PopoverContent>
             </Popover>

             <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-[#FF6B00]" onClick={() => {
                playMusicalNote();
                // Toggle gym panel: second press closes it
                if (gymRestOpen) {
                  setGymRestOpen(false);
                  setCatMoodOverride(null);
                  return;
                }
                if (!settings.gymRestEnabled) {
                  handleUpdateSettings({ gymRestEnabled: true });
                }
                setGymRestOpen(true);
                // set cat to gym mood briefly
                setCatMoodOverride('gym');
                setTimeout(() => setCatMoodOverride(null), 5000);
              }}>
                <Dumbbell className="w-4 h-4" />
             </Button>
             <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => {
                playMusicalNote();
                setIsSettingsOpen(true);
              }}>
                <Settings className="w-4 h-4" />
             </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth relative z-10" id="main-scroll-container">
        <div className="container mx-auto max-w-7xl">
           <div className="mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                 <h2 className="text-2xl font-black">{t('weekOf')} {format(selectedWeekStart, 'w')}</h2>
                 <p className="text-sm opacity-60">{format(selectedWeekStart, 'd MMMM')} - {format(addWeeks(selectedWeekStart, 1), 'd MMMM')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="hidden lg:flex" onClick={() => setIsSummaryOpen(true)}>
                  <Trophy className="w-3.5 h-3.5 mr-2 text-yellow-600" />
                  {t('summaryButton')}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9">
                      <Download className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-2 rounded-2xl shadow-2xl border bg-popover">
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={captureWeeklyScheduleImage}>
                      {t('downloadWeeklyImage')}
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => generateMonthlyPdf(selectedWeekStart)}>
                      {t('downloadMonthlyPdf')}
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
           </div>

           <div ref={scheduleGridRef} className="bg-card dark:border-white/10 rounded-xl border shadow-xl overflow-hidden">
               <ScheduleGrid 
                  currentWeekStart={selectedWeekStart}
                  plans={plans}
                  onAddPlan={(p) => {
                    setPlans((currentPlans) => [...currentPlans, p]);
                    if (user) {
                      cloudStorage.savePlan(user.uid, p);
                    }
                  }}
                  onUpdatePlan={handleUpdatePlan}
                  onDeletePlan={(id) => {
                    setPlans((currentPlans) => currentPlans.filter(x => x.id !== id));
                    if (user) {
                      cloudStorage.deletePlan(user.uid, id);
                    }
                  }}
                 onPlanTurnGreen={(p) => {
                    // Cat celebrates and meows
                    setCatMoodOverride('celebrating');
                    playMeow();
                    setShowCelebration(true);
                    setTimeout(() => setCatMoodOverride(null), 3000);
                 }}
                  language={settings.language}
                  theme={settings.theme}
                  startHour={settings.startHour}
                  endHour={settings.endHour}
               />
               <div className="p-4 border-t bg-muted/30">
                 <Label className="text-[10px] font-bold uppercase mb-2 block opacity-50">{t('weekNote')}</Label>
                 <WeekNoteEditor 
                    weekStart={selectedWeekStart}
                    initialNote={weekMetas[format(selectedWeekStart, 'yyyy-MM-dd')]?.note || ''}
                    theme={settings.theme}
                    placeholder={t('weekNotePlaceholder')}
                    btnSaveText={t('saveNote')}
                    btnSavedText={t('saved')}
                    onSave={(note) => {
                      const key = format(selectedWeekStart, 'yyyy-MM-dd');
                      const updated = { ...weekMetas, [key]: { ...weekMetas[key], note } };
                      setWeekMetas(updated);
                      storage.saveWeekMeta(key, { note }, user?.uid);
                      if (user) cloudStorage.saveWeekMeta(user.uid, key, { note });
                    }}
                 />
               </div>
           </div>

           <div className="mt-8 flex justify-between items-center bg-[#107C41] text-white p-6 rounded-xl">
              <div>
                 <h3 className="font-bold">{t('weeklyProgress')}</h3>
                 <p className="text-sm opacity-80">{completedPlansCount}/{totalPlansCount} {t('tasksCompleted')}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 opacity-20" />
           </div>
        </div>
      </main>

      <footer className="p-2 border-t sticky bottom-0 z-50 bg-background/95 border-border backdrop-blur relative">
         <div className="container mx-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSelectedWeekStart(subWeeks(selectedWeekStart, 1))}><ChevronLeft className="w-4 h-4"/></Button>
            <div className="flex-1 overflow-x-auto flex gap-1 scroll-smooth" id="week-tabs-container">
              {weekTabs.map((ws, i) => {
                const isActive = isSameWeek(ws, selectedWeekStart, { weekStartsOn: 1 });
                const key = format(ws, 'yyyy-MM-dd');
                const meta = weekMetas[key] || {};
                const colorValue = meta.color || 'bg-muted dark:bg-muted';
                
                return (
                  <React.Fragment key={i}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          id={isActive ? "active-week-tab" : undefined}
                          className={cn(
                            "px-4 py-1.5 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all border shrink-0",
                            isActive 
                              ? "bg-[#107C41] text-white shadow-lg scale-105 border-[#107C41]" 
                              : cn("text-muted-foreground border-border hover:border-primary/30", colorValue)
                          )}
                          onClick={() => setSelectedWeekStart(ws)}
                        >
                          {t('week')} {format(ws, 'w')}
                          {meta.note && <span className="ml-1 opacity-50">✎</span>}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-4 space-y-4 rounded-2xl shadow-2xl border bg-popover" side="top" align="center" sideOffset={10}>
                         <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t('weekColor')}</Label>
                               {meta.color && (
                                  <Button variant="ghost" size="sm" className="h-6 text-[9px]" onClick={() => {
                                     const updated = { ...weekMetas, [key]: { ...weekMetas[key], color: undefined } };
                                     setWeekMetas(updated);
                                     storage.saveWeekMeta(key, { color: null }, user?.uid);
                                     if (user) cloudStorage.saveWeekMeta(user.uid, key, { color: null });
                                  }}>Reset</Button>
                               )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {WEEK_COLORS.map(c => (
                                  <button
                                     key={c.value}
                                     onClick={() => {
                                        const updated = { ...weekMetas, [key]: { ...weekMetas[key], color: c.value } };
                                        setWeekMetas(updated);
                                        storage.saveWeekMeta(key, { color: c.value }, user?.uid);
                                        if (user) cloudStorage.saveWeekMeta(user.uid, key, { color: c.value });
                                     }}
                                     className={cn(
                                        "w-7 h-7 rounded-lg border-2 transition-all hover:scale-110",
                                        c.value,
                                        meta.color === c.value ? "ring-2 ring-offset-2 ring-[#107C41] border-white" : "border-transparent"
                                     )}
                                     title={c.name}
                                  />
                               ))}
                            </div>
                         </div>
                         
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t('weekNote')}</Label>
                            <Textarea 
                               value={meta.note || ''}
                               onChange={(e) => {
                                  const updated = { ...weekMetas, [key]: { ...weekMetas[key], note: e.target.value } };
                                  setWeekMetas(updated);
                                  storage.saveWeekMeta(key, { note: e.target.value }, user?.uid);
                                  if (user) cloudStorage.saveWeekMeta(user.uid, key, { note: e.target.value });
                               }}
                               placeholder={t('weekNotePlaceholder')}
                               className="text-xs min-h-[100px] resize-none rounded-xl bg-muted/50 border-border"
                            />
                         </div>
                         
                         <div className="flex gap-2">
                            <Button size="sm" className="flex-1 bg-[#107C41] hover:bg-[#0d6435] text-white rounded-xl shadow-lg border-none" onClick={() => {
                               const updated = { ...weekMetas, [key]: { ...weekMetas[key] } };
                               setWeekMetas(updated);
                               storage.saveWeekMeta(key, updated[key], user?.uid);
                               if (user) cloudStorage.saveWeekMeta(user.uid, key, updated[key]);
                            }}>
                               {t('save')}
                            </Button>
                         </div>
                      </PopoverContent>
                    </Popover>
                  </React.Fragment>
                );
              })}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedWeekStart(addWeeks(selectedWeekStart, 1))}><ChevronRight className="w-4 h-4"/></Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="link" size="sm">
                  <CalendarIcon className="w-4 h-4 mr-2 sm:inline hidden" />
                  {t('today')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 flex flex-col" align="end" side="top">
                <CalendarUI
                  mode="single"
                  selected={selectedWeekStart}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
                    }
                  }}
                  initialFocus
                />
                <div className="p-3 border-t bg-muted/50">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full text-[11px] font-bold h-7 rounded-lg"
                    onClick={() => {
                      const now = new Date();
                      setSelectedWeekStart(startOfWeek(now, { weekStartsOn: 1 }));
                      setIsCalendarOpen(false);
                    }}
                  >
                    {t('currentDay')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
         </div>
      </footer>

      {/* Floating UI Group */}
      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-3 pointer-events-none items-end">
        <HealthTipPanel theme={settings.theme} isSettingsOpen={isSettingsOpen} t={t} lang={settings.language} onActivate={(m) => { setCatMoodOverride(m); setTimeout(() => setCatMoodOverride(null), 4000); }} />
        {gymRestOpen && (
          <AnimatePresence>
            <motion.div
              drag
              dragMomentum={false}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onPointerDown={(e) => e.stopPropagation()}
              className="fixed bottom-24 right-4 z-40 w-[min(95vw,22rem)] border shadow-2xl rounded-3xl overflow-hidden cursor-move bg-card border-border pointer-events-auto"
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest">{t('gymRestTimer')}</h3>
                      <p className="text-[10px] opacity-90">{t('gymRestDuration')} {formatSeconds(settings.gymRestDurationSeconds ?? 60)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateSettings({ gymRestSoundEnabled: !settings.gymRestSoundEnabled })}
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/20 bg-white/10 transition",
                          settings.gymRestSoundEnabled ? 'text-white' : 'text-white/70'
                        )}
                        title={t('gymRestSound')}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSettings({ gymRestVibrationEnabled: !settings.gymRestVibrationEnabled })}
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/20 bg-white/10 transition",
                          settings.gymRestVibrationEnabled ? 'text-white' : 'text-white/70'
                        )}
                        title={t('gymRestVibration')}
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                      <X className="w-4 h-4 cursor-pointer" onClick={() => setGymRestOpen(false)} />
                    </div>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[30, 45, 60, 90, 120].map((sec) => (
                        <Button
                          key={sec}
                          size="sm"
                          variant={settings.gymRestDurationSeconds === sec ? 'secondary' : 'outline'}
                          className="h-9 rounded-2xl text-xs font-bold"
                          onClick={() => handleUpdateSettings({ gymRestDurationSeconds: sec })}
                        >
                          {sec}s
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant={gymRestCustomOpen ? 'secondary' : 'outline'}
                        className="h-9 rounded-2xl text-xs font-bold col-span-3"
                        onClick={() => setGymRestCustomOpen((v) => !v)}
                      >
                        {t('custom')} ⚙️
                      </Button>
                    </div>

                    {gymRestCustomOpen && (
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <Input
                          type="number"
                          min={5}
                          max={600}
                          value={settings.gymRestDurationSeconds ?? 60}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            handleUpdateSettings({ gymRestDurationSeconds: value });
                            if (!gymRestRunning) setGymRestRemaining(value);
                          }}
                          className="h-11 rounded-2xl border border-border bg-muted/70 text-center"
                        />
                        <span className="text-xs text-muted-foreground">{t('seconds')}</span>
                      </div>
                    )}

                    <div className="rounded-[32px] border border-border bg-background p-5 text-center">
                      <div className="text-[3rem] font-black leading-none tracking-tight text-[#FF6B00]">
                        {formatSeconds(gymRestRemaining)}
                      </div>
                      <p className="text-xs uppercase opacity-70 mt-2 tracking-[0.3em]">{t('gymRestTimer')}</p>
                      <p className="text-sm font-bold mt-3">{t('setProgress', { current: String(gymRestRound), total: String(gymRestSets) })}</p>
                      <p className="text-[11px] opacity-70 mt-1">{t('gymRestNextRound', { nextRound: String(Math.min(gymRestRound + 1, gymRestSets)) })}</p>
                    </div>

                    <div className="grid gap-2">
                      <Button
                        className={cn(
                          "h-12 rounded-2xl text-sm font-bold",
                          gymRestRunning ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-[#FF6B00] text-white hover:bg-[#ff7f2f]'
                        )}
                        onClick={() => {
                          if (gymRestRunning) pauseGymRest();
                          else startGymRest();
                        }}
                      >
                        {gymRestRunning ? <><Pause className="w-4 h-4 mr-2 inline" />{t('pause')}</> : <><Play className="w-4 h-4 mr-2 inline" />{t('start')}</>}
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={resetGymRest}>{t('reset')}</Button>
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl" onClick={() => setGymRestOpen(false)}>{t('close')}</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        )}
        
        {/* Dynamic Cat */}
        {settings.catEnabled !== false && (
          <motion.div
            animate={{ x: [0, -8, 8, 0], y: [0, -6, 6, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-auto"
          >
            {/* Dynamic Cat positioned above everything */}
            <div style={{ position: 'fixed', left: (catPosition?.left ?? window.innerWidth - 110), top: (catPosition?.top ?? window.innerHeight - 220), zIndex: 99999 }} className="pointer-events-auto">
              <DynamicCat 
                mood={catMoodOverride ?? catMood}
                size="md"
                onClick={() => {
                  playMusicalNote();
                  setShowCelebration(true);
                }}
              />
            </div>
          </motion.div>
        )}
        <div className="relative inline-block pointer-events-auto">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIsPomodoroOpen(v => !v)}
            className={cn(
              "w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95",
              pomodoroRunning ? "animate-pulse bg-red-500" : "bg-[#107C41]"
            )}
            title={t('pomodoro')}
          >
            <Timer className="w-6 h-6 text-white" />
          </button>

          <AnimatePresence>
            {isPomodoroOpen && (
              <motion.div
                drag
                dragMomentum={false}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute z-40 w-64 right-0 bottom-14 border shadow-2xl rounded-xl overflow-hidden cursor-move bg-card"
              >
                <div className="p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-sm uppercase tracking-wider">{t('pomodoro')}</h3>
                    <Badge variant="outline">{pomodoroSessions} {t('sessions')}</Badge>
                  </div>
                  
                  <div className={cn(
                    "text-center py-6 rounded-2xl transition-colors duration-500",
                    pomodoroMode === 'work' 
                      ? "bg-red-500/10 text-red-600 dark:text-red-400" 
                      : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                  )}>
                    <div className="text-5xl font-black font-mono tracking-tighter">
                      {Math.floor(pomodoroSecondsLeft / 60).toString().padStart(2, '0')}:
                      {(pomodoroSecondsLeft % 60).toString().padStart(2, '0')}
                    </div>
                    <p className="text-[10px] uppercase opacity-70 mt-1 font-bold tracking-widest">{t(pomodoroMode as any)}</p>
                  </div>

                  <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
                    {(['work', 'short', 'long'] as PomodoroMode[]).map(m => (
                      <Button 
                        key={m}
                        variant={pomodoroMode === m ? 'secondary' : 'ghost'} 
                        size="xs" 
                        className={cn(
                          "flex-1 text-[10px] rounded-lg transition-all",
                          pomodoroMode === m && (
                            pomodoroMode === 'work' 
                              ? "bg-background text-red-600 shadow-sm" 
                              : "bg-background text-teal-600 shadow-sm"
                          )
                        )}
                        onClick={() => switchPomodoroMode(m)}
                      >
                        {t(m === 'work' ? 'work' : m === 'short' ? 'shortBreak' : 'longBreak' as any)}
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      className={cn(
                        "flex-1 h-10 rounded-xl font-bold transition-all",
                        pomodoroRunning 
                          ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" 
                          : (pomodoroMode === 'work' ? "bg-red-600 hover:bg-red-700 text-white" : "bg-teal-600 hover:bg-teal-700 text-white")
                      )}
                      onClick={togglePomodoro}
                    >
                      {pomodoroRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {pomodoroRunning ? t('pause') : t('start')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl"
                      onClick={resetPomodoro}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CelebrationEffect trigger={showCelebration} count={25} />
      <Toaster />

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
         <DialogContent className="w-full max-w-[calc(100vw-32px)] sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-popover p-0">
            <div className="flex h-full sm:min-h-[32rem] min-h-0 flex-col rounded-[32px] bg-card shadow-xl sm:flex-row">
              <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} orientation="vertical" className="w-full flex flex-col sm:flex-row overflow-hidden">
                {/* Mobile: accordion list (full width with scrolling) */}
                <div className="block sm:hidden px-4 py-4 mobile-settings-scroll">
                  <div className="mb-3 px-2">
                    <DialogHeader className="p-0">
                      <DialogTitle className="text-base md:text-lg">{t('settings')}</DialogTitle>
                    </DialogHeader>
                    <p className="mt-1 text-xs text-muted-foreground">{t('appDescription')}</p>
                  </div>

                {/* Desktop: left sidebar tabs */}
                <aside className="hidden sm:flex sm:flex-col sm:w-52 md:w-56 lg:w-64 sm:border-r sm:border-b-0 p-4 md:p-6 bg-muted/50 overflow-y-auto">
                  <div className="mb-4">
                    <DialogHeader className="p-0">
                      <DialogTitle className="text-base">{t('settings')}</DialogTitle>
                    </DialogHeader>
                    <p className="mt-1 text-xs text-muted-foreground">{t('appDescription')}</p>
                  </div>
                  <TabsList className="grid gap-2">
                    {settingsTabs.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={cn(
                          "group flex h-14 items-center justify-between rounded-2xl border border-transparent bg-background px-4 text-sm font-medium text-foreground transition hover:border-border hover:bg-muted sm:justify-start",
                          activeSettingsTab === tab.value && "bg-[#F8F9FD] shadow-sm"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          {tab.icon}
                          <span>{tab.label}</span>
                        </span>
                        <ChevronRight className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform duration-200",
                          activeSettingsTab === tab.value ? "rotate-90" : ""
                        )} />
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </aside>
                  <div className="space-y-2 px-2">
                    {settingsTabs.map((tab) => (
                      <div key={tab.value} className="w-full">
                        <button
                          type="button"
                          onClick={() => setMobileExpanded(mobileExpanded === tab.value ? null : tab.value)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-background text-sm font-medium text-foreground border border-border transition-all duration-200",
                            mobileExpanded === tab.value && 'bg-[#F8F9FD] shadow-md'
                          )}
                          aria-expanded={mobileExpanded === tab.value}
                        >
                          <span className="flex items-center gap-3">
                            {tab.icon}
                            <span className="truncate">{tab.label}</span>
                          </span>
                          <ChevronRight className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform duration-200",
                            mobileExpanded === tab.value ? "rotate-90" : ""
                          )} />
                        </button>

                        {mobileExpanded === tab.value && (
                          <div className="mt-2 px-2 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Render corresponding content for this tab (mobile-friendly full width) */}
                            <div className="space-y-4">
                              {tab.value === 'general' && (
                                <div className="rounded-2xl border border-border bg-muted/60 p-4">
                                  <div className="flex flex-col gap-3">
                                    <div className="w-full">
                                      <p className="text-sm font-semibold">{t('language')}</p>
                                      <p className="text-xs text-muted-foreground">{t('language')}</p>
                                      <div className="mt-2">
                                        <Select value={settings.language} onValueChange={(v: Language) => handleUpdateSettings({ language: v })}>
                                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="w-full">
                                      <p className="text-sm font-semibold mt-2">{t('theme')}</p>
                                      <p className="text-xs text-muted-foreground">{t('theme')}</p>
                                      <div className="flex items-center gap-2 rounded-full bg-background p-1 mt-2">
                                        <Button variant={settings.theme === 'light' ? 'secondary' : 'ghost'} size="xs" onClick={() => handleUpdateSettings({ theme: 'light' })}>
                                          <Sun className="w-3 h-3" />
                                        </Button>
                                        <Button variant={settings.theme === 'dark' ? 'secondary' : 'ghost'} size="xs" onClick={() => handleUpdateSettings({ theme: 'dark' })}>
                                          <Moon className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="w-full">
                                      <p className="text-sm font-semibold mt-2">{t('cat')}</p>
                                      <p className="text-xs text-muted-foreground">{t('enableCat')}</p>
                                      <div className="mt-2">
                                        <Switch
                                          checked={settings.catEnabled !== false}
                                          onCheckedChange={(checked) => handleUpdateSettings({ catEnabled: checked })}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {tab.value === 'schedule' && (
                                <div className="rounded-2xl border border-border bg-muted/60 p-4 space-y-4">
                                  <div className="flex flex-col gap-3">
                                    <span className="text-sm text-foreground">{t('startHour')}</span>
                                    <div className="flex items-center gap-3">
                                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => { if (settings.startHour > 0) handleUpdateSettings({ startHour: settings.startHour - 1 }); }}>
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <span className="w-12 text-center font-black text-[#107C41]">{settings.startHour}h</span>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => { if (settings.startHour < settings.endHour - 1) handleUpdateSettings({ startHour: settings.startHour + 1 }); }}>
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <span className="text-sm text-foreground">{t('endHour')}</span>
                                    <div className="flex items-center gap-3">
                                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => { if (settings.endHour > settings.startHour + 1) handleUpdateSettings({ endHour: settings.endHour - 1 }); }}>
                                        <Minus className="w-3 h-3" />
                                      </Button>
                                      <span className="w-12 text-center font-black text-[#107C41]">{settings.endHour}h</span>
                                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => { if (settings.endHour < 23) handleUpdateSettings({ endHour: settings.endHour + 1 }); }}>
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {tab.value === 'sound' && (
                                <div className="rounded-2xl border border-border bg-muted/60 p-4 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold">{t('notificationsLabel')}</p>
                                      <p className="text-xs text-muted-foreground">{t('notificationSound')}</p>
                                    </div>
                                    <Switch checked={!!settings.notificationsEnabled} onCheckedChange={(v) => handleUpdateSettings({ notificationsEnabled: v })} />
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Label>{t('notificationSound')}</Label>
                                    <div className="flex items-center gap-2">
                                      <Select value={settings.notificationSound} onValueChange={(v: NotificationSound) => handleUpdateSettings({ notificationSound: v })}>
                                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="bird">{t('bird')}</SelectItem>
                                          <SelectItem value="wind">{t('wind')}</SelectItem>
                                          <SelectItem value="bell">{t('bell')}</SelectItem>
                                          <SelectItem value="chime">{t('chime')}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => playNotificationSound(settings.notificationSound)}>
                                        <Volume2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-border" />

                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold">{t('music')}</p>
                                      <p className="text-xs text-muted-foreground">{t('musicTrack')}</p>
                                    </div>
                                    <Switch checked={!!settings.musicEnabled} onCheckedChange={(v) => handleUpdateSettings({ musicEnabled: v })} />
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Select value={settings.musicTrackId} onValueChange={(v: string) => handleUpdateSettings({ musicTrackId: v })}>
                                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {PRESET_TRACKS.map(track => (
                                          <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Slider value={[settings.musicVolume ?? 0.3]} onValueChange={(v: number[]) => handleUpdateSettings({ musicVolume: v[0] })} min={0} max={1} step={0.01} />
                                  </div>

                                  <div className="pt-2 border-t border-border" />

                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold">{t('gymRestTimer')}</p>
                                      <p className="text-xs text-muted-foreground">{t('gymRestTimerDescription')}</p>
                                    </div>
                                    <Switch checked={!!settings.gymRestEnabled} onCheckedChange={(v) => handleUpdateSettings({ gymRestEnabled: v })} />
                                  </div>

                                  <div className="flex flex-col gap-2">
                                    <Input type="number" min={5} max={600} value={settings.gymRestDurationSeconds ?? 60} onChange={(e) => handleUpdateSettings({ gymRestDurationSeconds: Number(e.target.value) })} className="h-10 rounded-2xl border border-border" placeholder={t('gymRestDuration')} />
                                    <div className="flex gap-2 items-center">
                                      <Switch checked={!!settings.gymRestSoundEnabled} onCheckedChange={(v) => handleUpdateSettings({ gymRestSoundEnabled: v })} />
                                      <Label className="text-xs">{t('gymRestSound')}</Label>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <Switch checked={!!settings.gymRestVibrationEnabled} onCheckedChange={(v) => handleUpdateSettings({ gymRestVibrationEnabled: v })} />
                                      <Label className="text-xs">{t('gymRestVibration')}</Label>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {tab.value === 'appearance' && (
                                <div className="rounded-2xl border border-border bg-muted/60 p-4">
                                  <BackgroundCustomizer
                                    config={settings.backgroundConfig}
                                    onChange={(config) => handleUpdateSettings({ backgroundConfig: config })}
                                    t={t}
                                    theme={settings.theme}
                                  />
                                </div>
                              )}

                              {tab.value === 'account' && (
                                <div className="rounded-2xl border border-border bg-muted/60 p-4 space-y-4">
                                  {user ? (
                                    <div className="flex items-center gap-3">
                                      <img src={user.photoURL || ''} className="w-10 h-10 rounded-full" />
                                      <div className="flex-1">
                                        <p className="text-sm font-semibold">{user.displayName}</p>
                                        <p className="text-xs opacity-70">{user.email}</p>
                                      </div>
                                      <Button variant="outline" size="sm" onClick={() => signOutUser()}>{t('signOut')}</Button>
                                    </div>
                                  ) : (
                                    <Button
                                      disabled={loginLoading}
                                      onClick={async () => {
                                        setLoginLoading(true);
                                        try {
                                          await signInWithGoogle();
                                        } catch (err: any) {
                                          toast.error(err.message || "Đăng nhập thất bại");
                                        } finally {
                                          setLoginLoading(false);
                                        }
                                      }}
                                      className="w-full bg-[#107C41] hover:bg-[#0d6435] text-white"
                                    >
                                      {loginLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                      {t('signIn')}
                                    </Button>
                                  )}
                                  <div className="pt-2 border-t border-border text-center">
                                    <p className="text-[10px] opacity-30">{t('inspiredBy')}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <section className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 hidden sm:block">
                  <TabsContent value="general" className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-muted/60 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold">{t('language')}</p>
                            <p className="text-xs text-muted-foreground">{t('language')}</p>
                          </div>
                          <Select value={settings.language} onValueChange={(v: Language) => handleUpdateSettings({ language: v })}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="vi">Tiếng Việt</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-muted/60 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold">{t('theme')}</p>
                            <p className="text-xs text-muted-foreground">{t('theme')}</p>
                          </div>
                          <div className="flex items-center gap-2 rounded-full bg-background p-1">
                            <Button variant={settings.theme === 'light' ? 'secondary' : 'ghost'} size="xs" onClick={() => handleUpdateSettings({ theme: 'light' })}>
                              <Sun className="w-3 h-3" />
                            </Button>
                            <Button variant={settings.theme === 'dark' ? 'secondary' : 'ghost'} size="xs" onClick={() => handleUpdateSettings({ theme: 'dark' })}>
                              <Moon className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-muted/60 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold">{t('cat')}</p>
                            <p className="text-xs text-muted-foreground">{t('enableCat')}</p>
                          </div>
                          <Switch
                            checked={settings.catEnabled !== false}
                            onCheckedChange={(checked) => handleUpdateSettings({ catEnabled: checked })}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="rounded-2xl border border-border bg-muted/60 p-4 md:p-6 space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-foreground">{t('startHour')}</span>
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => { if (settings.startHour > 0) handleUpdateSettings({ startHour: settings.startHour - 1 }); }}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-12 text-center font-black text-[#107C41]">{settings.startHour}h</span>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => { if (settings.startHour < settings.endHour - 1) handleUpdateSettings({ startHour: settings.startHour + 1 }); }}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-foreground">{t('endHour')}</span>
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => { if (settings.endHour > settings.startHour + 1) handleUpdateSettings({ endHour: settings.endHour - 1 }); }}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-12 text-center font-black text-[#107C41]">{settings.endHour}h</span>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background" onClick={() => { if (settings.endHour < 23) handleUpdateSettings({ endHour: settings.endHour + 1 }); }}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="sound" className="space-y-4 max-h-[50vh] overflow-y-auto pr-4">
                    <div className="rounded-2xl border border-border bg-muted/60 p-4 md:p-6 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{t('notificationsLabel')}</p>
                          <p className="text-xs text-muted-foreground">{t('notificationSound')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch checked={!!settings.notificationsEnabled} onCheckedChange={(v) => handleUpdateSettings({ notificationsEnabled: v })} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label>{t('notificationSound')}</Label>
                        <div className="flex items-center gap-2">
                          <Select value={settings.notificationSound} onValueChange={(v: NotificationSound) => handleUpdateSettings({ notificationSound: v })}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bird">{t('bird')}</SelectItem>
                              <SelectItem value="wind">{t('wind')}</SelectItem>
                              <SelectItem value="bell">{t('bell')}</SelectItem>
                              <SelectItem value="chime">{t('chime')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => playNotificationSound(settings.notificationSound)}>
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border" />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{t('music')}</p>
                          <p className="text-xs text-muted-foreground">{t('musicTrack')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch checked={!!settings.musicEnabled} onCheckedChange={(v) => handleUpdateSettings({ musicEnabled: v })} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="w-full sm:w-auto">
                          <Select value={settings.musicTrackId} onValueChange={(v: string) => handleUpdateSettings({ musicTrackId: v })}>
                            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {PRESET_TRACKS.map(track => (
                                <SelectItem key={track.id} value={track.id}>{track.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-full sm:w-48">
                          <Slider value={[settings.musicVolume ?? 0.3]} onValueChange={(v: number[]) => handleUpdateSettings({ musicVolume: v[0] })} min={0} max={1} step={0.01} />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border" />

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{t('gymRestTimer')}</p>
                          <p className="text-xs text-muted-foreground">{t('gymRestTimerDescription')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch checked={!!settings.gymRestEnabled} onCheckedChange={(v) => handleUpdateSettings({ gymRestEnabled: v })} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 items-center">
                        <Input type="number" min={5} max={600} value={settings.gymRestDurationSeconds ?? 60} onChange={(e) => handleUpdateSettings({ gymRestDurationSeconds: Number(e.target.value) })} className="h-10 rounded-2xl border border-border" />
                        <div className="flex gap-2">
                          <Switch checked={!!settings.gymRestSoundEnabled} onCheckedChange={(v) => handleUpdateSettings({ gymRestSoundEnabled: v })} />
                          <Label className="text-xs">{t('gymRestSound')}</Label>
                        </div>
                        <div className="flex gap-2 col-span-2 items-center">
                          <Switch checked={!!settings.gymRestVibrationEnabled} onCheckedChange={(v) => handleUpdateSettings({ gymRestVibrationEnabled: v })} />
                          <Label className="text-xs">{t('gymRestVibration')}</Label>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="appearance" className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="rounded-2xl border border-border bg-muted/60 p-4 md:p-6">
                      <BackgroundCustomizer
                        config={settings.backgroundConfig}
                        onChange={(config) => handleUpdateSettings({ backgroundConfig: config })}
                        t={t}
                        theme={settings.theme}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="account" className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                    <div className="rounded-2xl border border-border bg-muted/60 p-4 md:p-6">
                      {user ? (
                        <div className="flex items-center gap-3">
                          <img src={user.photoURL || ''} className="w-10 h-10 rounded-full" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{user.displayName}</p>
                            <p className="text-xs opacity-70">{user.email}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => signOutUser()}>{t('signOut')}</Button>
                        </div>
                      ) : (
                        <Button
                          disabled={loginLoading}
                          onClick={async () => {
                            setLoginLoading(true);
                            try {
                              await signInWithGoogle();
                            } catch (err: any) {
                              toast.error(err.message || "Đăng nhập thất bại");
                            } finally {
                              setLoginLoading(false);
                            }
                          }}
                          className="w-full bg-[#107C41] hover:bg-[#0d6435] text-white"
                        >
                          {loginLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          {t('signIn')}
                        </Button>
                      )}
                    </div>
                    <div className="pt-4 border-t border-border text-center">
                      <p className="text-[10px] opacity-30">{t('inspiredBy')}</p>
                    </div>
                  </TabsContent>
                </section>
              </Tabs>
            </div>
         </DialogContent>
      </Dialog>

      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('summaryYear').replace('{year}', format(new Date(), 'yyyy'))}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Array.from({ length: 52 }, (_, i) => {
              const ws = startOfWeek(addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), i - 26), { weekStartsOn: 1 });
              const weekPlans = plans.filter(p => isSameWeek(new Date(p.date), ws, { weekStartsOn: 1 }));
              const completed = weekPlans.filter(p => p.color === 'green').length;
              const total = weekPlans.length;
              const ratio = total > 0 ? (completed / total) : 0;
              
              return (
                <div 
                  key={i} 
                    className={cn(
                      "p-2 rounded border text-center transition-all cursor-pointer hover:scale-105",
                      isSameWeek(ws, new Date(), { weekStartsOn: 1 }) ? "ring-2 ring-[#107C41]" : "",
                      "bg-muted/50 border-border"
                    )}
                  onClick={() => { setSelectedWeekStart(ws); setIsSummaryOpen(false); }}
                >
                  <p className="text-[10px] font-bold opacity-50 uppercase">{t('week')} {format(ws, 'w')}</p>
                  <div className="my-1 flex justify-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black relative overflow-hidden" 
                         style={{ background: `conic-gradient(#107C41 ${ratio * 360}deg, var(--chart-track) 0deg)` }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center z-10 bg-background">
                        {Math.round(ratio * 100)}%
                      </div>
                    </div>
                  </div>
                  <p className="text-[9px] opacity-40">{format(ws, 'd/M')}</p>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
