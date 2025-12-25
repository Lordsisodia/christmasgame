import Constants from "expo-constants";
import { createClient } from "@supabase/supabase-js";

const { supabaseUrl, supabaseAnonKey } = Constants.expoConfig?.extra ?? {};

export const supabaseReady = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 2 } },
    })
  : null;
