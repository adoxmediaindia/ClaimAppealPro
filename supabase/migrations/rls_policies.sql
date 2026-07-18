-- ====================================================================
-- ClaimAppealPro Row-Level Security (RLS) Policies
-- Enforced on Supabase PostgreSQL tables to secure HIPAA/PHI data.
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appeal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AppealVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiGeneration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeatureFlag" ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 1. "User" Table Policies
-- Users can only view or edit their own user status
-- --------------------------------------------------------------------
CREATE POLICY user_self_read ON "User"
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY user_self_update ON "User"
    FOR UPDATE
    USING (auth.uid() = id);

-- --------------------------------------------------------------------
-- 2. "Profile" Table Policies
-- Users can read/write their own profile fields
-- --------------------------------------------------------------------
CREATE POLICY profile_self_read ON "Profile"
    FOR SELECT
    USING (auth.uid() = "userId");

CREATE POLICY profile_self_write ON "Profile"
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- --------------------------------------------------------------------
-- 3. "Appeal" Table Policies
-- Users can only access/modify appeals they created
-- --------------------------------------------------------------------
CREATE POLICY appeal_self_access ON "Appeal"
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- --------------------------------------------------------------------
-- 4. "AppealVersion" Table Policies
-- Users can only access appeal versions if they own the parent appeal
-- --------------------------------------------------------------------
CREATE POLICY version_parent_owner ON "AppealVersion"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Appeal" a
            WHERE a.id = "appealId" AND a."userId" = auth.uid()
        )
    );

-- --------------------------------------------------------------------
-- 5. "File" Table Policies
-- Users can only access attached files if they own the parent appeal
-- --------------------------------------------------------------------
CREATE POLICY file_parent_owner ON "File"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "Appeal" a
            WHERE a.id = "appealId" AND a."userId" = auth.uid()
        )
    );

-- --------------------------------------------------------------------
-- 6. "Subscription" Table Policies
-- Users can view their own billing subscription data
-- --------------------------------------------------------------------
CREATE POLICY subscription_self ON "Subscription"
    FOR SELECT
    USING (auth.uid() = "userId");

-- --------------------------------------------------------------------
-- 7. "Payment" Table Policies
-- Users can view their own transaction history
-- --------------------------------------------------------------------
CREATE POLICY payment_self ON "Payment"
    FOR SELECT
    USING (auth.uid() = "userId");

-- --------------------------------------------------------------------
-- 8. "UsageLog" Table Policies
-- Users can view their own token/operation usage records
-- --------------------------------------------------------------------
CREATE POLICY usage_log_self ON "UsageLog"
    FOR SELECT
    USING (auth.uid() = "userId");

-- --------------------------------------------------------------------
-- 9. "AiGeneration" Table Policies
-- Users can view generative statistics for their own appeals
-- --------------------------------------------------------------------
CREATE POLICY ai_generation_self ON "AiGeneration"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "Appeal" a
            WHERE a.id = "appealId" AND a."userId" = auth.uid()
        )
    );

-- --------------------------------------------------------------------
-- 10. "SupportTicket" Table Policies
-- Users can create/view their own tickets
-- --------------------------------------------------------------------
CREATE POLICY ticket_self ON "SupportTicket"
    FOR ALL
    USING (auth.uid() = "userId")
    WITH CHECK (auth.uid() = "userId");

-- --------------------------------------------------------------------
-- 11. "FeatureFlag" Table Policies
-- Public read access, restrict modifications to administrators
-- --------------------------------------------------------------------
CREATE POLICY flag_public_read ON "FeatureFlag"
    FOR SELECT
    TO authenticated
    USING (true);
