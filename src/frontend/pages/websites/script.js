// ===================== WEBSITES PAGE JAVASCRIPT =====================

import { ensureSessionToken } from "/lib/auth.js";

let websites = [];
let editingWebsite = null;
let deletingWebsite = null;

// ===================== API FUNCTIONS =====================

async function getAuthToken() {
  const token = await ensureSessionToken();
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
}

async function fetchWebsites() {
  console.log('fetchWebsites called');
  try {
    const token = await getAuthToken();
    console.log('Token obtained:', token ? 'yes' : 'no');
    const response = await fetch('/api/websites/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    if (!response.ok) {
      throw new Error('Failed to fetch websites');
    }

    const data = await response.json();
    console.log('Response data:', data);
    return data.resp.websites || [];
  } catch (error) {
    console.error('Error fetching websites:', error);
    return [];
  }
}

async function addWebsite(name, url) {
  try {
    const token = await getAuthToken();
    const response = await fetch('/api/websites/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, url })
    });

    if (!response.ok) {
      throw new Error('Failed to add website');
    }

    const data = await response.json();
    return data.resp.websites || [];
  } catch (error) {
    console.error('Error adding website:', error);
    throw error;
  }
}

async function updateWebsite(oldName, newName, newUrl) {
  try {
    const token = await getAuthToken();
    const response = await fetch('/api/websites/update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ oldName, newName, newUrl })
    });

    if (!response.ok) {
      throw new Error('Failed to update website');
    }

    const data = await response.json();
    return data.resp.websites || [];
  } catch (error) {
    console.error('Error updating website:', error);
    throw error;
  }
}

