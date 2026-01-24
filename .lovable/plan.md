
# Plán: Přidání tabu "Média" do karty klienta

## Přehled

Přidám nový tab **"Média"** vedle tabu "Profil" v kartě klienta. Tento tab umožní:
- Nahrávat fotografie, videa a dokumenty (PDF, DOC)
- Prohlížet galerii médií s filtrováním
- **Srovnávat fotografie** (před/po) pomocí existující komponenty `PhotoCompare`

---

## Technické řešení

### 1. Rozšíření databáze

Aktuální tabulka `client_media` podporuje typy `photo` a `audio`. Rozšířím o:
- **`video`** - pro video soubory
- **`document`** - pro PDF, DOC a další dokumenty

```sql
-- Přidat nové typy médií
ALTER TABLE client_media 
DROP CONSTRAINT IF EXISTS client_media_type_check;

ALTER TABLE client_media 
ADD CONSTRAINT client_media_type_check 
CHECK (type IN ('photo', 'audio', 'video', 'document'));
```

### 2. Rozšíření storage bucketů

Vytvořím dva nové buckety pro videa a dokumenty:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('client-videos', 'client-videos', false),
  ('client-documents', 'client-documents', false);

-- RLS policies pro přístup
CREATE POLICY "Users can view own client videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload client videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Stejné pro client-documents
```

### 3. Přidání tabu "Média" do ClientDetailTabs

V souboru `src/components/clients/ClientDetailTabs.tsx`:

```typescript
// Import ikony
import { Image } from 'lucide-react';

// Přidat do pole tabs (za 'profile')
{
  id: 'media',
  label: 'Média',
  icon: Image,
  badge: totalMediaCount > 0 ? totalMediaCount : undefined,
},

// Přidat nový TabsContent
<TabsContent value="media" className="mt-0 space-y-4">
  <ClientMediaTab clientId={client.id} />
</TabsContent>
```

### 4. Rozšíření ClientMediaTab o videa a dokumenty

V souboru `src/components/media/ClientMediaTab.tsx`:

```typescript
// Přidat nové subtaby
<TabsTrigger value="photos">
  Fotografie ({photos?.length || 0})
</TabsTrigger>
<TabsTrigger value="videos">
  Videa ({videos?.length || 0})
</TabsTrigger>
<TabsTrigger value="documents">
  Dokumenty ({documents?.length || 0})
</TabsTrigger>
<TabsTrigger value="audio">
  Nahrávky ({audioNotes?.length || 0})
</TabsTrigger>
```

### 5. Nová komponenta DocumentUpload

Vytvoření nové komponenty `src/components/media/DocumentUpload.tsx`:
- Podpora PDF, DOC, DOCX, XLS, XLSX
- Náhled ikony podle typu souboru
- Metadata: název, popis, kategorie, datum

### 6. Nová komponenta VideoUpload

Vytvoření nové komponenty `src/components/media/VideoUpload.tsx`:
- Podpora MP4, MOV, WebM
- Thumbnail náhled
- Limit velikosti (např. 100MB)

### 7. Rozšíření useClientMedia hooku

V souboru `src/hooks/useClientMedia.ts`:

```typescript
export type MediaType = 'photo' | 'audio' | 'video' | 'document';

// Přidat bucket mapping
const BUCKET_MAP: Record<MediaType, string> = {
  photo: 'client-photos',
  audio: 'client-audio',
  video: 'client-videos',
  document: 'client-documents',
};

// Přidat nové category options
export const DOCUMENT_CATEGORY_OPTIONS = [
  { value: 'contract', label: 'Smlouva' },
  { value: 'medical', label: 'Lékařská zpráva' },
  { value: 'training_plan', label: 'Tréninkový plán' },
  { value: 'diet', label: 'Stravovací plán' },
  { value: 'other', label: 'Ostatní' },
];
```

---

## Struktura souborů

| Soubor | Změna |
|--------|-------|
| `src/components/clients/ClientDetailTabs.tsx` | Přidat tab "Média" s ikonou |
| `src/components/media/ClientMediaTab.tsx` | Rozšířit o videa a dokumenty |
| `src/components/media/VideoUpload.tsx` | **Nový** - nahrávání videí |
| `src/components/media/VideoGallery.tsx` | **Nový** - přehrávač videí |
| `src/components/media/DocumentUpload.tsx` | **Nový** - nahrávání dokumentů |
| `src/components/media/DocumentList.tsx` | **Nový** - seznam dokumentů |
| `src/hooks/useClientMedia.ts` | Rozšířit typy a bucket mapping |
| SQL migrace | Přidat constraint a buckety |

---

## Funkcionalita srovnání fotografií (Před/Po)

Existující komponenta `PhotoCompare` již podporuje:
- **Režim vedle sebe** - dvě fotky vedle sebe
- **Režim posuvníku** - překrývání s posuvným rozhraním
- Zoom a rotace jednotlivých fotografií
- Zobrazení data pořízení

Uživatel vybere 2 fotografie v galerii (tlačítko "Srovnat fotky") a zobrazí se dialog s porovnáním.

---

## Očekávaný výsledek

Po implementaci:
- V kartě klienta bude nový tab **"Média"** vedle "Profil"
- Trenér může nahrávat fotografie, videa i dokumenty
- Fotografie lze srovnávat před/po pomocí posuvníku
- Všechna média jsou organizována podle kategorií a tagů
- Podpora vyhledávání a filtrování
