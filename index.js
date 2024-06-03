
const express = require('express');
const cors = require('cors');
const app = express();

const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;


// middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://medicare-2059.web.app',
        'https://medicare-2059.firebaseapp.com'
    ],
    credentials: true
}));
app.use(express.json());




// MongoDB Conection
const uri = `mongodb+srv://${process.env.ENV_USE}:${process.env.ENV_PASS}@cluster0.6e55rfm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Database Conection
        const userCollections = client.db("madiCare").collection("users");
        const medicinCollections = client.db("madiCare").collection("medicin");


        // ***************  Veryfy secure related API  ********************

        // jwt Token send to client side
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // middlewares 

        // Veryfy Token
        const verifyToken = (req, res, next) => {
            console.log('verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })

        }

        // use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollections.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        //  ***************  user funtionality **************

        // User add to database
        app.post('/users', async (req, res) => {
            const user = req.body;

            const query = { email: user.email }
            const existingUser = await userCollections.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already Stored', insertedId: null })
            }

            const result = await userCollections.insertOne(user);
            res.send(result);
        })

        // ****************  Medicin data function ********************

        // get all medicin data
        // get menu data from mongodeb database
        app.get('/medicin', async (req, res) => {
            const result = await medicinCollections.find().toArray();
            res.send(result);
        });






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Madicare is running')
})

app.listen(port, () => {
    console.log(`Madicare is sitting on port ${port}`);
})
