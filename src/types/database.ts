export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            audit_logs: {
                Row: {
                    action: string
                    created_at: string
                    details: Json | null
                    error_message: string | null
                    event_type: string
                    id: string
                    ip_address: string | null
                    resource_id: string | null
                    resource_type: string | null
                    status: string
                    user_agent: string | null
                    user_email: string | null
                    user_id: string | null
                    user_role: string | null
                }
                Insert: Partial<Database['public']['Tables']['audit_logs']['Row']>
                Update: Partial<Database['public']['Tables']['audit_logs']['Row']>
            }
            inventory: {
                Row: {
                    batch_number: string | null
                    category: string
                    created_at: string
                    expiry_date: string | null
                    id: string
                    last_updated_at: string
                    last_updated_by: string | null
                    manufacturer: string | null
                    name: string
                    price: number
                    unit_price?: number // DB column name
                    quantity: number
                    reorder_level: number
                    sku: string
                    unit: string
                }
                Insert: Partial<Database['public']['Tables']['inventory']['Row']>
                Update: Partial<Database['public']['Tables']['inventory']['Row']>
            }
            sales: {
                Row: {
                    id: string
                    transaction_id: string
                    customer_name: string | null
                    customer_phone: string | null
                    total: number
                    discount: number | null
                    sale_type: string
                    status: string
                    cashier_id: string | null
                    cashier_name: string | null
                    cashier_email: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: Partial<Database['public']['Tables']['sales']['Row']>
                Update: Partial<Database['public']['Tables']['sales']['Row']>
            }
            sales_items: {
                Row: {
                    id: string
                    sale_id: string
                    product_id: string
                    product_name: string
                    quantity: number
                    price: number
                    unit_price: number
                    total: number
                    discount: number | null
                    is_wholesale: boolean | null
                    created_at: string | null
                }
                Insert: Partial<Database['public']['Tables']['sales_items']['Row']>
                Update: Partial<Database['public']['Tables']['sales_items']['Row']>
            }
            profiles: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    username: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: Partial<Database['public']['Tables']['profiles']['Row']>
                Update: Partial<Database['public']['Tables']['profiles']['Row']>
            }
            user_roles: {
                Row: {
                    id: string
                    user_id: string
                    role: 'SUPER_ADMIN' | 'ADMIN' | 'PHARMACIST' | 'CASHIER'
                    created_at: string
                }
                Insert: Partial<Database['public']['Tables']['user_roles']['Row']>
                Update: Partial<Database['public']['Tables']['user_roles']['Row']>
            }
            store_settings: {
                Row: {
                    id: string
                    name: string
                    email: string | null
                    phone: string | null
                    address: string | null
                    logo_url: string | null
                    print_show_logo: boolean | null
                    print_show_address: boolean | null
                    print_show_email: boolean | null
                    print_show_phone: boolean | null
                    print_show_footer: boolean | null
                    updated_at: string
                    updated_by: string | null
                }
                Insert: Partial<Database['public']['Tables']['store_settings']['Row']>
                Update: Partial<Database['public']['Tables']['store_settings']['Row']>
            }
        }
    }
}
