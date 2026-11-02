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

const upload = multer({
  storage: multer.memoryStorage(),
  limit: {
    fileSize: 5 * 1024 * 1024,
  }
});

app.post('/books', upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image selected" });
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
    res.send(result);
  })

  app.get('/top-categories', async(req, res)=>{
  const result = await categoriesCollection.find().limit(4).toArray();
  res.send(result);
})


  app.get('/all-books', async(req, res)=>{
    const result = await booksCollection.find().toArray();
    res.send(result);
  })

  app.get('/all-books/:id', async(req, res)=>{
    const {id} = req.params;
    const result = await booksCollection.findOne({_id: new ObjectId(id)});
    res.send(result);
  })

  app.get('/my-books/:email', async(req, res)=>{
    const {email} = req.params;
    const result = await booksCollection.find({uploaderEmail:email}).toArray();
    res.send(result);
  })

  app.patch('/my-books/:id', async(req, res)=>{
    const {id} = req.params;
    const data = req.body;
    const result = await booksCollection.updateOne(
      {_id: new ObjectId(id)},
      {$set: data},
    );
    res.send(result);
  })

   app.delete('/my-books/:id', async(req, res)=>{
    const {id} = req.params;
    const result = await booksCollection.deleteOne({_id: new ObjectId(id)});
    res.send(result);
  })

app.post('/borrows', async(req, res)=>{
  const borrowDate = new Date();
  const returnDate = new Date(borrowDate);
  returnDate.setDate(returnDate.getDate() + 14);

  const data = {
    ...req.body,
    borrowDate,
    returnDate
  };

  const result = await borrowsCollection.insertOne(data);
  res.send(result);
})

  app.get('/borrows/:email', async(req, res)=>{
    const {email} = req.params;
    const result = await borrowsCollection.find({borrowerEmail:email}).toArray();
    res.send(result);
  })

    app.delete('/borrows/:id', async(req, res)=>{
    const {id} = req.params;
    const result = await borrowsCollection.deleteOne({_id: new ObjectId(id)});
    res.send(result);
  })


  app.get('/', async (req, res) => {
    res.send("Server is running fine...");
  })

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  })