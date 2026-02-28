-- =============================================================================
-- Migration: L7 — Broadcast trigger fires only on status changes
-- =============================================================================
-- Previously, the broadcast trigger fired on every column update (updated_at,
-- retry_count, error_message, etc), generating unnecessary Realtime events.
-- Now it only fires on INSERT, DELETE, or UPDATE when status actually changes.
--
-- Split into two triggers because PostgreSQL WHEN clauses cannot reference
-- OLD in INSERT triggers or NEW in DELETE triggers.
-- =============================================================================

-- Drop the original combined trigger
DROP TRIGGER IF EXISTS broadcast_llm_jobs_changes_trigger ON public.llm_jobs;

-- INSERT/DELETE: always fire (new job or removed job)
CREATE TRIGGER broadcast_llm_jobs_insert_delete_trigger
  AFTER INSERT OR DELETE ON public.llm_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.broadcast_llm_jobs_changes();

-- UPDATE: only fire when status actually changes
CREATE TRIGGER broadcast_llm_jobs_status_update_trigger
  AFTER UPDATE OF status ON public.llm_jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.broadcast_llm_jobs_changes();
