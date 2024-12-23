/** @type {import('tailwindcss').Config} */
export default {
  // What tailwind should scan to generate the css
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Customize the theme
  theme: {
    extend: {},
  },
  // Plugins to extend functionality
  plugins: [],
}