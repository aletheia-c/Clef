import {byId} from './dom';
import {loadShowRawNames, saveShowRawNames} from './prefs';
import type {ServerService} from './server';

export class SettingsMenu {
  private readonly button = byId('settings', HTMLButtonElement);
  private readonly menu = byId('settings-menu', HTMLElement);
  private readonly version = byId('settings-version', HTMLElement);
  private readonly server = byId('settings-server', HTMLElement);
  private readonly rawNames = byId('settings-raw-names', HTMLInputElement);

  constructor(
    private readonly service: ServerService,
    onRawNamesChange: (show: boolean) => void,
  ) {
    this.rawNames.checked = loadShowRawNames();
    this.rawNames.addEventListener('change', () => {
      saveShowRawNames(this.rawNames.checked);
      onRawNamesChange(this.rawNames.checked);
    });
    this.menu.addEventListener('toggle', event => {
      if ((event as ToggleEvent).newState === 'open') {
        this.placeUnderButton();
        void this.loadServerInfo();
      }
    });
  }

  private placeUnderButton(): void {
    const button = this.button.getBoundingClientRect();
    this.menu.style.top = `${button.bottom + 4}px`;
    this.menu.style.right = `${innerWidth - button.right}px`;
  }

  private async loadServerInfo(): Promise<void> {
    this.version.textContent = 'Clef';
    this.server.textContent = '…';
    try {
      const settings = await this.service.settings();
      this.version.textContent = `Clef ${settings.version}`;
      const clefId = settings.clef_id ? 'on' : 'off';
      this.server.textContent = `${settings.mountpoint} · ID ${clefId}`;
    } catch {
      this.server.textContent = 'Server info unavailable';
    }
  }
}
