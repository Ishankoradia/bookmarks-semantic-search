// Background Service Worker for Semantic Bookmarks Extension

// Import config
importScripts('config.js');
const API_URL = CONFIG.API_URL;
const APP_URL = CONFIG.APP_URL;

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  // Context menu for pages
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save page to Semantic Bookmarks',
    contexts: ['page'],
  });

  // Context menu for links
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save link to Semantic Bookmarks',
    contexts: ['link'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const url = info.menuItemId === 'save-link' ? info.linkUrl : tab.url;

  try {
    const result = await quickSaveBookmark(url);
    if (result.success) {
      showNotification('Bookmark Saved', `"${result.title}" has been saved!`);
    } else {
      showNotification('Save Failed', result.error || 'Could not save bookmark');
    }
  } catch (error) {
    showNotification('Error', error.message);
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-bookmark') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      try {
        const result = await quickSaveBookmark(tab.url);
        if (result.success) {
          showNotification('Bookmark Saved', `"${result.title}" has been saved!`);
        } else {
          showNotification('Save Failed', result.error || 'Could not save bookmark');
        }
      } catch (error) {
        showNotification('Error', error.message);
      }
    }
  }
});

// Quick save bookmark (preview + save with defaults)
async function quickSaveBookmark(url) {
  const token = await getAuthToken();
  if (!token) {
    return { success: false, error: 'Please sign in first' };
  }

  try {
    // Preview the bookmark
    const previewResponse = await fetch(`${API_URL}/bookmarks/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!previewResponse.ok) {
      const error = await previewResponse.json();
      return { success: false, error: error.detail || 'Failed to preview bookmark' };
    }

    const preview = await previewResponse.json();

    // Save the bookmark with suggested category
    const saveResponse = await fetch(`${API_URL}/bookmarks/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: preview.id,
        category: preview.suggested_category,
      }),
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      return { success: false, error: error.detail || 'Failed to save bookmark' };
    }

    const bookmark = await saveResponse.json();
    return { success: true, title: bookmark.title, bookmark };
  } catch (error) {
    console.error('Quick save error:', error);
    return { success: false, error: error.message };
  }
}

// Get stored auth token
async function getAuthToken() {
  const result = await chrome.storage.local.get(['authToken']);
  return result.authToken;
}

// Store auth token
async function setAuthToken(token) {
  await chrome.storage.local.set({ authToken: token });
}

// Clear auth token
async function clearAuthToken() {
  await chrome.storage.local.remove(['authToken', 'user']);
}

// Show notification
function showNotification(title, message) {
  // Use badge text for quick feedback
  chrome.action.setBadgeText({ text: '✓' });
  chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });

  // Clear badge after 2 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

// Handle Google OAuth login (runs in background so popup closing doesn't matter)
async function handleGoogleLogin() {
  try {
    const redirectUrl = chrome.identity.getRedirectURL();
    const clientId = chrome.runtime.getManifest().oauth2.client_id;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', 'openid email profile');

    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });

    // Extract access token from response URL
    const url = new URL(responseUrl);
    const hashParams = new URLSearchParams(url.hash.slice(1));
    const googleAccessToken = hashParams.get('access_token');

    if (!googleAccessToken) {
      return { success: false, error: 'Failed to get access token' };
    }

    // Exchange Google token for our app's JWT token
    const response = await fetch(`${API_URL}/auth/google/extension`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: googleAccessToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.detail || 'Authentication failed' };
    }

    const data = await response.json();

    // Store credentials
    await chrome.storage.local.set({
      authToken: data.access_token,
      user: data.user
    });

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Failed to sign in' };
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAuthToken') {
    getAuthToken().then(sendResponse);
    return true;
  }

  if (request.action === 'setAuthToken') {
    setAuthToken(request.token).then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'clearAuthToken') {
    clearAuthToken().then(() => sendResponse({ success: true }));
    return true;
  }

  if (request.action === 'quickSave') {
    quickSaveBookmark(request.url).then(sendResponse);
    return true;
  }

  if (request.action === 'openApp') {
    chrome.tabs.create({ url: APP_URL });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'login') {
    handleGoogleLogin().then(sendResponse);
    return true;
  }
});
