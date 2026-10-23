'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react'

export type GalleryItem = {
  category: string
  title: string
  image: string
  largeImage?: string
}

export function GallerySection({ items }: { items: GalleryItem[] }) {
  const [galleryFilter, setGalleryFilter] = useState('All')
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  const filteredGallery = items.filter(
    (item) => galleryFilter === 'All' || item.category === galleryFilter
  )

  return (
    <section className="section gallery-section" id="gallery">
      <div className="container">
        <div className="section-head">
          <div>
            <p className="eyebrow">FROM THE CENTRE</p>
            <h2>A closer look.</h2>
          </div>
          <p className="section-copy">
            Step inside our facilities, field sessions, and everyday experiments.
          </p>
        </div>
        <div className="filter-row">
          {['All', 'Facility', 'Crops', 'Workshops'].map((cat) => (
            <button
              key={cat}
              className={galleryFilter === cat ? 'filter active' : 'filter'}
              onClick={() => setGalleryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="gallery-grid">
          {filteredGallery.map((item) => (
            <button
              className="gallery-item"
              key={item.title}
              onClick={() => setSelectedImage(items.indexOf(item))}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 760px) 100vw, 33vw"
              />
              <span>
                {item.title} <ArrowRight size={15} />
              </span>
            </button>
          ))}
        </div>
      </div>
      {selectedImage !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image viewer"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="lightbox-close"
            aria-label="Close gallery"
            onClick={() => setSelectedImage(null)}
          >
            <X />
          </button>
          <button
            className="lightbox-prev"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedImage((selectedImage - 1 + items.length) % items.length)
            }}
          >
            <ChevronLeft />
          </button>
          <Image
            src={items[selectedImage].largeImage || items[selectedImage].image}
            alt={items[selectedImage].title}
            width={1300}
            height={900}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="lightbox-next"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedImage((selectedImage + 1) % items.length)
            }}
          >
            <ChevronRight />
          </button>
        </div>
      )}
    </section>
  )
}
