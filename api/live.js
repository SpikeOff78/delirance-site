// Statut du live Twitch.
// Sans identifiants configurés, renvoie proprement "hors ligne" : le site reste fonctionnel.
//
// Pour l'activer plus tard, ajouter sur Vercel (Settings > Environment Variables) :
//   TWITCH_CLIENT_ID      → depuis https://dev.twitch.tv/console/apps
//   TWITCH_CLIENT_SECRET  → idem
//   TWITCH_LOGIN          → optionnel, "dimehdelire" par défaut

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const LOGIN = process.env.TWITCH_LOGIN || 'dimehdelire';

let jeton = null;         // { valeur, expire }

async function obtenirJeton() {
  if (jeton && jeton.expire > Date.now() + 60000) return jeton.valeur;
  const r = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!r.ok) throw new Error('jeton Twitch refusé');
  const d = await r.json();
  jeton = { valeur: d.access_token, expire: Date.now() + (d.expires_in * 1000) };
  return jeton.valeur;
}

function dureeDepuis(debut) {
  const ms = Date.now() - new Date(debut).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const h = Math.floor(ms / 3600000);
  const min = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h${String(min).padStart(2, '0')}` : `${min} min`;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=45, stale-while-revalidate=90');

  // Pas d'identifiants : on répond "hors ligne" sans erreur
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(200).json({ enDirect: false, configure: false });
  }

  try {
    const acces = await obtenirJeton();
    const r = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(LOGIN)}`,
      { headers: { 'Client-ID': CLIENT_ID, Authorization: `Bearer ${acces}` } }
    );
    if (!r.ok) throw new Error('API Twitch ' + r.status);

    const d = await r.json();
    const flux = d.data && d.data[0];
    if (!flux) return res.status(200).json({ enDirect: false, configure: true });

    return res.status(200).json({
      enDirect: true,
      configure: true,
      titre: flux.title || null,
      jeu: flux.game_name || null,
      viewers: flux.viewer_count ?? null,
      duree: flux.started_at ? dureeDepuis(flux.started_at) : null,
      miniature: flux.thumbnail_url
        ? flux.thumbnail_url.replace('{width}', '640').replace('{height}', '360')
        : null,
    });
  } catch (e) {
    console.error('Erreur Twitch :', e.message);
    return res.status(200).json({ enDirect: false, configure: true, erreur: true });
  }
};
