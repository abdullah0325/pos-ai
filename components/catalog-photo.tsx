'use client'

import type { ImgHTMLAttributes } from 'react'

type CatalogItem = { name?: string; category?: string; imageUrl?: string }

// Presentation-only category photos. Never written into product or inventory records.
export function getCatalogPhoto(item?: CatalogItem): string {
  return '/images/hardware-catalog.svg'
}

export default function CatalogPhoto({ item, src, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { item?: CatalogItem; src?: string }) {
  const fallback = getCatalogPhoto(item)
  const uploaded = src || item?.imageUrl
  return (
    <img
      {...props}
      src={uploaded || fallback}
      alt={props.alt || item?.name || 'Catalog item'}
      title={uploaded ? props.title : 'Representative category photo'}
      loading={props.loading || 'lazy'}
      decoding="async"
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(fallback)) {
          event.currentTarget.src = fallback
          event.currentTarget.title = 'Representative category photo'
        }
      }}
    />
  )
}
