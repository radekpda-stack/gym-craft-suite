-- =====================================================
-- COMPREHENSIVE ANALYTICS SYSTEM
-- =====================================================

-- 1. Interaction Events - granular click/scroll/hover tracking
CREATE TABLE public.interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT,
  
  -- Event type
  event_type TEXT NOT NULL, -- 'click', 'scroll', 'focus', 'hover', 'rage_click', 'blur'
  
  -- Element info
  element_type TEXT,        -- 'button', 'link', 'input', 'card', etc.
  element_id TEXT,          -- data-track-id or HTML id
  element_text TEXT,        -- truncated inner text (max 100 chars)
  element_path TEXT,        -- CSS selector path
  
  -- Position
  x_position INTEGER,
  y_position INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  
  -- Context
  route TEXT NOT NULL,
  route_params JSONB,
  
  -- Timing
  time_on_page_ms INTEGER,  -- time since page load
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Extra metadata
  metadata JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Feature Sessions - time tracking per feature/section
CREATE TABLE public.feature_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT,
  
  feature_name TEXT NOT NULL,    -- 'client_detail', 'training_form', 'calendar'
  feature_category TEXT NOT NULL,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  
  duration_ms INTEGER,
  active_duration_ms INTEGER,    -- without background time
  
  -- Interactions during feature
  click_count INTEGER DEFAULT 0,
  scroll_depth_percent INTEGER DEFAULT 0,
  input_count INTEGER DEFAULT 0,
  
  -- Context
  entity_type TEXT,              -- 'client', 'training', etc.
  entity_id TEXT,
  
  -- Exit info
  exit_type TEXT,                -- 'navigate', 'close', 'timeout', 'error'
  exit_to TEXT,                  -- next route
  
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. User Journeys - complete user paths
CREATE TABLE public.user_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT,
  
  journey_type TEXT,            -- 'onboarding', 'create_client', 'complete_training'
  journey_name TEXT,
  
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array of {route, timestamp, action, duration_ms}
  
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  
  success BOOLEAN,
  
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Scroll Analytics - scroll depth tracking
CREATE TABLE public.scroll_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT,
  
  route TEXT NOT NULL,
  
  max_scroll_percent INTEGER DEFAULT 0,   -- maximum depth reached
  scroll_count INTEGER DEFAULT 0,          -- number of scroll actions
  scroll_up_count INTEGER DEFAULT 0,       -- times scrolled back up
  
  time_to_25_percent_ms INTEGER,
  time_to_50_percent_ms INTEGER,
  time_to_75_percent_ms INTEGER,
  time_to_100_percent_ms INTEGER,
  
  content_height INTEGER,
  viewport_height INTEGER,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Rage Clicks - frustration detection
CREATE TABLE public.rage_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT,
  
  route TEXT NOT NULL,
  
  element_type TEXT,
  element_id TEXT,
  element_text TEXT,
  element_path TEXT,
  
  click_count INTEGER NOT NULL,  -- number of rapid clicks
  time_span_ms INTEGER NOT NULL, -- time span of clicks
  
  x_position INTEGER,
  y_position INTEGER,
  
  -- Context before rage click
  previous_actions JSONB,        -- last 5 actions before rage click
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Performance Metrics
CREATE TABLE public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_id TEXT,
  
  route TEXT NOT NULL,
  
  -- Core Web Vitals
  lcp_ms INTEGER,               -- Largest Contentful Paint
  fid_ms INTEGER,               -- First Input Delay
  cls NUMERIC(10,4),            -- Cumulative Layout Shift
  fcp_ms INTEGER,               -- First Contentful Paint
  ttfb_ms INTEGER,              -- Time to First Byte
  
  -- Custom metrics
  page_load_ms INTEGER,
  dom_ready_ms INTEGER,
  time_to_interactive_ms INTEGER,
  
  -- Device context
  device_type TEXT,
  connection_type TEXT,         -- '4g', '3g', 'wifi', etc.
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_interaction_events_user_time ON interaction_events(user_id, timestamp DESC);
CREATE INDEX idx_interaction_events_route ON interaction_events(route, event_type);
CREATE INDEX idx_interaction_events_element ON interaction_events(element_type, element_id);

CREATE INDEX idx_feature_sessions_user_time ON feature_sessions(user_id, started_at DESC);
CREATE INDEX idx_feature_sessions_feature ON feature_sessions(feature_name, feature_category);

CREATE INDEX idx_user_journeys_user ON user_journeys(user_id, started_at DESC);
CREATE INDEX idx_user_journeys_type ON user_journeys(journey_type);

CREATE INDEX idx_scroll_analytics_user ON scroll_analytics(user_id, timestamp DESC);
CREATE INDEX idx_scroll_analytics_route ON scroll_analytics(route);

CREATE INDEX idx_rage_clicks_user ON rage_clicks(user_id, timestamp DESC);
CREATE INDEX idx_rage_clicks_route ON rage_clicks(route);

CREATE INDEX idx_performance_metrics_route ON performance_metrics(route, timestamp DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE scroll_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rage_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Interaction Events
CREATE POLICY "Users can insert own interaction events" ON interaction_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own interaction events" ON interaction_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own interaction events" ON interaction_events
  FOR DELETE USING (auth.uid() = user_id);

-- Feature Sessions
CREATE POLICY "Users can insert own feature sessions" ON feature_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own feature sessions" ON feature_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own feature sessions" ON feature_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feature sessions" ON feature_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- User Journeys
CREATE POLICY "Users can insert own journeys" ON user_journeys
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own journeys" ON user_journeys
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own journeys" ON user_journeys
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journeys" ON user_journeys
  FOR DELETE USING (auth.uid() = user_id);

-- Scroll Analytics
CREATE POLICY "Users can insert own scroll analytics" ON scroll_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own scroll analytics" ON scroll_analytics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scroll analytics" ON scroll_analytics
  FOR DELETE USING (auth.uid() = user_id);

-- Rage Clicks
CREATE POLICY "Users can insert own rage clicks" ON rage_clicks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own rage clicks" ON rage_clicks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rage clicks" ON rage_clicks
  FOR DELETE USING (auth.uid() = user_id);

-- Performance Metrics (allow anonymous for initial page loads)
CREATE POLICY "Users can insert performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own performance metrics" ON performance_metrics
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can delete own performance metrics" ON performance_metrics
  FOR DELETE USING (auth.uid() = user_id);