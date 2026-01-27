import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExistingProduct {
  id: string;
  name: string;
  category: string;
  purchase_price: number;
  price: number;
}

interface ParsedInvoiceItem {
  name: string;
  quantity: number;
  purchasePrice: number | null;
  suggestedSellPrice: number | null;
  suggestedCategory: string;
  matchedProductId: string | null;
  matchedProductName: string | null;
  confidence: number;
}

interface ParsedInvoice {
  supplier: string | null;
  invoiceNumber: string | null;
  date: string | null;
  totalAmount: number | null;
}

interface ParseInvoiceResponse {
  success: boolean;
  error?: string;
  invoice?: ParsedInvoice;
  items?: ParsedInvoiceItem[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, mimeType, existingProducts } = await req.json() as {
      fileBase64: string;
      mimeType: string;
      existingProducts: ExistingProduct[];
    };

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nebyl nahrán žádný soubor' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI služba není nakonfigurována' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare product list for matching
    const productList = existingProducts.map(p => `- ${p.name} (kategorie: ${p.category}, ID: ${p.id})`).join('\n');

    // Category margins for AI suggestion
    const categoryMargins: Record<string, number> = {
      'supplement': 0.6,  // 60% marže
      'drink': 0.8,       // 80% marže
      'snack': 0.5,       // 50% marže
      'equipment': 0.4,   // 40% marže
      'other': 0.5,       // 50% marže
    };

    const systemPrompt = `Jsi asistent pro analýzu faktur. Tvým úkolem je extrahovat položky z faktur a porovnat je s existujícími produkty.

Analyzuj fakturu a extrahuj následující informace:
1. Základní údaje faktury (dodavatel, číslo faktury, datum, celková částka)
2. Jednotlivé položky/produkty s množstvím a cenami

Pro každou položku urči:
- Název produktu (jak je na faktuře)
- Počet kusů
- Nákupní cena za kus (bez DPH pokud je uvedeno, jinak celková/počet)
- Navrhni prodejní cenu s typickou marží podle kategorie
- Navrhni kategorii: supplement (doplňky), drink (nápoje), snack (svačiny), equipment (vybavení), other (ostatní)
- Pokud je položka podobná některému existujícímu produktu, uveď jeho ID

Marže podle kategorií:
- supplement: 60% (prodejní = nákupní * 2.5)
- drink: 80% (prodejní = nákupní * 5)
- snack: 50% (prodejní = nákupní * 2)
- equipment: 40% (prodejní = nákupní * 1.67)
- other: 50% (prodejní = nákupní * 2)

Existující produkty v systému:
${productList || '(žádné existující produkty)'}

Vrať POUZE validní JSON bez jakéhokoliv dalšího textu v tomto formátu:
{
  "invoice": {
    "supplier": "Název dodavatele nebo null",
    "invoiceNumber": "Číslo faktury nebo null",
    "date": "YYYY-MM-DD nebo null",
    "totalAmount": číslo nebo null
  },
  "items": [
    {
      "name": "Název položky",
      "quantity": číslo,
      "purchasePrice": číslo nebo null,
      "suggestedSellPrice": číslo nebo null,
      "suggestedCategory": "supplement|drink|snack|equipment|other",
      "matchedProductId": "UUID existujícího produktu nebo null",
      "matchedProductName": "Název existujícího produktu nebo null",
      "confidence": číslo 0-1 (jistota rozpoznání)
    }
  ]
}`;

    console.log('Calling Lovable AI to parse invoice...');
    
    // Prepare content based on mime type
    let content: any[];
    if (mimeType === 'application/pdf') {
      // For PDF, we'll send as document
      content = [
        {
          type: "text",
          text: "Analyzuj tuto fakturu a extrahuj všechny položky produktů/zboží podle instrukcí."
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${fileBase64}`
          }
        }
      ];
    } else {
      // For images
      content = [
        {
          type: "text",
          text: "Analyzuj tuto fakturu a extrahuj všechny položky produktů/zboží podle instrukcí."
        },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${fileBase64}`
          }
        }
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Příliš mnoho požadavků, zkuste to znovu později.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nedostatek kreditů pro AI službu.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Chyba při zpracování AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices?.[0]?.message?.content;

    if (!aiContent) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ success: false, error: 'AI nevrátila žádnou odpověď' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response received, parsing JSON...');

    // Try to parse JSON from the response
    let parsedResult: { invoice: ParsedInvoice; items: ParsedInvoiceItem[] };
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedContent = aiContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();

      parsedResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError, aiContent);
      return new Response(
        JSON.stringify({ success: false, error: 'Nepodařilo se zpracovat odpověď AI. Zkuste nahrát kvalitnější obrázek faktury.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and enhance the response
    if (!parsedResult.items || !Array.isArray(parsedResult.items)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nepodařilo se rozpoznat žádné položky na faktuře' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure all items have required fields
    const validatedItems: ParsedInvoiceItem[] = parsedResult.items.map(item => ({
      name: item.name || 'Neznámá položka',
      quantity: Math.max(1, Math.round(item.quantity || 1)),
      purchasePrice: item.purchasePrice || null,
      suggestedSellPrice: item.suggestedSellPrice || null,
      suggestedCategory: item.suggestedCategory || 'other',
      matchedProductId: item.matchedProductId || null,
      matchedProductName: item.matchedProductName || null,
      confidence: Math.min(1, Math.max(0, item.confidence || 0.5)),
    }));

    console.log(`Successfully parsed ${validatedItems.length} items from invoice`);

    const result: ParseInvoiceResponse = {
      success: true,
      invoice: {
        supplier: parsedResult.invoice?.supplier || null,
        invoiceNumber: parsedResult.invoice?.invoiceNumber || null,
        date: parsedResult.invoice?.date || null,
        totalAmount: parsedResult.invoice?.totalAmount || null,
      },
      items: validatedItems,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing invoice:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Neočekávaná chyba při zpracování faktury' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
