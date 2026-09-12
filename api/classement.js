// Fonction serveur Vercel : lit le classement dans MongoDB et le renvoie au site.
// La chaine de connexion reste ici, cote serveur : jamais visible par les visiteurs.

const { MongoClient } = require('mongodb');

const URI = process.env.MONGODB_URI;
const GUILD_ID = process.env.GUILD_ID || '1525098075545276467'; // LA DÉLIRANCE

// On reutilise la connexion entre les appels (Vercel garde la fonction "chaude")
let clientPromesse = null;
function obtenirClient() {
  if (!clientPromesse) {
    clientPromesse = new MongoClient(URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    }).connect();
  }
  return clientPromesse;
}

module.exports = async (req, res) => {
  // Cache 60s cote Vercel : evite de marteler MongoDB si beaucoup de visiteurs
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (!URI) {
    return res.status(500).json({ erreur: 'MONGODB_URI absente des variables d\'environnement' });
  }

  try {
    const client = await obtenirClient();
    const collection = client.db('dimeh_bot').collection('levels');

    const documents = await collection
      .find({ guild_id: String(GUILD_ID) })
      .project({ _id: 0, user_id: 1, xp: 1, level: 1, pseudo: 1, avatar: 1 })
      .sort({ xp: -1 })
      .limit(50)
      .toArray();

    const membres = documents.map(d => ({
      pseudo: d.pseudo || 'Membre',
      xp: Number(d.xp) || 0,
      avatar: d.avatar || null,
    }));

    return res.status(200).json({
      membres,
      total: membres.length,
      genere: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Erreur MongoDB:', e.message);
    // On renvoie une liste vide plutot qu'une erreur brute : le site reste utilisable
    return res.status(200).json({ membres: [], total: 0, erreur: 'base indisponible' });
  }
};
