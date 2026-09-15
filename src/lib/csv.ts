import type { RSVPRecord } from '../types/wedding';

/** Quote every cell and neutralize spreadsheet formula prefixes, including
 * prefixes hidden behind whitespace. Phone numbers beginning with + stay text. */
export function escapeCsv(value: string | number | null | undefined): string {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildRsvpCsv(records: RSVPRecord[]): string {
  const rows: (string | number)[][] = [
    ['Guest Name', 'Attendance', 'Guest Count', 'Phone', 'Message', 'Submitted At'],
    ...records.map((record) => [
      record.guest_name,
      record.attendance === 'attending' ? 'Attending' : 'Not attending',
      record.guest_count,
      record.phone,
      record.message,
      record.created_at,
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n') + '\r\n';
}

export function downloadRsvpCsv(records: RSVPRecord[], slug: string): void {
  const blob = new Blob([buildRsvpCsv(records)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slug.replace(/[^a-z0-9-]/gi, '') || 'wedding'}-rsvp.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Keep the object URL alive long enough for Safari to begin the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
