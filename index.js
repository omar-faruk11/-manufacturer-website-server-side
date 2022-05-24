const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { decode } = require('jsonwebtoken');




app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.razje.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = ( req, res, next) =>{
  const authHeader = req.params.authorization;

  if(!authHeader){
    return res.status(401).send({success: false, message:'UnAuthorized access'});
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(error, decoded )=>{
    if(error){
      return res.status(403).send({success:false, message:'Forbidden access'});
    }
    res.decoded = decoded;
    next();
  })

}

 const run = async() =>{
    try{
        await client.connect();
        const userCollection = client.db('parts_master').collection('users');
        const partCollection = client.db('parts_master').collection('parts');
        const reviewCollection = client.db('parts_master').collection('reviews');
        console.log("i am running");
        // review area 
        app.get('/reviews',async(req, res)=>{
          const reviews = (await reviewCollection.find().toArray()).reverse();
          res.send(reviews)
        });

         app.post('/review'),verifyJWT, async(req, res)=>{
           const review = req.body;
           const result = await reviewCollection.insertOne(review);
           res.send(result);
         }
        // --------part area---------

        
        // get all parts 
        app.get('/parts',async(req, res)=>{
          const parts = (await partCollection.find().toArray()).reverse()
          res.send(parts);
        });
        
        // get one part by id 
        app.get('/parts/:id',async(req, res)=>{
          const id = req.params.id;
          const find = {_id:ObjectId(id)};
          const result = await partCollection.findOne(find);
          res.send(result);
        })

        // add a product 
        app.post('/parts',verifyJWT, async(req, res)=>{
          const parts = req.body;
          const result = await partCollection.insertOne(parts);
          res.send(result);
        })

        // user area 
        app.get('/users',verifyJWT, async(req,res)=>{
          const users = await userCollection.find().toArray();
          res.send(users)
        });

        app.put('/user/:email', async(req, res)=>{
          const email = req.params.email;
          const user = req.body;
          const filter = {email:email}
          const options = { upsert: true };
          const updateDoc = {
            $set: user
      
          };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          const token = jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET,{expiresIn: '1d'})
          res.send({result, token});
        });

        //make a admin 
        app.put('user/admin/:email', verifyJWT, async(req, res)=>{
          const email = req.params.email;
          const filter = {email};
          const updateDoc = {
            $set: { role: 'admin' },
          };
          const result = await userCollection.updateOne(filter,updateDoc);
          res.send(result);
        })

        // get admin 
        app.get('/admin/:email', async(req, res)=>{
          const email = req.params.email;
          const query = {email}
          const user = await userCollection.findOne(query);
          
          const isAdmin = user.role === 'admin';
          res.send(isAdmin)

        })

        
    }
    finally{

    }

};
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
  })
  
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
  })