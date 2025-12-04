-- Add purchase_price column to products table
ALTER TABLE public.products ADD COLUMN purchase_price numeric DEFAULT 0;

-- Add dashboard_layout to app_settings for customization
INSERT INTO public.app_settings (key, value, description)
VALUES ('dashboard_layout', '{"showIncomeChart": true, "showMonthlyChart": true, "showClientCredits": true, "showProductBreakdown": true, "showTaxCalculator": true, "showQuickActions": true}', 'Nastavení zobrazení dashboardu')
ON CONFLICT (key) DO NOTHING;