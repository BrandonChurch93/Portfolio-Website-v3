import { contact } from '../content/contact';
import styles from './SiteFoot.module.css';

// The foot of a page that is not the home page: the same line and the same links as the home page's own.
export function SiteFoot() {
  return (
    <footer className={styles.foot}>
      <p>{contact.foot.line} · © {new Date().getFullYear()}</p>
      <ul>
        {contact.foot.links.filter((l) => !('held' in l)).map((l) => (
          <li key={l.label}><a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}>{l.label}</a></li>
        ))}
      </ul>
    </footer>
  );
}
