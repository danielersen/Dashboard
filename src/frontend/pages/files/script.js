// ===================== FILES PAGE JAVASCRIPT =====================

import { ensureSessionToken } from "/lib/auth.js";

let currentPath = "";
let files = [];
let folders = [];
let deletingItem = null;
let selectedFile = null;

// ===================== API FUNCTIONS =====================

async function getAuthToken() {
  const token = await ensureSessionToken();
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
}

async function fetchFiles(path = "") {
  try {
    const token = await getAuthToken();
    const encodedPath = encodeURIComponent(path);
    const response = await fetch(`/api/files/list/${encodedPath}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch files');
    }

    const data = await response.json();
    return data.resp || { files: [], folders: [], path };
  } catch (error) {
    console.error('Error fetching files:', error);
    throw error;
  }
}

async function uploadFile(relativePath, content) {
  try {
    const token = await getAuthToken();
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ relativePath, content })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload file');
    }

    const data = await response.json();
    return data.resp;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

async function createFolder(relativePath) {
  try {
    const token = await getAuthToken();
    const response = await fetch('/api/files/folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ relativePath })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create folder');
    }

    const data = await response.json();
    return data.resp;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

async function deleteFile(relativePath) {
  try {
    const token = await getAuthToken();
    const encodedPath = encodeURIComponent(relativePath);
    const response = await fetch(`/api/files/delete/${encodedPath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete item');
    }

    const data = await response.json();
    return data.resp;
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
}

// ===================== UTILITY FUNCTIONS =====================

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getFolderIcon() {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
}

function getFileIcon(extension) {
  // Generic file icon
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
}

// ===================== RENDER FUNCTIONS =====================

function renderFiles() {
  const filesList = document.getElementById('files-list');
  if (!filesList) return;

  if (folders.length === 0 && files.length === 0) {
    filesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <p class="empty-state-text">This folder is empty</p>
        <p class="empty-state-subtext">Upload files or create a folder to get started</p>
      </div>
    `;
    return;
  }

  filesList.innerHTML = '';

  // Render folders first
  folders.forEach(folder => {
    const block = createFolderBlock(folder);
    filesList.appendChild(block);
  });

  // Render files
  files.forEach(file => {
    const block = createFileBlock(file);
    filesList.appendChild(block);
  });
}

function createFolderBlock(folder) {
  const block = document.createElement('div');
  block.className = 'file-block folder';
  block.dataset.path = folder.path;

  const icon = document.createElement('div');
  icon.className = 'file-icon folder-icon';
  icon.innerHTML = getFolderIcon();

  const info = document.createElement('div');
  info.className = 'file-info';

  const name = document.createElement('h3');
  name.className = 'file-name';
  name.textContent = folder.name;

  const meta = document.createElement('div');
  meta.className = 'file-meta';
  meta.innerHTML = `
    <span class="file-date">${folder.modified || 'No date'}</span>
  `;

  info.appendChild(name);
  info.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'file-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'file-action-btn delete';
  deleteBtn.type = 'button';
  deleteBtn.ariaLabel = 'Delete folder';
  deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDeleteModal(folder, true);
  });

  actions.appendChild(deleteBtn);

  block.appendChild(icon);
  block.appendChild(info);
  block.appendChild(actions);

  // Click to navigate into folder
  block.addEventListener('click', () => {
    navigateTo(folder.path);
  });

  return block;
}

function createFileBlock(file) {
  const block = document.createElement('div');
  block.className = 'file-block';
  block.dataset.path = file.path;

  const icon = document.createElement('div');
  icon.className = 'file-icon file-icon';
  icon.innerHTML = getFileIcon(file.extension);

  const info = document.createElement('div');
  info.className = 'file-info';

  const name = document.createElement('h3');
  name.className = 'file-name';
  name.textContent = file.name;

  const meta = document.createElement('div');
  meta.className = 'file-meta';
  meta.innerHTML = `
    <span class="file-extension">${file.extension || 'FILE'}</span>
    <span class="file-size">${formatFileSize(file.size)}</span>
    <span class="file-date">${file.modified || 'No date'}</span>
  `;

  info.appendChild(name);
  info.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'file-actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'file-action-btn delete';
  deleteBtn.type = 'button';
  deleteBtn.ariaLabel = 'Delete file';
  deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDeleteModal(file, false);
  });

  actions.appendChild(deleteBtn);

  block.appendChild(icon);
  block.appendChild(info);
  block.appendChild(actions);

  // Click to select file
  block.addEventListener('click', () => {
    selectFile(file, block);
  });

  return block;
}

// ===================== NAVIGATION =====================

async function navigateTo(path) {
  currentPath = path;
  selectedFile = null;
  updateUploadButton();
  try {
    const data = await fetchFiles(currentPath);
    folders = data.folders || [];
    files = data.files || [];
    renderFiles();
  } catch (error) {
    console.error('Error navigating to path:', error);
    alert(`Failed to load folder: ${error.message}`);
  }
}

function selectFile(file, block) {
  // Remove previous selection
  document.querySelectorAll('.file-block.selected').forEach(b => {
    b.classList.remove('selected');
    b.style.borderColor = '';
  });

  // Select new file
  selectedFile = file;
  block.classList.add('selected');
  block.style.borderColor = 'var(--accent)';
  
  updateUploadButton();
}

function updateUploadButton() {
  const uploadBtn = document.getElementById('upload-btn');
  if (uploadBtn) {
    uploadBtn.style.display = selectedFile ? 'grid' : 'none';
  }
}

async function openFile(file) {
  // For now, we'll just alert the user since we don't have a way to preview files
  // In a real implementation, you might want to:
  // 1. Download the file content
  // 2. Create a Blob URL
  // 3. Open it in a new tab or use a file preview library
  alert(`Opening file: ${file.name}\n\nFile preview functionality would be implemented here.\n\nThe file would be opened using the device's default preview for ${file.extension} files.`);
}

// ===================== MODAL FUNCTIONS =====================

const uploadModal = document.getElementById('upload-modal');
const folderModal = document.getElementById('folder-modal');
const deleteModal = document.getElementById('delete-modal');
const uploadForm = document.getElementById('upload-form');
const folderForm = document.getElementById('folder-form');
const fileInput = document.getElementById('file-input');
const folderNameInput = document.getElementById('folder-name');

function openUploadModal() {
  fileInput.value = '';
  uploadModal.setAttribute('aria-hidden', 'false');
  fileInput.focus();
}

function closeUploadModal() {
  uploadModal.setAttribute('aria-hidden', 'true');
  uploadForm.reset();
}

function openFolderModal() {
  folderNameInput.value = '';
  folderModal.setAttribute('aria-hidden', 'false');
  folderNameInput.focus();
}

function closeFolderModal() {
  folderModal.setAttribute('aria-hidden', 'true');
  folderForm.reset();
}

function openDeleteModal(item, isFolder) {
  deletingItem = { ...item, isFolder };
  deleteModal.setAttribute('aria-hidden', 'false');
}

function closeDeleteModal() {
  deleteModal.setAttribute('aria-hidden', 'true');
  deletingItem = null;
}

// ===================== EVENT LISTENERS =====================

document.getElementById('upload-btn').addEventListener('click', openUploadModal);
document.getElementById('create-folder-btn').addEventListener('click', openFolderModal);

document.getElementById('cancel-upload-btn').addEventListener('click', closeUploadModal);
document.getElementById('cancel-folder-btn').addEventListener('click', closeFolderModal);
document.getElementById('cancel-delete-btn').addEventListener('click', closeDeleteModal);

document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (deletingItem) {
    const btn = document.getElementById('confirm-delete-btn');
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    
    try {
      await deleteFile(deletingItem.path);
      await navigateTo(currentPath);
      closeDeleteModal();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(`Failed to delete item: ${error.message}`);
    } finally {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  }
});

uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a file');
    return;
  }

  const submitBtn = uploadForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.5';
  submitBtn.style.cursor = 'not-allowed';

  try {
    // Read file as text (for text files) or base64 (for binary files)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      const relativePath = currentPath ? `${currentPath}/${file.name}` : file.name;
      
      try {
        await uploadFile(relativePath, content);
        await navigateTo(currentPath);
        closeUploadModal();
      } catch (error) {
        console.error('Error uploading file:', error);
        alert(`Failed to upload file: ${error.message}`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    };
    
    reader.onerror = () => {
      alert('Error reading file');
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    };

    // Read as data URL (base64) to handle all file types
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('Error processing file:', error);
    alert(`Failed to process file: ${error.message}`);
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
  }
});

folderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = folderNameInput.value.trim();
  if (!name) {
    alert('Please enter a folder name');
    return;
  }

  const submitBtn = folderForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.5';
  submitBtn.style.cursor = 'not-allowed';

  try {
    const relativePath = currentPath ? `${currentPath}/${name}` : name;
    await createFolder(relativePath);
    await navigateTo(currentPath);
    closeFolderModal();
  } catch (error) {
    console.error('Error creating folder:', error);
    alert(`Failed to create folder: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
  }
});

// Close modals on backdrop click
uploadModal.querySelector('.modal-backdrop').addEventListener('click', closeUploadModal);
folderModal.querySelector('.modal-backdrop').addEventListener('click', closeFolderModal);
deleteModal.querySelector('.modal-backdrop').addEventListener('click', closeDeleteModal);

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeUploadModal();
    closeFolderModal();
    closeDeleteModal();
  }
});

// ===================== INITIALIZATION =====================

async function init() {
  try {
    await navigateTo("");
  } catch (error) {
    console.error('Error initializing files page:', error);
    const filesList = document.getElementById('files-list');
    if (filesList) {
      filesList.innerHTML = `<p style="color: var(--text); padding: 20px;">Error loading files: ${error.message}. Please try again.</p>`;
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
