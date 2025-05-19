import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss, // This loads Tailwind CSS as a PostCSS plugin
    autoprefixer, // This adds vendor prefixes to CSS propertie
  ],
};
