/** Format date for assessment stub API (web `dateToday` parity). */
export function formatAssessmentEndTime(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  const yyyy = date.getFullYear();
  return `${yyyy}/${mm}/${dd} ${time}`;
}

/** Elapsed duration since session start as HH:MM:SS. */
export function formatAttendedDuration(startTime: Date, now = new Date()): string {
  const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
