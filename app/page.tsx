'use client'

import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import emailjs from '@emailjs/browser'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Beaker, ChevronDown, ChevronLeft, ChevronRight, Droplets, FlaskConical, Leaf, Mail, Menu, Microscope, MoveUpRight, Search, ShieldCheck, Sprout, Users, X } from 'lucide-react'

const images = {
  hero: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=2000&q=85',
  lab: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=85',
  crops: 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?auto=format&fit=crop&w=1200&q=85',
  greenhouse: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=85',
  workshop: 'https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&w=1200&q=85',
  seedlings: 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1200&q=85',
}

const research = [
  { title: 'Optimising leafy greens in NFT systems', category: 'NFT', year: '2024', status: 'Active', image: images.crops, text: 'Evaluating nutrient delivery and root-zone oxygenation for consistent, resource-efficient growth.' },
  { title: 'Water efficiency in vertical DWC', category: 'DWC', year: '2023', status: 'Active', image: images.greenhouse, text: 'Designing a closed-loop system that reduces water use while maintaining crop quality.' },
  { title: 'Precision aeroponics for herbs', category: 'Aeroponics', year: '2024', status: 'New', image: images.seedlings, text: 'Exploring fine-mist intervals, root health, and controlled environment parameters.' },
  { title: 'Circular nutrient recovery', category: 'Research', year: '2022', status: 'Completed', image: images.lab, text: 'Investigating safe, sustainable nutrient recovery pathways for protected agriculture.' },
]

const news = [
  { date: '12 Sep 2024', category: 'Announcement', title: 'Centre opens applications for the 2025 student research cohort', image: images.workshop },
  { date: '28 Aug 2024', category: 'Workshop', title: 'Hands-on controlled environment agriculture workshop announced', image: images.greenhouse },
  { date: '06 Jul 2024', category: 'Research', title: 'New trial begins to improve water efficiency in leafy greens', image: images.crops },
]

const gallery = [
  { category: 'Facility', title: 'Research greenhouse', image: images.hero },
  { category: 'Crops', title: 'Growing healthier greens', image: images.crops },
  { category: 'Facility', title: 'Controlled environment lab', image: images.lab },
  { category: 'Workshops', title: 'Learning in the field', image: images.workshop },
  { category: 'Crops', title: 'Seedling propagation', image: images.seedlings },
  { category: 'Workshops', title: 'Systems in action', image: images.greenhouse },
]

function Logo() { return <Link href="#top" className="logo" aria-label="Hydroponics Centre home"><span className="logo-mark"><Leaf size={21} fill="currentColor" /></span><span>HYDRO<span>PONICS</span></span></Link> }

function Header() {
  const [open, setOpen] = useState(false)
  const links = [['About', '#about'], ['Research', '#research'], ['Gallery', '#gallery'], ['Team', '#team'], ['News', '#news'], ['Contact', '#contact']]
  return <header className="site-header"><div className="container nav-wrap"><Logo /><nav className={open ? 'nav-links open' : 'nav-links'}>{links.map(([label, href]) => <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>)}<Link href="/login" className="login-link" onClick={() => setOpen(false)}>Login <MoveUpRight size={15} /></Link></nav><button className="menu-button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></header>
}

