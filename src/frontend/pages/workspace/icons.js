// Load icons via fetch and inject as inline SVG
async function loadIcons() {
  const iconElements = document.querySelectorAll('[data-icon]');
  
  for (const element of iconElements) {
    const iconUrl = element.dataset.icon;
    if (!iconUrl) continue;
    
    try {
      const response = await fetch(iconUrl);
      const svgContent = await response.text();
      element.innerHTML = svgContent;
    } catch (error) {
      console.error(`Failed to load icon ${iconUrl}:`, error);
    }
  }
}

// Load icons when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadIcons);
} else {
  loadIcons();
}
