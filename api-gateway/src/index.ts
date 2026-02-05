import express from 'express';
import cors from 'cors';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

const protoDir = process.env.PROTO_DIR || path.resolve(process.cwd(), '..', 'proto');
const loadOpts = { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true };

const productProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(protoDir, 'product.proto'), loadOpts)
).product as any;
const userProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(protoDir, 'user.proto'), loadOpts)
).user as any;
const orderProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(protoDir, 'order.proto'), loadOpts)
).order as any;
const cartProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(protoDir, 'cart.proto'), loadOpts)
).cart as any;

const productClient = new productProto.ProductService(
  process.env.PRODUCT_SERVICE_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);
const userClient = new userProto.UserService(
  process.env.USER_SERVICE_URL || 'localhost:50053',
  grpc.credentials.createInsecure()
);
const orderClient = new orderProto.OrderService(
  process.env.ORDER_SERVICE_URL || 'localhost:50052',
  grpc.credentials.createInsecure()
);
const cartClient = new cartProto.CartService(
  process.env.CART_SERVICE_URL || 'localhost:50054',
  grpc.credentials.createInsecure()
);

function promisify<T>(client: any, method: string, req: any): Promise<T> {
  return new Promise((resolve, reject) => {
    client[method](req, (err: Error | null, res: T) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Products
app.get('/api/products', async (req, res) => {
  try {
    const page = parseInt(String(req.query.page)) || 1;
    const page_size = parseInt(String(req.query.page_size)) || 10;
    const data = await promisify<any>(productClient, 'ListProducts', { page, page_size });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const data = await promisify<any>(productClient, 'GetProduct', { id: req.params.id });
    res.json(data);
  } catch (e: any) {
    res.status(e.code === 5 ? 404 : 500).json({ error: e.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const data = await promisify<any>(productClient, 'CreateProduct', {
      name: name || '',
      description: description || '',
      price: parseFloat(price) || 0,
      stock: parseInt(stock) || 0,
    });
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(String(req.query.page)) || 1;
    const page_size = parseInt(String(req.query.page_size)) || 10;
    const data = await promisify<any>(userClient, 'ListUsers', { page, page_size });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const data = await promisify<any>(userClient, 'GetUser', { id: req.params.id });
    res.json(data);
  } catch (e: any) {
    res.status(e.code === 5 ? 404 : 500).json({ error: e.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { email, name } = req.body;
    const data = await promisify<any>(userClient, 'CreateUser', { email: email || '', name: name || '' });
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Cart
app.get('/api/cart/:userId', async (req, res) => {
  try {
    const data = await promisify<any>(cartClient, 'GetCart', { user_id: req.params.userId });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/cart/:userId/items', async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const data = await promisify<any>(cartClient, 'AddItem', {
      user_id: req.params.userId,
      product_id: product_id || '',
      quantity: parseInt(quantity) || 1,
    });
    res.json(data);
  } catch (e: any) {
    res.status(e.code === 5 ? 404 : 500).json({ error: e.message });
  }
});

app.delete('/api/cart/:userId/items/:productId', async (req, res) => {
  try {
    const data = await promisify<any>(cartClient, 'RemoveItem', {
      user_id: req.params.userId,
      product_id: req.params.productId,
    });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/cart/:userId', async (req, res) => {
  try {
    const data = await promisify<any>(cartClient, 'ClearCart', { user_id: req.params.userId });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Orders
app.post('/api/orders', async (req, res) => {
  try {
    const { user_id, items, total } = req.body;
    const data = await promisify<any>(orderClient, 'CreateOrder', {
      user_id: user_id || '',
      items: items || [],
      total: parseFloat(total) || 0,
    });
    res.status(201).json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const data = await promisify<any>(orderClient, 'GetOrder', { id: req.params.id });
    res.json(data);
  } catch (e: any) {
    res.status(e.code === 5 ? 404 : 500).json({ error: e.message });
  }
});

app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const page = parseInt(String(req.query.page)) || 1;
    const page_size = parseInt(String(req.query.page_size)) || 10;
    const data = await promisify<any>(orderClient, 'ListOrdersByUser', {
      user_id: req.params.userId,
      page,
      page_size,
    });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway listening on http://localhost:${PORT}`);
});
