# 🖥️ BookNook Server

The REST API behind **BookNook**, a small online library. Built with **Node.js**, **Express 5**, and **MongoDB**, it manages books and borrow records, uploads cover images to imgbb, tracks available copies, and protects private routes with JWT verification against the client's better-auth keys.

- 🔗 **Live API:** [book-nook-server-iota.vercel.app](https://book-nook-server-iota.vercel.app/)
- 📦 **Server Repository:** [theopsupcorp1009/book-nook-server](https://github.com/theopsupcorp1009/book-nook-server)
- 🌐 **Frontend App:** [book-nook-indol.vercel.app](https://book-nook-indol.vercel.app/)
- 📦 **Frontend Repository:** [theopsupcorp1009/book-nook](https://github.com/theopsupcorp1009/book-nook)

---

## ✨ Features

- **Books API** with create, read, update, and delete operations
- **Borrow API** to borrow a book, list a user's borrows, and return a book
- **JWT verification** with `jose`, validating bearer tokens against the better-auth JWKS endpoint
- **Image upload**: cover images are received with Multer (memory storage) and uploaded to [imgbb](https://imgbb.com/)
- **Available copies tracking**: borrowing decrements `totalCopies` with `$inc` and returning increments it back
- **Borrow rules** enforced on the server:
  - A user cannot borrow the same book twice
  - A user cannot borrow their own book
  - Borrowing is rejected when no copies are left
- **Automatic 14 day return date** set when a book is borrowed
- **Duplicate protection** for books with the same title and author
- **Categories endpoints** including a top categories list for the home page
- **Clear status codes** (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`) with JSON error messages
- **CORS enabled** so the frontend can call the API from any origin
- Health check route at `/`

---

## 🖥️ Tech Stack

| Layer          | Technology                                          |
|----------------|------------------------------------------------------|
| Runtime        | [Node.js](https://nodejs.org/) (ES Modules)          |
| Framework      | [Express](https://expressjs.com/) 5                  |
| Database       | [MongoDB](https://www.mongodb.com/) (official driver) |
| Authentication | JWT verification with [jose](https://github.com/panva/jose) |
| File Uploads   | Multer, imgbb API                                    |
| Middleware     | cors, express.json                                   |
| Configuration  | dotenv                                               |
| Deployment     | Vercel                                               |

---

## 📂 Project Structure

```
book-nook-server/
├── index.js            # Express app, MongoDB connection, JWT middleware, and all routes
├── package.json
├── package-lock.json
├── .gitignore
└── .env                # Environment variables (never commit)
```

---

## 🔌 API Reference

Routes marked **Protected** require a valid JWT:

```http
Authorization: Bearer <token>
```

### Health

| Method | Endpoint | Description                          |
|--------|----------|--------------------------------------|
| GET    | `/`      | Returns `Server is running fine...`  |

### Categories

| Method | Endpoint          | Description                 |
|--------|-------------------|-----------------------------|
| GET    | `/categories`     | List all categories         |
| GET    | `/top-categories` | List the top four categories |

### Books

| Method | Endpoint             | Access    | Description                          |
|--------|----------------------|-----------|--------------------------------------|
| GET    | `/all-books`         | Public    | List all books                       |
| GET    | `/all-books/:id`     | Protected | Get a single book                    |
| POST   | `/books`             | Protected | Add a book (multipart form data)     |
| GET    | `/my-books/:email`   | Protected | List books added by a user           |
| PATCH  | `/my-books/:id`      | Protected | Update a book                        |
| DELETE | `/my-books/:id`      | Protected | Delete a book                        |

**Book fields**

| Field           | Type   | Notes                                             |
|-----------------|--------|---------------------------------------------------|
| `title`         | string | Trimmed, checked for duplicates with author       |
| `author`        | string | Trimmed                                           |
| `category`      | string | Fiction, Science, History, Kids, or Others        |
| `totalCopies`   | number | Decremented on borrow, incremented on return      |
| `description`   | string | Short description                                 |
| `image`         | file   | Sent as multipart field `image`, stored as an imgbb URL |
| `uploaderName`  | string | Name of the user who added the book               |
| `uploaderEmail` | string | Email of the user who added the book              |
| `createdAt`     | date   | Set automatically on creation                     |

**Example request**

```http
POST /books
Authorization: Bearer <token>
Content-Type: multipart/form-data

title=The Hobbit
author=J.R.R. Tolkien
category=Fiction
totalCopies=3
description=A hobbit goes on an unexpected journey.
uploaderName=Jane Doe
uploaderEmail=jane@example.com
image=<file>
```

### Borrows

| Method | Endpoint                | Access    | Description                          |
|--------|-------------------------|-----------|--------------------------------------|
| POST   | `/borrows`              | Protected | Borrow a book                        |
| GET    | `/borrows/:email`       | Protected | List borrows of a user               |
| DELETE | `/borrows/:id`          | Protected | Return a book                        |

**Borrow request body**

```json
{
  "bookId": "6710f1c2a1b2c3d4e5f60718",
  "bookTitle": "The Hobbit",
  "bookImage": "https://i.ibb.co/example.jpg",
  "borrowerName": "John Smith",
  "borrowerEmail": "john@example.com"
}
```

`borrowDate` is set to now and `returnDate` to 14 days later automatically.

### Status codes

| Code | Meaning                                                                  |
|------|--------------------------------------------------------------------------|
| 200  | Request succeeded                                                        |
| 201  | Resource created                                                         |
| 400  | Invalid ID, missing image, or no copies available                        |
| 401  | Missing or malformed authorization header                               |
| 403  | User tried to borrow their own book                                      |
| 404  | Book or borrow record not found                                          |
| 409  | Duplicate book, or the book is already borrowed by this user             |
| 500  | Internal server error or failed image upload                             |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm
- A MongoDB database (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- An [imgbb](https://api.imgbb.com/) API key
- The [BookNook frontend](https://github.com/theopsupcorp1009/book-nook) running, since it issues the JWTs

### Installation

```bash
# Clone the repository
git clone https://github.com/theopsupcorp1009/book-nook-server.git
cd book-nook-server

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
MONGODB_URL=your_mongodb_connection_string
IMGBB_API_KEY=your_imgbb_api_key
BETTER_AUTH_URL=https://your-frontend-domain/api/auth/jwks
PORT=5000
```

- `BETTER_AUTH_URL` must point to the **JWKS endpoint** of the frontend's better-auth instance. The server uses it to verify token signatures.
- `PORT` is optional and defaults to `5000`.

> Keep `.env` out of version control and never share real credentials publicly.

### Run the server

```bash
node index.js
```

The API will be available at `http://localhost:5000`. Visit `/` to confirm it is running.

Data is stored in a MongoDB database named `bookNook-db` with three collections: `books`, `borrows`, and `categories`. The `categories` collection should contain documents with a `name` field (Fiction, Science, History, Kids, Others).

---

## 🌐 Deployment

The server is deployed on **Vercel**. The Express app is exported from `index.js` so it can run as a serverless function.

To deploy your own copy:

1. Push this repository to your GitHub account.
2. Import the project into [Vercel](https://vercel.com/new).
3. Add `MONGODB_URL`, `IMGBB_API_KEY`, and `BETTER_AUTH_URL` in the Vercel project settings.
4. Allow Vercel's outbound IP addresses in your MongoDB Atlas network access settings.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙏 Acknowledgments

- Built with [Express](https://expressjs.com/) and the [MongoDB Node.js driver](https://www.mongodb.com/docs/drivers/node/current/)
- Token verification by [jose](https://github.com/panva/jose)
- Image hosting by [imgbb](https://imgbb.com/)
- Hosted on [Vercel](https://vercel.com/)

---

## 📝 Project Summary

**BookNook Server** is the backend of an online library, exposing a REST API for managing books and borrow records. Built with Express 5 and the native MongoDB driver in ES Module style, it verifies JWTs issued by the frontend's better-auth setup, accepts cover images through Multer and forwards them to imgbb, and keeps stock accurate with atomic `$inc` updates when books are borrowed or returned. Business rules such as no double borrowing, no borrowing your own book, and no borrowing when copies run out are enforced on the server with clear status codes and messages. The project demonstrates practical experience with RESTful API design, token-based authorization, file upload handling, MongoDB data modeling, and serverless deployment on Vercel.
