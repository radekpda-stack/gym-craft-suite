import { useState, useEffect, useRef } from "react";
import { Building2, Save, Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

interface CompanyProfile {
  name: string;
  id: string;
  address: string;
  contact: string;
  logoUrl?: string;
}

export function CompanyProfileSettings() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>({
    name: "",
    id: "",
    address: "",
    contact: "",
    logoUrl: "",
  });

  const { data: savedProfile, isLoading } = useQuery({
    queryKey: ["companyProfile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "company_profile")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.value as unknown as CompanyProfile | null;
    },
  });

  useEffect(() => {
    if (savedProfile) {
      setProfile(savedProfile);
    }
  }, [savedProfile]);

  const saveMutation = useMutation({
    mutationFn: async (newProfile: CompanyProfile) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if setting already exists
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "company_profile")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: newProfile as any })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({
            key: "company_profile",
            user_id: user.id,
            value: newProfile as any,
            description: "Company profile for PDF headers",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companyProfile"] });
      queryClient.invalidateQueries({ queryKey: ["companySettings"] });
      toast.success(language === "cs" ? "Profil uložen" : "Profile saved");
    },
    onError: () => {
      toast.error(language === "cs" ? "Chyba při ukládání" : "Error saving");
    },
  });

  const handleSave = () => {
    saveMutation.mutate(profile);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(language === "cs" ? "Vyberte prosím obrázek" : "Please select an image");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error(language === "cs" ? "Maximální velikost je 2MB" : "Maximum size is 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Delete existing logo first
      await supabase.storage.from("company-assets").remove([`${user.id}/logo.png`, `${user.id}/logo.jpg`, `${user.id}/logo.jpeg`, `${user.id}/logo.webp`]);

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("company-assets")
        .getPublicUrl(fileName);

      setProfile({ ...profile, logoUrl: publicUrl });
      toast.success(language === "cs" ? "Logo nahráno" : "Logo uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(language === "cs" ? "Chyba při nahrávání" : "Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setProfile({ ...profile, logoUrl: "" });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary/50 rounded-lg" />
        <div className="h-10 bg-secondary/50 rounded-lg" />
        <div className="h-20 bg-secondary/50 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {language === "cs"
          ? "Tyto údaje se zobrazí v hlavičce PDF výpisů kreditu."
          : "This information will appear in credit statement PDF headers."}
      </p>

      {/* Logo upload section */}
      <div className="space-y-2">
        <Label>{language === "cs" ? "Logo firmy" : "Company logo"}</Label>
        <div className="flex items-center gap-4">
          {profile.logoUrl ? (
            <div className="relative">
              <img
                src={profile.logoUrl}
                alt="Company logo"
                className="h-16 w-auto max-w-[200px] object-contain rounded border border-border bg-background p-1"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={handleRemoveLogo}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-border bg-muted/50">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading
                ? language === "cs" ? "Nahrávám..." : "Uploading..."
                : language === "cs" ? "Nahrát logo" : "Upload logo"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              {language === "cs" ? "PNG, JPG, max 2MB" : "PNG, JPG, max 2MB"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">
            {language === "cs" ? "Název firmy / Jméno" : "Company name"}
          </Label>
          <Input
            id="companyName"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            placeholder={language === "cs" ? "Fitness Studio s.r.o." : "Fitness Studio LLC"}
            className="glass-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyId">
            {language === "cs" ? "IČ" : "Company ID"}
          </Label>
          <Input
            id="companyId"
            value={profile.id}
            onChange={(e) => setProfile({ ...profile, id: e.target.value })}
            placeholder="12345678"
            className="glass-input"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyAddress">
          {language === "cs" ? "Adresa" : "Address"}
        </Label>
        <Textarea
          id="companyAddress"
          value={profile.address}
          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          placeholder={language === "cs" ? "Ulice 123, 110 00 Praha" : "123 Main St, City"}
          className="glass-input min-h-[60px]"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyContact">
          {language === "cs" ? "Kontakt (telefon, email)" : "Contact (phone, email)"}
        </Label>
        <Input
          id="companyContact"
          value={profile.contact}
          onChange={(e) => setProfile({ ...profile, contact: e.target.value })}
          placeholder="+420 123 456 789, info@example.cz"
          className="glass-input"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="gap-2"
      >
        <Save className="h-4 w-4" />
        {saveMutation.isPending
          ? language === "cs"
            ? "Ukládám..."
            : "Saving..."
          : language === "cs"
            ? "Uložit profil"
            : "Save profile"}
      </Button>
    </div>
  );
}
