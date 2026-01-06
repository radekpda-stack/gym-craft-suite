import { useState } from 'react';
import { Phone, Mail, User, Hand, Pencil, X, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Client } from '@/types/client';
import { ClientFormValues } from '@/lib/validations/client';
import { cn } from '@/lib/utils';

interface ClientQuickInfoCardProps {
  client: Client;
  onUpdate: (data: Partial<ClientFormValues>) => Promise<void>;
  isLoading?: boolean;
}

export function ClientQuickInfoCard({ client, onUpdate, isLoading }: ClientQuickInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(client.phone || '');
  const [email, setEmail] = useState(client.email || '');
  const [gender, setGender] = useState<'male' | 'female' | undefined>(client.gender || undefined);
  const [handedness, setHandedness] = useState<'left' | 'right' | 'ambidextrous' | undefined>(
    (client.handedness as 'left' | 'right' | 'ambidextrous') || undefined
  );

  const handleStartEdit = () => {
    setPhone(client.phone || '');
    setEmail(client.email || '');
    setGender(client.gender || undefined);
    setHandedness((client.handedness as 'left' | 'right' | 'ambidextrous') || undefined);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    await onUpdate({
      phone: phone || '',
      email: email || '',
      gender: gender,
      handedness: handedness,
    });
    setIsEditing(false);
  };

  const getGenderLabel = (g: 'male' | 'female' | null | undefined) => {
    if (g === 'male') return 'Muž';
    if (g === 'female') return 'Žena';
    return '—';
  };

  const getHandednessLabel = (h: string | null | undefined) => {
    if (h === 'left') return 'Levák';
    if (h === 'right') return 'Pravák';
    if (h === 'ambidextrous') return 'Obouruký';
    return '—';
  };

  if (isEditing) {
    return (
      <Card className="border-primary/20 bg-card/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Základní údaje
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
                className="h-8 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Zrušit
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
                className="h-8 px-3"
              >
                <Check className="h-4 w-4 mr-1" />
                Uložit
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+420 123 456 789"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Pohlaví</Label>
              <RadioGroup
                value={gender || ''}
                onValueChange={(v) => setGender(v as 'male' | 'female')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="gender-male" />
                  <Label htmlFor="gender-male" className="font-normal cursor-pointer">Muž</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="gender-female" />
                  <Label htmlFor="gender-female" className="font-normal cursor-pointer">Žena</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Dominantní ruka</Label>
              <RadioGroup
                value={handedness || ''}
                onValueChange={(v) => setHandedness(v as 'left' | 'right' | 'ambidextrous')}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="left" id="hand-left" />
                  <Label htmlFor="hand-left" className="font-normal cursor-pointer">Levák</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="right" id="hand-right" />
                  <Label htmlFor="hand-right" className="font-normal cursor-pointer">Pravák</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ambidextrous" id="hand-ambidextrous" />
                  <Label htmlFor="hand-ambidextrous" className="font-normal cursor-pointer">Obouruký</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Základní údaje
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Upravit
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Phone */}
          <div className="flex items-center gap-2 min-w-0">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className={cn(
              "text-sm truncate",
              client.phone ? "text-foreground" : "text-muted-foreground"
            )}>
              {client.phone || '—'}
            </span>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className={cn(
              "text-sm truncate",
              client.email ? "text-foreground" : "text-muted-foreground"
            )}>
              {client.email || '—'}
            </span>
          </div>

          {/* Gender */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className={cn(
              "text-sm",
              client.gender ? "text-foreground" : "text-muted-foreground"
            )}>
              {getGenderLabel(client.gender)}
            </span>
          </div>

          {/* Handedness */}
          <div className="flex items-center gap-2">
            <Hand className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className={cn(
              "text-sm",
              client.handedness ? "text-foreground" : "text-muted-foreground"
            )}>
              {getHandednessLabel(client.handedness)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
