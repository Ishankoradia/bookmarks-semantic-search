# Semantic Bookmarks Chrome Extension

A Chrome extension to quickly save bookmarks with AI-powered categorization and tagging.

## Features

- Save the current page with one click
- Right-click context menu to save pages or links
- Keyboard shortcut: `Cmd+Shift+S` (Mac) / `Ctrl+Shift+S` (Windows/Linux)
- AI-generated tags and categories
- Google OAuth authentication

## Setup

### 1. Update Configuration

Update `config.js` if your API is not running on default ports:
```javascript
const CONFIG = {
  API_URL: 'http://localhost:6005/api/v1',
  APP_URL: 'http://localhost:3002',
};
```

### 2. Load the Extension (to get Extension ID)

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this `chrome-extension` folder
5. **Copy the Extension ID** - you'll see it under the extension name (e.g., `kpeljcmneaobmfhgjbkoamcinbcaepjd`)

### 3. Configure Google OAuth

Google OAuth requires your Extension ID to authorize the extension. Now that you have the ID from step 2:

**Option A: Use your existing Web Application OAuth client**
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your existing OAuth client
3. Under **Authorized redirect URIs**, add:
   ```
   https://<YOUR_EXTENSION_ID>.chromiumapp.org/
   ```
   For example: `https://kpeljcmneaobmfhgjbkoamcinbcaepjd.chromiumapp.org/`
4. Save

**Option B: Create a new Chrome Extension OAuth client**
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Create Credentials → OAuth client ID → **Chrome Extension**
3. Enter your Extension ID from step 2
4. Copy the generated Client ID

### 4. Update manifest.json with Client ID

Update `manifest.json` line 35 with your Google Client ID:
```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  ...
}
```

Then reload the extension in `chrome://extensions` (click the refresh icon).

### 5. Start the Backend

Make sure your backend is running:
```bash
cd backend && ./run.sh
```

## Usage

1. Navigate to any webpage
2. Click the extension icon in the toolbar (or use `Cmd+Shift+S`)
3. Sign in with Google (first time only)
4. Review the AI-generated tags and category
5. Click "Save Bookmark"

## File Structure

```
chrome-extension/
├── manifest.json      # Extension configuration
├── config.js          # API URLs (edit for production)
├── background.js      # Service worker for context menus & shortcuts
├── popup/
│   ├── popup.html     # Extension popup UI
│   ├── popup.css      # Styles
│   └── popup.js       # Popup logic
└── icons/             # Extension icons (16, 32, 48, 128px)
```
