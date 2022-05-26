const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);




app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.razje.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const verifyJWT = ( req, res, next) =>{
  const authHeader = req.headers.authorization;
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

};

 const run = async() =>{
    try{
        await client.connect();
        const userCollection = client.db('parts_master').collection('users');
        const partCollection = client.db('parts_master').collection('parts');
        const reviewCollection = client.db('parts_master').collection('reviews');
        const orderCollection = client.db('parts_master').collection('order');
        const paymentCollection = client.db('parts_master').collection('payment');
        console.log("i am running");
        // review area 
        app.get('/reviews',async(req, res)=>{
          const reviews = (await reviewCollection.find().toArray()).reverse();
          res.send(reviews)
        });

         app.post('/reviews', verifyJWT, async(req, res)=>{
           const review = req.body;
           const result = await reviewCollection.insertOne(review);
           res.send(result);
         });
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
        });

        // add a product 
        app.post('/parts',verifyJWT, async(req, res)=>{
          const part = req.body;
          const result = await partCollection.insertOne(part);
          res.send(result);
        });


        app.delete('/parts/:id',verifyJWT, async(req, res)=>{
          const id = req.params.id;
          const part = {_id:ObjectId(id)};
          const result = await partCollection.deleteOne(part);
          res.send(result);
        });
        
        // user area 
        app.get('/users',verifyJWT, async(req,res)=>{
          const users = await userCollection.find().toArray();
          res.send(users)
        });


        app.put('/users/:email', async(req, res)=>{
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
        app.put('/users/admin/:email', verifyJWT, async(req, res)=>{
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
        // order area 
        app.post('/create-payment-intent',verifyJWT, async(req, res)=>{
          const order = req.body;
          console.log(order);
          const price = order.totalPrice;
          const amount = price * 100;

          const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types:['card']
          });
          res.send({clientSecret: paymentIntent.client_secret});
        })
        // get orders 
        app.get('/orders/:email',verifyJWT, async(req, res)=>{
          const email = req.params.email;
          const orders = await orderCollection.find({email}).toArray();
          res.send(orders);
        });

         
        // get order by id
      app.get('/order/:id', verifyJWT, async(req, res)=>{
        const id = req.params.id;
        const find = {_id:ObjectId(id)};
        const result = await orderCollection.findOne(find);
        res.send(result);
      })
        //update orders with payment
        app.patch('/orders/:id', verifyJWT, async(req, res)=>{
          const id = req.params.id;
          const payment = req.body;
          console.log(payment);
          console.log(payment.transactionId);
          const filter ={_id:ObjectId(id)};
          const updateDoc = {
            $set: {
              paid:true,
              transactionId: payment.transactionId
            }
            
          };
          const addPayment = await paymentCollection.insertOne(payment)
          const result = await orderCollection.updateOne(filter,updateDoc);
            res.send(result);
        })
        // post order 
        app.post('/orders', async(req, res)=>{
          const order = req.body;
          const result = await orderCollection.insertOne(order);
          res.send(result);
        });

        // Delete order
        app.delete('/orders/:id', verifyJWT, async(req, res)=>{
          const id = req.params.id;
          const query = {_id:ObjectId(id)};
          const result = await orderCollection.deleteOne(query);
          res.send(result);
        });

        
    }
    finally{

    };

};
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
  });
  
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });