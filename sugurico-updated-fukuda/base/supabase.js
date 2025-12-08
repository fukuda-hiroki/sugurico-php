'use strict';

// --- Supabaseクライアントの初期化 ---
const SUPABASE_URL = 'https://ahyayuewvlbgrpkuxhvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoeWF5dWV3dmxiZ3Jwa3V4aHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzQxNDgsImV4cCI6MjA2OTI1MDE0OH0.C3VoRGUdUxOIjUoAR4Hx2OLGpBy_5B0KSuuOqOu-arQ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);