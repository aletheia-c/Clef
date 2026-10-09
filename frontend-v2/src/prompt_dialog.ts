import {byId} from './dom';

export function askName(
  label: string,
  action: string,
  initial = '',
): Promise<string | null> {
  const dialog = byId('prompt', HTMLDialogElement);
  const input = byId('prompt-input', HTMLInputElement);
  byId('prompt-label', HTMLLabelElement).textContent = label;
  byId('prompt-ok', HTMLButtonElement).textContent = action;

  input.value = initial;
  dialog.returnValue = '';
  dialog.showModal();
  const dot = initial.lastIndexOf('.');
  input.setSelectionRange(0, dot > 0 ? dot : initial.length);

  return new Promise(resolve => {
    dialog.addEventListener(
      'close',
      () => resolve(dialog.returnValue === 'ok' ? input.value.trim() : null),
      {once: true},
    );
  });
}
