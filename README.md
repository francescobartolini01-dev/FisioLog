# FisioLog

**Esercizi a casa, progressi in studio.**
Il fisioterapista prepara una libreria di esercizi con spiegazione e video e li assegna ai pazienti. Il paziente li fa a casa e per ognuno registra serie, dolore (0–10), sensazioni e una nota. In seduta il fisioterapista ha già tutto davanti.

È una web app installabile (PWA): si apre dal browser e si aggiunge alla schermata Home di telefono e PC. Non serve alcun passaggio di build.

---

## Cosa c'è dentro

| File | A cosa serve |
|---|---|
| `index.html` | Pagina dell'app e animazione di apertura |
| `app.js` | Tutta la logica: accesso, area paziente, area fisioterapista, libreria |
| `styles.css` | Stile, tema giorno e notte |
| `config.js` | Indirizzo e chiave pubblica di Supabase (**da compilare**) |
| `supabase.sql` | Tabelle, permessi e archivio video (da eseguire una volta su Supabase) |
| `sw.js`, `manifest.webmanifest` | Installazione come app e apertura senza rete |
| `logo.svg`, `logo-animated.svg`, `icons/` | Logo e icone |
| `privacy.html` | Modello di informativa privacy (**da completare**) |
| `vercel.json` | Impostazioni per Vercel |

### Area paziente
- **Oggi**: gli esercizi del giorno con il loro stato e la prossima seduta.
- **Esercizio**: video dimostrativo, a cosa serve, passaggi numerati, avvertenze e la nota del fisio. Sotto c'è la registrazione: serie fatte, dolore 0–10, sensazioni e nota.
- **Programma**: tutti gli esercizi assegnati, con i giorni.
- **Diario**: costanza, dolore medio, grafico degli ultimi 14 giorni e storico.
- **Profilo**: nome, collegamento col fisio, tema, download dei dati, eliminazione dell'account.
- Senza rete la registrazione resta sul telefono e parte da sola appena torna la connessione.

### Area fisioterapista
- **Pazienti**: il **codice studio** da dare ai pazienti e l'elenco con costanza, dolore medio, ultima registrazione e avvisi. Prima compaiono i pazienti con un dolore da 6 in su negli ultimi 7 giorni.
- **Scheda paziente**: avvisi, numeri della settimana, grafico del dolore, diario recente, sedute e programma (assegna, modifica, riordina, togli).
- **Libreria**: esercizi con nome, zona, spiegazione, passaggi, avvertenze, prescrizione di partenza e video. Il video può essere **caricato** (MP4, MOV o WebM, fino a 50 MB) oppure un **link YouTube o Vimeo**. Ricerca e filtro per zona.

### Chi vede cosa
- Il paziente si registra e inserisce il codice studio del suo fisioterapista. Solo da quel momento il fisio vede il suo diario.
- Il paziente vede soltanto gli esercizi che gli sono stati assegnati. Il fisio vede soltanto i propri pazienti e la propria libreria.
- I video stanno in un archivio privato e si aprono con link temporanei, solo per il fisio che li ha caricati e per i suoi pazienti.
- Le regole stanno nel database (`supabase.sql`), non solo nell'app. Sono state provate con utenti di prova: paziente che prova a cambiare ruolo, fisio che prova ad assegnare esercizi a un paziente non suo, paziente che prova a caricare video. In tutti i casi l'operazione viene rifiutata.

---

## Messa online, passo passo

### 1. Supabase (database, accessi, video)
1. Su [supabase.com](https://supabase.com) crea un **nuovo progetto** dedicato a FisioLog, separato da LiftLog. Come regione scegli **Europa (Frankfurt)**: sono dati sanitari.
2. Vai in **SQL Editor › New query**, incolla tutto `supabase.sql` e premi **Run**. Si può rieseguire senza perdere dati.
3. In **Authentication › URL Configuration**:
   - **Site URL**: l'indirizzo Vercel, per esempio `https://fisiolog.vercel.app` (lo avrai al punto 3, poi torna qui).
   - **Redirect URLs**: aggiungi lo stesso indirizzo seguito da `/**`.
4. In **Authentication › Sign In / Providers › Email** lascia attiva la **conferma via email**: consigliata per un'app sanitaria.
5. **Email in produzione**: il servizio email incluso in Supabase manda pochissimi messaggi all'ora. Prima di invitare pazienti veri collega un SMTP in **Authentication › Emails › SMTP Settings** (per esempio Brevo o Resend, che hanno piani gratuiti). Nella stessa pagina puoi tradurre in italiano i testi delle email.
6. In **Project Settings › API** copia il **Project URL** e la chiave **Publishable** (o `anon public`).

### 2. Il repository
1. Apri `config.js` e incolla i due valori:
   ```js
   window.FISIOLOG_SUPABASE = {
     url: "https://xxxxxxxxxxxx.supabase.co",
     key: "sb_publishable_..."
   };
   ```
   Si possono pubblicare: i dati sono protetti dalle regole del database. **Non mettere mai qui la chiave `secret` o `service_role`.**
2. Crea un nuovo repository su GitHub (per esempio `fisiolog`) e carica tutti i file di questa cartella:
   ```bash
   cd fisiolog
   git init && git add . && git commit -m "FisioLog: prima versione"
   git branch -M main
   git remote add origin https://github.com/TUO-UTENTE/fisiolog.git
   git push -u origin main
   ```

### 3. Vercel
1. Su [vercel.com](https://vercel.com) scegli **Add New › Project** e importa il repository.
2. **Framework Preset: Other**. Lascia vuoti Build Command e Output Directory. Premi **Deploy**.
3. Copia l'indirizzo che ti dà Vercel e inseriscilo in Supabase (passo 1.3).
4. Da qui in poi ogni `git push` pubblica la nuova versione in automatico.

### 4. Prova
1. Apri l'app e crea un account **Fisioterapista**. Conferma l'email e accedi.
2. In **Libreria** crea un esercizio con un video.
3. Da un altro browser, o in finestra anonima, crea un account **Paziente** e inserisci il codice studio che vedi in **Pazienti**.
4. Torna sul fisio, apri il paziente e premi **Assegna esercizio**.
5. Sul paziente apri l'esercizio, registralo e controlla che compaia nel diario del fisio.

---

## Note utili
- **Nuova versione**: quando pubblichi modifiche, cambia il numero in `sw.js` (`fisiolog-v1` → `fisiolog-v2`). Così i telefoni scaricano subito i file aggiornati.
- **Video**: il limite di 50 MB a file è quello del piano gratuito di Supabase. Per video lunghi conviene un link YouTube **non in elenco**. Dall'iPhone, per avere la massima compatibilità anche su Android, imposta *Impostazioni › Fotocamera › Formati › Più compatibile*.
- **Spazio**: il piano gratuito di Supabase include 1 GB di archivio file. È il primo limite che incontrerai se carichi molti video.
- **Privacy**: completa `privacy.html` e falla verificare da un consulente prima di usare l'app con pazienti reali. L'app già offre consenso esplicito alla registrazione, scollegamento dal fisio, download dei dati ed eliminazione dell'account.
- **Codice studio**: viene creato in automatico per ogni account fisioterapista ed è di 6 caratteri.
