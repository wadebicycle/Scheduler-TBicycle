import * as React from 'react';
import { 
  format, 
  addDays, 
  addWeeks,
  getDay,
  isSameDay,
  isSameWeek,
  startOfWeek,
  isAfter,
  isBefore
} from 'date-fns';
import { Plan, PlanColor, Language, Theme } from '../types';
import { cn } from '@/lib/utils';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';
import { translations } from '../lib/i18n';
import { playMusicalNote } from '../lib/sounds';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLOR_MAP: Record<PlanColor, string> = {
  default: 'bg-card grayscale',
  green: 'bg-[#92D050] text-[#000]',
  yellow: 'bg-[#FFFF00] text-[#000]',
  gray: 'bg-[#7F7F7F] text-[#fff]',
  red: 'bg-[#FF0000] text-[#fff]',
  blue: 'bg-[#0070C0] text-[#fff]',
};

interface ScheduleGridProps {
  currentWeekStart: Date;
  plans: Plan[];
  onAddPlan: (plan: Plan) => void;
  onUpdatePlan: (plan: Plan) => void;
  onDeletePlan: (id: string) => void;
  onPlanTurnGreen?: (plan: Plan) => void;
  language: Language;
  theme: Theme;
  startHour: number;
  endHour: number;
}

export function ScheduleGrid({ 
  currentWeekStart, 
  plans, 
  onAddPlan, 
  onUpdatePlan, 
  onDeletePlan,
  onPlanTurnGreen,
  language,
  theme,
  startHour,
  endHour,
}: ScheduleGridProps) {

  const t = (key: keyof typeof translations.en, params: Record<string, string> = {}) => {
    let text = translations[language][key] || key;
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
    return text;
  };
  const dayLabels = [t('monday'), t('tuesday'), t('wednesday'), t('thursday'), t('friday'), t('saturday'), t('sunday')];
  const dayShortLabels = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];

  const HOURS = React.useMemo(
    () => Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour),
    [startHour, endHour]
  );

  const [editingPlan, setEditingPlan] = React.useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newColor, setNewColor] = React.useState<PlanColor>('yellow');
  const [newDuration, setNewDuration] = React.useState(1);
  const [newNotes, setNewNotes] = React.useState('');
  const [applyMode, setApplyMode] = React.useState<'none' | 'applyWeekly' | 'applyNextWeek'>('none');
  const [applyUntilDate, setApplyUntilDate] = React.useState('');
  const [editingOccurrenceDate, setEditingOccurrenceDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (editingPlan) {
      const sourceDate = new Date(editingPlan.date);
      const nextWeekDate = addDays(sourceDate, 7);
      const defaultUntil = format(nextWeekDate, 'yyyy-MM-dd');

      if (editingPlan.repeatWeekly || editingPlan.appliedTo) {
        const startsNextWeek = editingPlan.appliedFrom && isSameDay(new Date(editingPlan.appliedFrom), nextWeekDate);
        setApplyMode(startsNextWeek ? 'applyNextWeek' : 'applyWeekly');
        const derivedUntilDate = editingPlan.applyUntilDate
          ? editingPlan.applyUntilDate
          : editingPlan.appliedTo
            ? format(new Date(editingPlan.appliedTo), 'yyyy-MM-dd')
            : defaultUntil;
        setApplyUntilDate(derivedUntilDate);
      } else {
        setApplyMode('none');
        setApplyUntilDate(defaultUntil);
      }
    } else {
      setApplyMode('none');
      setApplyUntilDate('');
    }
  }, [editingPlan?.id, editingPlan?.date, editingPlan?.repeatWeekly, editingPlan?.appliedFrom, editingPlan?.appliedTo, editingPlan?.applyUntilDate]);

  const daysOfCurrentWeek = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const clickCount = React.useRef(0);
  const clickTimer = React.useRef<NodeJS.Timeout | null>(null);

  const getWeekdayIndex = (date: Date) => ((getDay(date) + 6) % 7);
  const getOccurrenceDateForWeek = (planDate: Date, weekStart: Date) => addDays(weekStart, getWeekdayIndex(planDate));

  const isRecurringPlanActiveForWeek = (plan: Plan, weekStart: Date) => {
    const planDate = new Date(plan.date);
    const occurrenceDate = getOccurrenceDateForWeek(planDate, weekStart);
    const from = plan.appliedFrom ? new Date(plan.appliedFrom) : planDate;
    const to = plan.appliedTo ? new Date(plan.appliedTo) : null;

    if (isAfter(from, occurrenceDate)) {
      return false;
    }
    if (to && isAfter(occurrenceDate, to)) {
      return false;
    }
    if (isBefore(occurrenceDate, planDate) && !plan.repeatWeekly) {
      return false;
    }
    return true;
  };

  const visiblePlans = React.useMemo(() => {
    return plans.flatMap((plan) => {
      const planDate = new Date(plan.date);

      if (isSameWeek(planDate, currentWeekStart, { weekStartsOn: 1 })) {
        return [plan];
      }

      if ((plan.repeatWeekly || plan.appliedFrom || plan.appliedTo) && isRecurringPlanActiveForWeek(plan, currentWeekStart)) {
        const occurrenceDate = getOccurrenceDateForWeek(planDate, currentWeekStart);
        const explicitDuplicate = plans.some((otherPlan) =>
          otherPlan.id !== plan.id &&
          isSameDay(new Date(otherPlan.date), occurrenceDate) &&
          otherPlan.startHour === plan.startHour
        );
        if (explicitDuplicate) {
          return [];
        }
        return [{ ...plan, date: occurrenceDate.toISOString(), sourcePlanId: plan.id }];
      }

      return [];
    });
  }, [plans, currentWeekStart]);

  const handleUnifiedClick = (date: Date, hour: number) => {
    playMusicalNote();
    const existing = visiblePlans.find(p => isSameDay(new Date(p.date), date) && p.startHour === hour);
    const actualExisting = existing?.sourcePlanId ? plans.find(p => p.id === existing.sourcePlanId) ?? existing : existing;

    if (!actualExisting || actualExisting.title === '') {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        clickCount.current = 0;
      }
      
      if (actualExisting) {
        setEditingPlan(actualExisting);
        setEditingOccurrenceDate(existing?.sourcePlanId ? existing.date : null);
        setNewTitle(actualExisting.title);
        setNewColor(actualExisting.color);
        setNewDuration(actualExisting.duration);
        setNewNotes(actualExisting.notes || '');
      } else {
        setEditingPlan({
          id: crypto.randomUUID(),
          title: '',
          date: date.toISOString(),
          startHour: hour,
          duration: 1,
          color: 'yellow'
        } as Plan);
        setEditingOccurrenceDate(null);
        setNewTitle('');
        setNewColor('yellow');
        setNewDuration(1);
        setNewNotes('');
      }
      setIsDialogOpen(true);
      return;
    }

    clickCount.current += 1;

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
    }

    clickTimer.current = setTimeout(() => {
      if (clickCount.current === 1) {
        const updated = { ...existing, color: 'yellow' as PlanColor };
        onUpdatePlan(updated);
      } else if (clickCount.current === 2) {
        const updated = { ...existing, color: 'green' as PlanColor };
        onUpdatePlan(updated);
        if (existing.color !== 'green') {
          onPlanTurnGreen?.(updated);
        }
      } else if (clickCount.current >= 3) {
        onUpdatePlan({ ...existing, color: 'default' as PlanColor });
      }
      clickCount.current = 0;
      clickTimer.current = null;
    }, 300);
  };

  const handleOpenEdit = (plan: Plan, e: React.MouseEvent) => {
    e.stopPropagation();
    const sourcePlan = plan.sourcePlanId ? plans.find(p => p.id === plan.sourcePlanId) ?? plan : plan;
    setEditingPlan(sourcePlan);
    setEditingOccurrenceDate(plan.sourcePlanId ? plan.date : null);
    setNewTitle(sourcePlan.title);
    setNewColor(sourcePlan.color);
    setNewDuration(sourcePlan.duration);
    setNewNotes(sourcePlan.notes || '');
    setIsDialogOpen(true);
  };

  const buildUpdatedPlan = (plan: Plan) => ({
    ...plan,
    title: newTitle,
    color: newColor,
    duration: newDuration,
    notes: newNotes || undefined,
  });

  const handleSave = async () => {
    if (!editingPlan) return;

    const sourceDate = new Date(editingPlan.date);
    const nextWeekDate = addDays(sourceDate, 7);
    const updatedSourcePlan = buildUpdatedPlan(editingPlan);
    const wasGreen = plans.find(p => p.id === editingPlan.id)?.color === 'green';
    const isNew = !plans.some(p => p.id === updatedSourcePlan.id);

    try {
      if (applyMode === 'applyWeekly' || applyMode === 'applyNextWeek') {
        const targetDate = applyUntilDate ? new Date(applyUntilDate) : nextWeekDate;
        const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
        const endDate = addDays(targetWeekStart, getWeekdayIndex(sourceDate));

        const recurrencePlan = {
          ...updatedSourcePlan,
          repeatWeekly: true,
          appliedFrom: applyMode === 'applyNextWeek' ? nextWeekDate.toISOString() : updatedSourcePlan.date,
          appliedTo: endDate.toISOString(),
          applyUntilDate: applyUntilDate || format(targetDate, 'yyyy-MM-dd'),
        } as Plan;

        if (isNew) {
          await onAddPlan(recurrencePlan);
        } else {
          await onUpdatePlan(recurrencePlan);
        }
      } else {
        const plainPlan = {
          ...updatedSourcePlan,
          appliedFrom: undefined,
          appliedTo: undefined,
          repeatWeekly: false,
          applyUntilDate: undefined,
        } as Plan;

        if (isNew) {
          await onAddPlan(plainPlan);
        } else {
          await onUpdatePlan(plainPlan);
        }
      }

      if (!isNew && !wasGreen && newColor === 'green') {
        onPlanTurnGreen?.(updatedSourcePlan);
      } else if (isNew && newColor === 'green') {
        onPlanTurnGreen?.(updatedSourcePlan);
      }

      setIsDialogOpen(false);
    } catch (e) {
      console.error('Error saving plan:', e);
    }
  };

  const handleDelete = () => {
    if (editingPlan) {
      onDeletePlan(editingPlan.id);
      setIsDialogOpen(false);
    }
  };

  const maxDuration = (hour: number) => Math.min(12, endHour - hour + 1);

  return (
    <div className="w-full overflow-x-auto rounded-xl border transition-colors bg-card border-border">
      <table className="w-full border-collapse table-fixed min-w-[600px]">
        <thead className="sticky top-0 z-30">
          <tr className="bg-muted/95 backdrop-blur">
            <th className="w-14 md:w-20 border p-2 text-[10px] font-black uppercase tracking-wider sticky left-0 z-30 bg-card border-border text-muted-foreground">
              <Clock className="w-3 h-3 mx-auto" />
            </th>
            {daysOfCurrentWeek.map((day, i) => (
              <th key={i} className={cn(
                "border p-2 text-[10px] md:text-xs font-black uppercase tracking-tight border-border text-foreground bg-muted/95",
                isSameDay(day, new Date()) && "bg-primary/10 text-primary"
              )}>
                <span className="hidden md:inline">{dayLabels[i]}</span>
                <span className="md:hidden">{dayShortLabels[i]}</span>
                <div className="text-[10px] opacity-50">{format(day, 'd/M')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map(hour => (
            <tr key={hour} className="h-10 md:h-12">
              <td className="border text-center font-bold text-[10px] md:text-xs sticky left-0 z-20 bg-muted/50 border-border text-muted-foreground">
                {hour}:00
              </td>
              {daysOfCurrentWeek.map((day, dayIndex) => {
                  const plan = visiblePlans.find(p => isSameDay(new Date(p.date), day) && p.startHour === hour);
                  const isPartofPreviousPlan = visiblePlans.some(p => 
                    isSameDay(new Date(p.date), day) &&
                    hour > p.startHour && 
                    hour < p.startHour + p.duration
                  );
                return (
                  <td 
                    key={dayIndex} 
                    rowSpan={plan?.duration || 1}
                    className={cn(
                      "border p-0 relative group cursor-pointer transition-all duration-200 border-border",
                      plan ? COLOR_MAP[plan.color] : "bg-background/50 hover:bg-muted"
                    )}
                    onClick={() => handleUnifiedClick(day, hour)}
                  >
                    {plan ? (
                      <div className="w-full h-full p-1.5 text-[10px] md:text-xs font-bold flex flex-col items-center justify-center text-center relative leading-tight gap-0.5">
                        <span className={cn(plan.title === '' && "italic opacity-30")}>
                          {plan.title || t('enterTask')}
                        </span>
                        {plan.duration > 1 && (
                          <span className="text-[9px] opacity-50">{plan.duration}{t('hours_suffix')}</span>
                        )}
                        {plan.appliedFrom && plan.appliedTo && (
                          <span className="text-[8px] opacity-70 mt-1 block leading-snug">
                            {t('appliedFromTo', {
                              from: format(new Date(plan.appliedFrom), 'd/M'),
                              to: format(new Date(plan.appliedTo), 'd/M'),
                            })}
                          </span>
                        )}
                        {plan.notes && (
                          <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-current opacity-40" title={plan.notes} />
                        )}
                        <button 
                          onClick={(e) => {
                            playMusicalNote();
                            handleOpenEdit(plan, e);
                          }}
                          className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-muted/40 p-1 rounded hover:bg-muted/60"
                        >
                          <Edit2 className="w-2 md:w-3 h-2 md:h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
                        <Plus className="w-4 md:w-5 h-4 md:h-5 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:rounded-2xl border-none max-w-sm w-full bg-card max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {plans.some(p => p.id === editingPlan?.id) ? t('editPlan') : t('addPlan')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingPlan && `${editingPlan.startHour}:00 — ${format(new Date(editingOccurrenceDate || editingPlan.date), 'EEE, d/M')}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label htmlFor="title" className="text-xs font-bold text-muted-foreground sm:text-right">
                {t('title')}
              </Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="sm:col-span-3 font-semibold bg-muted/50 border-border"
                placeholder={t('enterTask')}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label className="text-xs font-bold text-muted-foreground sm:text-right">
                {t('duration')}
              </Label>
              <div className="sm:col-span-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <Select
                  value={String(newDuration)}
                  onValueChange={(v) => setNewDuration(Number(v))}
                >
                  <SelectTrigger className="w-28 bg-muted/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: editingPlan ? maxDuration(editingPlan.startHour) : 8 }, (_, i) => i + 1).map(h => (
                      <SelectItem key={h} value={String(h)}>{h} {t('hours_suffix')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  → {editingPlan ? editingPlan.startHour + newDuration : ''}:00
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label className="text-xs font-bold text-muted-foreground sm:text-right">
                {t('color')}
              </Label>
              <div className="sm:col-span-3 flex gap-2 flex-wrap">
                {(Object.keys(COLOR_MAP) as PlanColor[]).map(color => (
                  <button
                    key={color}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                      COLOR_MAP[color],
                      "border-border",
                      newColor === color && "ring-2 ring-primary ring-offset-2 scale-110"
                    )}
                    onClick={() => {
                      playMusicalNote();
                      setNewColor(color);
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-3">
              <Label className="text-xs font-bold pt-2 text-muted-foreground sm:text-right">
                {t('notes')}
              </Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                rows={2}
                className="sm:col-span-3 text-xs resize-none bg-muted/50 border-border placeholder:text-muted-foreground"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-3">
              <Label className="text-xs font-bold text-muted-foreground sm:text-right">
                {t('applyMode')}
              </Label>
              <div className="sm:col-span-3 space-y-2">
                <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="applyMode"
                    value="applyWeekly"
                    checked={applyMode === 'applyWeekly'}
                    onChange={() => setApplyMode('applyWeekly')}
                  />
                  <span className="text-xs">{t('applyWeekly')}</span>
                </label>
                <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer">
                  <input
                    type="radio"
                    name="applyMode"
                    value="applyNextWeek"
                    checked={applyMode === 'applyNextWeek'}
                    onChange={() => setApplyMode('applyNextWeek')}
                  />
                  <span className="text-xs">{t('applyNextWeek')}</span>
                </label>
              </div>
            </div>
            {applyMode !== 'none' && (
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                <Label htmlFor="apply-until-date" className="text-xs font-bold text-muted-foreground sm:text-right">
                  {t('applyUntil')}
                </Label>
                <Input
                  id="apply-until-date"
                  type="date"
                  value={applyUntilDate}
                  onChange={(e) => setApplyUntilDate(e.target.value)}
                  className="sm:col-span-3 w-full bg-muted/50 border-border"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between w-full flex-row gap-2">
            {plans.some(p => p.id === editingPlan?.id) && (
              <Button variant="destructive" size="sm" onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                <Trash2 className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">{t('delete')}</span>
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="text-muted-foreground">
                {t('cancel')}
              </Button>
              <Button onClick={handleSave} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {t('save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
