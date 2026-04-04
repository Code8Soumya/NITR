BEGIN;

UPDATE auth.users
SET
  is_admin = true,
  approval_status = 'approved',
  approved_at = COALESCE(approved_at, now()),
  rejected_at = NULL,
  rejected_by = NULL,
  rejection_reason = NULL,
  updated_at = now()
WHERE lower(email) = '122me0914@nitrkl.ac.in';

COMMIT;
