import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { useCertificationsFromExpenses } from '@/hooks/useEducationExpenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Camera, X, Plus, Instagram, Facebook, Linkedin, Globe, Save, Loader2, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TrainerProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  specializations: string[];
  certifications: string[];
  experience_years: number | null;
  social_links: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    website?: string;
  };
  phone: string | null;
}

const SPECIALIZATION_OPTIONS = [
  { cs: 'Silový trénink', en: 'Strength Training' },
  { cs: 'Kondiční trénink', en: 'Conditioning' },
  { cs: 'Rehabilitace', en: 'Rehabilitation' },
  { cs: 'Funkční trénink', en: 'Functional Training' },
  { cs: 'Hubnutí', en: 'Weight Loss' },
  { cs: 'Nabírání svalové hmoty', en: 'Muscle Building' },
  { cs: 'Sportovní příprava', en: 'Sports Performance' },
  { cs: 'Mobilita', en: 'Mobility' },
  { cs: 'Výživa', en: 'Nutrition' },
  { cs: 'Senior fitness', en: 'Senior Fitness' },
];

export function TrainerProfileSettings() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { certifications: expenseCertifications, isLoading: expenseCertsLoading } = useCertificationsFromExpenses();
  
  const [profile, setProfile] = useState<TrainerProfile>({
    id: '',
    display_name: '',
    email: '',
    avatar_url: null,
    bio: '',
    specializations: [],
    certifications: [],
    experience_years: null,
    social_links: {},
    phone: '',
  });
  const [newCertification, setNewCertification] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ['trainer-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (existingProfile) {
      setProfile({
        id: existingProfile.id,
        display_name: existingProfile.display_name || '',
        email: existingProfile.email || '',
        avatar_url: existingProfile.avatar_url,
        bio: existingProfile.bio || '',
        specializations: existingProfile.specializations || [],
        certifications: existingProfile.certifications || [],
        experience_years: existingProfile.experience_years,
        social_links: (existingProfile.social_links as TrainerProfile['social_links']) || {},
        phone: existingProfile.phone || '',
      });
    }
  }, [existingProfile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name || null,
          email: profile.email || null,
          avatar_url: profile.avatar_url,
          bio: profile.bio || null,
          specializations: profile.specializations,
          certifications: profile.certifications,
          experience_years: profile.experience_years,
          social_links: profile.social_links,
          phone: profile.phone || null,
        })
        .eq('id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer-profile'] });
      toast.success(language === 'cs' ? 'Profil byl uložen' : 'Profile saved');
    },
    onError: () => {
      toast.error(language === 'cs' ? 'Nepodařilo se uložit profil' : 'Failed to save profile');
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error(language === 'cs' ? 'Vyberte prosím obrázek' : 'Please select an image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === 'cs' ? 'Obrázek je příliš velký (max 2MB)' : 'Image too large (max 2MB)');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('trainer-avatars')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) {
        // If bucket doesn't exist, create it first
        if (uploadError.message.includes('not found')) {
          toast.error(language === 'cs' ? 'Úložiště není nakonfigurováno' : 'Storage not configured');
          return;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('trainer-avatars')
        .getPublicUrl(fileName);
      
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success(language === 'cs' ? 'Fotka nahrána' : 'Photo uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(language === 'cs' ? 'Nepodařilo se nahrát fotku' : 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setProfile(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const addCertification = () => {
    if (!newCertification.trim()) return;
    setProfile(prev => ({
      ...prev,
      certifications: [...prev.certifications, newCertification.trim()],
    }));
    setNewCertification('');
  };

  const removeCertification = (cert: string) => {
    setProfile(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert),
    }));
  };

  const updateSocialLink = (platform: keyof TrainerProfile['social_links'], value: string) => {
    setProfile(prev => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value || undefined },
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
            {profile.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </label>
        </div>
        <div className="flex-1">
          <Label htmlFor="display_name">
            {language === 'cs' ? 'Jméno' : 'Full Name'}
          </Label>
          <Input
            id="display_name"
            value={profile.display_name || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
            placeholder={language === 'cs' ? 'Vaše jméno' : 'Your name'}
            className="mt-1"
          />
        </div>
      </div>

      {/* Bio Section */}
      <div className="space-y-2">
        <Label htmlFor="bio">
          {language === 'cs' ? 'O mně' : 'About Me'}
        </Label>
        <Textarea
          id="bio"
          value={profile.bio || ''}
          onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
          placeholder={language === 'cs' 
            ? 'Napište něco o sobě, své filosofii tréninku...' 
            : 'Write something about yourself, your training philosophy...'}
          rows={4}
        />
      </div>

      {/* Experience Years */}
      <div className="space-y-2">
        <Label htmlFor="experience">
          {language === 'cs' ? 'Roky praxe' : 'Years of Experience'}
        </Label>
        <Input
          id="experience"
          type="number"
          min={0}
          max={50}
          value={profile.experience_years ?? ''}
          onChange={(e) => setProfile(prev => ({ 
            ...prev, 
            experience_years: e.target.value ? parseInt(e.target.value) : null 
          }))}
          placeholder="5"
          className="w-32"
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          {language === 'cs' ? 'E-mail' : 'Email'}
        </Label>
        <Input
          id="email"
          type="email"
          value={profile.email || ''}
          onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
          placeholder="vas@email.cz"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          {language === 'cs' ? 'Telefon' : 'Phone'}
        </Label>
        <Input
          id="phone"
          type="tel"
          value={profile.phone || ''}
          onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="+420 xxx xxx xxx"
        />
      </div>

      {/* Specializations */}
      <div className="space-y-2">
        <Label>
          {language === 'cs' ? 'Specializace' : 'Specializations'}
        </Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATION_OPTIONS.map((spec) => {
            const label = language === 'cs' ? spec.cs : spec.en;
            const isSelected = profile.specializations.includes(spec.cs);
            return (
              <Badge
                key={spec.cs}
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                onClick={() => toggleSpecialization(spec.cs)}
              >
                {label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Certifications from Education Expenses */}
      {expenseCertifications.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            {language === 'cs' ? 'Certifikace z nákladů' : 'Certifications from Expenses'}
          </Label>
          <div className="flex flex-wrap gap-2">
            {expenseCertifications.map((cert) => (
              <Badge key={cert.id} variant="default" className="gap-1">
                {cert.name}
                <span className="text-[10px] opacity-70">({cert.year})</span>
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'cs' 
              ? 'Tyto certifikace jsou automaticky načteny z nákladů kategorie Vzdělávání.' 
              : 'These certifications are automatically loaded from Education expenses.'}
            {' '}
            <Link to="/expenses" className="text-primary hover:underline">
              {language === 'cs' ? 'Spravovat náklady' : 'Manage expenses'}
            </Link>
          </p>
        </div>
      )}

      {/* Manual Certifications */}
      <div className="space-y-2">
        <Label>
          {language === 'cs' ? 'Další certifikace (ručně)' : 'Other Certifications (manual)'}
        </Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {profile.certifications.map((cert) => (
            <Badge key={cert} variant="secondary" className="gap-1">
              {cert}
              <button 
                onClick={() => removeCertification(cert)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newCertification}
            onChange={(e) => setNewCertification(e.target.value)}
            placeholder={language === 'cs' ? 'Např. ACE, NSCA, FMS...' : 'E.g. ACE, NSCA, FMS...'}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
          />
          <Button type="button" variant="outline" size="icon" onClick={addCertification}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <Label>
          {language === 'cs' ? 'Sociální sítě' : 'Social Links'}
        </Label>
        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-muted-foreground" />
            <Input
              value={profile.social_links.instagram || ''}
              onChange={(e) => updateSocialLink('instagram', e.target.value)}
              placeholder="instagram.com/username"
            />
          </div>
          <div className="flex items-center gap-2">
            <Facebook className="w-5 h-5 text-muted-foreground" />
            <Input
              value={profile.social_links.facebook || ''}
              onChange={(e) => updateSocialLink('facebook', e.target.value)}
              placeholder="facebook.com/username"
            />
          </div>
          <div className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-muted-foreground" />
            <Input
              value={profile.social_links.linkedin || ''}
              onChange={(e) => updateSocialLink('linkedin', e.target.value)}
              placeholder="linkedin.com/in/username"
            />
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <Input
              value={profile.social_links.website || ''}
              onChange={(e) => updateSocialLink('website', e.target.value)}
              placeholder="www.myweb.com"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button 
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full sm:w-auto"
      >
        {saveMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {language === 'cs' ? 'Uložit profil' : 'Save Profile'}
      </Button>
    </div>
  );
}
