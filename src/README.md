# Licitax Advisor (Local Version)

This is a Next.js application designed for managing bidding processes (licitações) for clients. This version has been modified to run **entirely locally**, using your browser's `localStorage` for all data persistence. It does not require any external database or backend setup.

## Getting Started

To run this application locally, you only need Node.js. All data will be saved in your browser.

**Prerequisites:**

*   Node.js (Version 18 or later)

---

### **1. Installation**

Once you have the project files, open a terminal in the project's root directory and install the required dependencies.

```bash
npm install
```

---

### **2. Running the App**

After the installation is complete, run the development server.

```bash
npm run dev
```

The application will start, and you can access it at the URL provided in the terminal (usually [http://localhost:9002](http://localhost:9002)).

---

### **Important Notes for Local Version**

*   **Data Persistence:** All data (clients, bids, documents, etc.) is stored in your browser's `localStorage`. This means:
    *   The data is only available on the computer and in the browser where you are using the app.
    *   Clearing your browser's cache or site data will permanently delete all information stored by the application.
    *   Using a different browser or the same browser in "Incognito/Private" mode will result in a separate, empty data store.

*   **No Cloud Sync:** Since there is no database, your data is not synced across devices or backed up to the cloud.

*   **AI Features:** AI features that rely on Genkit still require a `GOOGLE_GENAI_API_KEY` to be set. You can create a file named `.env.local` in the project root and add your key:
    ```env
    GOOGLE_GENAI_API_KEY="YOUR_API_KEY_HERE"
    ```
    You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey). If this key is not provided, AI-related functionalities will not work.

This setup is ideal for demonstrations, personal use, or rapid prototyping without the need for backend infrastructure.
