import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://svopqsssthtttltwdtze.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_88FIK1kBPC0qGkY_tadBPw_bhmbybTG";

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);