async function deleteWebsite(name) {
  try {
    const token = await getAuthToken();
    const response = await fetch(`/api/websites/delete/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete website');
    }

    const data = await response.json();
    return data.resp.websites || [];
  } catch (error) {
    console.error('Error deleting website:', error);
    throw error;
  }
}

// ===================== LOGO FETCHING =====================

async function getWebsiteLogo(url) {
  try {
    const domain = new URL(url).hostname;
    
    // Try to get favicon from common paths
    const faviconPaths = [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      `https://${domain}/favicon.ico`,
      `https://${domain}/favicon.png`,
      `https://${domain}/apple-touch-icon.png`
    ];

    for (const faviconUrl of faviconPaths) {
      try {
        const response = await fetch(faviconUrl, { method: 'HEAD' });
        if (response.ok) {
          return faviconUrl;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching logo:', error);
    return null;
  }
}

function getFallbackLogo(name) {
  // Get first letter of name for fallback
  return name ? name.charAt(0).toUpperCase() : '?';
}

// ===================== RENDER FUNCTIONS =====================

function renderWebsites() {
  console.log('renderWebsites called, websites:', websites);
  const grid = document.getElementById('websites-grid');
  
  if (!grid) {
    console.error('websites-grid element not found');
    return;
  }
  
  if (websites.length === 0) {
    console.log('No websites to display, showing empty state');
    grid.classList.add('empty');
    grid.innerHTML = '<div class="empty-state">No websites yet. Click the + button to add your first website.</div>';
    return;
  }

  console.log('Rendering', websites.length, 'websites');
  grid.classList.remove('empty');
  grid.innerHTML = '';

  websites.forEach(website => {
    console.log('Creating block for:', website);
    const block = createWebsiteBlock(website);
    grid.appendChild(block);
  });
  
  console.log('All blocks added to grid');
}

function createWebsiteBlock(website) {
  const block = document.createElement('div');
  block.className = 'website-block';
  block.dataset.name = website.name;

  const content = document.createElement('div');
  content.className = 'website-content';

  // Logo container
  const logoContainer = document.createElement('div');
  logoContainer.className = 'website-logo';
  
  const logoImg = document.createElement('img');
  logoImg.alt = website.name;
  logoImg.onerror = function() {
    this.style.display = 'none';
    logoContainer.classList.add('fallback');
    logoContainer.textContent = getFallbackLogo(website.name);
  };
  
  // Try to load logo
  getWebsiteLogo(website.url).then(logoUrl => {
    if (logoUrl) {
      logoImg.src = logoUrl;
    } else {
      logoImg.style.display = 'none';
      logoContainer.classList.add('fallback');
      logoContainer.textContent = getFallbackLogo(website.name);
    }
  });

  logoContainer.appendChild(logoImg);

  // Website info
  const info = document.createElement('div');
  info.className = 'website-info';

  const name = document.createElement('h3');
  name.className = 'website-name';
  name.textContent = website.name;

  info.appendChild(name);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'website-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'website-action-btn edit';
  editBtn.type = 'button';
  editBtn.ariaLabel = 'Edit website';
  editBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditModal(website);
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'website-action-btn delete';
  deleteBtn.type = 'button';
  deleteBtn.ariaLabel = 'Delete website';
  deleteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDeleteModal(website);
  });

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  content.appendChild(logoContainer);
  content.appendChild(info);
  content.appendChild(actions);

  block.appendChild(content);

  // Click to open URL
  block.addEventListener('click', () => {
    window.open(website.url, '_blank');
  });

  return block;
}

// ===================== MODAL FUNCTIONS =====================

const websiteModal = document.getElementById('website-modal');
const deleteModal = document.getElementById('delete-modal');
const websiteForm = document.getElementById('website-form');
const modalTitle = document.getElementById('modal-title');
const nameInput = document.getElementById('website-name');
const urlInput = document.getElementById('website-url');

function openAddModal() {
  editingWebsite = null;
  modalTitle.textContent = 'Add Website';
  nameInput.value = '';
  urlInput.value = '';
  websiteModal.setAttribute('aria-hidden', 'false');
  nameInput.focus();
}

function openEditModal(website) {
  console.log('Opening edit modal for website:', website);
  editingWebsite = website;
  modalTitle.textContent = 'Edit Website';
  nameInput.value = website.name;
  urlInput.value = website.url;
  websiteModal.setAttribute('aria-hidden', 'false');
  nameInput.focus();
}

function closeWebsiteModal() {
  websiteModal.setAttribute('aria-hidden', 'true');
  editingWebsite = null;
  websiteForm.reset();
}

function openDeleteModal(website) {
  console.log('Opening delete modal for website:', website);
  deletingWebsite = website;
  deleteModal.setAttribute('aria-hidden', 'false');
}

function closeDeleteModal() {
  deleteModal.setAttribute('aria-hidden', 'true');
  deletingWebsite = null;
}

// ===================== EVENT LISTENERS =====================

document.getElementById('add-website-btn').addEventListener('click', openAddModal);

document.getElementById('cancel-btn').addEventListener('click', closeWebsiteModal);

document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  console.log('Delete button clicked, deletingWebsite:', deletingWebsite);
  if (deletingWebsite) {
    try {
      console.log('Deleting website with name:', deletingWebsite.name);
      websites = await deleteWebsite(deletingWebsite.name);
      renderWebsites();
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting website:', error);
      alert('Failed to delete website. Please try again.');
    }
  } else {
    console.error('No deletingWebsite set');
  }
});

websiteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();

  console.log('Form submitted:', { name, url, editingWebsite });

  if (!name || !url) {
    alert('Please fill in all fields');
    return;
  }

  try {
    if (editingWebsite) {
      console.log('Updating existing website with old name:', editingWebsite.name, 'new name:', name);
      // Update existing website
      websites = await updateWebsite(editingWebsite.name, name, url);
    } else {
      console.log('Adding new website');
      // Add new website
      websites = await addWebsite(name, url);
    }
    
    renderWebsites();
    closeWebsiteModal();
  } catch (error) {
    console.error('Error saving website:', error);
    alert('Failed to save website. Please try again.');
  }
});

// Close modals on backdrop click
websiteModal.querySelector('.modal-backdrop').addEventListener('click', closeWebsiteModal);
deleteModal.querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeWebsiteModal();
    closeDeleteModal();
  }
});

// ===================== INITIALIZATION =====================

async function init() {
  console.log('Websites page initializing...');
  console.log('DOM ready, elements:', {
    grid: document.getElementById('websites-grid'),
    addBtn: document.getElementById('add-website-btn'),
    modal: document.getElementById('website-modal')
  });
  
  try {
    websites = await fetchWebsites();
    console.log('Websites fetched:', websites);
    renderWebsites();
    console.log('Websites rendered');
  } catch (error) {
    console.error('Error initializing websites page:', error);
    // Show error message to user
    const grid = document.getElementById('websites-grid');
    if (grid) {
      grid.innerHTML = '<p style="color: var(--text); padding: 20px;">Error loading websites. Please try again.</p>';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}