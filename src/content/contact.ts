// What Contact says and where its buttons go. The words are stand ins and his to write. The Calendly page and the
// address are his live site's own, on his word (BRIEF.md, Settled, "Contact, the first build").
const ADDRESS = 'brandonleochurch@gmail.com';

export const contact = {
  title: 'Contact',
  calendly: { label: 'Book on Calendly', href: 'https://calendly.com/modernsoftworks' },
  email: { label: 'Copy my email', copied: 'Copied', address: ADDRESS },
  rule: 'or send a message',
  form: {
    name: 'Name',
    email: 'Email',
    message: 'Message',
    send: 'Send message',
    sending: 'Sending',
    sent: ['Message sent', 'I’ll get back to you within 24 hours.'] as [string, string],
    failed: 'That did not send. Copy my email above and write to me directly.',
    // What a field says when the form is sent with it empty or wrong. Stand ins, and his to write.
    wrong: { name: 'Add your name', email: 'Add an email I can reply to', message: 'Write a message' },
    again: 'Send another',
    // His live site's form goes through FormSubmit, which mails what is posted to the address at the end of this.
    endpoint: `https://formsubmit.co/ajax/${ADDRESS}`,
    subject: 'New Portfolio Contact!',
  },
  based: 'Boise, Idaho · Mountain Time',
  foot: {
    line: 'Designed and built by Brandon Church',
    links: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/brandon-church-ms' },
      { label: 'GitHub', href: 'https://github.com/BrandonChurch93' },
      // The file is not on this site yet (the copy he shared holds a phone number, and no phone number goes on the
      // site), so the link is held back: a link that answers 404 is worse than none.
      { label: 'Résumé', href: '/downloads/BrandonChurch-Resume.pdf', held: true },
    ],
  },
} as const;
