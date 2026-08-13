# Registro Ore — Deploy su Netlify

## Struttura
- index.html — schermata iniziale con i 3 collegamenti
- inserisci.html — modulo pubblico di inserimento ore
- ore.html — area operai (login nome + password)
- admin.html — area amministratore (password unica)
- netlify/functions/api.js — funzione serverless (dati + autenticazioni)
- netlify.toml — configurazione redirect /api

## Passaggi
1. Crea un nuovo sito su Netlify collegato a questa cartella/repo.
2. Vai su Site settings → Environment variables e aggiungi:
   - ADMIN_PASSWORD = la password che vuoi usare per admin.html
3. Vai su Site settings → Data storage → Blobs: è già attivo di default
   sui siti Netlify (nessuna configurazione aggiuntiva richiesta,
   @netlify/blobs usa lo storage del sito automaticamente).
4. Deploy. Netlify installa automaticamente @netlify/blobs da package.json
   e pubblica la funzione /netlify/functions/api.js su /api.

## Note
- I dati (ore) e le credenziali operai sono salvati in due blob separati
  ("dati" e "credenziali") nello store "registro-ore", persistenti tra i deploy.
- Ogni operaio, al primo accesso su ore.html, sceglie liberamente una password;
  da quel momento gli viene richiesta ad ogni accesso.
- Dalla scheda "Password operai" in admin.html è possibile rimuovere la
  password di un operaio (al successivo accesso potrà impostarne una nuova).
- admin.html vede e modifica tutti i dati senza bisogno delle password operai:
  usa solo ADMIN_PASSWORD.
