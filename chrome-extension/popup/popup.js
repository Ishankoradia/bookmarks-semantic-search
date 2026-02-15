// Popup Script for Semantic Bookmarks Extension

// Config loaded from config.js via popup.html
const API_URL = CONFIG.API_URL;
const APP_URL = CONFIG.APP_URL;

// DOM Elements
const views = {
  login: document.getElementById('login-view'),
  loading: document.getElementById('loading-view'),
  preview: document.getElementById('preview-view'),
  success: document.getElementById('success-view'),
  error: document.getElementById('error-view'),
};

const elements = {
  loginBtn: document.getElementById('login-btn'),
  loadingText: document.getElementById('loading-text'),
  scrapeWarning: document.getElementById('scrape-warning'),
  titleInput: document.getElementById('title-input'),
  descriptionText: document.getElementById('description-text'),
  categoryInput: document.getElementById('category-input'),
  tagsContainer: document.getElementById('tags-container'),
  saveBtn: document.getElementById('save-btn'),
  cancelBtn: document.getElementById('cancel-btn'),
  successTitle: document.getElementById('success-title'),
  openAppBtn: document.getElementById('open-app-btn'),
  closeBtn: document.getElementById('close-btn'),
  errorMessage: document.getElementById('error-message'),
  retryBtn: document.getElementById('retry-btn'),
  userMenu: document.getElementById('user-menu'),
  userAvatar: document.getElementById('user-avatar'),
  userName: document.getElementById('user-name'),
  logoutBtn: document.getElementById('logout-btn'),
};

// State
let currentPreview = null;
let currentUrl = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab?.url;

  // Check if logged in
  const token = await getAuthToken();
  const user = await getUser();

  if (token && user) {
    showUserMenu(user);
    await startPreview();
  } else {
    showView('login');
  }

  // Event listeners
  elements.loginBtn.addEventListener('click', handleLogin);
  elements.saveBtn.addEventListener('click', handleSave);
  elements.cancelBtn.addEventListener('click', () => window.close());
  elements.openAppBtn.addEventListener('click', handleOpenApp);
  elements.closeBtn.addEventListener('click', () => window.close());
  elements.retryBtn.addEventListener('click', () => startPreview());
  elements.logoutBtn.addEventListener('click', handleLogout);
}

// View Management
function showView(viewName) {
  Object.keys(views).forEach(key => {
    views[key].classList.toggle('hidden', key !== viewName);
  });
}

function setLoadingText(text) {
  elements.loadingText.textContent = text;
}

function showUserMenu(user) {
  elements.userMenu.classList.remove('hidden');
  elements.userAvatar.src = user.picture || '';
  elements.userName.textContent = user.name || user.email;
}

// Auth Functions
async function getAuthToken() {
  const result = await chrome.storage.local.get(['authToken']);
  return result.authToken;
}

async function setAuthToken(token) {
  await chrome.storage.local.set({ authToken: token });
}

async function getUser() {
  const result = await chrome.storage.local.get(['user']);
  return result.user;
}

async function setUser(user) {
  await chrome.storage.local.set({ user });
}

async function handleLogin() {
  showView('loading');
  setLoadingText('Signing in with Google...');

  // Send login to background script (it stays alive even if popup closes)
  chrome.runtime.sendMessage({ action: 'login' }, async (result) => {
    if (result?.success) {
      // Login successful - refresh the popup state
      showUserMenu(result.user);

      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentUrl = tab?.url;

      await startPreview();
    } else {
      showError(result?.error || 'Failed to sign in');
    }
  });
}

async function handleLogout() {
  await chrome.runtime.sendMessage({ action: 'clearAuthToken' });
  await chrome.storage.local.remove(['user']);
  elements.userMenu.classList.add('hidden');
  showView('login');
}

// Preview Functions
async function startPreview() {
  if (!currentUrl) {
    showError('No URL to bookmark');
    return;
  }

  // Skip chrome:// and extension pages
  if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
    showError('Cannot bookmark this page');
    return;
  }

  showView('loading');
  setLoadingText('Analyzing page...');

  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/bookmarks/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ url: currentUrl }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to preview bookmark');
    }

    currentPreview = await response.json();
    displayPreview(currentPreview);
  } catch (error) {
    console.error('Preview error:', error);
    showError(error.message || 'Failed to analyze page');
  }
}

function displayPreview(preview) {
  // Show scrape warning if needed
  if (preview.scrape_failed) {
    elements.scrapeWarning.classList.remove('hidden');
    elements.titleInput.required = true;
  } else {
    elements.scrapeWarning.classList.add('hidden');
    elements.titleInput.required = false;
  }

  // Fill in fields
  elements.titleInput.value = preview.title || '';
  elements.descriptionText.textContent = preview.description || '-';
  elements.categoryInput.value = preview.suggested_category || '';

  // Display tags
  elements.tagsContainer.innerHTML = '';
  if (preview.tags && preview.tags.length > 0) {
    preview.tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = tag;
      elements.tagsContainer.appendChild(tagEl);
    });
  } else {
    elements.tagsContainer.innerHTML = '<span style="color: #9ca3af; font-size: 12px;">No tags generated</span>';
  }

  showView('preview');
}

// Save Functions
async function handleSave() {
  if (!currentPreview) return;

  const title = elements.titleInput.value.trim();
  const category = elements.categoryInput.value.trim();

  // Validate required fields
  if (currentPreview.scrape_failed && !title) {
    elements.titleInput.focus();
    return;
  }

  elements.saveBtn.disabled = true;
  elements.saveBtn.textContent = 'Saving...';

  try {
    const token = await getAuthToken();
    const saveData = {
      id: currentPreview.id,
      category: category || currentPreview.suggested_category,
    };

    // Include title if scrape failed or title was changed
    if (currentPreview.scrape_failed || title !== currentPreview.title) {
      saveData.title = title;
    }

    const response = await fetch(`${API_URL}/bookmarks/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(saveData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save bookmark');
    }

    const bookmark = await response.json();
    showSuccess(bookmark.title);
  } catch (error) {
    console.error('Save error:', error);
    showError(error.message || 'Failed to save bookmark');
  } finally {
    elements.saveBtn.disabled = false;
    elements.saveBtn.textContent = 'Save Bookmark';
  }
}

function showSuccess(title) {
  elements.successTitle.textContent = title;
  showView('success');
}

function showError(message) {
  elements.errorMessage.textContent = message;
  showView('error');
}

function handleOpenApp() {
  chrome.tabs.create({ url: CONFIG.APP_URL });
  window.close();
}
