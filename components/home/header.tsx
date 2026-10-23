'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Leaf, Menu, MoveUpRight, X } from 'lucide-react'

export function Logo() {
  return (
    <Link href="#top" className="logo" aria-label="Hydroponics Centre home">
      <span className="logo-mark">
        <Leaf size={21} fill="currentColor" />
      </span>
      <span>
        HYDRO<span>PONICS</span>
      </span>
    </Link>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  const links = [
    ['About', '#about'],
    ['Research', '#research'],
    ['Gallery', '#gallery'],
    ['Team', '#team'],
    ['News', '#news'],
    ['Contact', '#contact'],
  ]
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Logo />
        <nav className={open ? 'nav-links open' : 'nav-links'}>
          {links.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <Link href="/login" className="login-link" onClick={() => setOpen(false)}>
            Login <MoveUpRight size={15} />
          </Link>
        </nav>
        <button
          className="menu-button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  )
}
