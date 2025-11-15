const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nmodl3i.mongodb.net/?appName=Cluster0`

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) => {
  res.send('Server is running')
})

async function run() {
  try {
    //await client.connect();
    const myDB = client.db('farmer-db')
    const cropCollection = myDB.collection('crop')
    const interestCollection = myDB.collection('interests')

    app.get('/crop', async (req, res) => {
      const email = req.query.email
      //console.log('saiful')
      const query = {}
      if (email) {
        query["owner.ownerEmail"] = email
      }
      const cursor = cropCollection.find(query)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/latest/crop', async (req, res) => {
      const cursor = cropCollection.find().limit(6)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get("/crop/:id",  async (req, res) => {
      const { id } = req.params;
      const objectId = new ObjectId(id);

      const result = await cropCollection.findOne({ _id: objectId });
      console.log(result)

      res.send({
        success: true,
        result,
      });
    });

    app.get('/search', async (req, res) => {
      const search = req.query.search
      const result = await cropCollection.find({name: {$regex: search, $options: 'i'}}).toArray()
      res.send(result)
    })


    app.post('/crop', async (req, res) => {
      const newCrop = req.body
      console.log(newCrop)
      const result = await cropCollection.insertOne(newCrop)
      res.send(result)
    })

    app.put('/crop/:id', async(req, res) => {
      console.log('saiful')
      const {id} = req.params
      const data = req.body
      const objectId = new ObjectId(id)
      const filter = { _id: objectId}
      //console.log(data, filter)
      const update = {
        $set: data
      }
      const result = await cropCollection.updateOne(filter, update)
      res.send(result)
    })


    app.get('/crop/interests/:cropId', async (req, res) => {
      const cropId = req.params.cropId;
      console.log(cropId)
      const query = { cropId: new ObjectId(cropId) }
      //const query = { crop: cropId }
      const cursor = interestCollection.find(query).sort({quantity: -1})
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/interests', async (req, res) => {
      const newInterests = req.body
      const existings = await interestCollection.findOne({userEmail: newInterests.userEmail , cropId: new ObjectId(newInterests.cropId)})
      if(existings) {
        res.send({message: 'Already added'})
      }
      newInterests.cropId = new ObjectId(newInterests.cropId)
      const result = await interestCollection.insertOne(newInterests)
      res.send(result)
    })

    app.get('/interests', async (req, res) => {
      const email = req.query.email
      const query = {}
      if (email) {
        query.userEmail = email;
      }
      const cursor = interestCollection.find(query).sort({quantity: -1});
      const result = await cursor.toArray()
      res.send(result)
    })

    app.delete('/crop/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cropCollection.deleteOne(query)
      res.send(result)
    })

    app.put("/interest/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    const filter = { _id: new ObjectId(id) };
    const update = { $set: { status } };
    await interestCollection.updateOne(filter, update);

    const updatedInterest = await interestCollection.findOne(filter);

    if (status === "accepted") {
      const crop = await cropCollection.findOne({ _id: new ObjectId(updatedInterest.cropId) });
      if (crop) {
        const newQty = Math.max(crop.quantity - updatedInterest.quantity, 0);
        await cropCollection.updateOne(
          { _id: new ObjectId(updatedInterest.cropId) },
          { $set: { quantity: newQty } }
        );
      }
    }

    res.send({ success: true, result: updatedInterest });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Server error" });
  }
});


    //await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
  finally {
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
