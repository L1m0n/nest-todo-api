const crypto = require('crypto');

if (!global.crypto) {
  global.crypto = {
    randomUUID: crypto.randomUUID,
  };
}