function SectionHead({ eyebrow, title, copy, link }: { eyebrow: string; title: string; copy?: string; link?: string }) { return <div className="section-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>{copy && <p className="section-copy">{copy}</p>}{link && <a className="text-link" href={link}>View all <ArrowRight size={16} /></a>}</div> }

function ResearchCard({ item }: { item: typeof research[number] }) { return <article className="research-card"><div className="card-image"><Image src={item.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" /><span className="status">{item.status}</span></div><div className="card-body"><div className="meta"><span>{item.category}</span><span>{item.year}</span></div><h3>{item.title}</h3><p>{item.text}</p><a href="#research-detail" className="text-link">View project <ArrowRight size={15} /></a></div></article> }

function ContactForm() {
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
      await emailjs.send(serviceId, templateId, {
        name,
        email,
        message,
        subject: 'New Contact Form Enquiry — Chrysalis Hydroponics Centre of Excellence',
        submitted_at: new Date().toISOString(),
        reply_to: email,
      }, { publicKey })
      setLastSentAt(Date.now())
      setStatus('success')
      form.reset()
    } catch {
      setError('We could not send your enquiry. Please try again or use the centre email directly.')
      setStatus('error')
    }
  }

  if (status === 'unavailable') return <div className="form-error" role="alert"><h3>Email delivery is not configured.</h3><p>Your message was not sent. Add the EmailJS variables to the environment and restart the development server.</p><button type="button" className="text-link" onClick={() => setStatus('idle')}>Try again <ArrowRight size={15} /></button></div>
  if (status === 'success') return <div className="form-success" role="status"><h3>Enquiry sent.</h3><p>Wait until our team will reach you</p><button type="button" className="text-link" onClick={() => setStatus('idle')}>Send another enquiry <ArrowRight size={15} /></button></div>
  return <form className="contact-form" onSubmit={handleSubmit} noValidate><label>Name<input name="name" required maxLength={120} placeholder="Your name" /></label><label>Email<input name="email" required type="email" maxLength={254} placeholder="you@example.com" /></label><label>Message<textarea name="message" required maxLength={4000} placeholder="How can we help?" rows={4} /></label>{status === 'error' && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send enquiry'} <ArrowRight size={17} /></button></form>
}

export default function Page() {
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [galleryFilter, setGalleryFilter] = useState('All')
  const [selectedImage, setSelectedImage] = useState<number | null>(null)
  const filteredResearch = useMemo(() => research.filter((item) => (filter === 'All' || item.category === filter) && item.title.toLowerCase().includes(query.toLowerCase())), [filter, query])
  const filteredGallery = gallery.filter((item) => galleryFilter === 'All' || item.category === galleryFilter)
  return <div id="top"><Header /><main>
    <section className="hero"><Image src={images.hero} alt="Sunlit hydroponic greenhouse rows" fill priority sizes="100vw" className="hero-bg" /><div className="hero-overlay" /><div className="container hero-content"><p className="eyebrow light">EDUCATION · RESEARCH · IMPACT</p><h1>Growing a more<br /><em>sustainable</em> future.</h1><p className="hero-copy">The Hydroponics Centre of Excellence advances sustainable agriculture through rigorous research, applied learning, and open innovation.</p><div className="hero-actions"><a className="button button-primary" href="#research">Explore our research <ArrowRight size={17} /></a><a className="button button-ghost" href="#about">Discover our centre</a></div></div><div className="hero-note"><span>01</span><span>Controlled environments<br />for a changing climate</span></div></section>
    <section className="intro section" id="about"><div className="container intro-grid"><div className="intro-image"><Image src={images.lab} alt="Researcher working in a controlled environment lab" fill sizes="(max-width: 760px) 100vw, 50vw" /><span className="image-caption">Research in action <ArrowRight size={15} /></span></div><div className="intro-content"><p className="eyebrow">ABOUT THE CENTRE</p><h2>Where science meets the soil-less.</h2><p>We are a research and learning centre focused on the future of food. Our work brings together plant science, engineering, data, and the people who will shape a more resilient agricultural system.</p><p className="muted">From nutrient film technique to aeroponics, we create space for practical experimentation and meaningful collaboration.</p><a className="button button-dark" href="#team">Meet our people <ArrowRight size={17} /></a></div></div></section>
    <section className="stats"><div className="container stats-grid"><div><strong>12<span>+</span></strong><p>Research projects</p></div><div><strong>06</strong><p>Hydroponic systems</p></div><div><strong>18<span>+</span></strong><p>Crops studied</p></div><div><strong>24<span>+</span></strong><p>Researchers & students</p></div></div></section>
    <section className="section research-section" id="research"><div className="container"><SectionHead eyebrow="FEATURED RESEARCH" title="Questions worth growing." copy="Exploring practical, scalable solutions for food systems that can thrive anywhere." link="#research" /><div className="research-grid">{research.slice(0, 3).map(item => <ResearchCard key={item.title} item={item} />)}</div><div className="systems"><div><p className="eyebrow">OUR APPROACH</p><h2>Three systems.<br /><em>One shared purpose.</em></h2></div><div className="system-list"><div><span className="icon-round"><Droplets /></span><div><h3>Nutrient Film Technique</h3><p>A thin, flowing film of nutrient solution keeps roots fed and oxygenated.</p></div></div><div><span className="icon-round"><Beaker /></span><div><h3>Deep Water Culture</h3><p>Plants thrive with roots suspended in a nutrient-rich, aerated reservoir.</p></div></div><div><span className="icon-round"><Sprout /></span><div><h3>Aeroponics</h3><p>Fine nutrient mist delivers precision care directly to the exposed root zone.</p></div></div></div></div></div></section>
    <section className="section gallery-section" id="gallery"><div className="container"><SectionHead eyebrow="FROM THE CENTRE" title="A closer look." copy="Step inside our facilities, field sessions, and everyday experiments." /><div className="filter-row">{['All', 'Facility', 'Crops', 'Workshops'].map(item => <button key={item} className={galleryFilter === item ? 'filter active' : 'filter'} onClick={() => setGalleryFilter(item)}>{item}</button>)}</div><div className="gallery-grid">{filteredGallery.map((item, i) => <button className="gallery-item" key={item.title} onClick={() => setSelectedImage(gallery.indexOf(item))}><Image src={item.image} alt={item.title} fill sizes="(max-width: 760px) 100vw, 33vw" /><span>{item.title} <ArrowRight size={15} /></span></button>)}</div></div></section>
    <section className="section news-section" id="news"><div className="container"><SectionHead eyebrow="LATEST FROM HYDROPONICS" title="Ideas in motion." link="#news" /><div className="news-grid">{news.map(item => <article className="news-card" key={item.title}><div className="news-image"><Image src={item.image} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" /></div><div className="news-body"><div className="meta"><span>{item.category}</span><span>{item.date}</span></div><h3>{item.title}</h3><a className="text-link" href="#contact">Read story <ArrowRight size={15} /></a></div></article>)}</div></div></section>
    <section className="section team-section" id="team"><div className="container team-banner"><div><p className="eyebrow light">PEOPLE & PARTNERS</p><h2>Good work is<br /><em>grown together.</em></h2><p>We are a community of researchers, students, growers, and partners united by curiosity and care.</p><a href="#contact" className="button button-light">Connect with us <ArrowRight size={17} /></a></div><div className="team-orbit"><div className="orbit-circle"></div><Image src={images.seedlings} alt="Young plants ready for research" fill sizes="40vw" /></div></div></section>
    <section className="section contact-section" id="contact"><div className="container contact-grid"><div><p className="eyebrow">START A CONVERSATION</p><h2>Let&apos;s grow<br /><em>something better.</em></h2><p className="muted">Have a research question, partnership idea, or student enquiry? We&apos;d love to hear from you.</p><div className="contact-detail"><Mail size={18} /><span>centre@example.edu<br /><small>Placeholder contact — to be verified</small></span></div></div><ContactForm /></div></section>
    <section className="login-strip" id="login"><div className="container login-inner"><div><p className="eyebrow light">CENTRE PORTAL</p><h2>Already part of the work?</h2></div><Link href="/login" className="button button-light">Sign in to your portal <MoveUpRight size={16} /></Link></div></section>
  </main><footer className="footer"><div className="container footer-grid"><div><Logo /><p>Advancing sustainable agriculture<br />through research and innovation.</p></div><div><p className="footer-label">Explore</p><a href="#about">About</a><a href="#research">Research</a><a href="#gallery">Gallery</a></div><div><p className="footer-label">Connect</p><a href="#contact">Contact</a><a href="#team">People & partners</a><a href="#login">Login</a></div><div><p className="footer-label">Stay curious</p><p className="muted">Updates and announcements<br />from the centre.</p><a className="text-link" href="#contact">Get in touch <ArrowRight size={15} /></a></div></div><div className="container footer-bottom"><span>© 2024 Hydroponics Centre of Excellence</span><span>Sample website · Institutional details to be confirmed</span></div></footer>
    {selectedImage !== null && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Gallery image viewer" onClick={() => setSelectedImage(null)}><button className="lightbox-close" aria-label="Close gallery" onClick={() => setSelectedImage(null)}><X /></button><button className="lightbox-prev" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); setSelectedImage((selectedImage - 1 + gallery.length) % gallery.length) }}><ChevronLeft /></button><Image src={gallery[selectedImage].image} alt={gallery[selectedImage].title} width={1300} height={900} onClick={(e) => e.stopPropagation()} /><button className="lightbox-next" aria-label="Next image" onClick={(e) => { e.stopPropagation(); setSelectedImage((selectedImage + 1) % gallery.length) }}><ChevronRight /></button></div>}
  </div>
}
