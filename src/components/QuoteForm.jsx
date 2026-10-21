import { useEffect, useRef, useState } from 'react';
import { contact, quoteForm } from '../content/site.js';
import { sfx } from '../sound/sfx.js';

// "Request a quote" — opened from the “ glyph on the shelf.
// Temporary styling, to be designed in Figma.
// `paused`: the privacy note is open on top, so Esc closes that, not the form.
export function QuoteForm({ onClose, onPrivacy, paused = false }) {
  const [services, setServices] = useState([]);
  const [status, setStatus] = useState('editing'); // editing | sending | sent | mailto | error
  const [sentTo, setSentTo] = useState({ name: '', email: '' });
  const firstField = useRef(null);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e) => e.key === 'Escape' && !paused && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, paused]);

  const toggleService = (s) => {
    sfx.hover();
    setServices((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    // Spam bots fill in every field, even the invisible one: pretend it worked.
    if (form.get('_gotcha')) return setStatus('sent');
    const data = {
      name: form.get('name').trim(),
      brand: form.get('brand').trim(),
      services: services.join(', '),
      budget: form.get('budget'),
      description: form.get('description').trim(),
      email: form.get('email').trim(),
    };
    sfx.click();
    setSentTo({ name: data.name, email: data.email });

    if (contact.formEndpoint) {
      setStatus('sending');
      try {
        const res = await fetch(contact.formEndpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, _subject: `Quote request from ${data.name}` }),
        });
        setStatus(res.ok ? 'sent' : 'error');
      } catch {
        setStatus('error');
      }
      return;
    }

    if (contact.email) {
      const body = [
        `Name: ${data.name}`,
        `Brand: ${data.brand || '—'}`,
        `Looking for: ${data.services || '—'}`,
        `Budget: ${data.budget || '—'}`,
        `Reply to: ${data.email}`,
        '',
        data.description,
      ].join('\n');
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(
        `Quote request from ${data.name}`,
      )}&body=${encodeURIComponent(body)}`;
      setStatus('mailto');
      return;
    }

    setStatus('error');
  };

  return (
    <div className="quote-scrim" onClick={onClose}>
      <div
        className="quote-letter"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="quote-close" aria-label="Close" onClick={onClose}>
          ×
        </button>

        {status === 'sent' || status === 'mailto' ? (
          <div className="quote-done">
            <h2 id="quote-title">Thank you, {sentTo.name.split(' ')[0]}!</h2>
            <p>
              {status === 'sent'
                ? `Your request is on its way. I'll get back to you at ${sentTo.email}.`
                : 'Your email app should have opened with everything filled in — just press send.'}
            </p>
            <button type="button" className="quote-send" onClick={onClose}>
              Back to the shelf
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <h2 id="quote-title">Request a quote</h2>
            <p className="quote-intro">Tell me a bit about your project and I'll write back.</p>

            <div className="quote-row">
              <label>
                <span>Your name *</span>
                <input ref={firstField} name="name" required autoComplete="name" />
              </label>
              <label>
                <span>Brand / company</span>
                <input name="brand" autoComplete="organization" />
              </label>
            </div>

            <fieldset>
              <legend>What do you need?</legend>
              <div className="quote-chips">
                {quoteForm.services.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="quote-chip"
                    aria-pressed={services.includes(s)}
                    onClick={() => toggleService(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            <label>
              <span>Budget</span>
              <select name="budget" defaultValue="">
                <option value="" disabled>
                  Choose a range
                </option>
                {quoteForm.budgets.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Short description *</span>
              <textarea name="description" required rows={4} maxLength={800} />
            </label>

            <label>
              <span>Your email, so I can reply *</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>

            {status === 'error' && (
              <p className="quote-error" role="alert">
                {contact.formEndpoint || contact.email
                  ? "Something went wrong sending your request. Please try again in a moment."
                  : 'This form isn’t connected yet (no form service or email set in site.js).'}
              </p>
            )}

            {/* Invisible to people; bots fill it in (Formspree also drops those) */}
            <input className="quote-trap" name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" />

            <button type="submit" className="quote-send" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send request'}
            </button>
            <p className="quote-consent">
              Your message goes straight to my inbox through Formspree and is only used to reply to you.{' '}
              <button type="button" onClick={onPrivacy}>
                Privacy note
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
