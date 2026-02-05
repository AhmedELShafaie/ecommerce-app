import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import Database from 'better-sqlite3';

const protoDir = process.env.PROTO_DIR || path.resolve(process.cwd(), '..', 'proto');
const loadOptions = { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true };
const cartProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(protoDir, 'cart.proto'), loadOptions)
).cart as any;
const productProto = grpc.loadPackageDefinition(
  protoLoader.loadSync(path.join(protoDir, 'product.proto'), loadOptions)
).product as any;

const productClient = new productProto.ProductService(
  process.env.PRODUCT_SERVICE_URL || 'localhost:50051',
  grpc.credentials.createInsecure()
);

const db = new Database('carts.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS cart_items (
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    PRIMARY KEY (user_id, product_id)
  );
`);

function computeTotal(items: { quantity: number; unit_price: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
}

function getCartForUser(userId: string): { items: any[]; total: number } {
  const rows = db
    .prepare(
      'SELECT product_id, product_name, quantity, unit_price FROM cart_items WHERE user_id = ?'
    )
    .all(userId) as any[];
  const items = rows.map((r) => ({
    product_id: r.product_id,
    product_name: r.product_name,
    quantity: r.quantity,
    unit_price: r.unit_price,
  }));
  return { items, total: computeTotal(rows) };
}

function getCart(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  try {
    const { user_id } = call.request;
    const { items, total } = getCartForUser(user_id);
    callback(null, { user_id, items, total });
  } catch (err: any) {
    callback({ code: grpc.status.INTERNAL, message: err.message }, null);
  }
}

function addItem(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  const { user_id, product_id, quantity } = call.request;
  productClient.GetProduct({ id: product_id }, (err: Error | null, product: any) => {
    if (err || !product) {
      return callback(
        { code: grpc.status.NOT_FOUND, message: 'Product not found: ' + product_id },
        null
      );
    }
    try {
      const product_name = product.name || 'Product';
      const unit_price = product.price ?? 0;
      const existing = db
        .prepare('SELECT quantity, product_name, unit_price FROM cart_items WHERE user_id = ? AND product_id = ?')
        .get(user_id, product_id) as { quantity: number; product_name: string; unit_price: number } | undefined;
      if (existing) {
        db.prepare(
          'UPDATE cart_items SET quantity = quantity + ?, product_name = ?, unit_price = ? WHERE user_id = ? AND product_id = ?'
        ).run(existing.quantity + quantity, product_name || existing.product_name, unit_price || existing.unit_price, user_id, product_id);
      } else {
        db.prepare(
          'INSERT INTO cart_items (user_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)'
        ).run(user_id, product_id, product_name, quantity, unit_price);
      }
      const { items, total } = getCartForUser(user_id);
      callback(null, { user_id, items, total });
    } catch (e: any) {
      callback({ code: grpc.status.INTERNAL, message: e.message }, null);
    }
  });
}

function removeItem(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  try {
    const { user_id, product_id } = call.request;
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(user_id, product_id);
    const { items, total } = getCartForUser(user_id);
    callback(null, { user_id, items, total });
  } catch (err: any) {
    callback({ code: grpc.status.INTERNAL, message: err.message }, null);
  }
}

function clearCart(call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) {
  try {
    const { user_id } = call.request;
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(user_id);
    callback(null, { user_id, items: [], total: 0 });
  } catch (err: any) {
    callback({ code: grpc.status.INTERNAL, message: err.message }, null);
  }
}

const server = new grpc.Server();
server.addService(cartProto.CartService.service, {
  GetCart: getCart,
  AddItem: addItem,
  RemoveItem: removeItem,
  ClearCart: clearCart,
});
server.bindAsync(
  '0.0.0.0:50054',
  grpc.ServerCredentials.createInsecure(),
  (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log('Cart service listening on :50054');
  }
);
