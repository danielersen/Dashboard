// Load icons via fetch and inject as data URLs
const iconPaths = {
  home: '/assets/icons/home.svg',
  notes: '/assets/icons/notes.svg',
  calendar: '/assets/icons/calendar.svg',
  homework: '/assets/icons/homework.svg',
  clock: '/assets/icons/clock.svg',
  arrowLeft: '/assets/icons/arrow-left.svg',
  arrowRight: '/assets/icons/arrow-right.svg',
  dots: '/assets/icons/dots.svg',
};

// Function to convert SVG string to data URL
function svgToDataUrl(svg) {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml,${encoded}`;
}

// Load icons and replace img src
async function loadIcons() {
  const iconImages = document.querySelectorAll('.ws-nav img');
  
  for (const img of iconImages) {
    const src = img.getAttribute('src');
    const iconName = src.split('/').pop().replace('.svg', '');
    const iconPath = iconPaths[iconName];
    
    if (iconPath) {
      try {
        const response = await fetch(iconPath);
        const svgContent = await response.text();
        img.src = svgToDataUrl(svgContent);
      } catch (error) {
        console.error(`Failed to load icon ${iconName}:`, error);
      }
    }
  }
}

// Load icons when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadIcons);
} else {
  loadIcons();
}
