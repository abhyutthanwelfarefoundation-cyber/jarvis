import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/*
==================================================
  SUPABASE SQL — run this in your Supabase SQL editor
  Go to: supabase.com → Your Project → SQL Editor
==================================================

-- Tasks table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id text default 'naman',
  title text not null,
  scheduled_at timestamptz,
  reminder_at timestamptz,
  completed boolean default false,
  notified boolean default false,
  created_at timestamptz default now()
);

-- Contacts table (for "call mom")
create table contacts (
  id uuid default gen_random_uuid() primary key,
  user_id text default 'naman',
  nickname text not null,        -- "mom", "brother"
  real_name text,
  phone text not null,
  created_at timestamptz default now()
);

-- Push subscriptions table
create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id text default 'naman',
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- Chat history table
create table chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id text default 'naman',
  role text not null,           -- 'user' or 'assistant'
  content text not null,
  language text default 'en',
  created_at timestamptz default now()
);

-- Sample contacts
insert into contacts (nickname, real_name, phone) values
  ('mom', 'Mummy', '+91XXXXXXXXXX'),
  ('brother', 'Bhai', '+91XXXXXXXXXX'),
  ('dad', 'Papa', '+91XXXXXXXXXX');
*/

export default supabase;
