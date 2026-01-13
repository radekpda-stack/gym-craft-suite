import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGuestRegistration } from '@/hooks/usePublicChallenge';
import { toast } from 'sonner';
import { z } from 'zod';

interface Props {
  challengeId: string;
  challengeTitle: string;
}

const registrationSchema = z.object({
  first_name: z.string().min(1, 'Jméno je povinné').max(50, 'Max 50 znaků'),
  last_name: z.string().min(1, 'Příjmení je povinné').max(50, 'Max 50 znaků'),
  sex: z.enum(['male', 'female']).optional(),
  age: z.number().min(5).max(120).optional().nullable(),
  weight_kg: z.number().min(20).max(400).optional().nullable(),
  height_cm: z.number().min(50).max(250).optional().nullable(),
  email: z.string().email('Neplatný email').optional().or(z.literal('')),
});

export default function PublicChallengeRegistration({ challengeId, challengeTitle }: Props) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    sex: '' as '' | 'male' | 'female',
    age: '',
    weight_kg: '',
    height_cm: '',
    email: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const registerMutation = useGuestRegistration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const data = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      sex: formData.sex || undefined,
      age: formData.age ? parseInt(formData.age) : undefined,
      weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
      height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
      email: formData.email.trim() || undefined,
    };

    const result = registrationSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await registerMutation.mutateAsync({
        challenge_id: challengeId,
        ...data,
      });
      toast.success('Registrace úspěšná! Nyní můžete odeslat svůj výsledek.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registrace selhala');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Registrace do výzvy
        </CardTitle>
        <CardDescription>
          Zaregistrujte se a soutěžte v "{challengeTitle}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">Jméno *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData(d => ({ ...d, first_name: e.target.value }))}
                placeholder="Jan"
                maxLength={50}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Příjmení *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData(d => ({ ...d, last_name: e.target.value }))}
                placeholder="Novák"
                maxLength={50}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sex">Pohlaví</Label>
            <Select
              value={formData.sex}
              onValueChange={(v) => setFormData(d => ({ ...d, sex: v as 'male' | 'female' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte pohlaví" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Muž</SelectItem>
                <SelectItem value="female">Žena</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="age">Věk</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(d => ({ ...d, age: e.target.value }))}
                placeholder="30"
                min={5}
                max={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight_kg">Váha (kg)</Label>
              <Input
                id="weight_kg"
                type="number"
                step="0.1"
                value={formData.weight_kg}
                onChange={(e) => setFormData(d => ({ ...d, weight_kg: e.target.value }))}
                placeholder="75"
                min={20}
                max={400}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="height_cm">Výška (cm)</Label>
              <Input
                id="height_cm"
                type="number"
                value={formData.height_cm}
                onChange={(e) => setFormData(d => ({ ...d, height_cm: e.target.value }))}
                placeholder="180"
                min={50}
                max={250}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email (volitelné)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(d => ({ ...d, email: e.target.value }))}
              placeholder="jan@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Email nebude nikdy veřejně zobrazen
            </p>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registruji...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Zaregistrovat se
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Na veřejné stránce budete zobrazeni pouze pod iniciálami (např. J. N.)
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
