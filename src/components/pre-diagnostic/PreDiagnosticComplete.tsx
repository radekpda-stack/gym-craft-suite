import { X, Mail, Phone, MapPin, Instagram, Facebook, Globe, Linkedin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface TrainerInfo {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  experience_years?: number | null;
  bio?: string | null;
  social_links?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    website?: string;
  } | null;
  company?: {
    name?: string;
    address?: string;
    contact?: string;
  } | null;
}

interface Props {
  trainerInfo?: TrainerInfo | null;
}

export function PreDiagnosticComplete({ trainerInfo }: Props) {
  const handleClose = () => {
    window.close();
  };

  const hasAnyContactInfo = trainerInfo?.name || trainerInfo?.email || trainerInfo?.phone || 
    trainerInfo?.company?.address || trainerInfo?.social_links?.instagram || 
    trainerInfo?.social_links?.facebook || trainerInfo?.social_links?.website;

  return (
    <div className="public-page flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="public-card overflow-hidden">
          <CardContent className="pt-0 pb-8">
            {/* Hero area */}
            <div className="relative -mx-6 -mt-6 mb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background py-8 px-6 text-center">
              <motion.div 
                className="text-6xl mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                🎉
              </motion.div>
              <motion.h1 
                className="text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Hotovo!
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4 text-center"
            >
              <p className="text-lg">
                Děkuju za vyplnění! 🙏
              </p>
              
              <p className="text-muted-foreground">
                Mám teď všechny potřebné informace a můžu ti připravit trénink na míru.
              </p>

              <div className="p-4 rounded-xl bg-secondary/50 text-left">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Co bude dál?</p>
                    <p>Trenér si projde tvé odpovědi a připraví diagnostiku. Brzy se ozve s dalšími kroky.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Trainer contact section */}
            {hasAnyContactInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 pt-6 border-t"
              >
                <h3 className="text-base font-semibold mb-4 text-center">📞 Kontakt na trenéra</h3>
                
                <div className="space-y-3">
                  {/* Trainer name */}
                  {trainerInfo?.name && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                        👤
                      </div>
                      <div>
                        <p className="font-medium">{trainerInfo.name}</p>
                        {trainerInfo.experience_years && (
                          <p className="text-sm text-muted-foreground">
                            {trainerInfo.experience_years} let zkušeností
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="grid gap-2">
                    {trainerInfo?.email && (
                      <a 
                        href={`mailto:${trainerInfo.email}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <Mail className="w-5 h-5 text-primary" />
                        <span className="text-sm">{trainerInfo.email}</span>
                      </a>
                    )}

                    {trainerInfo?.phone && (
                      <a 
                        href={`tel:${trainerInfo.phone}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                        <Phone className="w-5 h-5 text-primary" />
                        <span className="text-sm">{trainerInfo.phone}</span>
                      </a>
                    )}

                    {trainerInfo?.company?.address && (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{trainerInfo.company.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Social links */}
                  {(trainerInfo?.social_links?.instagram || trainerInfo?.social_links?.facebook || 
                    trainerInfo?.social_links?.linkedin || trainerInfo?.social_links?.website) && (
                    <div className="flex justify-center gap-3 pt-2">
                      {trainerInfo.social_links.instagram && (
                        <a 
                          href={trainerInfo.social_links.instagram.startsWith('http') 
                            ? trainerInfo.social_links.instagram 
                            : `https://instagram.com/${trainerInfo.social_links.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 transition-colors"
                        >
                          <Instagram className="w-5 h-5" />
                        </a>
                      )}
                      {trainerInfo.social_links.facebook && (
                        <a 
                          href={trainerInfo.social_links.facebook.startsWith('http') 
                            ? trainerInfo.social_links.facebook 
                            : `https://facebook.com/${trainerInfo.social_links.facebook}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 transition-colors"
                        >
                          <Facebook className="w-5 h-5" />
                        </a>
                      )}
                      {trainerInfo.social_links.linkedin && (
                        <a 
                          href={trainerInfo.social_links.linkedin.startsWith('http') 
                            ? trainerInfo.social_links.linkedin 
                            : `https://linkedin.com/in/${trainerInfo.social_links.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 transition-colors"
                        >
                          <Linkedin className="w-5 h-5" />
                        </a>
                      )}
                      {trainerInfo.social_links.website && (
                        <a 
                          href={trainerInfo.social_links.website.startsWith('http') 
                            ? trainerInfo.social_links.website 
                            : `https://${trainerInfo.social_links.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-primary/20 transition-colors"
                        >
                          <Globe className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-center"
            >
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Zavřít okno
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
