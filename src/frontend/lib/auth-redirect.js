export function shouldAttemptAutoLogin(hasSupabaseSession, canIssueServerSession) {
  return Boolean(hasSupabaseSession && canIssueServerSession);
}
