import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Phone, Briefcase, Moon, Heart, Save, Calendar, Clock,
  Mail, UserCircle, Dumbbell, Target
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

export function ClientProfileSection() {
  const { data: profile, isLoading } = useClientPortalProfileData();
  const updateProfile = useUpdateClientPortalProfile();

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    birth_date: '',
    gender: '',
    occupation: '',
    sleep_hours: 7,
    health_restrictions: '',
    current_activities: [] as string[],
    training_goals: [] as string[],
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        gender: profile.gender || '',
        occupation: profile.occupation || '',
        sleep_hours: profile.sleep_hours || 7,
        health_restrictions: profile.health_restrictions || '',
        current_activities: profile.current_activities || [],
        training_goals: profile.training_goals || [],
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
        occupation: formData.occupation || null,
        sleep_hours: formData.sleep_hours,
        health_restrictions: formData.health_restrictions || null,
        current_activities: formData.current_activities.length > 0 ? formData.current_activities : null,
        training_goals: formData.training_goals.length > 0 ? formData.training_goals : null,
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
            Vaše základní údaje
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
              Kontaktní údaje
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
          </div>

          {/* Section: Work & Lifestyle */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Životní styl
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
          </div>

          {/* Section: Training Goals */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Target className="w-4 h-4" />
              Co chci zlepšit
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
              Co dělám mimo tréninky
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

          {/* Section: Health */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Zdraví
            </h3>
            <div className="space-y-2">
              <Label>Zdravotní omezení</Label>
              <p className="text-xs text-muted-foreground">
                Nemoci, operace, léky, alergie
              </p>
              <Textarea
                placeholder="Např. operace kolene 2020, vysoký tlak..."
                value={formData.health_restrictions}
                onChange={(e) => handleChange('health_restrictions', e.target.value)}
                rows={3}
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
