
const express = require('express');
const cors = require('cors');
const app = express();

const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
        // await client.connect();

        // Database Conection
        const userCollections = client.db("madiCare").collection("users");
        const medicinCollections = client.db("madiCare").collection("medicin");
        const shopCollections = client.db("madiCare").collection("shop");
        const paymentCollection = client.db("madiCare").collection("payments");


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

        // use verify admin after verifyToken
        const verifySeller = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollections.findOne(query);
            const isSeller = user?.role === 'Seller';
            if (!isSeller) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        //  ***************  user funtionality **************

        // get All Users function
        app.get('/users', verifyToken,  async (req, res) => {
            const result = await userCollections.find().toArray();
            res.send(result);
        });

        // get user data for email base
        app.get('/user/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const result = await userCollections.findOne({ email })
            res.send(result)
        })

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

        //  find of admin rool
        app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollections.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })


        // Update role
        app.patch('/users/roles/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const { role } = req.body;
            // console.log(email, role);

            const filter = { email: email };
            const updateDoc = {
                $set: { role: role },
            };
            const result = await userCollections.updateOne(filter, updateDoc);
            res.send(result);
        })


        // ****************  Medicin data function ********************

        // get all medicin data
        app.get('/medicin', async (req, res) => {
            const result = await medicinCollections.find().toArray();
            res.send(result);
        });

        //  find objectID base single medicin data 
        app.get('/medicin/:id',  async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id),
            };
            // console.log(filter);
            const result = await medicinCollections.findOne(filter);
            console.log(result);
            res.send(result);
        })

        // add Medicin client side to mongodeb Database
        app.post('/medicin', verifyToken,   async (req, res) => {
            const item = req.body;
            const result = await medicinCollections.insertOne(item);
            res.send(result);
        });

        // sellerEmail base medisin data get from mongoDB
        app.get('/medicins', async (req, res) => {
            const sellerEmail = req.query.sellerEmail;
            console.log(sellerEmail);
            const query = { sellerEmail: sellerEmail };
            const result = await medicinCollections.find(query).toArray();
            res.send(result);
        });


        // update one Medicin Data
        app.patch('/medicin/:id', verifyToken, verifyAdmin,  async (req, res) => {
            const medi = req.body;
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    category_name: medi.category_name,
                    image_url: medi.image_url,
                    per_unit_price: medi.unitPrice,
                    item_name: medi.itemName,
                    company_name: medi.companyName,
                    discount_percentage: medi.discount,
                    item_generic_name: medi.genericName,
                    item_mass_unit: medi.massUnit,
                    short_description: medi.shortDescription,
                    date: new Date()
                }
            }

            const result = await medicinCollections.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // delete function in shop cart data
        app.delete('/medicin/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await medicinCollections.deleteOne(query);
            res.send(result);
        })

        // *******************  shop Colection Funtionality  ****************



        // client side to mongoDB shop data send
        app.post('/shop', async (req, res) => {
            const shopData = req.body;
            const result = await shopCollections.insertOne(shopData);
            res.send(result);
        });


        // Shop data find to mongoDB (Email base)
        app.get('/shop', async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = { email: email };
            const result = await shopCollections.find(query).toArray();
            res.send(result);
        });

        // delete function in shop cart data
        app.delete('/shop/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await shopCollections.deleteOne(query);
            res.send(result);
        })


        // ***************     Payment section  ************** //

        // creat payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'amount inside the intent');

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });

        // get all medicin data
        app.get('/payment', verifyToken, async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        });


        // Update user or seller payment status
        app.patch('/payment/status/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { status } = req.body;
            console.log(id, status);

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { status: status },
            };
            const result = await paymentCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // find on letest payment data
        app.get('/payment/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            // console.log(filter);
            const result = await paymentCollection.find(filter).sort({ date: -1 }).limit(1).toArray();
            console.log(result);
            res.send(result.length > 0 ? result[0] : null);
        })

        // Buyer Email base medisin Payment data get from mongoDB
        app.get('/payments', verifyToken, async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = { email: email };
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        });

        // payment insart and delete functionality
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            //   delete each item from the cart
            console.log('payment info', payment);
            const query = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
                }
            };

            const deleteResult = await shopCollections.deleteMany(query);

            res.send({ paymentResult, deleteResult });
        })






        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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
