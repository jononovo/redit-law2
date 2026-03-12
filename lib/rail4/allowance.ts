export function getWindowStart(duration: string): Date {
  const now = new Date();
  switch (duration) {
    case "day": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "week": {
      const d = new Date(now);
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    default:
      return new Date(now.setHours(0, 0, 0, 0));
  }
}

export function getNextWindowStart(duration: string): Date {
  const start = getWindowStart(duration);
  switch (duration) {
    case "day": {
      start.setDate(start.getDate() + 1);
      return start;
    }
    case "week": {
      start.setDate(start.getDate() + 7);
      return start;
    }
    case "month": {
      start.setMonth(start.getMonth() + 1);
      return start;
    }
    default: {
      start.setDate(start.getDate() + 1);
      return start;
    }
  }
}
