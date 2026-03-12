/** @type {import('tailwindcss').Config} */
export default {
  presets: [require('../../packages/ui-system/tailwind.config')],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
}
