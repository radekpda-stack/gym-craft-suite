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
  sku_code?: string | null;
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
  skuCode: string | null;
  // Match suggestions for manual correction
  matchSuggestions?: {
    productId: string;
    productName: string;
    confidence: number;
    matchReason: string;
  }[];
  // Extracted details for enrichment
  extractedDetails?: {
    brand?: string;
    weight?: string;
    flavor?: string;
    size?: string;
  };
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

    // Prepare product list for matching - include SKU codes and more details
    const productList = existingProducts.map(p => {
      const skuPart = p.sku_code ? `, SKU: ${p.sku_code}` : '';
      return `- "${p.name}" (kategorie: ${p.category}, ID: ${p.id}${skuPart})`;
    }).join('\n');

    const systemPrompt = `Jsi expert na analýzu faktur od českých dodavatelů (zejména Vilgain, Aktin, MyProtein). Tvým úkolem je extrahovat položky produktů a PŘESNĚ je spárovat s existujícími produkty.

DŮLEŽITÉ INSTRUKCE:
1. Zpracuj VŠECHNY STRANY dokumentu
2. Extrahuj SKU kódy z názvů produktů - formáty: [PVXXXXX], [AKXXXXX], SKU:XXXXX
3. Ignoruj položky typu doprava, poštovné, balné, sleva

EXTRAKCE DETAILŮ PRODUKTU:
Pro každý produkt extrahuj tyto atributy (pokud jsou v názvu):
- brand: Značka (Vilgain, Aktin, MyProtein, Nutrend, atd.)
- weight: Gramáž/objem (25g, 500g, 1kg, 330ml, atd.)
- flavor: Příchuť (čokoláda, vanilka, jahoda, peach fuzz, atd.)
- size: Velikost balení nebo varianta

INTELIGENTNÍ PÁROVÁNÍ PRODUKTŮ:
Priorita při párování s existujícími produkty:
1. PŘESNÁ SHODA SKU kódu → confidence 0.95-1.0
2. Shoda značky + gramáže + příchutě → confidence 0.85-0.95
3. Shoda značky + typu produktu (whey, bar, coffee) → confidence 0.7-0.85
4. Podobný název (fuzzy) → confidence 0.5-0.7

VELMI DŮLEŽITÉ pro párování:
- "Vilgain Clear Whey Isolate Peach fuzz 25 g" by měl matchovat s produktem obsahujícím "Clear Whey", "Peach" a "25g"
- Ignoruj drobné rozdíly v názvech (Isolate vs Isolát, fuzz vs Fuzz)
- Pokud je více možných shod, vrať až 3 alternativy v matchSuggestions

Pro každou položku produktu vrať:
- name: Čistý název produktu (BEZ SKU kódu)
- skuCode: Extrahované SKU (např. "PV44916")
- quantity: Počet kusů (1,000 ks = 1 kus)
- purchasePrice: Cena za kus (s DPH/Brutto)
- suggestedCategory: supplement|drink|snack|equipment|other
- suggestedSellPrice: Navržená prodejní cena podle marže
- matchedProductId: UUID nejlepší shody nebo null
- matchedProductName: Název matchovaného produktu nebo null
- confidence: Jistota párování 0-1
- matchSuggestions: Až 3 alternativní návrhy párování [{productId, productName, confidence, matchReason}]
- extractedDetails: {brand, weight, flavor, size} - extrahované atributy

Marže podle kategorií:
- supplement: 60% (prodejní = nákupní * 2.5)
- drink: 80% (prodejní = nákupní * 5)
- snack: 50% (prodejní = nákupní * 2)
- equipment: 40% (prodejní = nákupní * 1.67)
- other: 50% (prodejní = nákupní * 2)

Existující produkty v systému:
${productList || '(žádné existující produkty)'}

Vrať POUZE validní JSON:
{
  "invoice": {
    "supplier": "Název dodavatele nebo null",
    "invoiceNumber": "Číslo faktury nebo null",
    "date": "YYYY-MM-DD nebo null",
    "totalAmount": celková částka nebo null
  },
  "items": [
    {
      "name": "Čistý název produktu",
      "skuCode": "PV44916 nebo null",
      "quantity": číslo,
      "purchasePrice": číslo nebo null,
      "suggestedSellPrice": číslo nebo null,
      "suggestedCategory": "supplement|drink|snack|equipment|other",
      "matchedProductId": "UUID nebo null",
      "matchedProductName": "Název nebo null",
      "confidence": 0-1,
      "matchSuggestions": [
        {"productId": "UUID", "productName": "Název", "confidence": 0-1, "matchReason": "SKU shoda / Podobný název"}
      ],
      "extractedDetails": {
        "brand": "Vilgain",
        "weight": "25g",
        "flavor": "Peach fuzz",
        "size": null
      }
    }
  ]
}`;

    console.log('Calling Lovable AI to parse invoice with enhanced matching...');
    
    // Prepare content - same for PDF and images with Gemini
    const content = [
      {
        type: "text",
        text: "Analyzuj tuto fakturu a extrahuj VŠECHNY položky produktů ze VŠECH STRAN. Přesně spáruj s existujícími produkty podle SKU, značky, gramáže a příchutě. Pro každou položku nabídni až 3 alternativní návrhy párování."
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${fileBase64}`
        }
      }
    ];

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
        max_tokens: 8192,
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
      skuCode: item.skuCode || null,
      matchSuggestions: item.matchSuggestions || [],
      extractedDetails: item.extractedDetails || {},
    }));

    console.log(`Successfully parsed ${validatedItems.length} items from invoice with enhanced matching`);

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
