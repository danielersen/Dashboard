// Load icons for files page
async function loadFilesIcons() {
  const iconElements = document.querySelectorAll('.files-icon[data-icon]');
  
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
  document.addEventListener('DOMContentLoaded', loadFilesIcons);
} else {
  loadFilesIcons();
}
