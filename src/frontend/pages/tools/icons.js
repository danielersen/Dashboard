// Load icons for tools page
async function loadToolsIcons() {
  const iconElements = document.querySelectorAll('.tools-icon[data-icon]');
  
  for (const element of iconElements) {
    const iconUrl = element.dataset.icon;
    if (!iconUrl) continue;
    
    try {
      const response = await fetch(iconUrl);
      const svgContent = await response.text();
      element.innerHTML = svgContent;
    } catch (error) {
      console.error('Error loading icon:', iconUrl, error);
    }
  }
}

// Load icons when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadToolsIcons);
} else {
  loadToolsIcons();
}
