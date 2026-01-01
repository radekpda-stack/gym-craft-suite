import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Briefcase, Moon, Activity, Heart, Save, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientPortalProfileData, useUpdateClientPortalProfile } from '@/hooks/useClientPortalProfile';
import { toast } from 'sonner';
import { format, differenceInMonths, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

export function ClientProfileSection() {
  const { data: profile, isLoading } = useClientPortalProfileData();
  const updateProfile = useUpdateClientPortalProfile();

  const [formData, setFormData] = useState({
    phone: '',
    birth_date: '',
    occupation: '',
    sitting_hours_daily: 0,
    sleep_hours: 7,
    stress_level: 5,
    health_restrictions: '',
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        birth_date: profile.birth_date || '',
        occupation: profile.occupation || '',
        sitting_hours_daily: profile.sitting_hours_daily || 0,
        sleep_hours: profile.sleep_hours || 7,
        stress_level: profile.stress_level || 5,
        health_restrictions: profile.health_restrictions || '',
      });
    }
  }, [profile]);

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        occupation: formData.occupation || null,
        sitting_hours_daily: formData.sitting_hours_daily,
        sleep_hours: formData.sleep_hours,
        stress_level: formData.stress_level,
        health_restrictions: formData.health_restrictions || null,
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

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

          {/* Birth Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Datum narození
            </Label>
            <Input
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleChange('birth_date', e.target.value)}
              className="max-w-xs"
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

          {/* Health Restrictions */}
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
