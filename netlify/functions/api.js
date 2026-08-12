const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}
function makeHash(password) {
  const salt = crypto.randomBytes(8).toString('hex');
  return salt + ':' + sha256(salt + password);
}
function verifyPassword(password, stored) {
  if (!stored || stored.indexOf(':') === -1) return false;
  const [salt, hash] = stored.split(':');
  return sha256(salt + password) === hash;
}

async function getDati(store) {
  const d = await store.get('dati', { type: 'json' });
  return d || {};
}
async function getCredenziali(store) {
  const c = await store.get('credenziali', { type: 'json' });
  return c || {};
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'JSON non valido' };
  }

  const store = getStore('registro-ore');
  const adminPassword = process.env.ADMIN_PASSWORD;

  const json = (data, statusCode = 200) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  try {
    switch (body.action) {

      case 'get-admin': {
        if (!adminPassword || body.password !== adminPassword) return json({ error: 'Password errata' }, 401);
        const dati = await getDati(store);
        const cred = await getCredenziali(store);
        return json({ dati, operai: Object.keys(cred) });
      }

      case 'save-admin': {
        if (!adminPassword || body.password !== adminPassword) return json({ error: 'Password errata' }, 401);
        await store.setJSON('dati', body.dati || {});
        return json({ ok: true });
      }

      case 'reset-worker-password': {
        if (!adminPassword || body.password !== adminPassword) return json({ error: 'Password errata' }, 401);
        const cred = await getCredenziali(store);
        delete cred[body.nome];
        await store.setJSON('credenziali', cred);
        return json({ ok: true });
      }

      case 'add-entry': {
        const { nome, data, attivita } = body;
        if (!nome || !data || !Array.isArray(attivita) || !attivita.length) return json({ error: 'Dati mancanti' }, 400);
        const dati = await getDati(store);
        const [anno, mese] = data.split('-');
        const key = `${anno}-${mese}`;
        if (!dati[key]) dati[key] = {};
        if (!dati[key][nome]) dati[key][nome] = [];
        const idx = dati[key][nome].findIndex(v => v.data === data);
        if (idx !== -1) {
          dati[key][nome][idx].attivita.push(...attivita);
        } else {
          dati[key][nome].push({ data, attivita });
          dati[key][nome].sort((a, b) => a.data.localeCompare(b.data));
        }
        await store.setJSON('dati', dati);
        return json({ ok: true });
      }

      case 'check-worker': {
        const cred = await getCredenziali(store);
        return json({ hasPassword: !!cred[body.nome] });
      }

      case 'set-worker-password': {
        const { nome, password } = body;
        if (!nome || !password) return json({ error: 'Dati mancanti' }, 400);
        const cred = await getCredenziali(store);
        if (cred[nome]) return json({ error: 'Password già impostata' }, 409);
        cred[nome] = makeHash(password);
        await store.setJSON('credenziali', cred);
        return json({ ok: true });
      }

      case 'login-worker': {
        const { nome, password } = body;
        const cred = await getCredenziali(store);
        if (!cred[nome] || !verifyPassword(password, cred[nome])) {
          return json({ error: 'Password errata' }, 401);
        }
        const dati = await getDati(store);
        const mie = {};
        Object.keys(dati).forEach(k => {
          if (dati[k][nome]) mie[k] = dati[k][nome];
        });
        return json({ dati: mie });
      }

      default:
        return json({ error: 'Azione non valida' }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
};
