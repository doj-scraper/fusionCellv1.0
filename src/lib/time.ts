import { formatDistanceToNowStrict } from 'date-fns';

export function toRelativeTime(value: string | Date) {
  return `${formatDistanceToNowStrict(new Date(value), { addSuffix: true })}`;
}
