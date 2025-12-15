# 🛒 Modern E-commerce Store (MERN Stack + Vite & Tailwind CSS)

A full-featured, responsive e-commerce platform built using the MERN stack. The project leverages **Vite** for a fast development experience and **Tailwind CSS** for modern, utility-first styling.

---

## 🚀 Live Demo & Deployment

| Component | Hosting Service | Link |
| :--- | :--- | :--- |
| **Frontend Deployment (Client)** | Vercel | [Click here to visit the live site](https://projects-lemon-eight.vercel.app/) |
| **Backend API (Server)** | Render | [Backend API Endpoint](https://anime-api-backend-u42d.onrender.com) |

**⚠️ Note on Backend Link:** The provided Render link points to your dashboard. Please replace it with the public URL of your deployed API for the link to be functional for users (e.g., `https://your-api-name.onrender.com`).

---

## 🛠️ Tech Stack & Key Dependencies

This application is built on the MERN stack with modern tooling, as detailed in the `package.json` files.

### Frontend (Client)

| Core Technology | Dependency | Description |
| :--- | :--- | :--- |
| **Framework** | `react`, `react-dom` | Core UI library for the frontend. |
| **Routing** | `react-router-dom` | Handles navigation between pages. |
| **State Management** | `zustand` | A fast, scalable, and simple state management solution. |
| **Styling** | `tailwindcss`, `postcss`, `autoprefixer` | Utility-first CSS framework for design. |
| **Development** | `vite` | Next-generation frontend tooling for a fast build process. |
| **API Calls** | `axios` | Promise-based HTTP client for making API requests. |
| **UI/UX** | `lucide-react`, `react-hot-toast` | Icons and simple notifications for enhanced user experience. |

### Backend (Server & Database)

| Core Technology | Dependency | Description |
| :--- | :--- | :--- |
| **Framework** | `express` | Fast, unopinionated, minimalist web framework for Node.js. |
| **Database** | `mongoose` | Object Data Modeling (ODM) for MongoDB. |
| **Security** | `bcryptjs`, `jsonwebtoken` | Password hashing and secure user authentication (JWT). |
| **Payment Gateway** | `stripe` | Integrates payment processing functionality. |
| **Middleware** | `cors`, `dotenv` | Enables Cross-Origin Resource Sharing and loads environment variables. |
| **Development** | `nodemon` | Automatically restarts the server during development. |

---

## ✨ Key Features

* **Secure Authentication:** User registration and login protected by **`bcryptjs`** and **`jsonwebtoken` (JWT)**.
* **Product Catalog:** Browse and view detailed product information.
* **Cart Functionality:** Seamless addition and removal of items from the shopping cart.
* **Payment Integration:** Checkout process integrated with **Stripe** for secure transactions.
* **Responsive Design:** Fully optimized layout for all devices, thanks to **Tailwind CSS**.
* **Fast Development:** Utilizes **Vite** for rapid tooling and development cycles.

---

### 1. Prerequisites

Ensure you have **Node.js (v20.x)** and MongoDB installed/running.

### 2. Clone the repository

```bash
git clone [https://github.com/Tushar-bot-hash/E-commerce-site.git](https://github.com/Tushar-bot-hash/E-commerce-site.git)
cd E-commerce-site