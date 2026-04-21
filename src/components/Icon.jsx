import React from 'react';

const ICON_MAP = {
  search: '/images/icons/search.jpg',
  filter: '/images/icons/filter.jpg',
  price: '/images/icons/price.jpg',
  category: '/images/icons/category.jpg',
  condition: '/images/icons/condition.jpg',
  target: '/images/icons/target.jpg',
  location: '/images/icons/location.png',
  'empty-box': '/images/icons/empty-box.jpg',
  user: '/images/icons/user.jpg',
  success: '/images/icons/success.png',
  error: '/images/icons/error.jpg',
  edit: '/images/icons/edit.jpg',
  settings: '/images/icons/settings.jpg',
  star: '/images/icons/star.jpg',
  graduation: '/images/icons/graduation.jpg',
  coin: '/images/icons/coin.jpg',
  list: '/images/icons/list.jpg',
  view: '/images/icons/view.jpg',
  calendar: '/images/icons/calendar.jpg',
  delete: '/images/icons/delete.jpg',
  warning: '/images/icons/warning.jpg',
  document: '/images/icons/document.jpg',
  lock: '/images/icons/lock.jpg',
  camera: '/images/icons/camera.jpg',
};

const ICON_SCALE = 2.7;
const ICON_STROKE_FILTER = 'brightness(1.18) contrast(1.04) saturate(1.03)';

const Icon = ({ name, size = 24, className = '', alt = '' }) => {
  const src = ICON_MAP[name];
  const scaledSize = Math.round(size * ICON_SCALE);

  if (!src) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <img
      src={src}
      alt={alt || name}
      width={scaledSize}
      height={scaledSize}
      className={`icon ${className}`}
      style={{
        width: `${scaledSize}px`,
        height: `${scaledSize}px`,
        objectFit: 'contain',
        filter: ICON_STROKE_FILTER,
        backgroundColor: name === 'location' ? 'transparent' : '#fff',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
};

export default Icon;
