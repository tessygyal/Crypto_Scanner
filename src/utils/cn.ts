/** Join class names, skipping false/null/undefined. `cn('p-md', isOn && 'bg-primary')` */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
