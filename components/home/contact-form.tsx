'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error' | 'unavailable'>('idle')
  const [error, setError] = useState('')
  const [lastSentAt, setLastSentAt] = useState(0)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending' || Date.now() - lastSentAt < 5000) return
    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') || '').trim()
    const email = String(data.get('email') || '').trim()
    const message = String(data.get('message') || '').trim()
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY

    if (!serviceId || !templateId || !publicKey) {
      setStatus('unavailable')
      return
    }
    if (!name || name.length > 120 || !email || !message || message.length > 4000) {
      setError('Please provide a valid name, email address, and message under 4,000 characters.')
      setStatus('error')
      return
    }

    setStatus('sending')
    setError('')
    try {
      // Dynamically import @emailjs/browser on submission to prevent bundling 35KB into initial page load
      const emailjs = (await import('@emailjs/browser')).default
      await emailjs.send(
        serviceId,
        templateId,
        {
          name,
          email,
          message,
          subject: 'New Contact Form Enquiry — Chrysalis Hydroponics Centre of Excellence',
          submitted_at: new Date().toISOString(),
          reply_to: email,
        },
        { publicKey }
      )
      setLastSentAt(Date.now())
      setStatus('success')
      form.reset()
    } catch {
      setError('We could not send your enquiry. Please try again or use the centre email directly.')
      setStatus('error')
    }
  }

  if (status === 'unavailable') {
    return (
      <div className="form-error" role="alert">
        <h3>Email delivery is not configured.</h3>
        <p>Your message was not sent. Add the EmailJS variables to the environment and restart the development server.</p>
        <button type="button" className="text-link" onClick={() => setStatus('idle')}>
          Try again <ArrowRight size={15} />
        </button>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="form-success" role="status">
        <h3>Enquiry sent.</h3>
        <p>Wait until our team will reach you</p>
        <button type="button" className="text-link" onClick={() => setStatus('idle')}>
          Send another enquiry <ArrowRight size={15} />
        </button>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <label>
        Name
        <input name="name" required maxLength={120} placeholder="Your name" />
      </label>
      <label>
        Email
        <input name="email" required type="email" maxLength={254} placeholder="you@example.com" />
      </label>
      <label>
        Message
        <textarea name="message" required maxLength={4000} placeholder="How can we help?" rows={4} />
      </label>
      {status === 'error' && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-dark" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? (
          <>
            <Loader2 className="spinner" size={17} /> Sending…
          </>
        ) : (
          <>
            Send enquiry <ArrowRight size={17} />
          </>
        )}
      </button>
    </form>
  )
}
