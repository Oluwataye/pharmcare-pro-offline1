
-- 1. Create Stock Movement Type Enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
        CREATE TYPE public.stock_movement_type AS ENUM ('SALE', 'ADJUSTMENT', 'ADDITION', 'RETURN', 'INITIAL');
    END IF;
END $$;

-- 2. Create Stock Movements Table (Standardized name and columns)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity_change integer NOT NULL,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    type public.stock_movement_type NOT NULL,
    reason text,
    reference_id uuid, -- For links to sales, returns, etc.
    created_by uuid REFERENCES public.profiles(user_id),
    created_at timestamptz NOT NULL DEFAULT now(),
    batch_number text,
    expiry_date date,
    cost_price_at_time decimal(10, 2),
    unit_price_at_time decimal(10, 2)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(type);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view stock movements"
ON public.stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert stock movements"
ON public.stock_movements FOR INSERT
TO authenticated
WITH CHECK (true);

-- Drop the temporary stock_adjustments table if it was created in a previous step
DROP TABLE IF EXISTS public.stock_adjustments;

-- Comment on table
COMMENT ON TABLE public.stock_movements IS 'Standardized auditing table for all stock changes, matching the main Pharmcare Pro project.';
