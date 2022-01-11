const { PubSub } = require("@google-cloud/pubsub");

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
  await pubSubClient.createTopic(topic).then(() => console.log(`Topic ${topic} created`)).catch(err => { });
}

async function createSubscription(topic) {
  // Crea la suscripción si no existe. Si ya está creada, no hace nada y oculta el error
  const subscriptionName = 'purchase_service-' + topic;
  await pubSubClient.topic(topic).createSubscription(subscriptionName).then(() => console.log(`Subscription ${subscriptionName} to topic ${topic} created`)).catch(err => { });
  return subscriptionName;
}

async function initializePubSub() {
  // TODO: En esta variable se guardan los topics de nuestro microservicio
  const ourTopics = [
    'prueba.prueba1',
    'prueba.prueba2'
  ];
  // Crea nuestros topics
  Promise.all(ourTopics.map(topic => createTopic(topic)));



  // Create a default event handler to handle messages
  const messageHandler = message => {
    console.log(`Received message ${message.id}:`);
    console.log(`\tData: ${message.data}`);
    console.log(`\tAttributes: ${message.attributes}`);
    message.ack(); // Acknowledge receipt of the message
  };

  // TODO: En esta variable se guardan los topics a los que nuestro servicio se suscribirá
  const subscribedTopics = [
    'prueba.prueba1',
    'prueba.prueba2'
  ];
  // Se indican los temas que van a ser escuchados y se crea un mapa { topic: subscription }.
  // A cada suscripción se le añaden dos listeners por defecto que únicamente muestran información en la consola
  const subscriptions = await subscribedTopics.reduce(async (map, obj) => {
    map[obj] = pubSubClient.subscription(await createSubscription(obj));
    map[obj].on('message', messageHandler);
    map[obj].on('error', console.error);
    return map;
  }, {});

  // TODO: Aquí concretar qué hacer para cada mensaje
  subscriptions['prueba.prueba1'].on('message', message => {
    console.log('Listener específico de "prueba.prueba1" llamado');
  });
  subscriptions['prueba.prueba2'].on('message', message => {
    console.log('Otro llamado. Habría que handlear creacion de usuarios y esas cosas.....');
  });
}

module.exports = { initializePubSub, publishMessage };
