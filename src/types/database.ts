/**
 * Generated-style Supabase schema types.
 * Mirrors supabase/schema.sql. Keep in sync when the DDL changes
 * (or regenerate with `supabase gen types typescript`).
 */

export type AppRole = "Admin" | "Dispatcher" | "Carrier" | "Client";
export type TransportMode = "Ocean" | "Air" | "Road" | "Rail";
export type ShipmentStatus =
  | "Booked"
  | "In Transit"
  | "Customs Hold"
  | "Delivered"
  | "Cancelled"
  | "Delayed";
export type ContainerStatus =
  | "Planned"
  | "Loading in Progress"
  | "Sealed & Staged"
  | "In Transit"
  | "Deconsolidated";
export type BolType = "HBL" | "MBL";
export type PoStatus =
  | "Open"
  | "In Transit"
  | "Customs Hold"
  | "Delivered"
  | "Closed"
  | "Cancelled";
export type LoadType = "LCL" | "FCL";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: AppRole;
          org_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role?: AppRole;
          org_name?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      shipments: {
        Row: {
          id: string;
          reference: string;
          tracking_number: string | null;
          client_name: string;
          shipper: string | null;
          consignee: string | null;
          origin: string;
          destination: string;
          mode: TransportMode;
          status: ShipmentStatus;
          etd: string | null;
          eta: string | null;
          container_no: string | null;
          cargo_type: string | null;
          vessel: string | null;
          carrier: string | null;
          po_number: string | null;
          weight_kg: number;
          volume_cbm: number;
          hazard_class: string | null;
          incoterms: string | null;
          current_location: string | null;
          current_lat: number | null;
          current_lng: number | null;
          progress: number;
          client_id: string | null;
          carrier_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference: string;
          tracking_number?: string | null;
          client_name: string;
          shipper?: string | null;
          consignee?: string | null;
          origin: string;
          destination: string;
          mode: TransportMode;
          status?: ShipmentStatus;
          etd?: string | null;
          eta?: string | null;
          container_no?: string | null;
          cargo_type?: string | null;
          vessel?: string | null;
          carrier?: string | null;
          po_number?: string | null;
          weight_kg?: number;
          volume_cbm?: number;
          hazard_class?: string | null;
          incoterms?: string | null;
          current_location?: string | null;
          current_lat?: number | null;
          current_lng?: number | null;
          progress?: number;
          client_id?: string | null;
          carrier_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipments"]["Insert"]>;
        Relationships: [];
      };
      shipment_tracking_logs: {
        Row: {
          id: string;
          shipment_id: string;
          event_type: string;
          message: string;
          level: string;
          lat: number | null;
          lng: number | null;
          location: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          event_type?: string;
          message: string;
          level?: string;
          lat?: number | null;
          lng?: number | null;
          location?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["shipment_tracking_logs"]["Insert"]
        >;
        Relationships: [];
      };
      containers: {
        Row: {
          id: string;
          reference: string;
          container_type: string;
          load_type: LoadType;
          max_volume_cbm: number;
          max_weight_kg: number;
          current_volume_cbm: number;
          current_weight_kg: number;
          origin: string | null;
          destination: string | null;
          vessel: string | null;
          status: ContainerStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference: string;
          container_type: string;
          load_type?: LoadType;
          max_volume_cbm: number;
          max_weight_kg: number;
          current_volume_cbm?: number;
          current_weight_kg?: number;
          origin?: string | null;
          destination?: string | null;
          vessel?: string | null;
          status?: ContainerStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["containers"]["Insert"]>;
        Relationships: [];
      };
      container_shipments: {
        Row: {
          container_id: string;
          shipment_id: string;
          loaded_at: string;
        };
        Insert: {
          container_id: string;
          shipment_id: string;
          loaded_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["container_shipments"]["Insert"]
        >;
        Relationships: [];
      };
      bills_of_lading: {
        Row: {
          id: string;
          bol_number: string;
          bol_type: BolType;
          shipment_id: string | null;
          master_bol_id: string | null;
          shipper_name: string | null;
          consignee_name: string | null;
          notify_party: string | null;
          vessel_name: string | null;
          voyage_no: string | null;
          port_of_loading: string | null;
          port_of_discharge: string | null;
          place_of_delivery: string | null;
          container_number: string | null;
          seal_number: string | null;
          total_weight_kg: number | null;
          total_volume_cbm: number | null;
          goods_description: string | null;
          freight_terms: string | null;
          issued_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bol_number: string;
          bol_type: BolType;
          shipment_id?: string | null;
          master_bol_id?: string | null;
          shipper_name?: string | null;
          consignee_name?: string | null;
          notify_party?: string | null;
          vessel_name?: string | null;
          voyage_no?: string | null;
          port_of_loading?: string | null;
          port_of_discharge?: string | null;
          place_of_delivery?: string | null;
          container_number?: string | null;
          seal_number?: string | null;
          total_weight_kg?: number | null;
          total_volume_cbm?: number | null;
          goods_description?: string | null;
          freight_terms?: string | null;
          issued_date?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["bills_of_lading"]["Insert"]
        >;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          po_number: string;
          client_name: string;
          vendor: string | null;
          currency: string;
          total_amount: number;
          status: PoStatus;
          shipment_id: string | null;
          client_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          po_number: string;
          client_name: string;
          vendor?: string | null;
          currency?: string;
          total_amount?: number;
          status?: PoStatus;
          shipment_id?: string | null;
          client_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["purchase_orders"]["Insert"]
        >;
        Relationships: [];
      };
      purchase_order_items: {
        Row: {
          id: string;
          po_id: string;
          sku: string;
          name: string;
          qty_ordered: number;
          qty_shipped: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          po_id: string;
          sku: string;
          name: string;
          qty_ordered?: number;
          qty_shipped?: number;
          unit_price?: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["purchase_order_items"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_role: { Args: Record<string, never>; Returns: AppRole };
      is_staff: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      transport_mode: TransportMode;
      shipment_status: ShipmentStatus;
      container_status: ContainerStatus;
      bol_type: BolType;
      po_status: PoStatus;
      load_type: LoadType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
