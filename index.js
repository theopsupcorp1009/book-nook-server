import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("bookNook-db");
const booksCollection = db.collection("books");
const borrowsCollection = db.collection("borrows");
const categoriesCollection = db.collection("categories");

import { createRemoteJWKSet, jwtVerify } from 'jose';

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized' })
  }
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' })
  }

  const JWKS = createRemoteJWKSet(new URL(`${process.env.BETTER_AUTH_URL}`));

  try {
    const { payload } = await jwtVerify(token, JWKS);
    next();
  } catch (error) {
    return res.status(500).send({ message: 'Internal Server Error' })
  }

}


const upload = multer({
  storage: multer.memoryStorage(),
  limit: {
    fileSize: 5 * 1024 * 1024,
  }
});

app.post('/books', verifyToken, upload.single("image"), async (req, res) => {
  try {
    const { title, author, uploaderEmail } = req.body;

    const existingBooks = await booksCollection.find().toArray();

    const existingBook = existingBooks.find(
      (book) =>
        book.title.trim().toLowerCase() === title.trim().toLowerCase() &&
        book.author.trim().toLowerCase() === author.trim().toLowerCase() &&
        book.uploaderEmail.trim().toLowerCase() === uploaderEmail.trim().toLowerCase()
    );

    if (existingBook) {
      return res.status(409).json({
        message: "This book already exists!",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No image selected",
      });
    }

    const base64Image = req.file.buffer.toString("base64");

    const imageData = new URLSearchParams();
    imageData.append("image", base64Image);

    const uploadRes = await fetch(
      `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
      {
        method: "POST",
        body: imageData,
      }
    );

    const imageResult = await uploadRes.json();

    if (!uploadRes.ok || !imageResult.success) {
      return res.status(500).json({ message: "Image upload failed" });
    }

    const data = {
      ...req.body,
      title: title.trim(),
      author: author.trim(),
      totalCopies: Number(req.body.totalCopies),
      image: imageResult.data.display_url,
      createdAt: new Date(),
    };

    const result = await booksCollection.insertOne(data);

    res.status(201).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.get('/categories', async (req, res) => {
  const result = await categoriesCollection.find().toArray();
  res.status(200).send(result);
});

app.get('/top-categories', async (req, res) => {
  const result = await categoriesCollection.find().limit(4).toArray();
  res.status(200).send(result);
});

app.get('/all-books', async (req, res) => {
  const result = await booksCollection.find().toArray();
  res.status(200).send(result);
});

app.get('/all-books/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid book ID" });
  }

  const result = await booksCollection.findOne({ _id: new ObjectId(id) });

  if (!result) {
    return res.status(404).json({ message: "Book not found" });
  }

  res.status(200).send(result);
});

app.get('/my-books/:email', verifyToken, async (req, res) => {
  const { email } = req.params;
  const result = await booksCollection.find({ uploaderEmail: email }).toArray();
  res.status(200).send(result);
});

app.patch('/my-books/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const currentBook = await booksCollection.findOne({
      _id: new ObjectId(id),
    });

    const title = data.title?.trim().toLowerCase() || currentBook.title.trim().toLowerCase();
    const author = data.author?.trim().toLowerCase() || currentBook.author.trim().toLowerCase();

    const existingBooks = await booksCollection.find().toArray();

    const existingBook = existingBooks.find(
      (book) =>
        book._id.toString() !== id &&
        book.title.trim().toLowerCase() === title &&
        book.author.trim().toLowerCase() === author
    );

    if (existingBook) {
      return res.status(409).json({
        message: "This book already exists!",
      });
    }

    data.title = title;
    data.author = author;

    if (data.totalCopies !== undefined) {
      data.totalCopies = Number(data.totalCopies);
    }

    const result = await booksCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({
        message: "No changes detected",
      });
    }

    res.status(200).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

app.delete('/my-books/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return res.status(404).send({ message: "Book not found" });
  }

  res.status(200).send(result);
});

app.post('/borrows', verifyToken, async (req, res) => {
  try {
    const { bookId, borrowerEmail } = req.body;

    const existingBorrow = await borrowsCollection.findOne({
      bookId,
      borrowerEmail,
    });

    if (existingBorrow) {
      return res.status(409).json({
        message: "You have already borrowed this book!",
      });
    }

    const book = await booksCollection.findOne({
      _id: new ObjectId(bookId),
    });

    if (book.uploaderEmail === borrowerEmail) {
      return res.status(403).json({
        message: "You cannot borrow your own book!",
      });
    }

    const updateResult = await booksCollection.updateOne(
      {
        _id: new ObjectId(bookId),
        totalCopies: { $gt: 0 },
      },
      {
        $inc: { totalCopies: -1 },
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).json({
        message: "No copies available!",
      });
    }

    const borrowDate = new Date();
    const returnDate = new Date(borrowDate);
    returnDate.setDate(returnDate.getDate() + 14);

    const data = {
      ...req.body,
      borrowDate,
      returnDate,
    };

    const result = await borrowsCollection.insertOne(data);

    res.status(201).send(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

app.get('/borrows/:email', verifyToken, async (req, res) => {
  const { email } = req.params;
  const result = await borrowsCollection.find({ borrowerEmail: email }).toArray();
  res.status(200).send(result);
});

app.delete('/borrows/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  const borrow = await borrowsCollection.findOne({
    _id: new ObjectId(id),
  });

  const result = await borrowsCollection.deleteOne({
    _id: new ObjectId(id),
  });

  if (result.deletedCount === 0) {
    return res.status(404).send({
      message: "Borrow record not found",
    });
  }

  await booksCollection.updateOne(
    { _id: new ObjectId(borrow.bookId) },
    { $inc: { totalCopies: 1 } }
  );

  res.status(200).send(result);
});

app.get('/', async (req, res) => {
  res.status(200).send("Server is running fine...");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})