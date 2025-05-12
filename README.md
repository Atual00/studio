# Licitax Advisor

This is a Next.js application designed for managing bidding processes (licitações) for clients.

## Getting Started

To run this application locally, follow these steps:

**Prerequisites:**

*   Node.js (Version 18 or later recommended)
*   npm or yarn package manager
*   Google Generative AI API Key (for AI features)
*   Firebase Project with a deployed Cloud Function to act as a proxy for the Compras.gov.br API (for API consultation features).

**Installation:**

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository-url>
    cd licitax-advisor
    ```
2.  **Install dependencies:**
    Using npm:
    ```bash
    npm install
    ```
    Or using yarn:
    ```bash
    yarn install
    ```
3.  **Configure Environment Variables:**
    *   Create a file named `.env.local` in the root directory of the project by copying `.env` (e.g., `cp .env .env.local`). **Be careful not to commit secrets in `.env.local` to public repositories.**
    *   Add your Google Generative AI API key to the `.env.local` file:
        ```env
        GOOGLE_GENAI_API_KEY="YOUR_API_KEY_HERE"
        ```
        Replace `"YOUR_API_KEY_HERE"` with your actual API key. You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).
    *   Add the URL of your deployed Firebase Cloud Function (proxy for Compras.gov.br API) to the `.env.local` file:
        ```env
        NEXT_PUBLIC_COMPRAS_GOV_PROXY_URL="YOUR_FIREBASE_CLOUD_FUNCTION_URL_HERE"
        ```
        Replace `"YOUR_FIREBASE_CLOUD_FUNCTION_URL_HERE"` with the actual URL of your deployed Cloud Function.
        Example: `https://southamerica-east1-your-project-id.cloudfunctions.net/consultarApiComprasGov`

**Running the Development Server:**

1.  **Start the Next.js development server:**
    Using npm:
    ```bash
    npm run dev
    ```
    Or using yarn:
    ```bash
    yarn dev
    ```
2.  **Access the application:**
    Open your web browser and navigate to [http://localhost:9002](http://localhost:9002).

This application is a web-based prototype and runs in your browser. It is not typically downloaded like a standalone desktop or mobile app. The steps above allow you to run the code on your own machine.
