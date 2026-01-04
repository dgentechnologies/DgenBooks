# DgenBooks - Premium Expense Tracker

<div align="center">
  <img src="/public/images/logo.png" alt="DgenBooks Logo" width="80" />
  <h1 align="center">DgenBooks</h1>
  <p align="center">
    A modern, real-time, and professional expense tracking application built for seamless collaboration.
  </p>
</div>

---

## 🎉 Push Notifications - 100% FREE with Vercel

Push notifications now work on **Vercel's free tier** - no Firebase Blaze plan needed!

**Quick Setup (3 steps):**
1. Get Firebase service account key
2. Add to Vercel environment variables
3. Deploy!

See **[VERCEL-NOTIFICATIONS-SETUP.md](VERCEL-NOTIFICATIONS-SETUP.md)** for complete instructions.

**Alternative:** For Firebase Cloud Functions approach, see **[FIX-NOTIFICATIONS-NOW.md](FIX-NOTIFICATIONS-NOW.md)**.

---

DgenBooks is a feature-rich, responsive, and secure expense tracking application designed for teams and individuals who demand efficiency and elegance. Built with Next.js, TypeScript, and Firebase, it offers a premium user experience with real-time data synchronization.

## ✨ Features

- 🔔 **Push Notifications**: Get real-time notifications for all expense and settlement changes (requires deployment - see above)
- 📊 **Interactive Dashboard**: Get a real-time overview of your finances with beautiful, interactive charts for spending patterns.
- 💸 **Real-time Balance Tracking**: Instantly see who owes who, with balances that update live as expenses are added or settled.
- 🤝 **Seamless Expense Splitting**: Easily split expenses among team members. Split with everyone or select specific people.
- 🔐 **Secure Authentication**: Robust and secure user authentication with Firebase, supporting both email/password and Google Sign-In.
- 🤖 **AI-Powered Summaries**: Leverage Google's Gemini models via Genkit to get intelligent summaries of your expense logs.
- 📱 **Fully Responsive Design**: A pixel-perfect interface that works flawlessly on mobile, tablet, and desktop.
- ⚡ **Blazing Fast Performance**: Built with the Next.js App Router and Server Components for a fast, native-like experience.
- ⌨️ **Keyboard-First Navigation**: Power-user shortcuts for quick navigation and actions, like adding expenses (`Ctrl+N`) and more.
- 🌙 **Elegant Dark Theme**: A stunning, professionally designed dark mode that's easy on the eyes.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Firebase Firestore](https://firebase.google.com/products/firestore) (for real-time data)
- **Authentication**: [Firebase Auth](https://firebase.google.com/products/auth)
- **Generative AI**: [Google Genkit](https://firebase.google.com/docs/genkit) with Gemini models
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Form Management**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v20 or later)
- npm, yarn, or pnpm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/dgenbooks.git
    cd dgenbooks
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Firebase:**
    - Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
    - Add a new Web App to your project.
    - Copy your Firebase configuration and add it to `src/firebase/config.ts`.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:9002](http://localhost:9002) in your browser to see the application.

## 🔐 Security

Security is a top priority for DgenBooks. The application is built with a robust security model to ensure user data is protected. For more details on reporting vulnerabilities, please see our [Security Policy](SECURITY.md).

- **Strict Firestore Security Rules**: User data is isolated using path-based ownership. Users can only read and write to their own data silos. All write operations are validated on the backend to ensure data integrity.
- **Secure Authentication**: All routes and API endpoints require authentication via Firebase Auth, preventing any unauthorized access.
- **Data Segregation**: Purchases and settlements are stored in subcollections under each user's document, creating a secure boundary that prevents data leaks between users.
- **Environment Variables**: Sensitive keys are managed through environment variables and are not exposed on the client-side.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE.md](LICENSE.md) file for details.

---

<p align="center">
  Built with ❤️ for modern development teams.
</p>
