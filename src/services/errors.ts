export function serviceError(
  error: { code?: string; message?: string } | null,
  fallback: string,
): Error {
  if (error?.code === '23505')
    return new Error('That invitation link is already in use. Please choose another slug.');
  if (['42501', 'PGRST301', 'PGRST302'].includes(error?.code || ''))
    return new Error(
      'You do not have access to this information. Please sign in again if your session has expired.',
    );
  if (error?.code === '23514' || error?.code === '22023')
    return new Error('Please check the form values and try again.');
  if (error?.message?.includes('not accepting') || error?.message?.includes('not active'))
    return new Error('This wedding is no longer accepting responses.');
  return new Error(fallback);
}
