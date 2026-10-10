const RAW_NAMES_KEY = 'clef.showRawTagNames';

export function loadShowRawNames(): boolean {
  return localStorage.getItem(RAW_NAMES_KEY) === 'true';
}

export function saveShowRawNames(show: boolean): void {
  localStorage.setItem(RAW_NAMES_KEY, String(show));
}
