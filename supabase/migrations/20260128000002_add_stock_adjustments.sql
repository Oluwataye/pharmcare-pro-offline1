-- Create stock_adjustments table
CREATE TABLE IF NOT EXISTS public.stock_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    cost_price_at_time DECIMAL(10, 2) NOT NULL,
    selling_price_at_time DECIMAL(10, 2) NOT NULL,
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('Increase', 'Decrease')),
    reason TEXT,
    adjusted_by UUID REFERENCES public.profiles(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on created_at for optimized date filtering
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created_at ON public.stock_adjustments(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON public.stock_adjustments(product_id);

-- Enable RLS
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "All authenticated users can view stock adjustments"
ON public.stock_adjustments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert stock adjustments"
ON public.stock_adjustments FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE public.stock_adjustments IS 'Stores immutable records of manual stock adjustments for auditing and financial reporting.';
