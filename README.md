# Licitax Advisor

This is a Next.js application designed for managing bidding processes (licitações) for clients. It uses Genkit for AI features and Firestore (via Google Cloud) as its backend database.

## Getting Started

To run this application locally, you must configure its connection to a Google Cloud project with Firestore enabled.

**Prerequisites:**

*   Node.js (Version 18 or later)
*   A Google Cloud Project with **Firestore enabled**.
*   A Firebase Service Account Key for backend authentication.

---

### **1. Firebase/Google Cloud Setup**

Before running the app, you need to set up Firestore and get your credentials.

*   **Create a Project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or select an existing Google Cloud project).
*   **Enable Firestore:**
    1.  In the Firebase console, go to **Build > Firestore Database**.
    2.  Click **Create database**.
    3.  Select **Start in production mode** (recommended).
    4.  Choose a location for your Firestore data and click **Enable**.
*   **Generate Service Account Key (Credentials):**
    1.  In the Firebase console, click the gear icon next to "Project Overview" and select **Project settings**.
    2.  Go to the **Service accounts** tab.
    3.  Click the **Generate new private key** button. A JSON file will be downloaded. **Treat this file like a password; do not share it or commit it to Git.**

---

### **2. Local Environment Configuration**

Now, you will use the downloaded JSON file to configure your local environment.

*   **Create `.env.local` file:** In the root of the project, create a new file named `.env.local`. This file is ignored by Git and is the correct place for your secrets.

*   **Add Credentials to `.env.local`:**
    1.  Open the downloaded JSON key file in a text editor.
    2.  Copy its **entire content**.
    3.  In your `.env.local` file, add the following line, pasting the JSON content you copied:

    ```env
    FIREBASE_SERVICE_ACCOUNT_JSON='{"type": "service_account", "project_id": "your-project-id", ...}'
    ```
    **Important:** The entire JSON content must be on a single line, enclosed in single quotes `'`.

*   **(Optional) Google Generative AI API Key:**
    If you intend to use AI features, add your Google Generative AI API key to the `.env.local` file:
    ```env
    GOOGLE_GENAI_API_KEY="YOUR_API_KEY_HERE"
    ```
    You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

### **3. Installation and Running the App**

Once your `.env.local` file is configured, you can install the dependencies and run the app.

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run the development server:**
    ```bash
    npm run dev
    ```
3.  **Access the application:**
    Open your web browser and navigate to [http://localhost:9002](http://localhost:9002).

By following these steps, your application will be able to securely authenticate with your Firestore database, and the "Could not refresh access token" error will be resolved.
