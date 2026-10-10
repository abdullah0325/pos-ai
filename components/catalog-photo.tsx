'use client'

import type { ImgHTMLAttributes } from 'react'

type CatalogItem = { name?: string; category?: string; imageUrl?: string }

// Presentation-only category photos. Never written into product or inventory records.
export function getCatalogPhoto(item?: CatalogItem): string {
  const name = (item?.name || '').toLowerCase()
  const category = (item?.category || '').toLowerCase()
  let photo = 'packaging'
  if (/packaging/.test(category)) photo = 'packaging'
  else if (/chemical|mineral.*premix|citric|sanitiz/.test(`${category} ${name}`)) photo = 'chemicals'
  else if (/oil/.test(name)) photo = 'oil'
  else if (/sugar/.test(name)) photo = 'sugar'
  else if (/mango/.test(name)) photo = 'mango'
  else if (/apple/.test(name)) photo = 'apple'
  else if (/guava/.test(name)) photo = 'guava'
  else if (/spice|masala|seasoning|flavor/.test(`${name} ${category}`)) photo = 'spices'
  else if (/ingredients/.test(category) && /potato/.test(name)) photo = 'potatoes'
  else if (/water/.test(`${name} ${category}`)) photo = 'water'
  else if (/juice|nectar|beverage|soda/.test(`${name} ${category}`)) photo = 'juice'
  else if (/candy|toffee|sweet/.test(`${name} ${category}`)) photo = 'candy'
  else if (/chip|crisp/.test(`${name} ${category}`)) photo = 'chips'
  else if (/snack|savory|savories|nimko/.test(`${name} ${category}`)) photo = 'snacks'
  return `/images/catalog/${photo}.jpg`
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
