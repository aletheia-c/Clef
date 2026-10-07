import {byId} from './dom';

export function confirmAction(
  message: string,
  action: string,
): Promise<boolean> {
  const dialog = byId('confirm', HTMLDialogElement);
  byId('confirm-message', HTMLParagraphElement).textContent = message;
  byId('confirm-ok', HTMLButtonElement).textContent = action;

  dialog.returnValue = '';
  dialog.showModal();
  return new Promise(resolve => {
    dialog.addEventListener(
      'close',
      () => resolve(dialog.returnValue === 'ok'),
      {once: true},
    );
  });
}
