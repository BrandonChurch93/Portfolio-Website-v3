import { contact } from '../content/contact';

// Sends the form the way his live site does: the fields posted to FormSubmit, which mails them to him. It answers
// whether the message went.
export async function send(form: HTMLFormElement): Promise<boolean> {
  const data = new FormData(form);
  // A field no person fills in: a message with it filled is thrown away at the other end.
  if (data.get('_honey')) return true;
  data.set('_subject', contact.form.subject);
  data.set('_template', 'table');
  data.set('_captcha', 'false');
  try {
    const r = await fetch(contact.form.endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
    // It answers 200 with success false when it took the post and sent nothing, as when the form is not yet confirmed.
    const said = (await r.json().catch(() => null)) as { success?: unknown } | null;
    return r.ok && String(said?.success ?? 'true') !== 'false';
  } catch {
    return false;
  }
}
