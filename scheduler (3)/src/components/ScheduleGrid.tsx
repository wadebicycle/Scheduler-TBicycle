import * as React from 'react';
import { 
  format, 
  addDays, 
  isSameDay 
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

  const t = (key: keyof typeof translations.en) => translations[language][key];
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
  const [applyTargetDate, setApplyTargetDate] = React.useState('');

  React.useEffect(() => {
    if (editingPlan) {
      setApplyTargetDate(format(new Date(editingPlan.date), 'yyyy-MM-dd'));
    } else {
      setApplyTargetDate(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [editingPlan?.id, editingPlan?.date]);

  const daysOfCurrentWeek = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const clickCount = React.useRef(0);
  const clickTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleUnifiedClick = (date: Date, hour: number) => {
    playMusicalNote();
    const existing = plans.find(p => isSameDay(new Date(p.date), date) && p.startHour === hour);

    if (!existing || existing.title === '') {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        clickCount.current = 0;
      }
      
      if (existing) {
        setEditingPlan(existing);
        setNewTitle(existing.title);
        setNewColor(existing.color);
        setNewDuration(existing.duration);
        setNewNotes(existing.notes || '');
      } else {
        setEditingPlan({
          id: crypto.randomUUID(),
          title: '',
          date: date.toISOString(),
          startHour: hour,
          duration: 1,
          color: 'yellow'
        } as Plan);
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
    setEditingPlan(plan);
    setNewTitle(plan.title);
    setNewColor(plan.color);
    setNewDuration(plan.duration);
    setNewNotes(plan.notes || '');
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
    const targetDate = new Date(`${applyTargetDate}T12:00:00`);
    const isApplyingToDifferentDate = !isSameDay(sourceDate, targetDate);
    const updatedSourcePlan = buildUpdatedPlan(editingPlan);
    const wasGreen = plans.find(p => p.id === editingPlan.id)?.color === 'green';
    const isNew = !plans.some(p => p.id === updatedSourcePlan.id);

    try {
      if (isApplyingToDifferentDate) {
        const targetPlan = plans.find((p) => isSameDay(new Date(p.date), targetDate) && p.startHour === editingPlan.startHour);
        const updatedTargetPlan = {
          ...buildUpdatedPlan(editingPlan),
          id: targetPlan?.id || crypto.randomUUID(),
          date: targetDate.toISOString(),
          appliedFrom: updatedSourcePlan.appliedFrom || updatedSourcePlan.date,
          appliedTo: targetDate.toISOString(),
        } as Plan;

        const updatedOriginalPlan = {
          ...updatedSourcePlan,
          appliedFrom: updatedSourcePlan.appliedFrom || updatedSourcePlan.date,
          appliedTo: targetDate.toISOString(),
        } as Plan;

        await onUpdatePlan(updatedOriginalPlan);

        if (targetPlan) {
          await onUpdatePlan(updatedTargetPlan);
        } else {
          await onAddPlan(updatedTargetPlan);
        }
      } else {
        if (isNew) {
          await onAddPlan(updatedSourcePlan);
        } else {
          await onUpdatePlan(updatedSourcePlan);
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

  const handleApplyToDate = () => {
    if (!editingPlan || !applyTargetDate) return;

    const sourceDate = new Date(editingPlan.date);
    const targetDate = new Date(`${applyTargetDate}T12:00:00`);
    if (isSameDay(targetDate, sourceDate)) {
      toast.info(t('sameDateSelected'));
      return;
    }

    const targetPlan = plans.find((p) => isSameDay(new Date(p.date), targetDate) && p.startHour === editingPlan.startHour);
    const payload = {
      ...editingPlan,
      id: targetPlan?.id || crypto.randomUUID(),
      title: newTitle,
      color: newColor,
      duration: newDuration,
      notes: newNotes || undefined,
      date: targetDate.toISOString(),
      startHour: editingPlan.startHour,
      appliedFrom: editingPlan.appliedFrom || editingPlan.date,
      appliedTo: targetDate.toISOString(),
    } as Plan;

    const originalPlan = { ...editingPlan, appliedTo: targetDate.toISOString() };
    onUpdatePlan(originalPlan);

    if (targetPlan) {
      onUpdatePlan(payload);
    } else {
      onAddPlan(payload);
    }

    toast.success(`${t('appliedToDate')} ${format(targetDate, 'dd/MM/yyyy')}`);
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
                const plan = plans.find(p => isSameDay(new Date(p.date), day) && p.startHour === hour);
                const isPartofPreviousPlan = plans.some(p => 
                  isSameDay(new Date(p.date), day) && 
                  hour > p.startHour && 
                  hour < p.startHour + p.duration
                );

                if (isPartofPreviousPlan) return null;

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
        <DialogContent className="sm:rounded-2xl border-none max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {plans.some(p => p.id === editingPlan?.id) ? t('editPlan') : t('addPlan')}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingPlan && `${editingPlan.startHour}:00 — ${format(new Date(editingPlan.date), 'EEE, d/M')}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="title" className="text-right text-xs font-bold text-muted-foreground">
                {t('title')}
              </Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="col-span-3 font-semibold bg-muted/50 border-border"
                placeholder={t('enterTask')}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-xs font-bold text-muted-foreground">
                {t('duration')}
              </Label>
              <div className="col-span-3 flex items-center gap-2">
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
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-xs font-bold text-muted-foreground">
                {t('color')}
              </Label>
              <div className="col-span-3 flex gap-2 flex-wrap">
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
            <div className="grid grid-cols-4 items-start gap-3">
              <Label className="text-right text-xs font-bold pt-2 text-muted-foreground">
                {t('notes')}
              </Label>
              <Textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder={t('notesPlaceholder')}
                rows={2}
                className="col-span-3 text-xs resize-none bg-muted/50 border-border placeholder:text-muted-foreground"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-3">
              <Label className="text-right text-xs font-bold text-muted-foreground">
                {t('applyToDate')}
              </Label>
              <div className="col-span-3 flex flex-col gap-2">
                <input
                  type="date"
                  value={applyTargetDate}
                  onChange={(e) => setApplyTargetDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleApplyToDate} className="w-full justify-center">
                  {t('applyToDateButton')}
                </Button>
              </div>
            </div>
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
