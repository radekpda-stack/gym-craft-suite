import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Phone, Briefcase, Moon, Activity, Heart, Save, Calendar, Clock,
  Mail, UserCircle, Hand, Dumbbell, Target, Pill, Apple, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useClientPortalProfileData, useUpdateClientPortalProfile } from '@/hooks/useClientPortalProfile';
import { toast } from 'sonner';
import { format, differenceInMonths, differenceInYears, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

const TRAINING_GOALS = [
  { value: 'weight_loss', label: 'Hubnutí' },
  { value: 'muscle_gain', label: 'Nárůst svalové hmoty' },
  { value: 'strength', label: 'Síla' },
  { value: 'endurance', label: 'Vytrvalost' },
  { value: 'flexibility', label: 'Flexibilita' },
  { value: 'health', label: 'Celkové zdraví' },
  { value: 'rehabilitation', label: 'Rehabilitace' },
  { value: 'sport_performance', label: 'Sportovní výkon' },
];

const CURRENT_ACTIVITIES = [
  { value: 'running', label: 'Běh' },
  { value: 'cycling', label: 'Cyklistika' },
  { value: 'swimming', label: 'Plavání' },
  { value: 'yoga', label: 'Jóga' },
  { value: 'hiking', label: 'Turistika' },
  { value: 'team_sports', label: 'Kolektivní sporty' },
  { value: 'martial_arts', label: 'Bojové sporty' },
  { value: 'dancing', label: 'Tanec' },
  { value: 'gym', label: 'Posilovna' },
  { value: 'other', label: 'Jiné' },
];

const SUPPLEMENTS = [
  { value: 'protein', label: 'Protein' },
  { value: 'creatine', label: 'Kreatin' },
  { value: 'vitamins', label: 'Vitamíny' },
  { value: 'omega3', label: 'Omega-3' },
  { value: 'magnesium', label: 'Hořčík' },
  { value: 'collagen', label: 'Kolagen' },
  { value: 'bcaa', label: 'BCAA' },
  { value: 'caffeine', label: 'Kofein' },
];

const DIETARY_RESTRICTIONS = [
  { value: 'vegetarian', label: 'Vegetarián' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Bezlepková dieta' },
  { value: 'lactose_free', label: 'Bez laktózy' },
  { value: 'low_carb', label: 'Nízkosacharidová' },
  { value: 'keto', label: 'Keto' },
  { value: 'allergies', label: 'Alergie' },
];

export function ClientProfileSection() {
  const { data: profile, isLoading } = useClientPortalProfileData();
  const updateProfile = useUpdateClientPortalProfile();

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    handedness: '',
    occupation: '',
    sitting_hours_daily: 0,
    sleep_hours: 7,
    stress_level: 5,
    health_restrictions: '',
    sports_history: '',
    current_activities: [] as string[],
    training_goals: [] as string[],
    supplements: [] as string[],
    dietary_restrictions: [] as string[],
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        gender: profile.gender || '',
        handedness: profile.handedness || '',
        occupation: profile.occupation || '',
        sitting_hours_daily: profile.sitting_hours_daily || 0,
        sleep_hours: profile.sleep_hours || 7,
        stress_level: profile.stress_level || 5,
        health_restrictions: profile.health_restrictions || '',
        sports_history: profile.sports_history || '',
        current_activities: profile.current_activities || [],
        training_goals: profile.training_goals || [],
        supplements: profile.supplements || [],
        dietary_restrictions: profile.dietary_restrictions || [],
      });
    }
  }, [profile]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleArrayToggle = (key: string, value: string) => {
    const currentArray = formData[key as keyof typeof formData] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    handleChange(key, newArray);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        email: formData.email || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender || null,
        handedness: formData.handedness || null,
        occupation: formData.occupation || null,
        sitting_hours_daily: formData.sitting_hours_daily,
        sleep_hours: formData.sleep_hours,
        stress_level: formData.stress_level,
        health_restrictions: formData.health_restrictions || null,
        sports_history: formData.sports_history || null,
        current_activities: formData.current_activities.length > 0 ? formData.current_activities : null,
        training_goals: formData.training_goals.length > 0 ? formData.training_goals : null,
        supplements: formData.supplements.length > 0 ? formData.supplements : null,
        dietary_restrictions: formData.dietary_restrictions.length > 0 ? formData.dietary_restrictions : null,
      });
      setHasChanges(false);
      toast.success('Profil byl uložen');
    } catch (error) {
      toast.error('Nepodařilo se uložit profil');
    }
  };

  // Calculate training duration
  const getTrainingDuration = () => {
    const startDate = profile?.training_start_date || profile?.created_at;
    if (!startDate) return null;
    
    const months = differenceInMonths(new Date(), parseISO(startDate));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'let'}${remainingMonths > 0 ? ` a ${remainingMonths} ${remainingMonths === 1 ? 'měsíc' : remainingMonths < 5 ? 'měsíce' : 'měsíců'}` : ''}`;
    }
    return `${months} ${months === 1 ? 'měsíc' : months < 5 ? 'měsíce' : 'měsíců'}`;
  };

  // Calculate age from birth date
  const getAge = () => {
    if (!formData.birth_date) return null;
    return differenceInYears(new Date(), parseISO(formData.birth_date));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const age = getAge();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Můj profil
          </CardTitle>
          <CardDescription>
            Vaše osobní údaje a zdravotní informace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Training Duration - Read only */}
          {(profile?.training_start_date || profile?.created_at) && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 text-primary">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Trénuji od</span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {format(parseISO(profile.training_start_date || profile.created_at), 'd. MMMM yyyy', { locale: cs })}
              </div>
              <div className="text-sm text-muted-foreground">
                Celkem {getTrainingDuration()}
              </div>
            </div>
          )}

          {/* Section: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              Základní údaje
            </h3>

            {/* Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                type="email"
                placeholder="vas@email.cz"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefon
              </Label>
              <Input
                type="tel"
                placeholder="+420 123 456 789"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            {/* Birth Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Datum narození
                {age !== null && (
                  <span className="text-muted-foreground font-normal">({age} let)</span>
                )}
              </Label>
              <Input
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
                className="max-w-xs"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Pohlaví
              </Label>
              <Select
                value={formData.gender || 'none'}
                onValueChange={(v) => handleChange('gender', v === 'none' ? '' : v)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Vyberte pohlaví" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nevybráno</SelectItem>
                  <SelectItem value="male">Muž</SelectItem>
                  <SelectItem value="female">Žena</SelectItem>
                  <SelectItem value="other">Jiné</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Handedness */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hand className="w-4 h-4" />
                Dominantní ruka
              </Label>
              <Select
                value={formData.handedness || 'none'}
                onValueChange={(v) => handleChange('handedness', v === 'none' ? '' : v)}
              >
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Vyberte dominantní ruku" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nevybráno</SelectItem>
                  <SelectItem value="right">Pravák</SelectItem>
                  <SelectItem value="left">Levák</SelectItem>
                  <SelectItem value="ambidextrous">Obouruký</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section: Work & Lifestyle */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Práce a životní styl
            </h3>

            {/* Occupation */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Typ práce
              </Label>
              <Select
                value={formData.occupation || 'none'}
                onValueChange={(v) => handleChange('occupation', v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte typ práce" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nevybráno</SelectItem>
                  <SelectItem value="sedentary">Sedavá (kancelář, řízení)</SelectItem>
                  <SelectItem value="mixed">Kombinovaná (střídání sezení a pohybu)</SelectItem>
                  <SelectItem value="active">Aktivní (fyzická práce, stání)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sitting Hours */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Hodiny vsedě denně
                </span>
                <span className="text-muted-foreground">{formData.sitting_hours_daily}h</span>
              </Label>
              <Slider
                value={[formData.sitting_hours_daily]}
                onValueChange={([v]) => handleChange('sitting_hours_daily', v)}
                min={0}
                max={16}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0h</span>
                <span>8h</span>
                <span>16h</span>
              </div>
            </div>

            {/* Sleep Hours */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Moon className="w-4 h-4" />
                  Průměrný spánek
                </span>
                <span className="text-muted-foreground">{formData.sleep_hours}h</span>
              </Label>
              <Slider
                value={[formData.sleep_hours]}
                onValueChange={([v]) => handleChange('sleep_hours', v)}
                min={4}
                max={12}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>4h</span>
                <span>8h</span>
                <span>12h</span>
              </div>
            </div>

            {/* Stress Level */}
            <div className="space-y-3">
              <Label className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Úroveň stresu
                </span>
                <span className="text-muted-foreground">{formData.stress_level}/10</span>
              </Label>
              <Slider
                value={[formData.stress_level]}
                onValueChange={([v]) => handleChange('stress_level', v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Nízký (1)</span>
                <span>Střední (5)</span>
                <span>Vysoký (10)</span>
              </div>
            </div>
          </div>

          {/* Section: Training Goals */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Target className="w-4 h-4" />
              Tréninkové cíle
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {TRAINING_GOALS.map((goal) => (
                <div key={goal.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`goal-${goal.value}`}
                    checked={formData.training_goals.includes(goal.value)}
                    onCheckedChange={() => handleArrayToggle('training_goals', goal.value)}
                  />
                  <label
                    htmlFor={`goal-${goal.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {goal.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Current Activities */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Aktuální aktivity
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {CURRENT_ACTIVITIES.map((activity) => (
                <div key={activity.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`activity-${activity.value}`}
                    checked={formData.current_activities.includes(activity.value)}
                    onCheckedChange={() => handleArrayToggle('current_activities', activity.value)}
                  />
                  <label
                    htmlFor={`activity-${activity.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {activity.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Sports History */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <History className="w-4 h-4" />
              Sportovní historie
            </h3>
            <Textarea
              placeholder="Popište svou sportovní historii - jaké sporty jste dělal/a, jak dlouho, na jaké úrovni..."
              value={formData.sports_history}
              onChange={(e) => handleChange('sports_history', e.target.value)}
              rows={3}
            />
          </div>

          {/* Section: Supplements */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Pill className="w-4 h-4" />
              Doplňky stravy
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {SUPPLEMENTS.map((supplement) => (
                <div key={supplement.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`supplement-${supplement.value}`}
                    checked={formData.supplements.includes(supplement.value)}
                    onCheckedChange={() => handleArrayToggle('supplements', supplement.value)}
                  />
                  <label
                    htmlFor={`supplement-${supplement.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {supplement.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Dietary Restrictions */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Apple className="w-4 h-4" />
              Stravovací omezení
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {DIETARY_RESTRICTIONS.map((restriction) => (
                <div key={restriction.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`diet-${restriction.value}`}
                    checked={formData.dietary_restrictions.includes(restriction.value)}
                    onCheckedChange={() => handleArrayToggle('dietary_restrictions', restriction.value)}
                  />
                  <label
                    htmlFor={`diet-${restriction.value}`}
                    className="text-sm cursor-pointer"
                  >
                    {restriction.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Health */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Zdraví
            </h3>
            <div className="space-y-2">
              <Label>Zdravotní omezení</Label>
              <p className="text-xs text-muted-foreground">
                Nemoci, operace, léky, alergie a další zdravotní informace
              </p>
              <Textarea
                placeholder="Např. operace kolene 2020, vysoký tlak - léky..."
                value={formData.health_restrictions}
                onChange={(e) => handleChange('health_restrictions', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full gap-2" 
            disabled={!hasChanges || updateProfile.isPending}
          >
            <Save className="w-4 h-4" />
            {updateProfile.isPending ? 'Ukládám...' : 'Uložit změny'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}