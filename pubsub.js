const { PubSub } = require("@google-cloud/pubsub");
const Product = require('./product');

require("dotenv").config();

const pubSubClient = new PubSub({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  },
});

const publishMessage = async function (topic, message) {
  try {
    await pubSubClient.topic(topic).publishMessage({
      data: Buffer.from(JSON.stringify(message)),
    });
    console.log(`Message published to topic ${topic}`);
  } catch (error) {
    console.error(`Received error while publishing to topic ${topic}: ${error.message}`);
  }
};

async function createTopic(topic) {
  // Crea el topic si no existe. Si ya está creado, no hace nada y oculta el error
  pubSubClient.createTopic(topic).then(() => console.log(`Topic ${topic} created`)).catch(err => { });
}

function getSubscriptionName(topic) {
  return 'buy-' + topic;
}

async function createSubscription(topic) {
  // Crea la suscripción si no existe. Si ya está creada, no hace nada y oculta el error
  const subscriptionName = getSubscriptionName(topic);
  await pubSubClient.topic(topic).createSubscription(subscriptionName).then(() => console.log(`Subscription ${subscriptionName} to topic ${topic} created`)).catch(err => { });
  return subscriptionName;
}

async function initializePubSub(createNewSubscriptions = false) {
  // Poner createNewSubscriptions a true cuando se hayan modificado los subscribedTopics
  const ourTopics = [
    'created-purchase',
    'updated-purchase',
    'deleted-purchase',
  ];
  // Crea nuestros topics
  await Promise.all(ourTopics.map(topic => createTopic(topic)));

  // Comentado porque no nos vamos a suscribir a ningún servicio
  const subscribedTopics = [
    'created-product',
    'updated-product',
    'deleted-product',
    'created-wallet',
    'updated-wallet',
    'deleted-wallet'
  ];
  // Se indican los temas que van a ser escuchados y se crea un mapa { topic: subscription }.
  // A cada suscripción se le añaden dos listeners por defecto que únicamente muestran información en la consola
  const subscriptions = {};
  for (var i = 0; i < subscribedTopics.length; i++) {
    const topic = subscribedTopics[i];
    const subscription = pubSubClient.subscription((createNewSubscriptions) ? await createSubscription(topic) : getSubscriptionName(topic));

    subscription.on('message', message => {
      console.log(`Received message ${message.id} from topic ${topic}:`);
      console.log(`\tData: ${message.data}`);
      message.ack();
    });

    subscription.on('error', console.error);

    subscriptions[topic] = subscription;
  }

  subscriptions['created-product'].on('message', async message => {
    let product = JSON.parse(message.data);

    try {
      await Product.create({
        _id: product.id,
        ownerId: product.owner,
        assetId: product.picture,
        price: product.price
      });
    } catch { }
  });

  subscriptions['updated-product'].on('message', async message => {
    let product = JSON.parse(message.data);

    try {
      await Product.updateOne({ _id: product.id }, {
        ownerId: product.owner,
        assetId: product.picture,
        price: product.price
      });
    } catch { }
  });

  subscriptions['deleted-product'].on('message', async message => {
    try {
      await Product.deleteOne({ _id: JSON.parse(message.data)['id'] });
    } catch { }
  });

  subscriptions['created-wallet'].on('message', async message => {
    let wallet = JSON.parse(message.data);

    try {
      await Wallet.create({
        _id: wallet._id,
        userId: wallet.user,
        funds: wallet.fund
      });
    } catch { }
  });

  subscriptions['updated-wallet'].on('message', async message => {
    let wallet = JSON.parse(message.data);

    try {
      await Product.updateOne({ _id: wallet._id }, {
        userId: wallet.user,
        funds: wallet.fund
      });
    } catch { }
  });

  subscriptions['deleted-wallet'].on('message', async message => {
    try {
      await Wallet.deleteOne({ _id: JSON.parse(message.data)['_id'] });
    } catch { }
  });
}

module.exports = { initializePubSub, publishMessage };