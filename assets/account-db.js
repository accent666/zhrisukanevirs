const sessionKey = 'zhrisukanevirs.account-session';
const lifetime = 30 * 24 * 60 * 60 * 1000;
let database;

function openDatabase() {
  if (!database) {
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('zhrisukanevirs-accounts', 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('accounts', {keyPath: 'email'});
        request.result.createObjectStore('sessions');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

async function request(store, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const query = operation(transaction.objectStore(store));
    transaction.oncomplete = () => resolve(query.result);
    transaction.onabort = () => reject(query.error || transaction.error);
  });
}

function get(store, key) {
  return request(store, 'readonly', table => table.get(key));
}

async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    {name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256'}, key, 256
  );
  return Array.from(new Uint8Array(bits), n => n.toString(16).padStart(2, '0')).join('');
}

function publicAccount({profile, orders, teeth}) {
  return {profile, orders, teeth};
}

export async function registerAccount({email, name, password}) {
  email = email.trim().toLowerCase();
  name = name.trim();
  if (!name) throw new Error('Введи имя.');
  if (password.length < 8) throw new Error('Пароль должен быть не короче 8 символов.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const account = {
    email, salt, passwordHash: await hashPassword(password, salt),
    profile: {email, name, phone: '', city: '', address: ''}, orders: [], teeth: 0
  };
  try {
    await request('accounts', 'readwrite', table => table.add(account));
  } catch (error) {
    if (error.name === 'ConstraintError') throw new Error('Аккаунт с такой почтой уже есть. Попробуй войти.');
    throw error;
  }
  return startSession(account);
}

export async function logIn({email, password}) {
  const account = await get('accounts', email.trim().toLowerCase());
  if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
    throw new Error('Неверная почта или пароль.');
  }
  return startSession(account);
}

async function startSession(account) {
  await endSession();
  const token = crypto.randomUUID();
  await request('sessions', 'readwrite', table =>
    table.add({email: account.email, expires: Date.now() + lifetime}, token)
  );
  localStorage.setItem(sessionKey, token);
  return publicAccount(account);
}

export async function restoreSession() {
  const token = localStorage.getItem(sessionKey);
  if (!token) return null;
  const session = await get('sessions', token);
  if (!session || session.expires <= Date.now()) {
    if (localStorage.getItem(sessionKey) === token) localStorage.removeItem(sessionKey);
    if (session) await request('sessions', 'readwrite', table => table.delete(token));
    return null;
  }
  const account = await get('accounts', session.email);
  return account && localStorage.getItem(sessionKey) === token ? publicAccount(account) : null;
}

export async function endSession() {
  const token = localStorage.getItem(sessionKey);
  if (!token) return;
  localStorage.removeItem(sessionKey);
  await request('sessions', 'readwrite', table => table.delete(token));
}

export function onSessionChange(listener) {
  const handle = event => {
    if (event.key === sessionKey || event.key === null) listener();
  };
  window.addEventListener('storage', handle);
  return () => window.removeEventListener('storage', handle);
}

export async function updateAccount(email, edit) {
  const token = localStorage.getItem(sessionKey);
  const session = token && await get('sessions', token);
  if (!session || session.email !== email || session.expires <= Date.now() ||
      localStorage.getItem(sessionKey) !== token) {
    throw new Error('Сессия закончилась. Войди снова.');
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('accounts', 'readwrite');
    const table = transaction.objectStore('accounts');
    const query = table.get(email);
    let account;
    let failure;
    query.onsuccess = () => {
      try {
        account = query.result;
        if (!account) throw new Error('Аккаунт не найден.');
        edit(account);
        table.put(account);
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(publicAccount(account));
    transaction.onabort = () => reject(failure || transaction.error);
  });
}
